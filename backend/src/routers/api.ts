import { Router } from 'express';

// Import feature routers
import authRouter from './auth.routes';
// import subzonesRouter from './subzones.routes'; // Disabled - using Task 2 API at /api/v1 instead
import adminRouter from './admin.routes';
import exportRouter from './export.routes';

const router = Router();

// Mount feature routers
router.use('/auth', authRouter);
// router.use('/subzones', subzonesRouter); // Disabled - using Task 2 API at /api/v1 instead
router.use('/admin', adminRouter);
router.use('/export', exportRouter);

// API health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
