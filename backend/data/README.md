# Dataset Files Directory

This directory stores all government datasets used for ingestion into the database.

## 📁 Expected Files

Place your downloaded datasets here. Scripts will check this folder first before attempting URL fetch.

### PART A: Subzones (Required ✅)
```
backend/data/ura_subzones_2019.geojson
```

### PART B: Population (Optional)
```
backend/data/census_2020_population.csv
# OR
backend/data/census_2020_population.json
```

### PART C: Point Features (Optional)
```
backend/data/nea_hawker_centres.json
backend/data/mrt_station_exits.json
backend/data/lta_bus_stops.json
```

---

## 🔄 Ingestion Strategy

All ingestion scripts follow this pattern:

1. ✅ **Try Local File First** - Check `backend/data/` for the file
2. 🌐 **Fallback to URL** - If file not found, try fetching from configured URL in `.env`
3. ❌ **Clear Error** - If both fail, show helpful message

### Example:
```bash
# From project root:

# Option 1: Place file locally (recommended)
cp ~/Downloads/census_2020_population.csv backend/data/

# Option 2: Configure URL in backend/.env
CENSUS2020_URL=https://data.gov.sg/api/.../census_2020.csv

# Run ingestion (from backend directory)
cd backend && npm run ingest:population
```

---

## 📥 File Requirements

### URA Subzones (ura_subzones_2019.geojson)
- **Format:** GeoJSON FeatureCollection
- **Geometry:** Polygon or MultiPolygon
- **Properties:** Must include `Description` field with HTML table containing:
  - `SUBZONE_C` (code/ID)
  - `SUBZONE_N` (name)
  - `REGION_N` (region)
- **CRS:** WGS84 (EPSG:4326)

### Census Population (census_2020_population.csv or .json)
- **Format:** CSV or JSON
- **Required Columns:**
  - Subzone name (e.g., "Planning Area", "Subzone")
  - Population count (e.g., "Total", "Population")
  - Year (optional, defaults to 2020)
- **Note:** Names will be normalized and matched to subzones

### NEA Hawker Centres (nea_hawker_centres.json)
- **Format:** GeoJSON FeatureCollection
- **Geometry:** Point
- **Required Properties:**
  - `name` or `NAME` - Hawker centre name
  - `ADDRESS` or `address` (optional)
  - Coordinates: [longitude, latitude]

### MRT Station Exits (mrt_station_exits.json)
- **Format:** GeoJSON FeatureCollection
- **Geometry:** Point
- **Required Properties:**
  - `STN_NAME` or `station` - Station name
  - `EXIT_CODE` or `exit_code` - Exit identifier
  - Coordinates: [longitude, latitude]

### LTA Bus Stops (lta_bus_stops.json)
- **Format:** JSON array
- **Required Fields:**
  - `BusStopCode` - Unique bus stop code
  - `Description` or `RoadName` - Location description
  - `Latitude`, `Longitude` - Coordinates

---

## 📚 Data Sources

All datasets should ideally come from official Singapore government portals:

1. **URA Master Plan 2019** - Urban Redevelopment Authority
   - Portal: https://www.ura.gov.sg/maps/
   - Note: May require manual download or API access

2. **Census 2020 Population** - Department of Statistics
   - Portal: https://www.singstat.gov.sg/
   - Alternative: https://data.gov.sg/

3. **NEA Hawker Centres** - National Environment Agency
   - Portal: https://data.gov.sg/
   - Dataset ID: Search for "hawker centres"

4. **MRT Station Exits** - Land Transport Authority
   - Portal: https://datamall.lta.gov.sg/
   - Note: Requires LTA DataMall API key

5. **Bus Stops** - Land Transport Authority
   - Portal: https://datamall.lta.gov.sg/
   - Note: Requires LTA DataMall API key

## Example Structure

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "SUBZONE_C": "BDSZ01",
        "SUBZONE_N": "Bedok South",
        "PLN_AREA_C": "BD",
        "PLN_AREA_N": "Bedok",
        "REGION_C": "ER",
        "REGION_N": "East Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[103.93, 1.32], [103.94, 1.32], ...]]
      }
    }
  ]
}
```

## After Placing the File

1. Verify the file is correctly placed:
   ```bash
   ls -lh backend/data/ura_subzones_2019.geojson
   ```

2. Run the ingestion script:
   ```bash
   cd backend
   npm run ingest:subzones
   ```

3. Verify ingestion:
   ```bash
   curl http://localhost:3001/api/v1/diag/status
   ```

Expected: `subzones` count should be > 300 (Singapore has ~320+ subzones)

## Coordinate Order

⚠️ **CRITICAL:** GeoJSON uses [longitude, latitude] order, NOT [latitude, longitude]

- ✅ Correct: `[103.8198, 1.3521]` (Singapore)
- ❌ Wrong: `[1.3521, 103.8198]`

If coordinates are swapped, the map will not render correctly.

## Data Sources

- **URA SPACE:** https://eservice.ura.gov.sg/maps/?service=mp&year=2019
- **Contact:** Urban Redevelopment Authority for dataset access
- **OneMap API:** Singapore's official mapping service (may have MP2019)

## Notes

- This folder is included in `.gitignore` to avoid committing large GeoJSON files
- The ingestion script is idempotent (safe to re-run)
- All subzones will be stored in PostgreSQL with full geometry

