import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routers
import apiRouter from './routers/api';
import authRouter from './routers/auth.routes';
import subzonesRouter from './routers/subzones.routes'; // Legacy routes with 501 stubs
import subzonesRouterV1 from './routers/subzones.router'; // Task 2 API
import adminRouter from './routers/admin.routes';
import exportRouter from './routers/export.routes';

// Import middlewares
import { errorHandler } from './middlewares/errorHandler';
import { authMiddleware } from './middlewares/auth';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.SERVER_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test endpoint to create a valid token for testing
app.get('/test-token', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      id: 'test-user-id', 
      email: 'test@example.com', 
      role: 'CLIENT' 
    },
    process.env.JWT_SECRET || 'hawker-opportunity-score-super-secret-key-2025',
    { expiresIn: '24h' }
  );
  res.json({ 
    token,
    message: 'Use this token for testing. Add it to localStorage as "token"'
  });
});

// API routes
app.use('/api', apiRouter);
app.use('/api/auth', authRouter);
app.use('/api/subzones', subzonesRouter); // Legacy routes (return 501, redirect to /api/v1)
app.use('/api/v1', subzonesRouterV1); // Task 2 versioned API (recommended)
app.use('/api/admin', authMiddleware, adminRouter);
app.use('/api/export', authMiddleware, exportRouter);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

export default app;
