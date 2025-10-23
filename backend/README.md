# Hawker Opportunity Score - Backend API

Production-ready PostgreSQL + Prisma database layer for the SC2006 Hawker Opportunity Score platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Git

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your database credentials and configuration

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

## 📊 Database Setup

### Initial Setup

```bash
# Generate Prisma Client from schema
npm run db:generate

# Run migrations (production)
npm run db:migrate

# Run migrations (development with prompts)
npm run db:migrate:dev

# Seed with 5 sample subzones
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Database Schema

The system uses PostgreSQL with Prisma ORM. Core models:

- **Subzone**: Singapore URA subzones with stable IDs, names, regions, and optional GeoJSON
- **Population**: Latest population data per subzone (1:1 relationship)
- **PopulationUnmatched**: Logs entries from government datasets that couldn't be matched
- **DatasetSnapshot**: Audit trail of data ingestion runs with status and metadata

See `/docs/DATA_SOURCES.md` for detailed schema documentation.

## 🔄 Data Ingestion

### Population Data Ingestion

```bash
# Run population data ingestion
npm run ingest:population
```

**Features**:
- ✅ Fetches from government open data portal (when URL configured)
- ✅ Normalizes and matches subzone names
- ✅ Records unmatched entries for review
- ✅ Idempotent (safe to run multiple times)
- ✅ Creates audit snapshots
- ✅ Gracefully handles missing/unavailable data sources

**Configuration**:

Set `GOV_POPULATION_DATA_URL` in `.env`:
```bash
GOV_POPULATION_DATA_URL=https://data.gov.sg/api/...
```

**Without Data Source**:
If URL is not configured, the script will:
- Log a warning (not an error)
- Use existing seed data
- Create a snapshot with `partial` status
- Allow the system to continue functioning

### Viewing Ingestion Results

```sql
-- Latest snapshot
SELECT * FROM "DatasetSnapshot"
WHERE kind = 'population'
ORDER BY "startedAt" DESC
LIMIT 1;

-- Unmatched entries
SELECT "sourceKey", "rawName", "reason"
FROM "PopulationUnmatched"
ORDER BY "createdAt" DESC;

-- Population data
SELECT s.name, p.total, p.year
FROM "Subzone" s
LEFT JOIN "Population" p ON s.id = p."subzoneId";
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Coverage**:
- ✅ Name normalization (case, punctuation, spacing)
- ✅ Matching algorithms (exact, alias)
- ✅ Upsert idempotency
- ✅ Snapshot creation
- ✅ Unmatched entry logging

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Sample data
│   └── migrations/             # Database migrations
├── src/
│   ├── main.ts                 # Server entry point
│   ├── db/
│   │   └── index.ts           # Prisma client singleton
│   ├── services/
│   │   └── ingest/
│   │       ├── population.ts   # Main ingestion logic
│   │       ├── utils/
│   │       │   ├── normalize.ts    # Name normalization
│   │       │   └── geo-matcher.ts  # Subzone matching
│   │       └── __tests__/
│   │           └── population.ingest.spec.ts
│   ├── controllers/            # API route handlers
│   ├── routers/                # Express routers
│   ├── middlewares/            # Auth, error handling
│   └── schemas/                # Zod validation schemas
├── docs/
│   └── DATA_SOURCES.md        # Data dictionary
├── env.example                 # Environment template
├── package.json
└── README.md                   # This file
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run migrations (production) |
| `npm run db:migrate:dev` | Run migrations (development) |
| `npm run db:reset` | Reset database (deletes all data) |
| `npm run db:seed` | Seed database with sample data |
| `npm run ingest:population` | Run population data ingestion |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## 🌍 Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key

# Optional
GOV_POPULATION_DATA_URL=https://data.gov.sg/...
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 📖 API Endpoints

### Health Check
```
GET /health
```

### Authentication
```
POST /api/auth/register   # Register new user
POST /api/auth/login      # Login
GET  /api/auth/profile    # Get profile
```

### Subzones
```
GET  /api/subzones              # List all subzones
GET  /api/subzones/:id          # Get subzone details
GET  /api/subzones/search?q=... # Search by name
```

### Admin
```
POST /api/admin/refresh-datasets  # Trigger data refresh
GET  /api/admin/snapshots         # List snapshots
```

See `/docs/API.md` for complete API documentation (if available).

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod
- SQL injection protection via Prisma
- CORS configuration
- Helmet.js for HTTP headers

## 📊 Database Maintenance

### Adding New Subzones

```typescript
await prisma.subzone.create({
  data: {
    id: 'SUBZONE_ID',
    name: 'Subzone Name',
    region: 'EAST', // CENTRAL, EAST, NORTH, NORTH_EAST, WEST, UNKNOWN
  },
});
```

### Adding Aliases

Edit `/src/services/ingest/utils/geo-matcher.ts`:

```typescript
export const ALIASES: Record<string, string> = {
  "ALTERNATE_NAME": "SUBZONE_ID",
};
```

Then re-run ingestion:
```bash
npm run ingest:population
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
npm run db:generate
```

### Migration Errors

```bash
# Reset and start fresh (WARNING: deletes data)
npm run db:reset

# Or manually fix
npx prisma migrate resolve --applied <migration-name>
```

### High Unmatched Count

1. Check `/docs/DATA_SOURCES.md` for normalization rules
2. Add aliases in `/src/services/ingest/utils/geo-matcher.ts`
3. Re-run ingestion

## 📝 Documentation

- [Data Sources & Schema](/docs/DATA_SOURCES.md) - Detailed data dictionary
- [Prisma Schema](/prisma/schema.prisma) - Database models
- [Ingestion Service](/src/services/ingest/population.ts) - Pipeline logic

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Build: `npm run build`
5. Commit and push

## 📄 License

MIT - SC2006 Team 5

## ✅ Task 1 Completion Checklist

- [x] Prisma schema with Subzone, Population, PopulationUnmatched, DatasetSnapshot
- [x] Migration `init_subzones_population_001` created and applied
- [x] Seed data with 5 sample subzones and population totals
- [x] Database client (`/src/db/index.ts`)
- [x] Normalization utilities (`/src/services/ingest/utils/normalize.ts`)
- [x] Geo-matcher with alias support (`/src/services/ingest/utils/geo-matcher.ts`)
- [x] Population ingestion service (`/src/services/ingest/population.ts`)
- [x] Comprehensive tests (`/src/services/ingest/__tests__/population.ingest.spec.ts`)
- [x] Data dictionary (`/docs/DATA_SOURCES.md`)
- [x] NPM scripts (db:generate, db:migrate, ingest:population, test)
- [x] `.env.example` with DATABASE_URL and GOV_POPULATION_DATA_URL
- [x] Graceful handling of missing/unavailable data sources
- [x] Idempotent ingestion (safe to re-run)
- [x] Unmatched entry logging
- [x] Dataset snapshots with audit trail

---

**Built with** ❤️ **by SC2006 Team 5**

