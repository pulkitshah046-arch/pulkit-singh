import { Router } from 'express';
import { getConversationMessages, sendMessage } from '../controllers/chat.controller';
import { requireAuth, requireApproved } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireApproved);

router.get('/:conversationId/messages', getConversationMessages);
router.post('/:conversationId/messages', sendMessage);

export default router;
