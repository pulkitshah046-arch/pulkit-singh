import { Router } from 'express';
import {
  getMyProfile,
  updateProfile,
  uploadProfilePhotos,
  deleteProfilePhoto,
  deleteMyAccount,
} from '../controllers/profile.controller';
import { requireAuth, requireApproved } from '../middleware/auth';
import { avatarUpload } from '../config/avatarMulter';

const router = Router();

router.use(requireAuth, requireApproved);

router.get('/me', getMyProfile);
router.put('/me', updateProfile);
router.post('/photos', avatarUpload.array('photos', 4), uploadProfilePhotos);
router.delete('/photos', deleteProfilePhoto);
router.delete('/me', deleteMyAccount);

export default router;
