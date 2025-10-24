/**
 * MRT Station Exits Ingestion Service
 * Loads MRT station exit points and assigns subzoneId via point-in-polygon
 * 
 * Strategy:
 * 1. Try loading from local file (backend/data/mrt_station_exits.json)
 * 2. Fallback to fetching from URL (MRT_EXITS_URL env var)
 * 3. If both fail, show clear error message
 * 
 * Task: DATASET-AUDIT-AND-INGEST P3
 */

import prisma from '../../db';
import { findSubzoneForPoint, createPointGeometry } from './utils/geo';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_FILE_PATH = path.join(DATA_DIR, 'mrt_station_exits.json');
const MRT_EXITS_URL = process.env.MRT_EXITS_URL || '';

/**
 * Fetch MRT exits data (file-first, then URL)
 */
async function fetchMRTExits(): Promise<{ data: any[]; source: 'file' | 'url' } | null> {
  // Strategy 1: Try local file
  try {
    console.log(`📂 Checking for local file: ${LOCAL_FILE_PATH}`);
    const fileContent = await fs.readFile(LOCAL_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    let records: any[] = [];
    
    // Handle GeoJSON FeatureCollection
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      records = data.features.map((f: any) => ({
        ...f.properties,
        geometry: f.geometry,
      }));
    }
    // Handle direct array
    else if (Array.isArray(data)) {
      records = data;
    }
    // Handle data.gov.sg CKAN format
    else if (data.result && data.result.records) {
      records = data.result.records;
    }
    
    console.log(`✅ Loaded ${records.length} MRT exits from local file`);
    return { data: records, source: 'file' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local file:`, error);
    }
  }

  console.log(`⚠️  No local MRT exits file found`);

  // Strategy 2: Try URL
  if (!MRT_EXITS_URL) {
    console.warn(`⚠️  MRT_EXITS_URL not configured in .env`);
    console.log(`\n💡 To fix this, either:`);
    console.log(`   1. Place file at: ${LOCAL_FILE_PATH}`);
    console.log(`   2. Or set MRT_EXITS_URL in backend/.env`);
    return null;
  }

  try {
    console.log(`🌐 Fetching MRT exits from URL: ${MRT_EXITS_URL}`);
    const response = await fetch(MRT_EXITS_URL);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    let records: any[] = [];
    
    // Handle data.gov.sg CKAN API format
    if (data.result && data.result.records) {
      records = data.result.records;
    }
    // Handle GeoJSON
    else if (data.type === 'FeatureCollection' && data.features) {
      records = data.features.map((f: any) => ({
        ...f.properties,
        geometry: f.geometry,
      }));
    }
    // Handle array
    else if (Array.isArray(data)) {
      records = data;
    }
    else {
      console.error('❌ Unexpected data format from URL');
      return null;
    }

    console.log(`✅ Fetched ${records.length} MRT exits from URL`);
    return { data: records, source: 'url' };
  } catch (error) {
    console.error('❌ Failed to fetch MRT exits from URL:', error);
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
  meta: any,
  sourceUrl?: string
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'mrt-exits',
      sourceUrl: sourceUrl || null,
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
  console.log('🚀 Starting MRT station exits ingestion...\n');

  let processedCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    const result = await fetchMRTExits();
    
    if (!result) {
      console.error('\n❌ MRT exits ingestion failed: No data source available');
      console.log('💡 Please either:');
      console.log(`   1. Place mrt_station_exits.json in: ${DATA_DIR}`);
      console.log(`   2. Or set MRT_EXITS_URL in backend/.env\n`);
      
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'No local file found and no URL configured',
      });
      return;
    }

    const { data: records, source } = result;
    console.log(`📊 Data source: ${source === 'file' ? 'Local file' : 'URL fetch'}`);
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
      source: result.source,
      totalRecords: records.length,
      processedCount,
      matchedCount,
      unmatchedCount,
      errorCount,
      duration: `${duration}ms`,
      errors: errors.slice(0, 10),
    }, result.source === 'url' ? MRT_EXITS_URL : undefined);

    console.log('\n════════════════════════════════════════════════════════════════════════════');
    console.log('📊 Ingestion Summary');
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log(`   Data source:          ${result.source === 'file' ? 'Local file' : 'URL fetch'}`);
    console.log(`   Total records:        ${records.length}`);
    console.log(`   ✅ Processed:          ${processedCount}`);
    console.log(`   🎯 Matched to subzone: ${matchedCount}`);
    console.log(`   ⚠️  Unmatched:         ${unmatchedCount}`);
    console.log(`   ❌ Errors:             ${errorCount}`);
    console.log(`   ⏱️  Duration:           ${duration}ms`);
    console.log(`   📝 Status:             ${status}`);
    console.log('════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fatal error during MRT exits ingestion:', error);
    
    await recordSnapshot('failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
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

