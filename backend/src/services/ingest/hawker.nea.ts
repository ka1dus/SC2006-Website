/**
 * NEA Hawker Centres Ingestion Service
 * Loads NEA hawker centre points and assigns subzoneId via point-in-polygon
 * 
 * Strategy:
 * 1. Try loading from local file (backend/data/nea_hawker_centres.json)
 * 2. Fallback to fetching from URL (NEA_HAWKER_CENTRES_URL env var)
 * 3. If both fail, show clear error message
 * 
 * Task: DATASET-AUDIT-AND-INGEST P2
 */

import prisma from '../../db';
import { findSubzoneForPoint, createPointGeometry } from './utils/geo';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_FILE_PATH = path.join(DATA_DIR, 'nea_hawker_centres.json');
const NEA_HAWKER_CENTRES_URL = process.env.NEA_HAWKER_CENTRES_URL || '';

/**
 * Fetch NEA hawker centres data (file-first, then URL)
 */
async function fetchHawkerCentres(): Promise<{ data: any[]; source: 'file' | 'url' } | null> {
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
    
    console.log(`✅ Loaded ${records.length} hawker centres from local file`);
    return { data: records, source: 'file' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local file:`, error);
    }
  }

  console.log(`⚠️  No local hawker centres file found`);

  // Strategy 2: Try URL
  if (!NEA_HAWKER_CENTRES_URL) {
    console.warn(`⚠️  NEA_HAWKER_CENTRES_URL not configured in .env`);
    console.log(`\n💡 To fix this, either:`);
    console.log(`   1. Place file at: ${LOCAL_FILE_PATH}`);
    console.log(`   2. Or set NEA_HAWKER_CENTRES_URL in backend/.env`);
    return null;
  }

  try {
    console.log(`🌐 Fetching NEA hawker centres from URL: ${NEA_HAWKER_CENTRES_URL}`);
    const response = await fetch(NEA_HAWKER_CENTRES_URL);
    
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
    // Handle direct GeoJSON
    else if (data.type === 'FeatureCollection' && data.features) {
      records = data.features.map((f: any) => ({
        ...f.properties,
        geometry: f.geometry,
      }));
    }
    // Handle array of records
    else if (Array.isArray(data)) {
      records = data;
    }
    else {
      console.error('❌ Unexpected data format from URL');
      return null;
    }

    console.log(`✅ Fetched ${records.length} hawker centres from URL`);
    return { data: records, source: 'url' };
  } catch (error) {
    console.error('❌ Failed to fetch hawker centres from URL:', error);
    return null;
  }
}

/**
 * Normalize hawker centre record
 */
function normalizeHawkerCentre(raw: any): {
  centreId: string;
  name: string;
  operator: string | null;
  address: string | null;
  coordinates: [number, number] | null;
} | null {
  // Extract coordinates from various possible formats
  let coordinates: [number, number] | null = null;

  if (raw.geometry && raw.geometry.type === 'Point') {
    coordinates = [raw.geometry.coordinates[0], raw.geometry.coordinates[1]];
  } else if (raw.LATITUDE && raw.LONGITUDE) {
    coordinates = [parseFloat(raw.LONGITUDE), parseFloat(raw.LATITUDE)];
  } else if (raw.latitude && raw.longitude) {
    coordinates = [parseFloat(raw.longitude), parseFloat(raw.latitude)];
  } else if (raw.lat && raw.lng) {
    coordinates = [parseFloat(raw.lng), parseFloat(raw.lat)];
  }

  if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    return null;
  }

  // Extract fields
  const centreId = String(raw.CENTRE_ID || raw.centre_id || raw.id || raw.NAME || raw.name || '').trim();
  const name = String(raw.NAME || raw.name || raw.CENTRE_NAME || raw.centre_name || '').trim();
  const operator = raw.OPERATOR || raw.operator || null;
  const address = raw.ADDRESS || raw.address || raw.ADDRESSSTREETNAME || null;

  if (!centreId || !name) {
    return null;
  }

  return {
    centreId,
    name,
    operator,
    address,
    coordinates,
  };
}

/**
 * Upsert a hawker centre with point-in-polygon matching
 */
async function upsertHawkerCentre(normalized: ReturnType<typeof normalizeHawkerCentre>): Promise<void> {
  if (!normalized) return;

  // Find subzone via point-in-polygon
  const subzoneId = await findSubzoneForPoint(normalized.coordinates!);

  if (subzoneId) {
    console.log(`✅ Matched hawker centre "${normalized.name}" → ${subzoneId}`);
  } else {
    console.log(`⚠️  Hawker centre "${normalized.name}" not in any subzone`);
  }

  await prisma.hawkerCentre.upsert({
    where: { centreId: normalized.centreId },
    create: {
      centreId: normalized.centreId,
      name: normalized.name,
      operator: normalized.operator,
      address: normalized.address,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
    update: {
      name: normalized.name,
      operator: normalized.operator,
      address: normalized.address,
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
      kind: 'nea-hawker-centres',
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
export async function ingestHawkerCentres() {
  const startTime = Date.now();
  console.log('🚀 Starting NEA hawker centres ingestion...\n');

  let processedCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // Step 1: Fetch data (file-first, then URL)
    const result = await fetchHawkerCentres();
    
    if (!result) {
      console.error('\n❌ Hawker centres ingestion failed: No data source available');
      console.log('💡 Please either:');
      console.log(`   1. Place nea_hawker_centres.json in: ${DATA_DIR}`);
      console.log(`   2. Or set NEA_HAWKER_CENTRES_URL in backend/.env\n`);
      
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'No local file found and no URL configured',
      });
      return;
    }

    const { data: records, source } = result;
    console.log(`📊 Data source: ${source === 'file' ? 'Local file' : 'URL fetch'}`);
    console.log(`📊 Found ${records.length} hawker centre records\n`);

    // Step 2: Process each record
    for (const record of records) {
      try {
        const normalized = normalizeHawkerCentre(record);
        
        if (!normalized) {
          console.warn(`⚠️  Skipping invalid record:`, record);
          errorCount++;
          continue;
        }

        await upsertHawkerCentre(normalized);
        processedCount++;

        // Count matched vs unmatched
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

    // Step 3: Record snapshot
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
    }, result.source === 'url' ? NEA_HAWKER_CENTRES_URL : undefined);

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
    console.error('\n❌ Fatal error during NEA hawker centres ingestion:', error);
    
    await recordSnapshot('failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Allow running directly from command line
if (require.main === module) {
  ingestHawkerCentres()
    .then(() => {
      console.log('✅ Hawker centres ingestion completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Hawker centres ingestion failed:', error);
      process.exit(1);
    });
}

