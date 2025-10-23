// backend/src/main.ts
import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Routers
import apiRouter from './routers/api';
import authRouter from './routers/auth.routes';
import subzonesRouter from './routers/subzones.routes';
import adminRouter from './routers/admin.routes';
import exportRouter from './routers/export.routes';

// Middlewares
import { errorHandler } from './middlewares/errorHandler';
import { authMiddleware } from './middlewares/auth';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ---- Config -----------------------------------------------------------------

// Prefer SERVER_PORT; fall back to PORT; default 4000 (to avoid 3001 collisions)
const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 4000);

// Frontend origins (support CSV in FRONTEND_URLS, single FRONTEND_URL, plus sensible defaults)
const defaultOrigins = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);
if (process.env.FRONTEND_URL) defaultOrigins.add(process.env.FRONTEND_URL);
if (process.env.FRONTEND_URLS) {
  process
    .env
    .FRONTEND_URLS
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(o => defaultOrigins.add(o));
}

// ---- Hardening & basics -----------------------------------------------------

app.set('trust proxy', true);

app.use(helmet({
  crossOriginEmbedderPolicy: false, // keep DevTools/maps happy in dev
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      // Allow inline styles during dev (Next.js)
      "style-src": ["'self'", "'unsafe-inline'", "https:"],
      // Images can be data: (dev screenshots/maps)
      "img-src": ["'self'", "data:"],
    },
  },
}));

// CORS (allow our FE origins; handle preflight)
const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    // Allow non-browser tools (curl/Postman) with no Origin header
    if (!origin) return cb(null, true);
    if (defaultOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,             // set true only if you use cookies
  maxAge: 86400,                  // cache preflight for 1 day
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (see exactly what the FE is calling)
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Health & utilities -----------------------------------------------------

// Shallow health check (no DB)
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Deep health check (DB connectivity)
app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', db: 'up' });
  } catch (e: any) {
    console.error('DB healthcheck failed:', e?.message ?? e);
    res.status(500).json({ status: 'ERROR', db: 'down' });
  }
});

// Test endpoint to create a token for local testing
app.get('/test-token', (_req, res) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'CLIENT',
    },
    process.env.JWT_SECRET || 'hawker-opportunity-score-super-secret-key-2025',
    { expiresIn: '24h' }
  );
  res.json({
    token,
    message: 'Use this token for testing. Add it to localStorage as "token".',
  });
});

// ---- API routes (your prefixes) ---------------------------------------------

// NOTE: Your frontend base should be http://localhost:<PORT>/api
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);
app.use('/api/subzones', subzonesRouter);
app.use('/api/admin', authMiddleware, adminRouter);
app.use('/api/export', authMiddleware, exportRouter);

// ---- 404 & error handling ---------------------------------------------------

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Must be the last middleware
app.use(errorHandler);

// ---- Startup / graceful shutdown -------------------------------------------

async function connectWithRetry(maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[DB] Connecting (attempt ${attempt}/${maxRetries})...`);
      await prisma.$connect();

      // Warm up Neon to avoid first-request cold start
      await prisma.$queryRaw`SELECT 1`;
      console.log('[DB] Connected & warmed up.');
      return;
    } catch (e: any) {
      console.error(`[DB] Connect failed (${attempt}):`, e?.message ?? e);
      if (attempt >= maxRetries) throw e;
      await new Promise(r => setTimeout(r, attempt * 1000)); // backoff
    }
  }
}

function setupSignals() {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    try {
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    // don’t exit immediately; let errorHandler/logging capture it
  });
}

async function start() {
  try {
    await connectWithRetry();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check:   http://localhost:${PORT}/health`);
      console.log(`🩺 DB health:      http://localhost:${PORT}/health/db`);
      console.log(`🔗 API base URL:   http://localhost:${PORT}/api`);
      console.log(
        `🌐 CORS allowed:   ${Array.from(defaultOrigins).join(', ') || '(none)'}`
      );
    });

    setupSignals();
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
}

start();

export default app;
