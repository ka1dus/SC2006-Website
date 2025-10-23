# Legacy Routes Fix - Handler Mismatch Resolution

## Problem

The old router at `backend/src/routers/subzones.routes.ts` was importing handler names that didn't exist in the controller, causing the error:

```
Error: Route.get() requires a callback function but got a [object Undefined]
```

**Router Expected:**
- `getAllSubzonesHandler`
- `getSubzoneByIdHandler`
- `getSubzoneDetailsHandler`
- `searchSubzonesHandler`
- `getAllRegionsHandler`
- `getLatestScoresHandler`
- `getScoresByPercentileHandler`

**Controller Had:**
- `listSubzonesHandler` (Task 2)
- `getSubzoneHandler` (Task 2)
- `batchSubzonesHandler` (Task 2)
- `getGeoJSONHandler` (Task 2)
- `getUnmatchedHandler` (Task 2)

## Solution

Added legacy handler aliases and 501 stub implementations to `backend/src/controllers/subzones.controller.ts`:

### 1. Aliases (Backward Compatibility)

```typescript
// Map old names to new Task 2 handlers
export const getAllSubzonesHandler = listSubzonesHandler;
export const getSubzoneByIdHandler = getSubzoneHandler;
```

### 2. Stub Implementations (501 Not Implemented)

All unimplemented legacy endpoints now return helpful 501 responses:

```typescript
// Example stub
export async function getSubzoneDetailsHandler(req, res, next) {
  try {
    res.status(501).json({
      error: 'NOT_IMPLEMENTED',
      message: 'This endpoint is deprecated. Use /api/v1/subzones/:id instead.',
      alternative: `/api/v1/subzones/${req.params.id}`,
    });
    return;
  } catch (error) {
    next(error);
  }
}
```

Stubs implemented for:
- `getSubzoneDetailsHandler`
- `searchSubzonesHandler`
- `getAllRegionsHandler`
- `getLatestScoresHandler`
- `getScoresByPercentileHandler`

## API Routes Now Available

### Task 2 API (Recommended) ✅

**Base:** `/api/v1`

- `GET /api/v1/subzones` - List subzones with filters (✅ Functional)
- `GET /api/v1/subzones/:id` - Get single subzone (✅ Functional)
- `GET /api/v1/subzones:batch?ids=...` - Batch fetch for comparison (✅ Functional)
- `GET /api/v1/geo/subzones` - GeoJSON for map rendering (✅ Functional)
- `GET /api/v1/population/unmatched` - Debug unmatched data (✅ Functional, dev-only)

### Legacy API (Backward Compatibility)

**Base:** `/api/subzones`

- `GET /api/subzones` - Alias for `/api/v1/subzones` (✅ Functional via alias)
- `GET /api/subzones/:id` - Alias for `/api/v1/subzones/:id` (✅ Functional via alias)
- `GET /api/subzones/search?q=...` - Returns 501, redirect to `/api/v1/subzones?q=...`
- `GET /api/subzones/:id/details` - Returns 501, redirect to `/api/v1/subzones/:id`
- `GET /api/subzones/regions` - Returns 501 with hardcoded region list
- `GET /api/scores/latest` - Returns 501 (not yet implemented)
- `GET /api/scores/percentile` - Returns 501 (not yet implemented)

## Testing Results

### Health Check ✅
```bash
$ curl http://localhost:3001/health
{"status":"OK","timestamp":"2025-10-23T19:34:58.178Z","version":"1.0.0"}
```

### Task 2 API (Functional) ✅
```bash
$ curl http://localhost:3001/api/v1/subzones
[
  {"id":"JURONG_WEST_CENTRAL","name":"Jurong West Central","region":"WEST","population":{"total":41000,"year":2023}},
  {"id":"MARINE_PARADE","name":"Marine Parade","region":"CENTRAL","population":{"total":32000,"year":2023}},
  ...
]
```

### Legacy API via Alias ✅
```bash
$ curl http://localhost:3001/api/subzones
[
  {"id":"JURONG_WEST_CENTRAL","name":"Jurong West Central","region":"WEST","population":{"total":41000,"year":2023}},
  ...
]
```

### Legacy API Stubs (501) ✅
```bash
$ curl http://localhost:3001/api/subzones/search?q=tampines
{
  "error":"NOT_IMPLEMENTED",
  "message":"This endpoint is deprecated. Use /api/v1/subzones?q=... instead.",
  "alternative":"/api/v1/subzones?q=tampines"
}

$ curl http://localhost:3001/api/subzones/TAMPINES_EAST/details
{
  "error":"NOT_IMPLEMENTED",
  "message":"This endpoint is deprecated. Use /api/v1/subzones/:id instead.",
  "alternative":"/api/v1/subzones/TAMPINES_EAST"
}
```

## Architecture

Both API versions can now coexist:

```
Express App
├── /api (api.ts router)
│   ├── /auth (auth.routes.ts)
│   ├── /subzones (subzones.routes.ts) ← Legacy routes
│   │   ├── GET / → getAllSubzonesHandler (alias → listSubzonesHandler)
│   │   ├── GET /:id → getSubzoneByIdHandler (alias → getSubzoneHandler)
│   │   ├── GET /search → searchSubzonesHandler (501 stub)
│   │   ├── GET /:id/details → getSubzoneDetailsHandler (501 stub)
│   │   ├── GET /regions → getAllRegionsHandler (501 stub)
│   │   └── GET /scores/* → get*ScoresHandler (501 stubs)
│   ├── /admin (admin.routes.ts)
│   └── /export (export.routes.ts)
├── /api/v1 (subzones.router.ts) ← Task 2 API (Recommended)
│   ├── GET /subzones → listSubzonesHandler
│   ├── GET /subzones/:id → getSubzoneHandler
│   ├── GET /subzones:batch → batchSubzonesHandler
│   ├── GET /geo/subzones → getGeoJSONHandler
│   └── GET /population/unmatched → getUnmatchedHandler
```

## Benefits

1. **No Breaking Changes** - Old routes still respond (either functional or helpful 501)
2. **Clear Migration Path** - 501 responses include alternative endpoint URLs
3. **Task 2 Implementation Preserved** - All new handlers remain functional
4. **Clean Deprecation** - Legacy endpoints clearly marked as deprecated
5. **Backend Starts Successfully** - No more "callback function undefined" errors

## Migration Guide for Frontend

If your frontend uses old API paths, migrate to Task 2 API:

### Old (Legacy)
```typescript
// ❌ Old endpoint
GET /api/subzones?region=EAST

// ❌ Old search
GET /api/subzones/search?q=tampines

// ❌ Old details
GET /api/subzones/TAMPINES_EAST/details
```

### New (Task 2) ✅
```typescript
// ✅ New endpoint (with filters)
GET /api/v1/subzones?region=EAST&q=tampines

// ✅ New details (same data, cleaner endpoint)
GET /api/v1/subzones/TAMPINES_EAST

// ✅ New batch fetch for comparison
GET /api/v1/subzones:batch?ids=TAMPINES_EAST,MARINE_PARADE

// ✅ New GeoJSON for maps
GET /api/v1/geo/subzones?region=EAST
```

## Status

✅ Backend starts successfully on port 3001
✅ All Task 2 endpoints functional
✅ Legacy endpoints return valid responses (functional or 501)
✅ No "undefined handler" errors
✅ Both route versions coexist without conflicts

## Files Modified

1. `backend/src/controllers/subzones.controller.ts`
   - Added `getAllSubzonesHandler` alias
   - Added `getSubzoneByIdHandler` alias
   - Added 5 stub implementations (501 responses)

2. `backend/src/routers/subzones.routes.ts`
   - Restored (was .disabled)
   - Now imports valid handlers (aliases + stubs)

3. `backend/src/routers/api.ts`
   - Re-enabled subzonesRouter import
   - Mounts at `/api/subzones`

4. `backend/src/main.ts`
   - Re-enabled subzonesRouter import
   - Mounts at `/api/subzones`
   - Task 2 router remains at `/api/v1` (recommended)

## Commit

```
fix: Add legacy handler aliases and 501 stubs for old routes

Controller Changes:
- Added getAllSubzonesHandler as alias for listSubzonesHandler
- Added getSubzoneByIdHandler as alias for getSubzoneHandler
- Implemented 501 stubs for deprecated endpoints
- All stubs return helpful alternative endpoint info

Router Changes:
- Restored subzones.routes.ts
- Re-enabled in api.ts and main.ts
- Legacy routes at /api/subzones (501 or alias)
- Task 2 routes at /api/v1 (recommended)

Resolves: Route.get() requires a callback function but got undefined
```

---

**SC2006 Team 5 - October 23, 2025**

