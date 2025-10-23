# Frontend Setup - Task 3 Map Implementation

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Required for API communication
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Mapbox Token (Optional but Recommended)
# IMPORTANT: Must be a PUBLIC token starting with "pk." (not a secret token!)
# Required scopes: styles:read, tiles:read, fonts:read, sprites:read
# Get your token from: https://account.mapbox.com/access-tokens/
NEXT_PUBLIC_MAPBOX_TOKEN=pk.YourPublicTokenHere
```

### Mapbox Token Setup

1. **Get a Token:**
   - Visit https://account.mapbox.com/access-tokens/
   - Create a new token or use an existing one
   - **MUST** be a **public token** (starts with `pk.`)
   - **MUST** have these scopes: `styles:read`, `tiles:read`, `fonts:read`, `sprites:read`

2. **Add to `.env.local`:**
   ```bash
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoi...your_actual_token...
   ```

3. **Restart Next.js:**
   - Next.js requires a restart after `.env.local` changes
   - Stop the dev server (Ctrl+C) and run `npm run dev` again

### Token-Free Fallback

**If your Mapbox token is missing or invalid**, the app will automatically:
- ✅ Switch to **MapLibre + OpenStreetMap** (no token required)
- ✅ Show a yellow banner explaining the fallback
- ✅ Continue working with full functionality (polygons, selection, comparison)
- ✅ Display in light OSM style instead of dark Mapbox style

**This means the app NEVER crashes due to token issues!**

## Routes

- `/` - Main map view with Task 3 HomeMapScreen
- `/compare` - Side-by-side subzone comparison view
- `/login` - Authentication (legacy, currently bypassed)
- `/register` - User registration (legacy)
- `/admin` - Admin dashboard (legacy)

## Architecture

### Pages Router Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── _app.tsx          # App wrapper with providers
│   │   ├── index.tsx         # Main map page (/)
│   │   └── compare.tsx       # Comparison page (/compare)
│   ├── screens/MainUI/
│   │   ├── HomeMapScreen.tsx # Task 3 map screen
│   │   ├── CompareView.tsx   # Task 3 comparison screen
│   │   └── components/       # Map components
│   ├── services/
│   │   ├── api.ts           # Base API client
│   │   └── subzones.ts      # Subzone API endpoints
│   ├── utils/
│   │   ├── hooks/           # Custom React hooks
│   │   └── geojson/         # Map utilities
│   └── styles/
│       ├── globals.css      # Global styles
│       └── map.css          # Map-specific styles
└── public/
    └── data/
        └── subzones.geojson # Fallback GeoJSON data
```

### SSR Handling

All Mapbox components are dynamically imported with `ssr: false` to prevent server-side rendering issues:

```typescript
const HomeMapScreen = dynamic(
  () => import('@/screens/MainUI/HomeMapScreen'),
  { ssr: false }
);
```

## API Endpoints Used

### Task 2 Backend API

- `GET /api/v1/subzones` - List subzones with filters
- `GET /api/v1/subzones/:id` - Get single subzone details
- `GET /api/v1/subzones:batch?ids=...` - Get multiple subzones for comparison
- `GET /api/v1/geo/subzones` - Get GeoJSON FeatureCollection for map

### Fallback Behavior

If the API is unreachable or returns errors:
1. Map loads fallback GeoJSON from `/public/data/subzones.geojson`
2. Population data shows as "—" (missing)
3. Yellow warning banners indicate missing data
4. Application remains functional for browsing

## Development

### Running Backend + Frontend

Terminal 1 - Backend (port 3001):
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend (port 3000):
```bash
cd frontend
npm run dev
```

### Verification

Check backend health:
```bash
curl http://localhost:3001/health
```

Check API endpoints:
```bash
curl http://localhost:3001/api/v1/subzones
curl http://localhost:3001/api/v1/geo/subzones
```

## Troubleshooting

### Frontend shows 404

- Ensure `src/pages/index.tsx` exists with default export
- Check Next.js is running on correct port (3000)
- Clear `.next` cache: `rm -rf .next && npm run dev`

### Map not rendering

- Check browser console for Mapbox errors
- Verify Mapbox CSS is loaded (check Network tab)
- Ensure `NEXT_PUBLIC_MAPBOX_TOKEN` is set (optional)
- Fallback GeoJSON should load even without token

### API fetch errors

- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is enabled in backend
- Check browser console for fetch errors

### TypeScript errors

```bash
npm run typecheck
```

Common fixes:
- Ensure all dependencies are installed
- Check `tsconfig.json` paths are correct
- Verify `@/*` aliases resolve to `src/*`

## Task 3 Components

### HomeMapScreen

Main map experience with:
- Interactive Mapbox map with subzone polygons
- Color-coded population visualization
- Hover tooltips with subzone info
- Click to select (max 2 subzones)
- Selection tray with Compare button
- Clear All button

### CompareView

Side-by-side comparison with:
- Demographics (population, year)
- Metrics placeholders (demand, supply, accessibility, score)
- Missing data warnings
- Back to map navigation

### MapContainer

Core Mapbox integration:
- Dynamic layer updates
- Hover and click interactions
- Tooltip positioning
- Feature querying

## Next Steps

- Add search functionality
- Implement region filters
- Add score calculations (Task 4+)
- Real URA GeoJSON integration
- Production deployment

---

**Built by SC2006 Team 5**

