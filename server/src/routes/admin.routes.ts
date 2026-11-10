import { Router } from 'express';
import {
  getAdminAnalytics,
  getVerifications,
  streamIdCardImage,
  reviewVerification,
  toggleUserSuspension,
  getReports,
  resolveReport,
  getAuditLogs,
  seedDemoProfiles,
} from '../controllers/admin.controller';
import { requireAuth, requireFounder } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireFounder);

router.get('/analytics', getAdminAnalytics);
router.get('/verifications', getVerifications);
router.get('/verifications/:id/id-card', streamIdCardImage);
router.post('/verifications/:id/review', reviewVerification);
router.post('/users/:userId/suspend', toggleUserSuspension);
router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);
router.get('/audit-logs', getAuditLogs);
router.post('/demo-data', seedDemoProfiles);

export default router;
