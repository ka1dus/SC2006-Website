/**
 * Population Data Ingestion Service
 * Fetches, parses, normalizes, and upserts population data from government sources
 */

import { Readable } from 'stream';
import { prisma } from '../../db';
import { normalizePopulationRow, NormalizedRow } from './utils/normalize';
import { SubzoneMatcher } from './utils/geo-matcher';

// Default to placeholder if env var not set
const GOV_POPULATION_DATA_URL = process.env.GOV_POPULATION_DATA_URL || '';

/**
 * Fetches population data from the government source
 * Returns null if URL is not configured or fetch fails
 */
export async function fetchPopulationSource(): Promise<string | null> {
  if (!GOV_POPULATION_DATA_URL) {
    console.warn('⚠️  GOV_POPULATION_DATA_URL not configured. Skipping fetch.');
    return null;
  }

  try {
    console.log(`📡 Fetching population data from: ${GOV_POPULATION_DATA_URL}`);
    const response = await fetch(GOV_POPULATION_DATA_URL);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('❌ Failed to fetch population data:', error);
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
  meta: any
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind,
      sourceUrl: GOV_POPULATION_DATA_URL || null,
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
  console.log('🚀 Starting population data ingestion...');

  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // Step 1: Fetch data
    const rawData = await fetchPopulationSource();
    
    if (!rawData) {
      console.warn('⚠️  No data source available. Using existing seed data only.');
      await recordSnapshot('population', 'partial', {
        error: 'POPULATION_URL_MISSING_OR_UNREACHABLE',
        message: 'Data source not configured or unreachable',
        matchedCount: 0,
        unmatchedCount: 0,
      });
      return;
    }

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
    
    await recordSnapshot('population', status, {
      totalRows: rawRows.length,
      matchedCount,
      unmatchedCount,
      errorCount,
      duration: `${duration}ms`,
      errors: errors.slice(0, 10), // Only store first 10 errors
    });

    console.log('\n📊 Ingestion Summary:');
    console.log(`   Total rows: ${rawRows.length}`);
    console.log(`   ✅ Matched: ${matchedCount}`);
    console.log(`   ⚠️  Unmatched: ${unmatchedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log('\n🎉 Population data ingestion complete!');

  } catch (error) {
    console.error('\n❌ Fatal error during ingestion:', error);
    
    await recordSnapshot('population', 'failed', {
      error: error instanceof Error ? error.message : String(error),
      matchedCount,
      unmatchedCount,
      errorCount,
    });
    
    throw error;
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

