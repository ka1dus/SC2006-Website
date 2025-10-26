/**
 * MRT Exits Ingestion Service (Part D)
 * Loads MRT exit points with proper CRS handling and subzone assignment
 * 
 * Strategy:
 * 1. Try MRT_EXITS_URL (data.gov.sg API)
 * 2. Fallback to local file (backend/data/mrt_exits.geojson or .csv)
 * 3. Handle both GeoJSON and CSV formats
 * 4. Detect and convert SVY21 → WGS84 coordinates
 * 5. Point-in-polygon assignment to subzones with buffer support
 * 
 * Part D: Full dataset ingestion with stage-by-stage diagnostics
 */

import prisma from '../../db';
import { assignSubzoneWithBuffer, createPointGeometry } from './utils/geo';
import { detectCRS, ensureWGS84, CRS } from './utils/crs';
import { stableMRTExitId } from './utils/id';
import { parse } from "csv-parse/sync";
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_GEOJSON_PATH = path.join(DATA_DIR, 'mrt_exits.geojson');
const LOCAL_CSV_PATH = path.join(DATA_DIR, 'mrt_exits.csv');
const MRT_EXITS_URL = process.env.MRT_EXITS_URL || '';

/**
 * Parse HTML table in Description field to extract STATION_NA and EXIT_CODE
 */
function parseStationInfo(description: string): { station?: string; code?: string } {
  if (!description) return {};

  const stationMatch = /STATION_NA.*?<td>(.*?)<\/td>/i.exec(description);
  const exitMatch = /EXIT_CODE.*?<td>(.*?)<\/td>/i.exec(description);
  
  const station = stationMatch ? stationMatch[1].trim() : undefined;
  const code = exitMatch ? exitMatch[1].trim() : undefined;

  return { station, code };
}

/**
 * Fetch MRT exits data (URL-first, then local files)
 */
async function fetchMRTExits(): Promise<{ data: any[]; source: string } | null> {
  // Strategy 1: Try URL
  if (MRT_EXITS_URL) {
    try {
      console.log(`🌐 Fetching MRT exits from URL: ${MRT_EXITS_URL}`);
      const response = await fetch(MRT_EXITS_URL);
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let records: any[] = [];
      
      // Handle data.gov.sg CKAN API format
      if (data.result && data.result.records) {
        records = data.result.records;
        console.log(`✅ Fetched ${records.length} MRT exits from data.gov.sg API`);
        return { data: records, source: 'data.gov.sg API' };
      }
      // Handle direct GeoJSON
      else if (data.type === 'FeatureCollection' && data.features) {
        records = data.features.map((f: any) => ({
          ...f.properties,
          geometry: f.geometry,
        }));
        console.log(`✅ Fetched ${records.length} MRT exits from GeoJSON URL`);
        return { data: records, source: 'GeoJSON URL' };
      }
    } catch (error) {
      console.error('❌ Failed to fetch MRT exits from URL:', error);
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
    
    console.log(`✅ Loaded ${records.length} MRT exits from local GeoJSON`);
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
    
    console.log(`✅ Loaded ${records.length} MRT exits from local CSV`);
    return { data: records, source: 'Local CSV' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local CSV:`, error);
    }
  }

  console.error(`❌ No MRT exits data source available`);
  console.log(`\n💡 To fix this, either:`);
  console.log(`   1. Set MRT_EXITS_URL in backend/.env`);
  console.log(`   2. Place file at: ${LOCAL_GEOJSON_PATH}`);
  console.log(`   3. Place file at: ${LOCAL_CSV_PATH}`);
  return null;
}

/**
 * Normalize MRT exit record with CRS detection and conversion
 */
function normalizeMRTExit(raw: any, rowIndex: number): {
  id: string;
  station: string | null;
  code: string | null;
  coordinates: [number, number] | null;
  originalCRS: CRS;
  converted: boolean;
} | null {
  // Extract coordinates from GeoJSON geometry
  let coordinates: [number, number] | null = null;
  let originalCRS: CRS = "UNKNOWN";
  let converted = false;

  if (raw.geometry && raw.geometry.type === 'Point') {
    coordinates = [raw.geometry.coordinates[0], raw.geometry.coordinates[1]];
  } else if (raw.longitude && raw.latitude) {
    coordinates = [parseFloat(raw.longitude), parseFloat(raw.latitude)];
  } else if (raw.lng && raw.lat) {
    coordinates = [parseFloat(raw.lng), parseFloat(raw.lat)];
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

  // Extract station and code from Description HTML table or direct properties
  let station: string | null = null;
  let code: string | null = null;

  if (raw.Description) {
    const parsed = parseStationInfo(raw.Description);
    station = parsed.station || null;
    code = parsed.code || null;
  } else {
    station = raw.STATION_NA || raw.station || raw.name || raw.STATION_NAME || null;
    code = raw.EXIT_CODE || raw.code || raw.EXIT || raw.exit || null;
  }

  // If no station/code, try Name field
  if (!station && raw.Name && raw.Name !== 'kml_1') {
    station = raw.Name;
  }

  // Generate stable ID
  const id = stableMRTExitId(station || undefined, code || undefined, coordinates[0], coordinates[1]);

  return {
    id,
    station: station || null,
    code: code || null,
    coordinates,
    originalCRS,
    converted,
  };
}

/**
 * Upsert MRT exit with point-in-polygon matching
 */
async function upsertMRTExit(normalized: ReturnType<typeof normalizeMRTExit>): Promise<void> {
  if (!normalized) return;

  // Find subzone via point-in-polygon with buffer support
  const subzoneId = await assignSubzoneWithBuffer(normalized.coordinates![0], normalized.coordinates![1]);

  await prisma.mRTExit.upsert({
    where: { id: normalized.id },
    create: {
      id: normalized.id,
      station: normalized.station,
      code: normalized.code,
      location: createPointGeometry(normalized.coordinates![0], normalized.coordinates![1]),
      subzoneId,
    },
    update: {
      station: normalized.station,
      code: normalized.code,
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
      kind: 'mrt-exits',
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
export async function ingestMRTExits() {
  const startTime = Date.now();
  console.log('🚀 Starting MRT exits ingestion (Part D)...\n');

  // Stage counters
  let totalRead = 0;
  let invalidGeom = 0;
  let convertedCRS = 0;
  let upserted = 0;
  let assigned = 0;
  let unassigned = 0;
  let errors: string[] = [];
  let crsStats: Record<string, number> = {};

  try {
    const result = await fetchMRTExits();
    if (!result) {
      throw new Error('No data source available');
    }

    const { data: rawData, source } = result;
    totalRead = rawData.length;

    console.log(`📊 Data source: ${source}`);
    console.log(`📊 Found ${totalRead} raw records\n`);

    // Stage 1: Normalize and detect CRS
    console.log('🔄 Stage 1: Normalizing records and detecting CRS...');
    const normalizedExits: Array<ReturnType<typeof normalizeMRTExit>> = [];

    for (const [rowIndex, rawRow] of rawData.entries()) {
      const normalized = normalizeMRTExit(rawRow, rowIndex);
      
      if (!normalized) {
        invalidGeom++;
        errors.push(`Row ${rowIndex + 1}: Invalid geometry or missing coordinates`);
        continue;
      }

      // Track CRS statistics
      crsStats[normalized.originalCRS] = (crsStats[normalized.originalCRS] || 0) + 1;
      if (normalized.converted) {
        convertedCRS++;
      }

      normalizedExits.push(normalized);
    }

    console.log(`✅ Normalized: ${normalizedExits.length} records`);
    console.log(`❌ Invalid geometry: ${invalidGeom} records`);
    console.log(`🔄 CRS converted: ${convertedCRS} records`);
    console.log(`📊 CRS breakdown:`, crsStats);

    // Stage 2: Point-in-polygon assignment and upsert
    console.log('\n🔄 Stage 2: Point-in-polygon assignment and database upsert...');
    
    for (const normalized of normalizedExits) {
      try {
        await upsertMRTExit(normalized);
        upserted++;

        if (normalized.coordinates) {
          const subzoneId = await assignSubzoneWithBuffer(normalized.coordinates[0], normalized.coordinates[1]);
          if (subzoneId) {
            assigned++;
          } else {
            unassigned++;
            console.log(`⚠️  "${normalized.station || normalized.code || 'Unknown'}" not in any subzone`);
          }
        }
      } catch (error) {
        errors.push(`Upsert error for ${normalized.station || normalized.code || 'Unknown'}: ${error}`);
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
      upserted,
      assigned,
      unassigned,
      assignmentRate: Math.round(assignmentRate * 100),
      crsStats,
      errors: errors.slice(0, 10),
      errorCount: errors.length,
    };

    await recordSnapshot(status, meta, MRT_EXITS_URL);

    const duration = Date.now() - startTime;

    // Print comprehensive summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 MRT Exits Ingestion Summary (Part D)');
    console.log('='.repeat(80));
    console.log(`   Data source:          ${source}`);
    console.log(`   Total raw records:    ${totalRead}`);
    console.log(`   ✅ Normalized:         ${normalizedExits.length}`);
    console.log(`   ❌ Invalid geometry:  ${invalidGeom}`);
    console.log(`   🔄 CRS converted:     ${convertedCRS}`);
    console.log(`   📊 CRS breakdown:     ${JSON.stringify(crsStats)}`);
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

    console.log('\n✅ MRT exits ingestion completed');

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    
    await recordSnapshot('failed', {
      error: String(error),
      totalRead,
      invalidGeom,
      convertedCRS,
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
  ingestMRTExits().catch(console.error);
}