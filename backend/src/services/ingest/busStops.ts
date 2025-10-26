/**
 * Bus Stops Ingestion Service (Part D)
 * Loads bus stop points with proper CRS handling and subzone assignment
 * 
 * Strategy:
 * 1. Try LTA_BUS_STOPS_URL (LTA Datamall API or export)
 * 2. Fallback to local file (backend/data/bus_stops.csv or .geojson)
 * 3. Handle both CSV and GeoJSON formats
 * 4. Detect and convert SVY21 → WGS84 coordinates
 * 5. Point-in-polygon assignment to subzones with buffer support
 * 
 * Part D: Full dataset ingestion with stage-by-stage diagnostics
 */

import prisma from '../../db';
import { assignSubzoneWithBuffer, createPointGeometry } from './utils/geo';
import { detectCRS, ensureWGS84, CRS } from './utils/crs';
import { stableBusStopId } from './utils/id';
import { parse } from "csv-parse/sync";
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_GEOJSON_PATH = path.join(DATA_DIR, 'bus_stops.geojson');
const LOCAL_CSV_PATH = path.join(DATA_DIR, 'bus_stops.csv');
const LTA_BUS_STOPS_URL = process.env.LTA_BUS_STOPS_URL || '';

/**
 * Fetch bus stops data (URL-first, then local files)
 */
async function fetchBusStops(): Promise<{ data: any[]; source: string } | null> {
  // Strategy 1: Try URL
  if (LTA_BUS_STOPS_URL) {
    try {
      console.log(`🌐 Fetching bus stops from URL: ${LTA_BUS_STOPS_URL}`);
      const response = await fetch(LTA_BUS_STOPS_URL);
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      // Determine if CSV or JSON
      const contentType = response.headers.get('content-type') || '';
      const data = await response.text();

      if (contentType.includes('json') || data.trim().startsWith('{')) {
        // GeoJSON or JSON
        const jsonData = JSON.parse(data);
        let records: any[] = [];
        
        if (jsonData.type === 'FeatureCollection' && jsonData.features) {
          records = jsonData.features.map((f: any) => ({
            ...f.properties,
            geometry: f.geometry,
          }));
        } else if (Array.isArray(jsonData)) {
          records = jsonData;
        }
        
        console.log(`✅ Fetched ${records.length} bus stops from GeoJSON URL`);
        return { data: records, source: 'LTA GeoJSON URL' };
      } else {
        // CSV
        const records = parse(data, {
          columns: true,
          skip_empty_lines: true,
          bom: true,
          trim: true,
        });
        
        console.log(`✅ Fetched ${records.length} bus stops from CSV URL`);
        return { data: records, source: 'LTA CSV URL' };
      }
    } catch (error) {
      console.error('❌ Failed to fetch bus stops from URL:', error);
    }
  }

  // Strategy 2: Try local GeoJSON file
  try {
    console.log(`📂 Checking for local GeoJSON: ${LOCAL_GEOJSON_PATH}`);
    const fileContent = await fs.readFile(LOCAL_GEOJSON_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    let records: any[] = [];
    
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      records = data.features.map((f: any) => ({
        ...f.properties,
        geometry: f.geometry,
      }));
    } else if (Array.isArray(data)) {
      records = data;
    }
    
    console.log(`✅ Loaded ${records.length} bus stops from local GeoJSON`);
    return { data: records, source: 'Local GeoJSON' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local GeoJSON:`, error);
    }
  }

  // Strategy 3: Try local CSV file
  try {
    console.log(`📂 Checking for local CSV: ${LOCAL_CSV_PATH}`);
    const fileContent = await fs.readFile(LOCAL_CSV_PATH, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });
    
    console.log(`✅ Loaded ${records.length} bus stops from local CSV`);
    return { data: records, source: 'Local CSV' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local CSV:`, error);
    }
  }

  console.error(`❌ No bus stops data source available`);
  console.log(`\n💡 To fix this, either:`);
  console.log(`   1. Set LTA_BUS_STOPS_URL in backend/.env`);
  console.log(`   2. Place file at: ${LOCAL_GEOJSON_PATH}`);
  console.log(`   3. Place file at: ${LOCAL_CSV_PATH}`);
  return null;
}

/**
 * Normalize bus stop record with CRS detection and conversion
 */
function normalizeBusStop(raw: any, rowIndex: number): {
  id: string;
  name: string | null;
  road: string | null;
  coordinates: [number, number] | null;
  originalCRS: CRS;
  converted: boolean;
} | null {
  // Extract coordinates from various formats
  let coordinates: [number, number] | null = null;
  let originalCRS: CRS = "UNKNOWN";
  let converted = false;

  // Handle GeoJSON geometry
  if (raw.geometry && raw.geometry.type === 'Point') {
    coordinates = [raw.geometry.coordinates[0], raw.geometry.coordinates[1]];
  }
  // Handle CSV columns: Longitude/Latitude or X/Y
  else if (raw.Longitude && raw.Latitude) {
    coordinates = [parseFloat(raw.Longitude), parseFloat(raw.Latitude)];
  } else if (raw.LONGITUDE && raw.LATITUDE) {
    coordinates = [parseFloat(raw.LONGITUDE), parseFloat(raw.LATITUDE)];
  } else if (raw.lng && raw.lat) {
    coordinates = [parseFloat(raw.lng), parseFloat(raw.lat)];
  } else if (raw.X && raw.Y) {
    coordinates = [parseFloat(raw.X), parseFloat(raw.Y)];
  }

  if (!coordinates || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    return null;
  }

  // Detect and convert CRS
  originalCRS = detectCRS(coordinates[0], coordinates[1]);
  if (originalCRS === "SVY21") {
    coordinates = ensureWGS84(coordinates[0], coordinates[1]);
    converted = true;
  }

  // Extract name/description and road
  const name = raw.Description || raw.description || raw.Description || raw.name || raw.NAME || null;
  const road = raw.RoadName || raw.roadName || raw.Road_Name || raw.ROAD_NAME || raw.road || raw.ROAD || null;

  // If no name or road, can't generate stable ID
  if (!name && !road) {
    return null;
  }

  // Prefer BusStopCode if available, else generate stable ID
  let id = raw.BusStopCode || raw.busStopCode || raw.BUS_STOP_CODE || raw.Code || raw.code;
  
  if (!id) {
    id = stableBusStopId(name, road, coordinates[0], coordinates[1]);
  }

  return {
    id,
    name: name || null,
    road: road || null,
    coordinates,
    originalCRS,
    converted,
  };
}

/**
 * Upsert bus stop with point-in-polygon matching
 */
async function upsertBusStop(normalized: ReturnType<typeof normalizeBusStop>): Promise<void> {
  if (!normalized) return;

  // Find subzone via point-in-polygon with buffer support
  const subzoneId = await assignSubzoneWithBuffer(normalized.coordinates![0], normalized.coordinates![1]);

  await prisma.busStop.upsert({
    where: { id: normalized.id },
    create: {
      id: normalized.id,
      name: normalized.name,
      road: normalized.road,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
    update: {
      name: normalized.name,
      road: normalized.road,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
  });
}

/**
 * Record snapshot with comprehensive metadata
 */
async function recordSnapshot(
  status: 'success' | 'partial' | 'failed',
  meta: any,
  sourceUrl?: string
) {
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'bus-stops',
      sourceUrl: sourceUrl || null,
      finishedAt: new Date(),
      status,
      meta,
    },
  });
}

/**
 * Main ingestion function with stage-by-stage diagnostics
 */
export async function ingestBusStops() {
  const startTime = Date.now();
  console.log('🚀 Starting bus stops ingestion (Part D)...\n');

  // Stage counters
  let totalRead = 0;
  let invalidGeom = 0;
  let convertedCRS = 0;
  let dedupDropped = 0;
  let upserted = 0;
  let assigned = 0;
  let unassigned = 0;
  let errors: string[] = [];
  let crsStats: Record<string, number> = {};

  try {
    const result = await fetchBusStops();
    if (!result) {
      throw new Error('No data source available');
    }

    const { data: rawData, source } = result;
    totalRead = rawData.length;

    console.log(`📊 Data source: ${source}`);
    console.log(`📊 Found ${totalRead} raw records\n`);

    // Stage 1: Normalize and detect CRS
    console.log('🔄 Stage 1: Normalizing records and detecting CRS...');
    const normalizedStops: Array<ReturnType<typeof normalizeBusStop>> = [];
    const idMap = new Map<string, number>(); // Track duplicates

    for (const [rowIndex, rawRow] of rawData.entries()) {
      const normalized = normalizeBusStop(rawRow, rowIndex);
      
      if (!normalized) {
        invalidGeom++;
        errors.push(`Row ${rowIndex + 1}: Invalid geometry or missing name/road`);
        continue;
      }

      // Track duplicates
      if (idMap.has(normalized.id)) {
        dedupDropped++;
        continue;
      }
      idMap.set(normalized.id, rowIndex);

      // Track CRS statistics
      crsStats[normalized.originalCRS] = (crsStats[normalized.originalCRS] || 0) + 1;
      if (normalized.converted) {
        convertedCRS++;
      }

      normalizedStops.push(normalized);
    }

    console.log(`✅ Normalized: ${normalizedStops.length} records`);
    console.log(`❌ Invalid geometry: ${invalidGeom} records`);
    console.log(`🔄 CRS converted: ${convertedCRS} records`);
    console.log(`📊 CRS breakdown:`, crsStats);
    console.log(`🔀 Deduplication: ${dedupDropped} duplicates dropped`);

    // Stage 2: Point-in-polygon assignment and upsert
    console.log('\n🔄 Stage 2: Point-in-polygon assignment and database upsert...');
    
    for (const normalized of normalizedStops) {
      try {
        await upsertBusStop(normalized);
        upserted++;

        if (normalized.coordinates) {
          const subzoneId = await assignSubzoneWithBuffer(normalized.coordinates[0], normalized.coordinates[1]);
          if (subzoneId) {
            assigned++;
          } else {
            unassigned++;
          }
        }
      } catch (error) {
        errors.push(`Upsert error for ${normalized.id}: ${error}`);
      }
    }

    // Calculate final status
    const assignmentRate = assigned / Math.max(assigned + unassigned, 1);
    const status = upserted > 0 && assignmentRate >= 0.5 ? "success" : "partial";

    // Record snapshot
    const meta = {
      source,
      totalRead,
      invalidGeom,
      convertedCRS,
      dedupDropped,
      upserted,
      assigned,
      unassigned,
      assignmentRate: Math.round(assignmentRate * 100),
      crsStats,
      errors: errors.slice(0, 10),
      errorCount: errors.length,
    };

    await recordSnapshot(status, meta, LTA_BUS_STOPS_URL);

    const duration = Date.now() - startTime;

    // Print comprehensive summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Bus Stops Ingestion Summary (Part D)');
    console.log('='.repeat(80));
    console.log(`   Data source:          ${source}`);
    console.log(`   Total raw records:    ${totalRead}`);
    console.log(`   ✅ Normalized:         ${normalizedStops.length}`);
    console.log(`   ❌ Invalid geometry:  ${invalidGeom}`);
    console.log(`   🔄 CRS converted:     ${convertedCRS}`);
    console.log(`   📊 CRS breakdown:     ${JSON.stringify(crsStats)}`);
    console.log(`   🔀 Deduplication:     ${dedupDropped} duplicates dropped`);
    console.log(`   💾 Upserted:          ${upserted}`);
    console.log(`   🎯 Assigned to subzone: ${assigned}`);
    console.log(`   ⚠️  Unassigned:        ${unassigned}`);
    console.log(`   📈 Assignment rate:    ${Math.round(assignmentRate * 100)}%`);
    console.log(`   ❌ Errors:             ${errors.length}`);
    console.log(`   ⏱️  Duration:           ${duration}ms`);
    console.log(`   📝 Status:             ${status}`);
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ First 5 errors:');
      errors.slice(0, 5).forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    console.log('\n✅ Bus stops ingestion completed');

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    
    await recordSnapshot('failed', {
      error: String(error),
      totalRead,
      invalidGeom,
      convertedCRS,
      dedupDropped,
      upserted,
      assigned,
      unassigned,
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  ingestBusStops().catch(console.error);
}