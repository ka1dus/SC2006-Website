/**
 * PART B: Census 2020 Population → Subzone Join
 * 
 * Ingests Census 2020 Resident Population by Subzone and attaches population
 * to every URA subzone from Part A.
 * 
 * Features:
 * - Idempotent (safe to re-run)
 * - Resilient (missing/ambiguous names don't crash)
 * - Auditable (DatasetSnapshot with unmatched details)
 * - File-first, URL-fallback strategy
 */

import prisma from '../../db';
import { normName, toInt, normalizePopulationRow, type NormalizedPopulationRow } from './utils/normalize';
import { resolveAlias } from './utils/aliases';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Papa from 'papaparse';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_CSV_PATH = path.join(DATA_DIR, 'census_2020_population.csv');
const LOCAL_JSON_PATH = path.join(DATA_DIR, 'census_2020_population.json');
const CENSUS2020_URL = process.env.CENSUS2020_URL || '';

/**
 * SubzoneLookup for fast matching
 */
interface SubzoneLookup {
  byId: Map<string, { id: string; name: string }>;
  byNameNorm: Map<string, string>; // normalized name → id
}

/**
 * Attempts to load Census 2020 population data from local file first, then URL
 * Returns { data: string, source: 'file' | 'url' } or null if both fail
 */
async function fetchPopulationSource(): Promise<{ data: string; source: 'file' | 'url' } | null> {
  // Strategy 1: Try local CSV file
  try {
    console.log(`📂 Checking for local file: ${LOCAL_CSV_PATH}`);
    const fileContent = await fs.readFile(LOCAL_CSV_PATH, 'utf-8');
    console.log(`✅ Loaded Census 2020 population from local CSV (${fileContent.length} bytes)`);
    return { data: fileContent, source: 'file' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local CSV file:`, error);
    }
  }

  // Strategy 2: Try local JSON file
  try {
    console.log(`📂 Checking for local file: ${LOCAL_JSON_PATH}`);
    const fileContent = await fs.readFile(LOCAL_JSON_PATH, 'utf-8');
    console.log(`✅ Loaded Census 2020 population from local JSON (${fileContent.length} bytes)`);
    return { data: fileContent, source: 'file' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local JSON file:`, error);
    }
  }

  console.log(`⚠️  No local Census 2020 population file found`);

  // Strategy 3: Try URL
  if (!CENSUS2020_URL) {
    console.warn(`⚠️  CENSUS2020_URL not configured in .env`);
    console.log(`\n💡 To fix this, either:`);
    console.log(`   1. Place file at: ${LOCAL_CSV_PATH}`);
    console.log(`   2. Or set CENSUS2020_URL in backend/.env`);
    return null;
  }

  try {
    console.log(`🌐 Fetching Census 2020 population from URL: ${CENSUS2020_URL}`);
    const response = await fetch(CENSUS2020_URL);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.text();
    console.log(`✅ Fetched Census 2020 population from URL (${data.length} bytes)`);
    return { data, source: 'url' };
  } catch (error) {
    console.error('❌ Failed to fetch Census 2020 population from URL:', error);
    return null;
  }
}

/**
 * Parses CSV or JSON population data
 * Returns array of raw records
 */
async function parsePopulationData(input: string): Promise<any[]> {
  // Try JSON first
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    if (parsed.result && Array.isArray(parsed.result)) {
      return parsed.result;
    }
  } catch {
    // Not JSON, try CSV
  }

  // Parse as CSV
  return new Promise((resolve, reject) => {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for better control
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn(`⚠️  CSV parsing warnings:`, results.errors.slice(0, 5));
        }
        resolve(results.data as any[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Builds lookup maps for fast subzone matching
 */
async function buildSubzoneLookup(): Promise<SubzoneLookup> {
  const subzones = await prisma.subzone.findMany({
    select: { id: true, name: true },
  });

  const byId = new Map(subzones.map(sz => [sz.id, sz]));
  const byNameNorm = new Map<string, string>();

  for (const sz of subzones) {
    const normKey = normName(sz.name);
    byNameNorm.set(normKey, sz.id);
  }

  console.log(`📊 Built lookup: ${byId.size} subzones, ${byNameNorm.size} normalized names`);
  
  return { byId, byNameNorm };
}

/**
 * Matches a normalized Census row to a Subzone.id
 * Returns { subzoneId, confidence } or { subzoneId: null, reason }
 */
function matchToSubzone(
  row: NormalizedPopulationRow,
  lookup: SubzoneLookup
): { subzoneId: string | null; confidence?: string; reason?: string } {
  const normKey = row.subzone_name_norm;

  // Strategy 1: Check aliases first
  const aliasId = resolveAlias(normKey);
  if (aliasId && lookup.byId.has(aliasId)) {
    return { subzoneId: aliasId, confidence: 'alias' };
  }

  // Strategy 2: Direct normalized name match
  const directId = lookup.byNameNorm.get(normKey);
  if (directId) {
    return { subzoneId: directId, confidence: 'direct' };
  }

  // Strategy 3: No match found
  return { 
    subzoneId: null, 
    reason: `No match for normalized name: "${normKey}" (original: "${row.subzone_name}")` 
  };
}

/**
 * Records a dataset snapshot
 */
async function recordSnapshot(
  status: 'success' | 'partial' | 'failed',
  meta: any,
  sourceUrl?: string
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'census-2020-population',
      sourceUrl: sourceUrl || null,
      startedAt: new Date(),
      finishedAt: new Date(),
      status,
      meta,
    },
  });
}

/**
 * Main ingestion function (idempotent)
 * 
 * Transaction strategy:
 * - Upsert all matched Population records in a single transaction
 * - Keep latest year per subzone
 * - Track unmatched in snapshot meta
 */
export async function ingestCensus2020Population() {
  const startTime = Date.now();
  console.log('🚀 Starting PART B: Census 2020 Population Ingestion...\n');

  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const unmatchedSamples: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Fetch data (file-first, URL-fallback)
    const result = await fetchPopulationSource();
    
    if (!result) {
      console.error('\n❌ Census 2020 population ingestion failed: No data source available');
      console.log('💡 This is expected if you haven\'t placed the file yet.');
      console.log('   The system will work with existing seed data.\n');
      
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'No local file found and no URL configured',
        matchedCount: 0,
        unmatchedCount: 0,
      });
      return;
    }

    const { data: rawData, source } = result;
    console.log(`📊 Data source: ${source === 'file' ? 'Local file' : 'URL fetch'}\n`);

    // Step 2: Parse data
    console.log('📊 Parsing Census 2020 population data...');
    const rawRows = await parsePopulationData(rawData);
    console.log(`📝 Found ${rawRows.length} raw rows\n`);

    if (rawRows.length === 0) {
      console.error('❌ No data rows found after parsing');
      await recordSnapshot('failed', {
        error: 'NO_DATA_ROWS',
        source: result.source,
      }, result.source === 'url' ? CENSUS2020_URL : undefined);
      return;
    }

    // Step 3: Build subzone lookup
    console.log('🔍 Building subzone lookup from Part A data...');
    const lookup = await buildSubzoneLookup();

    // Step 4: Normalize and match rows
    console.log('🔄 Normalizing and matching Census rows to URA subzones...\n');
    
    const normalizedRows: Array<NormalizedPopulationRow & { subzoneId: string }> = [];
    
    for (let i = 0; i < rawRows.length; i++) {
      try {
        const normalized = normalizePopulationRow(rawRows[i], i);
        
        if (!normalized) {
          errorCount++;
          continue;
        }

        // Match to subzone
        const match = matchToSubzone(normalized, lookup);
        
        if (match.subzoneId) {
          normalizedRows.push({
            ...normalized,
            subzoneId: match.subzoneId,
          });
          matchedCount++;
          
          if (matchedCount <= 5) {
            console.log(`✅ Matched: "${normalized.subzone_name}" → ${match.subzoneId} (${match.confidence})`);
          }
        } else {
          unmatchedCount++;
          if (unmatchedSamples.length < 20) {
            unmatchedSamples.push(normalized.subzone_name_norm);
          }
          
          if (unmatchedCount <= 5) {
            console.log(`⚠️  Unmatched: "${normalized.subzone_name}" (normalized: "${normalized.subzone_name_norm}")`);
          }
        }
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        if (errorCount <= 3) {
          console.error(`❌ Error processing row ${i}:`, error);
        }
      }
    }

    if (matchedCount > 5) {
      console.log(`... (${matchedCount - 5} more matched rows)\n`);
    }
    if (unmatchedCount > 5) {
      console.log(`... (${unmatchedCount - 5} more unmatched rows)\n`);
    }

    // Step 5: Upsert matched rows in transaction (idempotent)
    console.log(`💾 Upserting ${normalizedRows.length} matched population records...`);
    
    await prisma.$transaction(async (tx) => {
      for (const row of normalizedRows) {
        // Get subzone name for denormalization
        const subzone = lookup.byId.get(row.subzoneId);
        if (!subzone) continue;

        // Upsert: keep latest year
        await tx.population.upsert({
          where: { subzoneId: row.subzoneId },
          create: {
            subzoneId: row.subzoneId,
            subzoneName: subzone.name,
            year: row.year,
            total: row.population_total,
          },
          update: {
            // Only update if incoming year is newer or equal
            ...(row.year >= (await tx.population.findUnique({ 
              where: { subzoneId: row.subzoneId },
              select: { year: true }
            }))?.year || 0 ? {
              subzoneName: subzone.name,
              year: row.year,
              total: row.population_total,
            } : {}),
          },
        });
      }
    });

    console.log(`✅ Upserted ${normalizedRows.length} population records\n`);

    // Step 6: Record snapshot
    const duration = Date.now() - startTime;
    const status = unmatchedCount > 0 || errorCount > 0 ? 'partial' : 'success';
    
    await recordSnapshot(status, {
      source: result.source,
      rows: rawRows.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      errors: errorCount,
      unmatchedSamples: unmatchedSamples,
      year: 2020,
      duration: `${duration}ms`,
      errorSamples: errors.slice(0, 10),
    }, result.source === 'url' ? CENSUS2020_URL : undefined);

    // Final summary
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log('📊 PART B: Census 2020 Population Ingestion Summary');
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log(`   Data source:      ${result.source === 'file' ? 'Local file' : 'URL fetch'}`);
    console.log(`   Total rows:       ${rawRows.length}`);
    console.log(`   ✅ Matched:        ${matchedCount}`);
    console.log(`   ⚠️  Unmatched:     ${unmatchedCount}`);
    console.log(`   ❌ Errors:         ${errorCount}`);
    console.log(`   ⏱️  Duration:       ${duration}ms`);
    console.log(`   📝 Status:         ${status}`);
    console.log('════════════════════════════════════════════════════════════════════════════\n');

    if (unmatchedCount > 0) {
      console.log('💡 Unmatched subzones can be resolved by adding aliases to:');
      console.log('   backend/src/services/ingest/utils/aliases.ts\n');
      console.log('   Sample unmatched names:');
      unmatchedSamples.slice(0, 10).forEach(name => console.log(`   - "${name}"`));
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during Census 2020 population ingestion:', error);
    
    await recordSnapshot('failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      matchedCount,
      unmatchedCount,
      errorCount,
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Allow running directly from command line
if (require.main === module) {
  ingestCensus2020Population()
    .then(() => {
      console.log('✅ Census 2020 population ingestion completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Census 2020 population ingestion failed:', error);
      process.exit(1);
    });
}
