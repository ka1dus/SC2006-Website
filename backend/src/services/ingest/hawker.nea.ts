/**
 * NEA Hawker Centres Ingestion Service (Part C.FIX)
 * Loads NEA hawker centre points with proper CRS handling, deduplication, and diagnostics
 * 
 * Strategy:
 * 1. Try NEA_HAWKER_CENTRES_URL (data.gov.sg API)
 * 2. Fallback to local file (backend/data/nea_hawker_centres.geojson or .csv)
 * 3. Handle both GeoJSON and CSV formats
 * 4. Detect and convert SVY21 → WGS84 coordinates
 * 5. Deduplicate by name within 30m radius
 * 6. Point-in-polygon assignment to subzones
 * 
 * Part C.FIX: Full dataset ingestion with stage-by-stage diagnostics
 */

import prisma from '../../db';
import { findSubzoneForPoint, createPointGeometry } from './utils/geo';
import { detectCRS, ensureWGS84, CRS } from './utils/crs';
import { parse } from "csv-parse/sync";
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_GEOJSON_PATH = path.join(DATA_DIR, 'nea_hawker_centres.geojson');
const LOCAL_CSV_PATH = path.join(DATA_DIR, 'nea_hawker_centres.csv');
const NEA_HAWKER_CENTRES_URL = process.env.NEA_HAWKER_CENTRES_URL || '';

/**
 * Generate stable hawker ID
 */
function generateHawkerId(name: string, lng: number, lat: number): string {
  const slug = name
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, '_')
    .toUpperCase();
  
  return `${slug}:${lng.toFixed(6)},${lat.toFixed(6)}`;
}

/**
 * Calculate distance between two points (simple approximation)
 */
function calculateDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Deduplicate hawker centres by name within 30m radius
 */
function deduplicateHawkers(hawkers: Array<{
  id: string;
  name: string;
  lng: number;
  lat: number;
  operator?: string;
  address?: string;
}>): Array<typeof hawkers[0]> {
  const groups: Array<Array<typeof hawkers[0]>> = [];
  const processed = new Set<string>();

  for (const hawker of hawkers) {
    if (processed.has(hawker.id)) continue;

    const group = [hawker];
    processed.add(hawker.id);

    // Find other hawkers with same name within 30m
    for (const other of hawkers) {
      if (processed.has(other.id)) continue;
      
      if (other.name.toLowerCase() === hawker.name.toLowerCase()) {
        const distance = calculateDistance(hawker.lng, hawker.lat, other.lng, other.lat);
        if (distance <= 30) {
          group.push(other);
          processed.add(other.id);
        }
      }
    }

    groups.push(group);
  }

  // Return first hawker from each group
  return groups.map(group => group[0]);
}

/**
 * Fetch NEA hawker centres data (URL-first, then local files)
 */
async function fetchHawkerCentres(): Promise<{ data: any[]; source: string } | null> {
  // Strategy 1: Try URL (data.gov.sg API)
  if (NEA_HAWKER_CENTRES_URL) {
    try {
      console.log(`🌐 Fetching NEA hawker centres from URL: ${NEA_HAWKER_CENTRES_URL}`);
      const response = await fetch(NEA_HAWKER_CENTRES_URL);
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      let records: any[] = [];
      
      // Handle data.gov.sg CKAN API format
      if (data.result && data.result.records) {
        records = data.result.records;
        console.log(`✅ Fetched ${records.length} hawker centres from data.gov.sg API`);
        return { data: records, source: 'data.gov.sg API' };
      }
      // Handle data.gov.sg poll-download format
      else if (data.code === 0 && data.data && data.data.url) {
        console.log(`📥 Poll-download successful, fetching from: ${data.data.url}`);
        const downloadResponse = await fetch(data.data.url);
        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.status}`);
        }
        const downloadData = await downloadResponse.json();
        
        if (downloadData.type === 'FeatureCollection' && downloadData.features) {
          records = downloadData.features.map((f: any) => ({
            ...f.properties,
            geometry: f.geometry,
          }));
          console.log(`✅ Downloaded ${records.length} hawker centres from poll-download`);
          return { data: records, source: 'data.gov.sg poll-download' };
        }
      }
      // Handle direct GeoJSON
      else if (data.type === 'FeatureCollection' && data.features) {
        records = data.features.map((f: any) => ({
          ...f.properties,
          geometry: f.geometry,
        }));
        console.log(`✅ Fetched ${records.length} hawker centres from GeoJSON URL`);
        return { data: records, source: 'GeoJSON URL' };
      }
      else {
        console.error('❌ Unexpected data format from URL');
        throw new Error('Unexpected format');
      }
    } catch (error) {
      console.error('❌ Failed to fetch hawker centres from URL:', error);
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
    
    console.log(`✅ Loaded ${records.length} hawker centres from local GeoJSON`);
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
    
    console.log(`✅ Loaded ${records.length} hawker centres from local CSV`);
    return { data: records, source: 'Local CSV' };
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`❌ Error reading local CSV:`, error);
    }
  }

  console.error(`❌ No hawker centres data source available`);
  console.log(`\n💡 To fix this, either:`);
  console.log(`   1. Set NEA_HAWKER_CENTRES_URL in backend/.env`);
  console.log(`   2. Place file at: ${LOCAL_GEOJSON_PATH}`);
  console.log(`   3. Place file at: ${LOCAL_CSV_PATH}`);
  return null;
}

/**
 * Normalize hawker centre record with CRS detection and conversion
 */
function normalizeHawkerCentre(raw: any, rowIndex: number): {
  id: string;
  name: string;
  operator: string | null;
  address: string | null;
  coordinates: [number, number] | null;
  originalCRS: CRS;
  converted: boolean;
} | null {
  // Extract coordinates from various possible formats
  let coordinates: [number, number] | null = null;
  let originalCRS: CRS = "UNKNOWN";
  let converted = false;

  if (raw.geometry && raw.geometry.type === 'Point') {
    coordinates = [raw.geometry.coordinates[0], raw.geometry.coordinates[1]];
  } else if (raw.LATITUDE && raw.LONGITUDE) {
    coordinates = [parseFloat(raw.LONGITUDE), parseFloat(raw.LATITUDE)];
  } else if (raw.latitude && raw.longitude) {
    coordinates = [parseFloat(raw.longitude), parseFloat(raw.latitude)];
  } else if (raw.lat && raw.lng) {
    coordinates = [parseFloat(raw.lng), parseFloat(raw.lat)];
  } else if (raw.X && raw.Y) {
    coordinates = [parseFloat(raw.X), parseFloat(raw.Y)];
  } else if (raw.x && raw.y) {
    coordinates = [parseFloat(raw.x), parseFloat(raw.y)];
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

  // Extract fields
  const name = String(raw.NAME || raw.name || raw.CENTRE_NAME || raw.centre_name || raw.HAWKER_CENTRE_NAME || '').trim();
  const operator = raw.OPERATOR || raw.operator || null;
  const address = raw.ADDRESS || raw.address || raw.ADDRESSSTREETNAME || raw.ADDRESS_STREETNAME || null;

  if (!name) {
    return null;
  }

  // Generate stable ID
  const id = generateHawkerId(name, coordinates[0], coordinates[1]);

  return {
    id,
    name,
    operator,
    address,
    coordinates,
    originalCRS,
    converted,
  };
}

/**
 * Upsert a hawker centre with point-in-polygon matching (Part C.FIX)
 */
async function upsertHawkerCentre(normalized: ReturnType<typeof normalizeHawkerCentre>): Promise<void> {
  if (!normalized) return;

  // Find subzone via point-in-polygon
  const subzoneId = await findSubzoneForPoint(normalized.coordinates!);

  await prisma.hawkerCentre.upsert({
    where: { id: normalized.id },
    create: {
      id: normalized.id,
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
 * Record snapshot with comprehensive metadata
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
 * Main ingestion function with stage-by-stage diagnostics
 */
export async function ingestHawkerCentres() {
  const startTime = Date.now();
  console.log('🚀 Starting NEA hawker centres ingestion (Part C.FIX)...\n');

  // Stage counters
  let totalRead = 0;
  let invalidGeom = 0;
  let convertedCRS = 0;
  let dedupKept = 0;
  let dedupDropped = 0;
  let upserted = 0;
  let assigned = 0;
  let unassigned = 0;
  let errors: string[] = [];
  let crsStats: Record<string, number> = {};

  try {
    const result = await fetchHawkerCentres();
    if (!result) {
      throw new Error('No data source available');
    }

    const { data: rawData, source } = result;
    totalRead = rawData.length;

    console.log(`📊 Data source: ${source}`);
    console.log(`📊 Found ${totalRead} raw records\n`);

    // Stage 1: Normalize and detect CRS
    console.log('🔄 Stage 1: Normalizing records and detecting CRS...');
    const normalizedHawkers: Array<ReturnType<typeof normalizeHawkerCentre>> = [];

    for (const [rowIndex, rawRow] of rawData.entries()) {
      const normalized = normalizeHawkerCentre(rawRow, rowIndex);
      
      if (!normalized) {
        invalidGeom++;
        errors.push(`Row ${rowIndex + 1}: Invalid geometry or missing name`);
        continue;
      }

      // Track CRS statistics
      crsStats[normalized.originalCRS] = (crsStats[normalized.originalCRS] || 0) + 1;
      if (normalized.converted) {
        convertedCRS++;
      }

      normalizedHawkers.push(normalized);
    }

    console.log(`✅ Normalized: ${normalizedHawkers.length} records`);
    console.log(`❌ Invalid geometry: ${invalidGeom} records`);
    console.log(`🔄 CRS converted: ${convertedCRS} records`);
    console.log(`📊 CRS breakdown:`, crsStats);

    // Stage 2: Deduplication
    console.log('\n🔄 Stage 2: Deduplicating by name within 30m radius...');
    const deduplicatedHawkers = deduplicateHawkers(
      normalizedHawkers.map(h => ({
        id: h.id,
        name: h.name,
        lng: h.coordinates![0],
        lat: h.coordinates![1],
        operator: h.operator,
        address: h.address,
      }))
    );

    dedupKept = deduplicatedHawkers.length;
    dedupDropped = normalizedHawkers.length - deduplicatedHawkers.length;

    console.log(`✅ Deduplicated: ${dedupKept} kept, ${dedupDropped} dropped`);

    // Stage 3: Point-in-polygon assignment and upsert
    console.log('\n🔄 Stage 3: Point-in-polygon assignment and database upsert...');
    
    for (const hawker of deduplicatedHawkers) {
      try {
        const normalized = normalizedHawkers.find(h => h.id === hawker.id);
        if (!normalized) continue;

        await upsertHawkerCentre(normalized);
        upserted++;

        if (normalized.coordinates) {
          const subzoneId = await findSubzoneForPoint(normalized.coordinates);
          if (subzoneId) {
            assigned++;
            console.log(`✅ Matched "${normalized.name}" → ${subzoneId}`);
          } else {
            unassigned++;
            console.log(`⚠️  "${normalized.name}" not in any subzone`);
          }
        }
      } catch (error) {
        errors.push(`Upsert error for ${hawker.name}: ${error}`);
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
      dedupKept,
      dedupDropped,
      upserted,
      assigned,
      unassigned,
      assignmentRate: Math.round(assignmentRate * 100),
      crsStats,
      errors: errors.slice(0, 10), // First 10 errors
      errorCount: errors.length,
    };

    await recordSnapshot(status, meta, NEA_HAWKER_CENTRES_URL);

    const duration = Date.now() - startTime;

    // Print comprehensive summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Ingestion Summary (Part C.FIX)');
    console.log('='.repeat(80));
    console.log(`   Data source:          ${source}`);
    console.log(`   Total raw records:    ${totalRead}`);
    console.log(`   ✅ Normalized:         ${normalizedHawkers.length}`);
    console.log(`   ❌ Invalid geometry:  ${invalidGeom}`);
    console.log(`   🔄 CRS converted:     ${convertedCRS}`);
    console.log(`   📊 CRS breakdown:     ${JSON.stringify(crsStats)}`);
    console.log(`   🎯 Deduplicated:      ${dedupKept} kept, ${dedupDropped} dropped`);
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

    console.log('\n✅ Hawker centres ingestion completed');

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    
    await recordSnapshot('failed', {
      error: String(error),
      totalRead,
      invalidGeom,
      convertedCRS,
      dedupKept,
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
  ingestHawkerCentres().catch(console.error);
}