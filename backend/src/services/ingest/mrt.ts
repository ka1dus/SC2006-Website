/**
 * MRT Station Exits Ingestion Service
 * Loads MRT station exit points and assigns subzoneId via point-in-polygon
 * Task: DATASET-AUDIT-AND-INGEST P3
 */

import prisma from '../../db';
import { findSubzoneForPoint, createPointGeometry } from './utils/geo';

const MRT_EXITS_URL = process.env.MRT_EXITS_URL || '';

/**
 * Fetch MRT exits data
 */
async function fetchMRTExits(): Promise<any[] | null> {
  if (!MRT_EXITS_URL) {
    console.warn('⚠️  MRT_EXITS_URL not configured');
    return null;
  }

  try {
    console.log(`📡 Fetching MRT exits from: ${MRT_EXITS_URL}`);
    const response = await fetch(MRT_EXITS_URL);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Handle data.gov.sg CKAN API format
    if (data.result && data.result.records) {
      return data.result.records;
    }
    
    // Handle GeoJSON
    if (data.type === 'FeatureCollection' && data.features) {
      return data.features.map((f: any) => ({
        ...f.properties,
        geometry: f.geometry,
      }));
    }

    // Handle array
    if (Array.isArray(data)) {
      return data;
    }

    console.error('❌ Unexpected data format');
    return null;
  } catch (error) {
    console.error('❌ Failed to fetch MRT exits:', error);
    return null;
  }
}

/**
 * Normalize MRT exit record
 */
function normalizeMRTExit(raw: any): {
  stationId: string;
  name: string;
  code: string | null;
  exitCode: string | null;
  coordinates: [number, number] | null;
} | null {
  // Extract coordinates
  let coordinates: [number, number] | null = null;

  if (raw.geometry && raw.geometry.type === 'Point') {
    coordinates = [raw.geometry.coordinates[0], raw.geometry.coordinates[1]];
  } else if (raw.LATITUDE && raw.LONGITUDE) {
    coordinates = [parseFloat(raw.LONGITUDE), parseFloat(raw.LATITUDE)];
  } else if (raw.latitude && raw.longitude) {
    coordinates = [parseFloat(raw.longitude), parseFloat(raw.latitude)];
  }

  if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    return null;
  }

  // Extract fields
  const name = String(raw.STN_NAME || raw.stn_name || raw.STATION_NAME || raw.station_name || raw.NAME || raw.name || '').trim();
  const code = raw.STN_NO || raw.stn_no || raw.STATION_CODE || raw.station_code || raw.CODE || raw.code || null;
  const exitCode = raw.EXIT_CODE || raw.exit_code || raw.EXIT || raw.exit || null;
  
  // Generate unique station ID
  const stationId = exitCode 
    ? `${code || name}_EXIT_${exitCode}`.replace(/\s+/g, '_')
    : `${code || name}_${coordinates[0]}_${coordinates[1]}`.replace(/\s+/g, '_');

  if (!name) {
    return null;
  }

  return {
    stationId,
    name,
    code: code ? String(code) : null,
    exitCode: exitCode ? String(exitCode) : null,
    coordinates,
  };
}

/**
 * Upsert MRT exit
 */
async function upsertMRTExit(normalized: ReturnType<typeof normalizeMRTExit>): Promise<void> {
  if (!normalized) return;

  const subzoneId = await findSubzoneForPoint(normalized.coordinates!);

  if (subzoneId) {
    console.log(`✅ Matched MRT "${normalized.name}" (${normalized.code || 'N/A'}) → ${subzoneId}`);
  } else {
    console.log(`⚠️  MRT "${normalized.name}" not in any subzone`);
  }

  await prisma.mRTStation.upsert({
    where: { stationId: normalized.stationId },
    create: {
      stationId: normalized.stationId,
      name: normalized.name,
      code: normalized.code,
      exitCode: normalized.exitCode,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
    update: {
      name: normalized.name,
      code: normalized.code,
      exitCode: normalized.exitCode,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
  });
}

/**
 * Record snapshot
 */
async function recordSnapshot(
  status: 'success' | 'partial' | 'failed',
  meta: any
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'mrt',
      sourceUrl: MRT_EXITS_URL || 'not_configured',
      finishedAt: new Date(),
      status,
      meta,
    },
  });
}

/**
 * Main ingestion function
 */
export async function ingestMRTExits() {
  const startTime = Date.now();
  console.log('🚀 Starting MRT exits ingestion...\n');

  let processedCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    const records = await fetchMRTExits();
    
    if (!records) {
      console.error('❌ No MRT exit data available');
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'MRT_EXITS_URL not configured or fetch failed',
      });
      return;
    }

    console.log(`📊 Found ${records.length} MRT exit records\n`);

    for (const record of records) {
      try {
        const normalized = normalizeMRTExit(record);
        
        if (!normalized) {
          console.warn(`⚠️  Skipping invalid record`);
          errorCount++;
          continue;
        }

        await upsertMRTExit(normalized);
        processedCount++;

        const subzoneId = await findSubzoneForPoint(normalized.coordinates!);
        if (subzoneId) {
          matchedCount++;
        } else {
          unmatchedCount++;
        }

      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.error(`❌ Error processing record:`, error);
      }
    }

    const duration = Date.now() - startTime;
    const status = errorCount > 0 ? 'partial' : 'success';
    
    await recordSnapshot(status, {
      totalRecords: records.length,
      processedCount,
      matchedCount,
      unmatchedCount,
      errorCount,
      duration: `${duration}ms`,
      errors: errors.slice(0, 10),
    });

    console.log('\n📊 Ingestion Summary:');
    console.log(`   Total records: ${records.length}`);
    console.log(`   ✅ Processed: ${processedCount}`);
    console.log(`   🎯 Matched: ${matchedCount}`);
    console.log(`   ⚠️  Unmatched: ${unmatchedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📝 Status: ${status}\n`);

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    
    await recordSnapshot('failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
  }
}

// Allow running directly
if (require.main === module) {
  ingestMRTExits()
    .then(() => {
      console.log('✅ MRT exits ingestion completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ MRT exits ingestion failed:', error);
      process.exit(1);
    });
}

