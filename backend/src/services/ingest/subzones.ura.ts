/**
 * URA Subzones Ingestion Service
 * Loads URA 2019 subzone GeoJSON and populates Subzone table
 * Task: DATASET-AUDIT-AND-INGEST P1
 */

import prisma from '../../db';
import * as fs from 'fs';
import * as path from 'path';

// Environment variable for URA subzone data
const URA_SUBZONES_URL = process.env.URA_SUBZONES_URL || '';

/**
 * Fetch URA subzones GeoJSON from URL or local fallback
 */
async function fetchSubzonesGeoJSON(): Promise<any | null> {
  // Try URL first
  if (URA_SUBZONES_URL) {
    try {
      console.log(`📡 Fetching URA subzones from: ${URA_SUBZONES_URL}`);
      const response = await fetch(URA_SUBZONES_URL);
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      } else {
        const data = await response.json();
        console.log('✅ Fetched URA subzones from URL');
        return data;
      }
    } catch (error) {
      console.error('❌ Failed to fetch from URL:', error);
    }
  }

  // Fallback to local file
  const fallbackPath = path.join(process.cwd(), 'public', 'data', 'subzones.geojson');
  
  try {
    console.log(`📂 Loading fallback GeoJSON from: ${fallbackPath}`);
    const fileContent = await fs.promises.readFile(fallbackPath, 'utf-8');
    const data = JSON.parse(fileContent);
    console.log('✅ Loaded fallback GeoJSON');
    return data;
  } catch (error) {
    console.error('❌ Failed to load fallback file:', error);
    return null;
  }
}

/**
 * Map region string to Region enum
 */
function mapRegion(regionStr: string | undefined): 'CENTRAL' | 'EAST' | 'NORTH' | 'NORTH_EAST' | 'WEST' | 'UNKNOWN' {
  if (!regionStr) return 'UNKNOWN';
  
  const normalized = regionStr.toUpperCase().replace(/[\s-]/g, '_');
  
  switch (normalized) {
    case 'CENTRAL':
    case 'CENTRAL_REGION':
      return 'CENTRAL';
    case 'EAST':
    case 'EAST_REGION':
      return 'EAST';
    case 'NORTH':
    case 'NORTH_REGION':
      return 'NORTH';
    case 'NORTH_EAST':
    case 'NORTHEAST':
    case 'NORTH_EAST_REGION':
      return 'NORTH_EAST';
    case 'WEST':
    case 'WEST_REGION':
      return 'WEST';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Upsert a subzone from GeoJSON feature
 */
async function upsertSubzone(feature: any): Promise<void> {
  const props = feature.properties || {};
  const id = props.id || props.SUBZONE_C || props.subzone_code;
  const name = props.name || props.SUBZONE_N || props.subzone_name;
  const region = mapRegion(props.region || props.REGION_C || props.region_code);

  if (!id || !name) {
    console.warn(`⚠️  Skipping feature with missing id/name:`, props);
    return;
  }

  await prisma.subzone.upsert({
    where: { id },
    create: {
      id,
      name,
      region,
      geomGeoJSON: feature.geometry,
    },
    update: {
      name,
      region,
      geomGeoJSON: feature.geometry,
    },
  });

  console.log(`✅ Upserted subzone: ${id} (${name}) - ${region}`);
}

/**
 * Record a dataset snapshot
 */
async function recordSnapshot(
  status: 'success' | 'partial' | 'failed',
  meta: any
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'subzones',
      sourceUrl: URA_SUBZONES_URL || 'fallback_file',
      finishedAt: new Date(),
      status,
      meta,
    },
  });
}

/**
 * Main ingestion function
 */
export async function ingestSubzones() {
  const startTime = Date.now();
  console.log('🚀 Starting URA subzones ingestion...\n');

  let processedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    // Step 1: Fetch GeoJSON
    const geojson = await fetchSubzonesGeoJSON();
    
    if (!geojson) {
      console.error('❌ No GeoJSON data available');
      await recordSnapshot('failed', {
        error: 'NO_DATA_SOURCE',
        message: 'Neither URL nor fallback file available',
      });
      return;
    }

    // Validate structure
    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      console.error('❌ Invalid GeoJSON structure');
      await recordSnapshot('failed', {
        error: 'INVALID_GEOJSON',
        message: 'Expected FeatureCollection with features array',
      });
      return;
    }

    console.log(`📊 Found ${geojson.features.length} subzones in GeoJSON\n`);

    // Step 2: Upsert each subzone
    for (const feature of geojson.features) {
      try {
        await upsertSubzone(feature);
        processedCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.error(`❌ Error processing feature:`, error);
      }
    }

    // Step 3: Record snapshot
    const duration = Date.now() - startTime;
    const status = errorCount > 0 ? 'partial' : 'success';
    
    await recordSnapshot(status, {
      totalFeatures: geojson.features.length,
      processedCount,
      errorCount,
      duration: `${duration}ms`,
      errors: errors.slice(0, 10),
    });

    console.log('\n📊 Ingestion Summary:');
    console.log(`   Total features: ${geojson.features.length}`);
    console.log(`   ✅ Processed: ${processedCount}`);
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
  ingestSubzones()
    .then(() => {
      console.log('✅ Subzones ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Subzones ingestion failed:', error);
      process.exit(1);
    });
}

