import { Router } from 'express';
import { register, login, getMe, changePassword } from '../controllers/auth.controller';
import { idCardUpload } from '../config/multer';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, idCardUpload.single('idCard'), register);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

export default router;
