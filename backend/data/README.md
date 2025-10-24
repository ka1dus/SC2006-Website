# URA Master Plan 2019 Subzone Data

## Required File

Place the URA Master Plan 2019 Subzone Boundaries GeoJSON file here:

```
backend/data/ura_subzones_2019.geojson
```

## File Requirements

- **Format:** GeoJSON FeatureCollection
- **CRS:** WGS84 (EPSG:4326) with coordinates as [longitude, latitude]
- **Geometry:** Polygon or MultiPolygon
- **Properties:** Must include:
  - Subzone identifier (code or name that can be used as stable ID)
  - Subzone name
  - Region information (optional, will default to "UNKNOWN" if missing)

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

