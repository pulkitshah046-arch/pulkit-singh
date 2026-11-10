import { Router } from 'express';
import {
  handleLike,
  getMatches,
  unmatch,
  requestIdentityReveal,
  acceptIdentityReveal,
  declineIdentityReveal,
  revertIdentityReveal,
} from '../controllers/match.controller';
import { requireAuth, requireApproved } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireApproved);

router.post('/like', handleLike);
router.get('/', getMatches);
router.post('/:matchId/unmatch', unmatch);

// Reversible Identity Reveal endpoints
router.post('/:matchId/reveal/request', requestIdentityReveal);
router.post('/:matchId/reveal/accept', acceptIdentityReveal);
router.post('/:matchId/reveal/decline', declineIdentityReveal);
router.post('/:matchId/reveal/revert', revertIdentityReveal);

export default router;
