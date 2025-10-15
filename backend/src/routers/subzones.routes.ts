import { Router } from 'express';
import { 
  getAllSubzonesHandler,
  getSubzoneByIdHandler,
  getSubzoneDetailsHandler,
  searchSubzonesHandler,
  getAllRegionsHandler,
  getLatestScoresHandler,
  getScoresByPercentileHandler
} from '../controllers/subzones.controller';
import { optionalAuthMiddleware } from '../middlewares/auth';

const router = Router();

// Apply optional auth to all routes (for analytics)
router.use(optionalAuthMiddleware);

// Subzone routes
router.get('/', getAllSubzonesHandler);
router.get('/search', searchSubzonesHandler);
router.get('/regions', getAllRegionsHandler);
router.get('/:id', getSubzoneByIdHandler);
router.get('/:id/details', getSubzoneDetailsHandler);

// Score routes
router.get('/scores/latest', getLatestScoresHandler);
router.get('/scores/percentile', getScoresByPercentileHandler);

export default router;
