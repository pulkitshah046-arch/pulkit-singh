import { Response } from 'express';
import { db, generateId, checkpointDatabase } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { calculateAge } from '../utils/ageValidator';

/**
 * Fetch messages for a conversation with anonymous privacy model & reversible reveal state
 */
export const getConversationMessages = (req: AuthRequest, res: Response): void => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user!.id;

    // Validate conversation existence & user participation in the match
    const conversation = db.prepare(`
      SELECT c.id, c.match_id, m.user1_id, m.user2_id, m.is_active,
             m.reveal_state, m.reveal_requested_by, m.user1_reveal_consent, m.user2_reveal_consent,
             u1.id AS u1_id, u2.id AS u2_id,
             p1.display_name AS u1_name, p2.display_name AS u2_name,
             p1.display_nickname AS u1_nickname, p2.display_nickname AS u2_nickname,
             p1.anonymous_avatar_gradient AS u1_gradient, p2.anonymous_avatar_gradient AS u2_gradient,
             p1.show_course AS u1_show_course, p2.show_course AS u2_show_course,
             p1.show_academic_year AS u1_show_year, p2.show_academic_year AS u2_show_year,
             p1.photos AS u1_photos, p2.photos AS u2_photos,
             p1.course AS u1_course, p2.course AS u2_course,
             p1.academic_year AS u1_year, p2.academic_year AS u2_year,
             v1.date_of_birth AS u1_dob, v2.date_of_birth AS u2_dob,
             v1.first_name AS u1_real_first_name, v2.first_name AS u2_real_first_name
      FROM conversations c
      JOIN matches m ON m.id = c.match_id
      JOIN users u1 ON u1.id = m.user1_id
      JOIN users u2 ON u2.id = m.user2_id
      JOIN profiles p1 ON p1.user_id = u1.id
      JOIN profiles p2 ON p2.user_id = u2.id
      JOIN student_verifications v1 ON v1.user_id = u1.id
      JOIN student_verifications v2 ON v2.user_id = u2.id
      WHERE c.id = ?
    `).get(conversationId) as any;

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found.' });
      return;
    }

    if (conversation.user1_id !== currentUserId && conversation.user2_id !== currentUserId) {
      res.status(403).json({ success: false, error: 'Forbidden: You are not part of this conversation.' });
      return;
    }

    if (conversation.is_active === 0) {
      res.status(403).json({ success: false, error: 'Match is no longer active. Chat access revoked.' });
      return;
    }

    // Determine partner
    const isUser1 = conversation.user1_id === currentUserId;
    const partnerId = isUser1 ? conversation.user2_id : conversation.user1_id;
    const partnerNickname = isUser1
      ? (conversation.u2_nickname || conversation.u2_name || 'CampusPeer')
      : (conversation.u1_nickname || conversation.u1_name || 'CampusPeer');
    const partnerShowCourse = isUser1 ? conversation.u2_show_course : conversation.u1_show_course;
    const partnerShowYear = isUser1 ? conversation.u2_show_year : conversation.u1_show_year;
    const partnerCourse = partnerShowCourse !== 0
      ? (isUser1 ? conversation.u2_course : conversation.u1_course)
      : 'Verified PCTE Student';
    const partnerYear = partnerShowYear !== 0
      ? (isUser1 ? conversation.u2_year : conversation.u1_year)
      : '';
    const partnerPhotos = JSON.parse(isUser1 ? conversation.u2_photos : conversation.u1_photos || '[]');
    const partnerGradient = isUser1 ? (conversation.u2_gradient || 'rose') : (conversation.u1_gradient || 'rose');
    const partnerDob = isUser1 ? conversation.u2_dob : conversation.u1_dob;
    const partnerAge = partnerDob ? calculateAge(partnerDob) : 18;
    const partnerRealFirstName = isUser1 ? conversation.u2_real_first_name : conversation.u1_real_first_name;

    // Check if either user has blocked the other
    const block = db.prepare(`
      SELECT id FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(currentUserId, partnerId, partnerId, currentUserId);

    if (block) {
      res.status(403).json({ success: false, error: 'Chat is unavailable because a user has been blocked.' });
      return;
    }

    // Mark partner's unread messages as read
    db.prepare(`
      UPDATE messages
      SET is_read = 1
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `).run(conversationId, currentUserId);

    checkpointDatabase();

    // Fetch message history
    const messages = db.prepare(`
      SELECT id, conversation_id, sender_id, content, is_read, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(conversationId).map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      isRead: msg.is_read === 1,
      createdAt: msg.created_at,
      isMe: msg.sender_id === currentUserId,
      isSystem: msg.content.startsWith('[SYSTEM]:'),
    }));

    // Determine reveal state from current user's perspective
    let clientRevealState: 'anonymous' | 'reveal_requested' | 'reveal_pending' | 'revealed' | 'reverted_to_anonymous' = 'anonymous';
    const isRevealed = conversation.reveal_state === 'revealed';

    if (isRevealed) {
      clientRevealState = 'revealed';
    } else if (conversation.reveal_state === 'reveal_requested') {
      clientRevealState = conversation.reveal_requested_by === currentUserId ? 'reveal_requested' : 'reveal_pending';
    } else if (conversation.reveal_state === 'reverted_to_anonymous') {
      clientRevealState = 'reverted_to_anonymous';
    }

    res.status(200).json({
      success: true,
      matchId: conversation.match_id,
      revealState: clientRevealState,
      revealRequestedBy: conversation.reveal_requested_by,
      revealedIdentity: isRevealed
        ? { realFirstName: partnerRealFirstName, course: partnerCourse }
        : null,
      partner: {
        id: partnerId,
        displayName: partnerNickname,
        displayNickname: partnerNickname,
        age: partnerAge,
        course: partnerCourse,
        academicYear: partnerYear,
        photos: partnerPhotos,
        photo: partnerPhotos[0] || null,
        anonymousAvatarGradient: partnerGradient,
      },
      messages,
    });
  } catch (error) {
    console.error('getConversationMessages error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve messages.' });
  }
};

/**
 * Send a new message
 */
export const sendMessage = (req: AuthRequest, res: Response): void => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user!.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Message cannot be empty.' });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ success: false, error: 'Message exceeds maximum length of 1000 characters.' });
      return;
    }

    const conversation = db.prepare(`
      SELECT c.id, m.user1_id, m.user2_id, m.is_active
      FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = ?
    `).get(conversationId) as any;

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found.' });
      return;
    }

    if (conversation.user1_id !== currentUserId && conversation.user2_id !== currentUserId) {
      res.status(403).json({ success: false, error: 'Forbidden: You are not part of this conversation.' });
      return;
    }

    if (conversation.is_active === 0) {
      res.status(403).json({ success: false, error: 'Cannot send message: match has been unmatched.' });
      return;
    }

    const partnerId = conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;

    // Check block
    const block = db.prepare(`
      SELECT id FROM blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(currentUserId, partnerId, partnerId, currentUserId);

    if (block) {
      res.status(403).json({ success: false, error: 'Cannot send message to this student.' });
      return;
    }

    const messageId = generateId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(messageId, conversationId, currentUserId, content.trim(), now);

    checkpointDatabase();

    res.status(201).json({
      success: true,
      message: {
        id: messageId,
        conversationId,
        senderId: currentUserId,
        content: content.trim(),
        isRead: false,
        createdAt: now,
        isMe: true,
        isSystem: false,
      }
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message.' });
  }
};
