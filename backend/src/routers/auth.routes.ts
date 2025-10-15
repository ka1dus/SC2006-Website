import { Router } from 'express';
import { 
  register, 
  login, 
  changePasswordHandler, 
  resetPasswordHandler, 
  getProfile, 
  logout 
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPasswordHandler);

// Protected routes
router.use(authMiddleware);
router.get('/profile', getProfile);
router.post('/change-password', changePasswordHandler);
router.post('/logout', logout);

export default router;
