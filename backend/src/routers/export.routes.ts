import { Router } from 'express';
import { 
  exportSubzoneDetails,
  exportComparison
} from '../controllers/export.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Export routes
router.post('/subzone', exportSubzoneDetails);
router.post('/comparison', exportComparison);

export default router;
