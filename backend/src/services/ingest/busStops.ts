/**
 * LTA Bus Stops Ingestion Service
 * Loads LTA bus stop points and assigns subzoneId via point-in-polygon
 * 
 * Strategy:
 * 1. Try loading from local file (backend/data/lta_bus_stops.json)
 * 2. Fallback to fetching from URL (LTA_BUS_STOPS_URL env var with optional AccountKey)
 * 3. If both fail, show clear error message
 * 
 * Task: DATASET-AUDIT-AND-INGEST P3
 */

import prisma from '../../db';
import { findSubzoneForPoint, createPointGeometry } from './utils/geo';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_FILE_PATH = path.join(DATA_DIR, 'lta_bus_stops.json');
const LTA_BUS_STOPS_URL = process.env.LTA_BUS_STOPS_URL || '';
const LTA_ACCOUNT_KEY = process.env.LTA_ACCOUNT_KEY || '';

/**
 * Fetch LTA bus stops data (file-first, then URL)
 */
async function fetchBusStops(): Promise<{ data: any[]; source: 'file' | 'url' } | null> {
  // Strategy 1: Try local file
  try {
    console.log(`📂 Checking for local file: ${LOCAL_FILE_PATH}`);
    const fileContent = await fs.readFile(LOCAL_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    let records: any[] = [];
    
    // Handle LTA Datamall format
    if (data.value && Array.isArray(data.value)) {
      records = data.value;
    }
    // Handle data.gov.sg format
    else if (data.result && data.result.records) {
      records = data.result.records;
    }
    // Handle direct array
    else if (Array.isArray(data)) {
      records = data;
    }
    
    console.log(`✅ Loaded ${records.length} bus stops from local file`);
    return { data: records, source: 'file' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local file:`, error);
    }
  }

  console.log(`⚠️  No local bus stops file found`);

  // Strategy 2: Try URL
  if (!LTA_BUS_STOPS_URL) {
    console.warn(`⚠️  LTA_BUS_STOPS_URL not configured in .env`);
    console.log(`\n💡 To fix this, either:`);
    console.log(`   1. Place file at: ${LOCAL_FILE_PATH}`);
    console.log(`   2. Or set LTA_BUS_STOPS_URL in backend/.env`);
    if (!LTA_ACCOUNT_KEY) {
      console.log(`   3. Also set LTA_ACCOUNT_KEY if required by LTA DataMall API`);
    }
    return null;
  }

  try {
    console.log(`🌐 Fetching LTA bus stops from URL: ${LTA_BUS_STOPS_URL}`);
    
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Add LTA API key if available
    if (LTA_ACCOUNT_KEY) {
      headers['AccountKey'] = LTA_ACCOUNT_KEY;
      console.log(`🔑 Using LTA AccountKey`);
    }

    const response = await fetch(LTA_BUS_STOPS_URL, { headers });
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      if (response.status === 401 || response.status === 403) {
        console.error(`💡 Check that LTA_ACCOUNT_KEY is valid`);
      }
      return null;
    }

    const data = await response.json();
    
    let records: any[] = [];
    
    // Handle LTA Datamall format
    if (data.value && Array.isArray(data.value)) {
      records = data.value;
    }
    // Handle data.gov.sg format
    else if (data.result && data.result.records) {
      records = data.result.records;
    }
    // Handle direct array
    else if (Array.isArray(data)) {
      records = data;
    }
    else {
      console.error('❌ Unexpected data format from URL');
      return null;
    }

    console.log(`✅ Fetched ${records.length} bus stops from URL`);
    return { data: records, source: 'url' };
  } catch (error) {
    console.error('❌ Failed to fetch bus stops from URL:', error);
    return null;
  }
}

/**
 * Normalize bus stop record
 */
function normalizeBusStop(raw: any): {
  stopCode: string;
  name: string | null;
  roadName: string | null;
  coordinates: [number, number] | null;
} | null {
  // Extract coordinates
  let coordinates: [number, number] | null = null;

  // LTA Datamall format uses Latitude/Longitude fields
  if (raw.Latitude && raw.Longitude) {
    coordinates = [parseFloat(raw.Longitude), parseFloat(raw.Latitude)];
  } else if (raw.latitude && raw.longitude) {
    coordinates = [parseFloat(raw.longitude), parseFloat(raw.latitude)];
  } else if (raw.LATITUDE && raw.LONGITUDE) {
    coordinates = [parseFloat(raw.LONGITUDE), parseFloat(raw.LATITUDE)];
  } else if (raw.geometry && raw.geometry.type === 'Point') {
    coordinates = [raw.geometry.coordinates[0], raw.geometry.coordinates[1]];
  }

  if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    return null;
  }

  // Extract fields (LTA Datamall field names)
  const stopCode = String(raw.BusStopCode || raw.bus_stop_code || raw.BUSSTOP_CODE || raw.CODE || raw.code || '').trim();
  const name = raw.Description || raw.description || raw.NAME || raw.name || null;
  const roadName = raw.RoadName || raw.road_name || raw.ROAD_NAME || null;

  if (!stopCode) {
    return null;
  }

  return {
    stopCode,
    name,
    roadName,
    coordinates,
  };
}

/**
 * Upsert bus stop
 */
async function upsertBusStop(normalized: ReturnType<typeof normalizeBusStop>): Promise<void> {
  if (!normalized) return;

  const subzoneId = await findSubzoneForPoint(normalized.coordinates!);

  if (subzoneId) {
    console.log(`✅ Matched bus stop ${normalized.stopCode} (${normalized.name || 'N/A'}) → ${subzoneId}`);
  } else {
    console.log(`⚠️  Bus stop ${normalized.stopCode} not in any subzone`);
  }

  await prisma.busStop.upsert({
    where: { stopCode: normalized.stopCode },
    create: {
      stopCode: normalized.stopCode,
      name: normalized.name,
      roadName: normalized.roadName,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
    update: {
      name: normalized.name,
      roadName: normalized.roadName,
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
      kind: 'lta-bus-stops',
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
export async function ingestBusStops() {
  const startTime = Date.now();
  console.log('🚀 Starting LTA bus stops ingestion...\n');

  let processedCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    const result = await fetchBusStops();
    
    if (!result) {
      console.error('\n❌ Bus stops ingestion failed: No data source available');
      console.log('💡 Please either:');
      console.log(`   1. Place lta_bus_stops.json in: ${DATA_DIR}`);
      console.log(`   2. Or set LTA_BUS_STOPS_URL in backend/.env`);
      if (!LTA_ACCOUNT_KEY) {
        console.log(`   3. Also set LTA_ACCOUNT_KEY if required\n`);
      }
      
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'No local file found and no URL configured',
      });
      return;
    }

    const { data: records, source } = result;
    console.log(`📊 Data source: ${source === 'file' ? 'Local file' : 'URL fetch'}`);
    console.log(`📊 Found ${records.length} bus stop records\n`);

    for (const record of records) {
      try {
        const normalized = normalizeBusStop(record);
        
        if (!normalized) {
          console.warn(`⚠️  Skipping invalid record`);
          errorCount++;
          continue;
        }

        await upsertBusStop(normalized);
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
    }, result.source === 'url' ? LTA_BUS_STOPS_URL : undefined);

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
    console.error('\n❌ Fatal error during LTA bus stops ingestion:', error);
    
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
  ingestBusStops()
    .then(() => {
      console.log('✅ Bus stops ingestion completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bus stops ingestion failed:', error);
      process.exit(1);
    });
}

