/**
 * Population Data Ingestion Service
 * Fetches, parses, normalizes, and upserts population data from government sources
 * 
 * Strategy:
 * 1. Try loading from local file (backend/data/census_2020_population.csv or .json)
 * 2. Fallback to fetching from URL (CENSUS2020_URL env var)
 * 3. If both fail, show clear error message
 */

import { Readable } from 'stream';
import prisma from '../../db';
import { normalizePopulationRow, NormalizedRow } from './utils/normalize';
import { SubzoneMatcher } from './utils/geo-matcher';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_CSV_PATH = path.join(DATA_DIR, 'census_2020_population.csv');
const LOCAL_JSON_PATH = path.join(DATA_DIR, 'census_2020_population.json');
const CENSUS2020_URL = process.env.CENSUS2020_URL || process.env.GOV_POPULATION_DATA_URL || '';

/**
 * Attempts to load population data from local file first, then URL
 * Returns { data: string, source: 'file' | 'url' } or null if both fail
 */
export async function fetchPopulationSource(): Promise<{ data: string; source: 'file' | 'url' } | null> {
  // Strategy 1: Try local CSV file
  try {
    console.log(`📂 Checking for local file: ${LOCAL_CSV_PATH}`);
    const fileContent = await fs.readFile(LOCAL_CSV_PATH, 'utf-8');
    console.log(`✅ Loaded population data from local CSV file (${fileContent.length} bytes)`);
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
    console.log(`✅ Loaded population data from local JSON file (${fileContent.length} bytes)`);
    return { data: fileContent, source: 'file' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local JSON file:`, error);
    }
  }

  console.log(`⚠️  No local population file found`);

  // Strategy 3: Try URL
  if (!CENSUS2020_URL) {
    console.warn(`⚠️  CENSUS2020_URL not configured in .env`);
    console.log(`\n💡 To fix this, either:`);
    console.log(`   1. Place file at: ${LOCAL_CSV_PATH}`);
    console.log(`   2. Or set CENSUS2020_URL in backend/.env`);
    return null;
  }

  try {
    console.log(`🌐 Fetching population data from URL: ${CENSUS2020_URL}`);
    const response = await fetch(CENSUS2020_URL);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.text();
    console.log(`✅ Fetched population data from URL (${data.length} bytes)`);
    return { data, source: 'url' };
  } catch (error) {
    console.error('❌ Failed to fetch population data from URL:', error);
    return null;
  }
}

/**
 * Parses CSV or JSON population data
 * TODO: Implement actual CSV/JSON parsing based on dataset format
 */
export async function parsePopulationCsvOrJson(input: string): Promise<any[]> {
  try {
    // Try JSON first
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    return [parsed];
  } catch {
    // TODO: Implement CSV parsing if needed
    console.warn('⚠️  CSV parsing not yet implemented. Add CSV parser if needed.');
    return [];
  }
}

/**
 * Records an unmatched population entry
 */
async function recordUnmatched(
  tx: any,
  normalized: NormalizedRow,
  reason: string,
  details?: any
) {
  await tx.populationUnmatched.create({
    data: {
      sourceKey: normalized.sourceKey,
      rawName: normalized.rawName,
      reason,
      details: details || { normalizedName: normalized.normalizedName },
    },
  });
}

/**
 * Upserts population data for a matched subzone
 */
async function upsertPopulation(
  tx: any,
  normalized: NormalizedRow,
  subzoneId: string
) {
  if (!normalized.populationTotal || !normalized.year) {
    throw new Error('Missing population total or year');
  }

  await tx.population.upsert({
    where: { subzoneId },
    create: {
      subzoneId,
      subzoneName: normalized.rawName,
      year: normalized.year,
      total: normalized.populationTotal,
    },
    update: {
      subzoneName: normalized.rawName,
      year: normalized.year,
      total: normalized.populationTotal,
    },
  });
}

/**
 * Records a dataset snapshot
 */
async function recordSnapshot(
  kind: string,
  status: 'success' | 'partial' | 'failed',
  meta: any,
  sourceUrl?: string
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind,
      sourceUrl: sourceUrl || null,
      versionNote: meta.versionNote || null,
      startedAt: new Date(),
      finishedAt: new Date(),
      status,
      meta,
    },
  });
}

/**
 * Main ingestion function
 * Orchestrates the entire population data ingestion pipeline
 */
export async function ingestPopulationData() {
  const startTime = Date.now();
  console.log('🚀 Starting Census 2020 population data ingestion...\n');

  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // Step 1: Fetch data (file-first, then URL)
    const result = await fetchPopulationSource();
    
    if (!result) {
      console.error('\n❌ Population data ingestion failed: No data source available');
      console.log('💡 Please either:');
      console.log(`   1. Place census_2020_population.csv in: ${DATA_DIR}`);
      console.log(`   2. Or set CENSUS2020_URL in backend/.env\n`);
      
      await recordSnapshot('census-2020-population', 'failed', {
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
    console.log('📊 Parsing population data...');
    const rawRows = await parsePopulationCsvOrJson(rawData);
    console.log(`📝 Found ${rawRows.length} raw rows`);

    if (rawRows.length === 0) {
      console.warn('⚠️  No rows found in dataset');
      await recordSnapshot('population', 'partial', {
        error: 'NO_DATA_IN_SOURCE',
        message: 'Dataset was empty or could not be parsed',
        matchedCount: 0,
        unmatchedCount: 0,
      });
      return;
    }

    // Step 3: Initialize matcher
    const matcher = new SubzoneMatcher();
    await matcher.initialize();
    console.log('✅ Subzone matcher initialized');

    // Step 4: Process each row
    await prisma.$transaction(async (tx) => {
      for (const rawRow of rawRows) {
        try {
          // Normalize
          const normalized = normalizePopulationRow(rawRow);
          
          // Skip if essential data is missing
          if (!normalized.populationTotal || !normalized.year) {
            console.warn(`⚠️  Skipping row with missing data: ${normalized.rawName}`);
            continue;
          }

          // Match to subzone
          const match = matcher.match(normalized.normalizedName);

          if (match.subzoneId) {
            // Matched: upsert population
            await upsertPopulation(tx, normalized, match.subzoneId);
            matchedCount++;
            console.log(`✅ Matched: ${normalized.rawName} → ${match.subzoneId}`);
          } else {
            // Unmatched: record for review
            await recordUnmatched(
              tx,
              normalized,
              match.reason || 'no_match',
              { confidence: match.confidence }
            );
            unmatchedCount++;
            console.log(`⚠️  Unmatched: ${normalized.rawName} (${match.reason})`);
          }
        } catch (error) {
          errorCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(errorMsg);
          console.error(`❌ Error processing row:`, error);
        }
      }
    });

    // Step 5: Record snapshot
    const duration = Date.now() - startTime;
    const status = errorCount > 0 ? 'partial' : 'success';
    
    await recordSnapshot('census-2020-population', status, {
      source: result.source,
      totalRows: rawRows.length,
      matchedCount,
      unmatchedCount,
      errorCount,
      duration: `${duration}ms`,
      errors: errors.slice(0, 10), // Only store first 10 errors
    }, result.source === 'url' ? CENSUS2020_URL : undefined);

    console.log('\n════════════════════════════════════════════════════════════════════════════');
    console.log('📊 Ingestion Summary');
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log(`   Data source:      ${result.source === 'file' ? 'Local file' : 'URL fetch'}`);
    console.log(`   Total rows:       ${rawRows.length}`);
    console.log(`   ✅ Matched:        ${matchedCount}`);
    console.log(`   ⚠️  Unmatched:     ${unmatchedCount}`);
    console.log(`   ❌ Errors:         ${errorCount}`);
    console.log(`   ⏱️  Duration:       ${duration}ms`);
    console.log(`   📝 Status:         ${status}`);
    console.log('════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal error during Census 2020 population ingestion:', error);
    
    await recordSnapshot('census-2020-population', 'failed', {
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
  ingestPopulationData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

