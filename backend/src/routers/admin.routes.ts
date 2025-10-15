import { Router } from 'express';
import { 
  refreshDatasets,
  getAllSnapshots,
  getSnapshotById,
  createSnapshot,
  getKernelConfigs,
  createKernelConfig,
  getSystemStats
} from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth';

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Dataset management
router.post('/refresh-datasets', refreshDatasets);

// Snapshot management
router.get('/snapshots', getAllSnapshots);
router.get('/snapshots/:id', getSnapshotById);
router.post('/snapshots', createSnapshot);

// Kernel configuration
router.get('/kernel-configs', getKernelConfigs);
router.post('/kernel-configs', createKernelConfig);

// System statistics
router.get('/stats', getSystemStats);

export default router;
