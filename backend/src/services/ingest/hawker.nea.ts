/**
 * NEA Hawker Centres Ingestion Service
 * Loads NEA hawker centre points and assigns subzoneId via point-in-polygon
 * Task: DATASET-AUDIT-AND-INGEST P2
 */

import prisma from '../../db';
import { findSubzoneForPoint, createPointGeometry } from './utils/geo';

const NEA_HAWKER_CENTRES_URL = process.env.NEA_HAWKER_CENTRES_URL || '';

/**
 * Fetch NEA hawker centres data
 */
async function fetchHawkerCentres(): Promise<any[] | null> {
  if (!NEA_HAWKER_CENTRES_URL) {
    console.warn('⚠️  NEA_HAWKER_CENTRES_URL not configured');
    return null;
  }

  try {
    console.log(`📡 Fetching NEA hawker centres from: ${NEA_HAWKER_CENTRES_URL}`);
    const response = await fetch(NEA_HAWKER_CENTRES_URL);
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Handle data.gov.sg CKAN API format
    if (data.result && data.result.records) {
      return data.result.records;
    }
    
    // Handle direct GeoJSON
    if (data.type === 'FeatureCollection' && data.features) {
      return data.features.map((f: any) => ({
        ...f.properties,
        geometry: f.geometry,
      }));
    }

    // Handle array of records
    if (Array.isArray(data)) {
      return data;
    }

    console.error('❌ Unexpected data format');
    return null;
  } catch (error) {
    console.error('❌ Failed to fetch hawker centres:', error);
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
  meta: any
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'hawker',
      sourceUrl: NEA_HAWKER_CENTRES_URL || 'not_configured',
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
    // Step 1: Fetch data
    const records = await fetchHawkerCentres();
    
    if (!records) {
      console.error('❌ No hawker centre data available');
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'NEA_HAWKER_CENTRES_URL not configured or fetch failed',
      });
      return;
    }

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
    console.log(`   🎯 Matched to subzone: ${matchedCount}`);
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

