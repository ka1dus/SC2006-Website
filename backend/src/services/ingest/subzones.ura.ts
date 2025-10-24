/**
 * URA Master Plan 2019 Subzones Ingestion Service
 * Loads ALL Singapore subzones from ura_subzones_2019.geojson
 * PART A: Build DB for ALL URA Subzones
 */

import prisma from '../../db';
import { Region } from '@prisma/client';
import type { FeatureCollection, Feature, Polygon, MultiPolygon, Geometry } from 'geojson';
import * as path from 'path';
import * as fs from 'fs';

const URA_SUBZONES_FILE = path.join(process.cwd(), 'data', 'ura_subzones_2019.geojson');

/**
 * Load URA MP2019 subzones GeoJSON from local file
 */
async function loadUraSubzonesGeoJSON(): Promise<FeatureCollection | null> {
  try {
    console.log('📂 Loading URA MP2019 subzones from:', URA_SUBZONES_FILE);
    const fileContent = await fs.promises.readFile(URA_SUBZONES_FILE, 'utf-8');
    const geojson = JSON.parse(fileContent) as FeatureCollection;
    
    if (geojson.type !== 'FeatureCollection') {
      throw new Error('File is not a valid GeoJSON FeatureCollection');
    }
    
    console.log(`✅ Loaded GeoJSON with ${geojson.features.length} features`);
    return geojson;
  } catch (error: any) {
    console.error('❌ Failed to load URA subzones GeoJSON:', error);
    if (error.code === 'ENOENT') {
      console.error('');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('ERROR: File not found');
      console.error('Expected location: backend/data/ura_subzones_2019.geojson');
      console.error('');
      console.error('Please place the URA Master Plan 2019 Subzone Boundaries');
      console.error('GeoJSON file at the location above.');
      console.error('');
      console.error('See: backend/data/README.md for instructions');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('');
    }
    return null;
  }
}

/**
 * Parse HTML table from Description field to extract properties
 * Format: <table><tr><th>KEY</th><td>VALUE</td></tr>...</table>
 */
function parseDescriptionTable(description: string): Record<string, string> {
  const props: Record<string, string> = {};
  
  // Extract table rows with regex: <th>KEY</th> <td>VALUE</td>
  const rowRegex = /<th>(.*?)<\/th>\s*<td>(.*?)<\/td>/gi;
  let match;
  
  while ((match = rowRegex.exec(description)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    props[key] = value;
  }
  
  return props;
}

/**
 * Map region code/name to Prisma Region enum
 */
function mapRegionToEnum(regionCode: string | undefined, regionName: string | undefined): Region {
  if (!regionCode && !regionName) {
    return Region.UNKNOWN;
  }
  
  // Try region code first (CR, ER, NR, NER, WR)
  if (regionCode) {
    const code = regionCode.toUpperCase().trim();
    switch (code) {
      case 'CR': return Region.CENTRAL;
      case 'ER': return Region.EAST;
      case 'NR': return Region.NORTH;
      case 'NER': return Region.NORTH_EAST;
      case 'WR': return Region.WEST;
    }
  }
  
  // Fallback to region name
  if (regionName) {
    const name = regionName.toUpperCase().replace(/[\s-]/g, '_');
    if (name.includes('CENTRAL')) return Region.CENTRAL;
    if (name.includes('EAST') && !name.includes('NORTH')) return Region.EAST;
    if (name.includes('NORTH') && name.includes('EAST')) return Region.NORTH_EAST;
    if (name.includes('NORTH')) return Region.NORTH;
    if (name.includes('WEST')) return Region.WEST;
  }
  
  return Region.UNKNOWN;
}

/**
 * Normalize geometry to remove elevation (Z) coordinate if present
 * GeoJSON spec uses [lng, lat] but some exports include [lng, lat, elevation]
 */
function normalizeGeometry(geometry: Geometry): Geometry {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring =>
        ring.map(([lng, lat]) => [lng, lat]) // Drop elevation
      ),
    };
  } else if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(([lng, lat]) => [lng, lat]) // Drop elevation
        )
      ),
    };
  }
  return geometry;
}

/**
 * Validate coordinate order (should be WGS84: [lng, lat])
 * Singapore bounds: lng 103.6-104.0, lat 1.1-1.5
 */
function validateCoordinates(geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') {
    const firstCoord = geometry.coordinates[0][0];
    const lng = firstCoord[0];
    const lat = firstCoord[1];
    
    // Check if coordinates are in valid Singapore range
    if (lng >= 103.6 && lng <= 104.0 && lat >= 1.1 && lat <= 1.5) {
      return true;
    }
    
    console.warn(`⚠️  Coordinates may be swapped or out of range: [${lng}, ${lat}]`);
    return false;
  }
  return true;
}

/**
 * Upsert a single subzone from parsed feature
 */
async function upsertSubzone(
  subzoneCode: string,
  subzoneName: string,
  region: Region,
  geometry: Geometry
): Promise<void> {
  await prisma.subzone.upsert({
    where: { id: subzoneCode },
    create: {
      id: subzoneCode,
      name: subzoneName,
      region,
      geomGeoJSON: geometry as any,
    },
    update: {
      name: subzoneName,
      region,
      geomGeoJSON: geometry as any,
      updatedAt: new Date(),
    },
  });
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
      kind: 'ura-subzones',
      sourceUrl: URA_SUBZONES_FILE,
      finishedAt: new Date(),
      status,
      meta,
    },
  });
}

/**
 * Main ingestion function
 */
export async function ingestUraSubzones() {
  const startTime = Date.now();
  console.log('🚀 Starting URA MP2019 subzones ingestion...\n');

  let inserted = 0;
  let updated = 0;
  let invalid = 0;
  const errors: string[] = [];
  const unknownRegions = new Set<string>();

  try {
    // Step 1: Load GeoJSON
    const geojson = await loadUraSubzonesGeoJSON();
    
    if (!geojson) {
      await recordSnapshot('failed', {
        error: 'FILE_NOT_FOUND',
        message: 'Could not load ura_subzones_2019.geojson',
      });
      process.exit(1);
    }

    console.log(`📊 Processing ${geojson.features.length} subzones...\n`);

    // Step 2: Get existing subzone IDs for tracking updates vs inserts
    const existingSubzones = await prisma.subzone.findMany({
      select: { id: true },
    });
    const existingIds = new Set(existingSubzones.map(s => s.id));

    // Step 3: Process each feature
    for (const feature of geojson.features) {
      try {
        // Validate geometry type
        if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
          console.warn(`⚠️  Skipping non-polygon feature: ${JSON.stringify(feature.properties).substring(0, 100)}`);
          invalid++;
          continue;
        }

        // Parse properties from HTML table in Description field
        const description = feature.properties?.Description || '';
        const props = parseDescriptionTable(description);

        // Extract required fields
        const subzoneCode = props.SUBZONE_C;
        const subzoneName = props.SUBZONE_N;
        const regionCode = props.REGION_C;
        const regionName = props.REGION_N;

        if (!subzoneCode || !subzoneName) {
          console.warn(`⚠️  Skipping feature with missing code/name:`, props);
          invalid++;
          continue;
        }

        // Map region
        const region = mapRegionToEnum(regionCode, regionName);
        if (region === Region.UNKNOWN && (regionCode || regionName)) {
          unknownRegions.add(`${regionCode || '?'} (${regionName || '?'})`);
        }

        // Normalize geometry (remove elevation)
        const normalizedGeometry = normalizeGeometry(feature.geometry);

        // Validate coordinates
        if (!validateCoordinates(normalizedGeometry)) {
          console.warn(`⚠️  Invalid coordinates for subzone: ${subzoneCode} (${subzoneName})`);
        }

        // Track if this is an insert or update
        const isUpdate = existingIds.has(subzoneCode);

        // Upsert subzone
        await upsertSubzone(subzoneCode, subzoneName, region, normalizedGeometry);

        if (isUpdate) {
          updated++;
          console.log(`🔄 Updated: ${subzoneCode} (${subzoneName}) - ${region}`);
        } else {
          inserted++;
          console.log(`✅ Inserted: ${subzoneCode} (${subzoneName}) - ${region}`);
        }

      } catch (error) {
        invalid++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${feature.properties?.Name || 'unknown'}: ${errorMsg}`);
        console.error(`❌ Error processing feature:`, error);
      }
    }

    // Step 4: Record snapshot
    const duration = Date.now() - startTime;
    const status = invalid > 0 ? 'partial' : 'success';
    
    await recordSnapshot(status, {
      features: geojson.features.length,
      inserted,
      updated,
      invalid,
      duration: `${duration}ms`,
      unknownRegions: Array.from(unknownRegions),
      errors: errors.slice(0, 10),
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Ingestion Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total features:   ${geojson.features.length}`);
    console.log(`   ✅ Inserted:       ${inserted}`);
    console.log(`   🔄 Updated:        ${updated}`);
    console.log(`   ❌ Invalid:        ${invalid}`);
    console.log(`   ⏱️  Duration:       ${duration}ms`);
    console.log(`   📝 Status:         ${status}`);
    
    if (unknownRegions.size > 0) {
      console.log(`   ⚠️  Unknown regions: ${Array.from(unknownRegions).join(', ')}`);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');

    if (inserted + updated < 300) {
      console.warn('⚠️  WARNING: Expected 300+ subzones, but only got', inserted + updated);
      console.warn('   Check if the GeoJSON file contains all Singapore subzones.');
    }

  } catch (error) {
    console.error('❌ Fatal error during ingestion:', error);
    
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
  ingestUraSubzones()
    .then(() => {
      console.log('✅ URA subzones ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ URA subzones ingestion failed:', error);
      process.exit(1);
    });
}
