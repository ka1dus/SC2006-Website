# Dataset Ingestion Audit Report

**Generated:** 2025-01-23  
**Task:** DATASET-AUDIT-AND-INGEST

---

## Executive Summary

This audit verifies whether the 5 key datasets mentioned in the README are actually ingested and used in the codebase.

**Audit Status:** 🟡 **PARTIAL** — Models exist but lack proper integration

---

## Dataset Status Table

| Dataset | Model Exists | Ingest Script | Records Present | Used by Endpoint(s) | Linked to Subzone | Status |
|---------|--------------|---------------|-----------------|---------------------|-------------------|--------|
| **URA Subzones 2019** | ✅ Yes (`Subzone`) | ❌ No | 🟡 5 (seed only) | ✅ `/api/v1/geo/subzones` | N/A (root model) | 🟡 PARTIAL |
| **Census 2020 Population** | ✅ Yes (`Population`) | ✅ Yes (`ingest/population.ts`) | 🟡 5 (seed only) | ✅ `/api/v1/geo/subzones` | ✅ Yes (1:1) | 🟡 PARTIAL |
| **NEA Hawker Centres** | ✅ Yes (`HawkerCentre`) | ❌ No | ❌ 0 | ❌ No | ❌ No foreign key | 🔴 MISSING |
| **MRT Station Exits** | ✅ Yes (`MRTStation`) | ❌ No | ❌ 0 | ❌ No | ❌ No foreign key | 🔴 MISSING |
| **LTA Bus Stops** | ✅ Yes (`BusStop`) | ❌ No | ❌ 0 | ❌ No | ❌ No foreign key | 🔴 MISSING |

**Legend:**
- 🟢 COMPLETE — Fully functional
- 🟡 PARTIAL — Exists but incomplete
- 🔴 MISSING — Not implemented

---

## Detailed Findings

### 1. URA Subzones 2019 🟡 PARTIAL

**Model:** `backend/prisma/schema.prisma`
```prisma
model Subzone {
  id           String   @id
  name         String   @db.VarChar(120)
  region       Region   @default(UNKNOWN)
  geomGeoJSON  Json?    // optional; polygons can also be client-only GeoJSON
  population   Population?
  populationId String?  @unique
  // ...
}
```

**Status:**
- ✅ Model exists
- ❌ No ingestion script (`backend/src/services/ingest/subzones.ura.ts` missing)
- 🟡 Data: 5 seed subzones (from `prisma/seed.ts`)
- ✅ Used by: `/api/v1/geo/subzones` (backend/src/services/geo/geojson.service.ts)
- ❌ No `geomGeoJSON` populated (all NULL in DB)

**Missing:**
- Ingestion script to load URA 2019 GeoJSON
- Actual polygon data in `geomGeoJSON` field
- NPM script: `npm run ingest:subzones`

---

### 2. Census 2020 Population 🟡 PARTIAL

**Model:** `backend/prisma/schema.prisma`
```prisma
model Population {
  subzoneId   String  @id
  subzoneName String  @db.VarChar(120)
  year        Int
  total       Int
  subzone     Subzone @relation(fields: [subzoneId], references: [id], onDelete: Cascade)
}
```

**Ingestion Script:** `backend/src/services/ingest/population.ts` ✅

**Status:**
- ✅ Model exists
- ✅ Ingestion script exists (254 lines)
- 🟡 Data: 5 seed populations (no real Census 2020 data)
- ✅ Used by: `/api/v1/geo/subzones` (enriches GeoJSON with `populationTotal`, `populationYear`)
- ✅ Linked to Subzone via foreign key

**Features:**
- ✅ Name normalization (`utils/normalize.ts`)
- ✅ Subzone matching (`utils/geo-matcher.ts`)
- ✅ Unmatched tracking (`PopulationUnmatched` model)
- ✅ Snapshot recording (`DatasetSnapshot` model)
- ✅ Unit tests (`__tests__/population.ingest.spec.ts`)

**Missing:**
- Environment variable `GOV_POPULATION_DATA_URL` not set
- NPM script: `npm run ingest:population` (uses `ts-node`, should be `tsx`)
- No actual Census 2020 data ingested (URL placeholder)

---

### 3. NEA Hawker Centres 🔴 MISSING

**Model:** `backend/prisma/schema.prisma`
```prisma
model HawkerCentre {
  id       String @id @default(cuid())
  centreId String @unique
  name     String
  location Json   // GeoJSON point
  capacity Int
  status   String
  createdAt DateTime @default(now())
  
  @@map("hawker_centres")
}
```

**Status:**
- ✅ Model exists (but incomplete)
- ❌ NO foreign key to `Subzone` (`subzoneId` missing)
- ❌ NO ingestion script (`backend/src/services/ingest/hawker.nea.ts` missing)
- ❌ NO data (0 records)
- ❌ NOT used by any endpoint
- ❌ NOT enriched in `/api/v1/geo/subzones`

**Model Issues:**
- Missing `subzoneId` field (can't link to subzone)
- Missing `address` field (NEA dataset includes address)
- Missing `operator` field (NEA dataset includes operator)
- `capacity` field type is `Int` but should be optional (not all hawker centres have this)
- `status` field should be enum (e.g., "Open", "Closed")

**Missing:**
- Ingestion script: `backend/src/services/ingest/hawker.nea.ts`
- NPM script: `npm run ingest:hawker`
- Environment variable: `NEA_HAWKER_CENTRES_URL`
- Point-in-polygon logic to assign `subzoneId`
- Endpoint to count hawker centres per subzone

---

### 4. MRT Station Exits 🔴 MISSING

**Model:** `backend/prisma/schema.prisma`
```prisma
model MRTStation {
  id        String @id @default(cuid())
  stationId String @unique
  name      String
  location  Json   // GeoJSON point
  lineCount Int
  createdAt DateTime @default(now())
  
  @@map("mrt_stations")
}
```

**Status:**
- ✅ Model exists (but incomplete)
- ❌ NO foreign key to `Subzone` (`subzoneId` missing)
- ❌ NO ingestion script (`backend/src/services/ingest/mrt.ts` missing)
- ❌ NO data (0 records)
- ❌ NOT used by any endpoint
- ❌ NOT enriched in `/api/v1/geo/subzones`

**Model Issues:**
- Missing `subzoneId` field (can't link to subzone)
- Missing `code` field (MRT stations have codes like "NS1", "EW12")
- `lineCount` is not useful for exits (should be per-station metadata)
- Model represents stations, not exits (dataset is "MRT Station Exits")

**Missing:**
- Ingestion script: `backend/src/services/ingest/mrt.ts`
- NPM script: `npm run ingest:mrt`
- Environment variable: `MRT_EXITS_URL`
- Point-in-polygon logic to assign `subzoneId`
- Endpoint to count MRT exits per subzone

---

### 5. LTA Bus Stops 🔴 MISSING

**Model:** `backend/prisma/schema.prisma`
```prisma
model BusStop {
  id        String  @id @default(cuid())
  stopCode  String  @unique
  roadName  String
  location  Json    // GeoJSON point
  freqWeight Float
  createdAt DateTime @default(now())
  
  @@map("bus_stops")
}
```

**Status:**
- ✅ Model exists (but incomplete)
- ❌ NO foreign key to `Subzone` (`subzoneId` missing)
- ❌ NO ingestion script (`backend/src/services/ingest/busStops.ts` missing)
- ❌ NO data (0 records)
- ❌ NOT used by any endpoint
- ❌ NOT enriched in `/api/v1/geo/subzones`

**Model Issues:**
- Missing `subzoneId` field (can't link to subzone)
- Missing `name` field (bus stops have descriptions)
- `freqWeight` is custom calculation (not from LTA Datamall)
- `roadName` should match LTA field name: `RoadName`

**Missing:**
- Ingestion script: `backend/src/services/ingest/busStops.ts`
- NPM script: `npm run ingest:bus`
- Environment variable: `LTA_BUS_STOPS_URL`
- Point-in-polygon logic to assign `subzoneId`
- Endpoint to count bus stops per subzone

---

## Code Evidence

### Existing Ingestion Infrastructure

**✅ Population Ingestion (Template for Others):**
- `backend/src/services/ingest/population.ts` (263 lines)
- `backend/src/services/ingest/utils/normalize.ts` (name normalization)
- `backend/src/services/ingest/utils/geo-matcher.ts` (subzone matching)
- `backend/src/services/ingest/__tests__/population.ingest.spec.ts` (unit tests)

**✅ GeoJSON Enrichment:**
- `backend/src/services/geo/geojson.service.ts`
  - `loadBaseGeoJSON()` — Loads from DB `geomGeoJSON` or fallback file
  - `enrichWithPopulation()` — Adds `populationTotal`, `populationYear` to GeoJSON

**✅ Diagnostics:**
- `backend/src/services/diag.service.ts`
  - `getSystemStatus()` — Returns DB counts, GeoJSON status

**❌ Missing Point-in-Polygon:**
- No utility to match point locations to subzone polygons
- Required for: Hawker Centres, MRT Exits, Bus Stops

**❌ Missing Data Fetchers:**
- No HTTP/CSV/JSON utilities for fetching external datasets
- Population ingestion has placeholders but no real implementation

---

## Endpoint Usage

### `/api/v1/geo/subzones` (GeoJSON)

**File:** `backend/src/services/geo/geojson.service.ts`

**Current Enrichment:**
```typescript
properties: {
  id: subzone.id,
  name: subzone.name,
  region: subzone.region,
  populationTotal: population?.total || null,  // ✅ From Population model
  populationYear: population?.year || null,    // ✅ From Population model
  // ❌ MISSING: hawkerCount
  // ❌ MISSING: mrtExitCount
  // ❌ MISSING: busStopCount
}
```

**Missing Counts:**
- `hawkerCount` — Number of hawker centres in subzone
- `mrtExitCount` — Number of MRT exits in subzone
- `busStopCount` — Number of bus stops in subzone

---

### `/api/v1/diag/status` (Diagnostics)

**File:** `backend/src/services/diag.service.ts`

**Current Response:**
```json
{
  "subzones": 5,      // ✅ Counted
  "populations": 5,   // ✅ Counted
  "unmatched": 0,     // ✅ Counted
  "geo": {
    "ok": true,
    "features": 5,
    "sampleIds": ["TAMPINES_EAST", ...]
  }
  // ❌ MISSING: hawkerCentres count
  // ❌ MISSING: mrtStations count
  // ❌ MISSING: busStops count
}
```

---

## Recommendations

### Priority 1: Fix Existing Models (Schema Migration Required)

Add foreign keys to link point datasets to subzones:

```prisma
model HawkerCentre {
  id          String   @id @default(cuid())
  centreId    String   @unique
  name        String
  operator    String?
  address     String?
  location    Json     // Point GeoJSON
  subzoneId   String?  // ✅ ADD THIS
  subzone     Subzone? @relation(fields: [subzoneId], references: [id])  // ✅ ADD THIS
  createdAt   DateTime @default(now())
  @@map("hawker_centres")
}

// Similar for MRTExit (rename from MRTStation) and BusStop
```

**Migration:** `npm run db:migrate:dev --name add_subzone_links`

---

### Priority 2: Create Ingestion Scripts

**Template Structure (from `population.ts`):**
1. Fetch data from URL (or local file)
2. Parse CSV/JSON
3. Normalize/transform records
4. For points: Run point-in-polygon to find `subzoneId`
5. Upsert records (idempotent by unique ID)
6. Track unmatched records
7. Record `DatasetSnapshot`

**Files to Create:**
- `backend/src/services/ingest/subzones.ura.ts` (load URA GeoJSON)
- `backend/src/services/ingest/hawker.nea.ts` (load NEA hawker centres)
- `backend/src/services/ingest/mrt.ts` (load MRT exits)
- `backend/src/services/ingest/busStops.ts` (load LTA bus stops)

**Utilities Needed:**
- `backend/src/services/ingest/utils/geo.ts` — Point-in-polygon helper
- `backend/src/services/ingest/utils/http.ts` — Fetch/parse CSV/JSON

---

### Priority 3: Enrich Endpoints

**Update `/api/v1/geo/subzones`:**
```typescript
properties: {
  // ... existing ...
  hawkerCount: await prisma.hawkerCentre.count({ where: { subzoneId } }),
  mrtExitCount: await prisma.mrtExit.count({ where: { subzoneId } }),
  busStopCount: await prisma.busStop.count({ where: { subzoneId } }),
}
```

**Update `/api/v1/diag/status`:**
```typescript
{
  tables: {
    subzones: await prisma.subzone.count(),
    population: await prisma.population.count(),
    hawkerCentres: await prisma.hawkerCentre.count(),  // ✅ ADD
    mrtExits: await prisma.mrtExit.count(),            // ✅ ADD
    busStops: await prisma.busStop.count(),            // ✅ ADD
  },
  // ... snapshots, samples ...
}
```

---

### Priority 4: Environment & Documentation

**Add to `backend/.env.example`:**
```bash
# Dataset URLs
URA_SUBZONES_URL=https://data.gov.sg/api/action/datastore_search?resource_id=...
CENSUS2020_URL=https://data.gov.sg/api/action/datastore_search?resource_id=...
NEA_HAWKER_CENTRES_URL=https://data.gov.sg/api/action/datastore_search?resource_id=...
MRT_EXITS_URL=https://data.gov.sg/api/action/datastore_search?resource_id=...
LTA_BUS_STOPS_URL=http://datamall2.mytransport.sg/ltaodataservice/BusStops
LTA_ACCOUNT_KEY=your_lta_api_key_here
```

**Create `backend/docs/DATA_SOURCES.md`:**
- Document each dataset URL
- Field mappings (source → model)
- Normalization rules
- CRS/coordinate system (EPSG:4326)

---

## Conclusion

**Current State:**
- 🟡 **40% Complete** — Models exist but 3/5 datasets have NO ingestion or usage
- 🔴 **Critical Gap** — Point datasets (Hawker/MRT/Bus) are NOT linked to subzones
- 🟡 **Partial Usage** — Only Population is enriched in GeoJSON endpoint

**Required Work:**
1. Update Prisma schema (add foreign keys)
2. Create 4 ingestion scripts (subzones, hawker, mrt, bus)
3. Implement point-in-polygon utility
4. Enrich GeoJSON endpoint with counts
5. Update diagnostics endpoint
6. Add environment variables
7. Document all datasets

**Estimated Effort:** ~2-3 days for full implementation

---

**Audit Completed:** 2025-01-23


