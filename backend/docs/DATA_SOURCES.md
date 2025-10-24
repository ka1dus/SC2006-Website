# Data Sources Documentation

**Task:** DATASET-AUDIT-AND-INGEST  
**Last Updated:** 2025-01-23

This document maps external datasets to internal database models, documenting URLs, field mappings, normalization rules, and coordinate systems.

---

## Overview

| Dataset | Status | Model | Records | Ingestion Script |
|---------|--------|-------|---------|------------------|
| URA Subzones 2019 | 🟢 Active | `Subzone` | 5 (seed) | `ingest:subzones` |
| Census 2020 Population | 🟢 Active | `Population` | 5 (seed) | `ingest:population` |
| NEA Hawker Centres | 🟡 Ready | `HawkerCentre` | 0 | `ingest:hawker` |
| MRT Station Exits | 🟡 Ready | `MRTStation` | 0 | `ingest:mrt` |
| LTA Bus Stops | 🟡 Ready | `BusStop` | 0 | `ingest:bus` |

**Legend:**
- 🟢 Active: Data ingested and in use
- 🟡 Ready: Script ready, awaiting data source configuration
- 🔴 Missing: Not implemented

---

## Coordinate Reference System (CRS)

**All datasets use:** **WGS84 (EPSG:4326)**
- Longitude: -180 to +180 (East-West)
- Latitude: -90 to +90 (North-South)
- Singapore typical range: 
  - Longitude: 103.6 to 104.0
  - Latitude: 1.1 to 1.5

**GeoJSON Format:**
```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]  // [103.8198, 1.3521] for Singapore center
}
```

---

## 1. URA Subzones 2019 (P1)

### Source

**Provider:** Urban Redevelopment Authority (URA), Singapore  
**Dataset:** Master Plan 2019 Subzone Boundaries  
**URL:** `https://data.gov.sg/api/action/datastore_search?resource_id=d_ebc5ab87086db484f88045b47411ebc5`  
**Format:** GeoJSON FeatureCollection  
**Update Frequency:** Static (2019 boundaries)

### Field Mapping

| Source Field | Model Field | Type | Notes |
|--------------|-------------|------|-------|
| `id` / `SUBZONE_C` | `id` | String | Stable URA subzone code (primary key) |
| `name` / `SUBZONE_N` | `name` | String | Display name (e.g., "Tampines East") |
| `region` / `REGION_C` | `region` | Enum | Mapped to: CENTRAL, EAST, NORTH, NORTH_EAST, WEST, UNKNOWN |
| `geometry` | `geomGeoJSON` | JSON | Full Polygon/MultiPolygon geometry |

### Region Normalization

```typescript
// Mapping logic in subzones.ura.ts
function mapRegion(regionStr: string | undefined): Region {
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
```

### Ingestion

```bash
npm run ingest:subzones
```

**Process:**
1. Fetch GeoJSON from URA_SUBZONES_URL (or fallback file)
2. Validate FeatureCollection structure
3. Extract id, name, region from properties
4. Upsert Subzone with full geometry
5. Record DatasetSnapshot

**Idempotent:** Yes (upsert by `id`)

---

## 2. Census 2020 Population (PART B)

### Source

**Provider:** Department of Statistics, Singapore  
**Dataset:** Singapore Residents by Planning Area/Subzone, 2020  
**URL:** `https://data.gov.sg/api/action/datastore_search?resource_id=d_f7541ec3af57b5edb4a69c0e31e02ca3`  
**Local File:** `backend/data/census_2020_population.csv` (or `.json`)  
**Format:** CSV/JSON (via CKAN API or local file)  
**Update Frequency:** Annual (Census years)

### Field Mapping

| Source Field | Model Field | Type | Notes |
|--------------|-------------|------|-------|
| `subzone` / `subzone_name` / `Planning Area` / `name` | Matched to `Subzone.id` | String | Requires normalization + matching |
| `year` / `Year` | `year` | Int | Census year (e.g., 2020), defaults to 2020 |
| `population` / `total` / `Total Population` / `residents` | `total` | Int | Total resident population |
| Various age/sex columns | Summed to `total` | Int | If no direct population field, sums numeric columns |

### Name Normalization (PART B Spec)

**Rules** (in `utils/normalize.ts` → `normName()`):
1. **NFKD normalization** (Unicode compatibility)
2. **Remove quotes/apostrophes** (`'`, `'`, `` ` ``)
3. **Replace hyphens/slashes with spaces** (`-`, `/` → space)
4. **Collapse multiple spaces** to single space
5. **Trim** and convert to **UPPERCASE**

**Example:**
```typescript
normName("Tampines' East-Central/North")
// → "TAMPINES EAST CENTRAL NORTH"
```

### Subzone Matching (PART B Strategy)

**3-Step Strategy** (in `population.census2020.ts`):

1. **Check Aliases** (in `utils/aliases.ts`):
   ```typescript
   export const ALIASES: Record<string, string> = {
     // "TAMPINES E": "TAMPINES_EAST",
     // Add entries as unmatched names appear
   };
   ```

2. **Direct Normalized Name Match**:
   ```typescript
   const subzoneId = byNameNorm.get(normName(censusName));
   ```

3. **Record Unmatched**:
   - If both fail, add to `DatasetSnapshot.meta.unmatchedSamples`
   - Shows in diag endpoint for manual alias creation

**Confidence Levels:**
- `alias`: Matched via ALIASES map
- `direct`: Matched via normalized name
- `null`: No match (reason provided)

### Ingestion (PART B Implementation)

```bash
# File-first approach (recommended)
cp ~/Downloads/census_2020_population.csv backend/data/
cd backend && npm run ingest:population

# OR URL-based (alternative)
# Set CENSUS2020_URL in backend/.env
npm run ingest:population
```

**Process:**
1. **Try local file first**: `backend/data/census_2020_population.csv` or `.json`
2. **Fallback to URL**: If file not found, fetch from `CENSUS2020_URL`
3. **Parse**: Handle CSV (papaparse) or JSON formats
4. **Normalize**: Apply `normalizePopulationRow()` to each row
5. **Build Lookup**: Load all subzones and create `byNameNorm` map
6. **Match**: Apply 3-step strategy (alias → direct → unmatched)
7. **Upsert**: In transaction, upsert matched rows (keep latest year)
8. **Snapshot**: Record with counts, unmatched samples, duration

**Idempotent:** Yes (upsert by `subzoneId`, keeps latest year)

### Re-Running Ingestion

**Safe to re-run** - handles updates correctly:
- If same year: Updates total
- If newer year: Updates year and total
- If older year: Keeps existing (doesn't downgrade)

**Example:**
```bash
# First run: Inserts 2020 data
npm run ingest:population

# Second run: No-op (same data)
npm run ingest:population

# With 2021 data: Updates to 2021
npm run ingest:population
```

### Unmatched Names

After first ingestion, check `/api/v1/diag/status` → `snapshots.population.meta.unmatchedSamples` for names that didn't match.

**To resolve:**
1. Add entries to `backend/src/services/ingest/utils/aliases.ts`:
   ```typescript
   export const ALIASES: Record<string, string> = {
     "CENSUS_NAME": "URA_SUBZONE_ID",
     "TAMPINES E": "TAMPINES_EAST",
     "MARINE PDE": "MARINE_PARADE",
   };
   ```
2. Re-run ingestion: `npm run ingest:population`

### Verification

**Check results:**
```bash
# Count matched populations
curl http://localhost:3001/api/v1/diag/status | jq '.tables.population'

# View snapshot details
curl http://localhost:3001/api/v1/diag/status | jq '.snapshots.population'

# Check sample population
curl http://localhost:3001/api/v1/diag/status | jq '.sample.population'

# Verify GeoJSON enrichment
curl http://localhost:3001/api/v1/geo/subzones | jq '.features[0].properties | {id, name, populationTotal, populationYear}'
```

**Expected after successful ingestion:**
- `tables.population` ≥ 300 (expecting most subzones matched)
- `snapshots.population.status` = "success" or "partial"
- GeoJSON features include `populationTotal` and `populationYear`
- Features without population have `missing: ["population"]`

---

## 3. NEA Hawker Centres (P2)

### Source

**Provider:** National Environment Agency (NEA), Singapore  
**Dataset:** Hawker Centres  
**URL:** `https://data.gov.sg/api/action/datastore_search?resource_id=d_4a61ea0e421baf5257c0aa2e5051ede5`  
**Format:** JSON (via CKAN API) or GeoJSON  
**Update Frequency:** Quarterly (approximate)

### Field Mapping

| Source Field | Model Field | Type | Notes |
|--------------|-------------|------|-------|
| `CENTRE_ID` / `centre_id` / `id` | `centreId` | String | Unique hawker centre ID (primary key) |
| `NAME` / `name` | `name` | String | Hawker centre name |
| `OPERATOR` / `operator` | `operator` | String? | E.g., "NEA", "Private" |
| `ADDRESS` / `address` | `address` | String? | Full address |
| `LONGITUDE` / `longitude` | `location.coordinates[0]` | Float | Longitude (WGS84) |
| `LATITUDE` / `latitude` | `location.coordinates[1]` | Float | Latitude (WGS84) |

### Point-in-Polygon Matching

**Library:** `@turf/boolean-point-in-polygon`

**Process:**
1. Extract point coordinates from record
2. Load all subzone geometries from database
3. Check if point falls within any subzone polygon
4. Assign `subzoneId` if match found
5. Leave `subzoneId` as NULL if no match

**Code:**
```typescript
import { findSubzoneForPoint } from './utils/geo';

const subzoneId = await findSubzoneForPoint([longitude, latitude]);
```

### Ingestion

```bash
npm run ingest:hawker
```

**Process:**
1. Fetch hawker centres from NEA_HAWKER_CENTRES_URL
2. Normalize and extract coordinates
3. For each hawker centre:
   - Run point-in-polygon to find subzoneId
   - Upsert HawkerCentre with location and subzoneId
4. Record DatasetSnapshot with match statistics

**Idempotent:** Yes (upsert by `centreId`)

---

## 4. MRT Station Exits (P3)

### Source

**Provider:** Land Transport Authority (LTA), Singapore  
**Dataset:** MRT Station Exits/Entrances  
**URL:** `https://data.gov.sg/api/action/datastore_search?resource_id=d_8a1b6e9c1c1f3e5f3d5a5c1f3e5f3d5a` (placeholder)  
**Format:** JSON (via CKAN API) or GeoJSON  
**Update Frequency:** Annually (station changes)

### Field Mapping

| Source Field | Model Field | Type | Notes |
|--------------|-------------|------|-------|
| Composite key | `stationId` | String | Generated: `{code}_EXIT_{exitCode}` or `{name}_{lng}_{lat}` |
| `STN_NAME` / `station_name` | `name` | String | Station name (e.g., "Jurong East") |
| `STN_NO` / `station_code` | `code` | String? | Station code (e.g., "NS1", "EW24") |
| `EXIT_CODE` / `exit_code` | `exitCode` | String? | Exit identifier (e.g., "A", "B", "C") |
| `LONGITUDE` / `longitude` | `location.coordinates[0]` | Float | Longitude (WGS84) |
| `LATITUDE` / `latitude` | `location.coordinates[1]` | Float | Latitude (WGS84) |

### Station ID Generation

```typescript
// If exit code available
`${code || name}_EXIT_${exitCode}`.replace(/\s+/g, '_')
// Example: "NS1_EXIT_A", "Jurong_East_EXIT_B"

// If no exit code
`${code || name}_${coordinates[0]}_${coordinates[1]}`.replace(/\s+/g, '_')
// Example: "NS1_103.7437_1.3328"
```

### Point-in-Polygon Matching

Same process as hawker centres (see above).

### Ingestion

```bash
npm run ingest:mrt
```

**Process:**
1. Fetch MRT exits from MRT_EXITS_URL
2. Normalize and extract coordinates
3. Generate unique stationId
4. For each exit:
   - Run point-in-polygon to find subzoneId
   - Upsert MRTStation with location and subzoneId
5. Record DatasetSnapshot

**Idempotent:** Yes (upsert by `stationId`)

---

## 5. LTA Bus Stops (P3)

### Source

**Provider:** Land Transport Authority (LTA), Singapore  
**Dataset:** Bus Stops  
**URL:** `http://datamall2.mytransport.sg/ltaodataservice/BusStops`  
**Format:** JSON (LTA Datamall API)  
**Authentication:** Requires `AccountKey` header  
**Update Frequency:** Real-time (changes reflected immediately)

### API Authentication

**Environment Variables:**
```bash
LTA_BUS_STOPS_URL=http://datamall2.mytransport.sg/ltaodataservice/BusStops
LTA_ACCOUNT_KEY=your_lta_api_key_here
```

**Request Header:**
```
AccountKey: your_lta_api_key_here
```

**Get API Key:** https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html

### Field Mapping

| Source Field | Model Field | Type | Notes |
|--------------|-------------|------|-------|
| `BusStopCode` | `stopCode` | String | 5-digit bus stop code (primary key) |
| `Description` | `name` | String? | Bus stop description/name |
| `RoadName` | `roadName` | String? | Road name |
| `Longitude` | `location.coordinates[0]` | Float | Longitude (WGS84) |
| `Latitude` | `location.coordinates[1]` | Float | Latitude (WGS84) |

### Point-in-Polygon Matching

Same process as hawker centres and MRT (see above).

### Ingestion

```bash
npm run ingest:bus
```

**Process:**
1. Fetch bus stops from LTA_BUS_STOPS_URL (with AccountKey header)
2. Normalize and extract coordinates
3. For each bus stop:
   - Run point-in-polygon to find subzoneId
   - Upsert BusStop with location and subzoneId
4. Record DatasetSnapshot

**Idempotent:** Yes (upsert by `stopCode`)

---

## Point-in-Polygon Implementation

### Library

**@turf/boolean-point-in-polygon** (MIT License)

### Algorithm

1. Create a Turf.js Point from `[longitude, latitude]`
2. Load all subzone Polygon/MultiPolygon geometries
3. For each subzone:
   - Create a Turf.js Polygon/MultiPolygon
   - Test if point is inside using `booleanPointInPolygon()`
   - Return first match (subzones don't overlap)
4. Return `null` if no match found

### Performance

- **Geometry Cache:** Subzone geometries loaded once, cached in memory
- **Early Exit:** Stops searching after first match
- **Batch Processing:** Available via `findSubzonesForPoints()` for efficiency

### Code Location

`backend/src/services/ingest/utils/geo.ts`

---

## Data Quality

### Unmatched Records

**Population:**
- Tracked in `PopulationUnmatched` table
- Includes raw name, reason, and details
- Accessible via `/api/v1/diag/status` → `unmatched` count

**Point Features:**
- Unmatched = `subzoneId` is NULL
- Logged during ingestion
- Accessible via `/api/v1/diag/status` → snapshot metadata

### Validation Rules

**Coordinates:**
- Must be in valid Singapore range (approx. 103.6-104.0, 1.1-1.5)
- Must not be NaN or null

**IDs:**
- Must be non-empty strings
- Must be unique per dataset

**Names:**
- Should be non-empty
- Normalized for matching

---

## Ingestion Scripts

### Run Individual Scripts

```bash
# P1: URA Subzones & Census Population
npm run ingest:subzones
npm run ingest:population

# P2: NEA Hawker Centres
npm run ingest:hawker

# P3: MRT Exits & LTA Bus Stops
npm run ingest:mrt
npm run ingest:bus

# Run all in sequence
npm run ingest:all
```

### Script Location

`backend/src/services/ingest/`

### Idempotency

**All scripts are idempotent** (safe to re-run):
- Use `upsert` operations (update if exists, create if not)
- Match by stable IDs (subzone ID, centre ID, stop code, etc.)
- No data duplication on re-run

### Snapshots

**All ingestions record a `DatasetSnapshot`:**
- `kind`: "subzones" | "population" | "hawker" | "mrt" | "bus"
- `status`: "success" | "partial" | "failed"
- `finishedAt`: Timestamp
- `meta`: JSON with counts, errors, duration

---

## API Enrichment

### `/api/v1/geo/subzones` (GeoJSON)

**Enriched Properties:**
```json
{
  "id": "TAMPINES_EAST",
  "name": "Tampines East",
  "region": "EAST",
  "populationTotal": 45000,
  "populationYear": 2023,
  "hawkerCount": 3,
  "mrtExitCount": 5,
  "busStopCount": 12
}
```

### `/api/v1/diag/status` (Diagnostics)

**Response:**
```json
{
  "subzones": 5,
  "populations": 5,
  "unmatched": 0,
  "hawkerCentres": 15,
  "mrtStations": 30,
  "busStops": 120,
  "geo": {
    "ok": true,
    "features": 5,
    "sampleIds": ["TAMPINES_EAST", ...]
  }
}
```

---

## Troubleshooting

### Issue: "No subzone geometries loaded"

**Cause:** `Subzone.geomGeoJSON` is NULL for all records

**Solution:**
```bash
npm run ingest:subzones
```

### Issue: "Point not in any subzone"

**Possible Causes:**
1. Coordinates are outside Singapore bounds
2. Subzone boundaries don't cover that area
3. Coordinates are swapped (lat, lng instead of lng, lat)

**Debug:**
```typescript
console.log('Coordinates:', [longitude, latitude]);
// Should be: [103.xxx, 1.xxx] for Singapore
```

### Issue: "LTA API returns 401"

**Cause:** Missing or invalid `LTA_ACCOUNT_KEY`

**Solution:**
1. Get API key from https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html
2. Add to `.env`:
   ```
   LTA_ACCOUNT_KEY=your_actual_key_here
   ```
3. Restart backend server

---

## References

- **data.gov.sg:** https://data.gov.sg/
- **URA Master Plan:** https://www.ura.gov.sg/Corporate/Guidelines/Development-Control/Gross-Floor-Area/GFA/Basements
- **LTA Datamall:** https://datamall.lta.gov.sg/content/datamall/en.html
- **NEA:** https://www.nea.gov.sg/
- **Turf.js:** https://turfjs.org/
- **GeoJSON Spec:** https://geojson.org/

---

**End of Data Sources Documentation**

