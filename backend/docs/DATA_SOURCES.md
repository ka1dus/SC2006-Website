# Data Sources Documentation

This document describes the external data sources used by the Hawker Opportunity Score system, including dataset URLs, column mappings, normalization rules, and integration procedures.

## Population Dataset

### Source Information

**Dataset Name**: Singapore Population Data by Subzone  
**Provider**: Singapore Government Open Data Portal  
**URL**: `TODO: Add official government dataset URL here`  
**Environment Variable**: `GOV_POPULATION_DATA_URL`  
**Format**: JSON or CSV  
**Update Frequency**: Annual (typically)

### Column Mapping

The population dataset is expected to contain the following fields (field names may vary):

| Government Dataset Field | Our Field | Type | Description |
|-------------------------|-----------|------|-------------|
| `name`, `subzone`, `area`, or `location` | `rawName` | string | Name of the subzone/area |
| `population`, `total`, or `count` | `populationTotal` | integer | Total population count |
| `year` | `year` | integer | Data year (defaults to current year if missing) |
| `id`, `code`, or derived from name | `sourceKey` | string | Unique identifier from source |

### Normalization Rules

To match population data to our subzone records, we apply the following normalization:

1. **Case Normalization**: Convert to UPPERCASE
2. **Whitespace**: Trim and collapse multiple spaces to single space
3. **Punctuation**: Remove most punctuation except hyphens
4. **Hyphens**: Convert hyphens to spaces for consistent matching
5. **Suffix Removal**: Remove "SUBZONE" suffix if present
6. **Special Handling**: 
   - "TAMPINES-EAST" → "TAMPINES EAST"
   - "Marine Parade Subzone" → "MARINE PARADE"

**Example Transformations**:
```
"Tampines  East" → "TAMPINES EAST"
"Marine-Parade" → "MARINE PARADE"
"Punggol Field Subzone" → "PUNGGOL FIELD"
```

### Alias Mapping

Known aliases are maintained in `/src/services/ingest/utils/geo-matcher.ts`:

```typescript
export const ALIASES: Record<string, string> = {
  // "NORMALIZED_ALIAS": "SUBZONE_ID"
  // TODO: Add aliases as discovered during ingestion
};
```

Add new aliases when you discover alternate names for subzones in the dataset.

## Integration Procedures

### Running Population Ingestion

```bash
# Ensure environment variable is set
export GOV_POPULATION_DATA_URL="https://data.gov.sg/..."

# Run the ingestion script
npm run ingest:population
```

### Ingestion Workflow

1. **Fetch**: Download dataset from configured URL
2. **Parse**: Extract rows from JSON/CSV format
3. **Normalize**: Apply name normalization rules
4. **Match**: Attempt to match normalized names to subzones
5. **Upsert**: Update population records for matched subzones
6. **Log Unmatched**: Record unmatched entries in `PopulationUnmatched` table
7. **Snapshot**: Create a `DatasetSnapshot` record with results

### Idempotency

The ingestion script is designed to be idempotent:
- Running multiple times will **update** existing population records
- Latest year's data is retained (older data is replaced)
- Unmatched records are logged each time for review

### Handling Missing Data

If the population dataset URL is unavailable:
- Script logs a warning but **does not fail**
- Uses existing seed data (5 sample subzones)
- Creates a snapshot with status `partial` and error flag
- Frontend should display "—" or "No data" for missing values

## Database Schema

### Core Models

#### Subzone
```prisma
model Subzone {
  id           String   @id         // e.g., "TAMPINES_EAST"
  name         String   @db.VarChar(120)
  region       Region   @default(UNKNOWN)
  geomGeoJSON  Json?                // Optional GeoJSON polygon
  population   Population?          // 1:1 relationship
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

#### Population
```prisma
model Population {
  subzoneId   String  @id          // Foreign key to Subzone
  subzoneName String  @db.VarChar(120)
  year        Int                   // Data year
  total       Int                   // Total population
  subzone     Subzone @relation(...)
}
```

#### PopulationUnmatched
```prisma
model PopulationUnmatched {
  id         String   @id @default(cuid())
  sourceKey  String   @db.VarChar(200)
  rawName    String   @db.VarChar(200)
  reason     String?  @db.VarChar(200)  // e.g., "no_match"
  details    Json?                      // Additional context
  createdAt  DateTime @default(now())
}
```

#### DatasetSnapshot
```prisma
model DatasetSnapshot {
  id          String   @id @default(cuid())
  kind        String   @db.VarChar(64)    // "population"
  sourceUrl   String?  @db.VarChar(500)
  versionNote String?  @db.VarChar(200)
  startedAt   DateTime @default(now())
  finishedAt  DateTime?
  status      String   @db.VarChar(40)    // "success" | "partial" | "failed"
  meta        Json?                        // Stats and diagnostics
}
```

## Querying Unmatched Data

### View Unmatched Entries

```sql
SELECT sourceKey, rawName, reason
FROM "PopulationUnmatched"
ORDER BY createdAt DESC
LIMIT 100;
```

### Get Match Statistics

```sql
SELECT 
  COUNT(*) FILTER (WHERE reason = 'no_match') as no_match_count,
  COUNT(*) FILTER (WHERE reason = 'empty_name') as empty_name_count,
  COUNT(*) as total_unmatched
FROM "PopulationUnmatched";
```

### View Latest Snapshot

```sql
SELECT *
FROM "DatasetSnapshot"
WHERE kind = 'population'
ORDER BY startedAt DESC
LIMIT 1;
```

## Frontend Integration

### Displaying Population Data

- **With Data**: Display `Population.total` with year
- **No Data**: Display "—" or "No data available"
- **Check**: Query `Population` table by `subzoneId`

### Unmatched Count Badge

Show a badge/indicator if there are unmatched entries:

```typescript
const unmatchedCount = await prisma.populationUnmatched.count();
if (unmatchedCount > 0) {
  // Show admin notification
}
```

## Maintenance

### Adding New Subzones

If a new subzone appears in the population dataset:
1. It will be logged in `PopulationUnmatched`
2. Add it to the seed data or create manually:
   ```typescript
   await prisma.subzone.create({
     data: {
       id: 'NEW_SUBZONE_ID',
       name: 'New Subzone Name',
       region: 'EAST', // or appropriate region
     },
   });
   ```
3. Re-run ingestion: `npm run ingest:population`

### Updating Aliases

When you discover alternate names in the dataset:
1. Open `/src/services/ingest/utils/geo-matcher.ts`
2. Add to the `ALIASES` map:
   ```typescript
   "ALTERNATE NAME": "SUBZONE_ID"
   ```
3. Re-run ingestion to apply the alias

## Troubleshooting

### Issue: High Unmatched Count

**Solution**: 
1. Check `PopulationUnmatched` for patterns
2. Add aliases for common alternate names
3. Re-run ingestion

### Issue: Data Not Updating

**Solution**:
1. Check `DatasetSnapshot` for last successful run
2. Verify `GOV_POPULATION_DATA_URL` is accessible
3. Check logs for fetch/parse errors

### Issue: Script Crashes

**Solution**:
1. Check database connection
2. Verify Prisma schema is up to date: `npm run db:generate`
3. Check for validation errors in source data

## References

- [Singapore Open Data Portal](https://data.gov.sg/)
- [URA Master Plan](https://www.ura.gov.sg/maps/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

**Last Updated**: 2025-10-23  
**Maintained By**: SC2006 Team 5

