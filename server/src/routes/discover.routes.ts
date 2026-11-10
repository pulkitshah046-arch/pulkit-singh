import { Router } from 'express';
import { getDiscoveryDeck, recordPass } from '../controllers/discover.controller';
import { requireAuth, requireApproved } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireApproved);

router.get('/', getDiscoveryDeck);
router.get('/deck', getDiscoveryDeck);
router.post('/pass', recordPass);

export default router;
