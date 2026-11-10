import { Router } from 'express';
import { blockUser, reportItem } from '../controllers/moderation.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/block', blockUser);
router.post('/report', reportItem);

export default router;
