import { Response } from 'express';
import { db, generateId, checkpointDatabase } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { calculateAge } from '../utils/ageValidator';

export const handleLike = (req: AuthRequest, res: Response): void => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user!.id;

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ success: false, error: 'Cannot like yourself or invalid user.' });
      return;
    }

    // Verify target user is active & approved
    const target = db.prepare(`
      SELECT u.id, u.verification_status, p.display_name, p.display_nickname, p.photos,
             p.course, p.academic_year, p.anonymous_avatar_gradient, p.show_course, p.show_academic_year,
             v.date_of_birth
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN student_verifications v ON v.user_id = u.id
      WHERE u.id = ? AND u.is_deleted = 0
    `).get(targetUserId) as any;

    if (!target || target.verification_status !== 'APPROVED') {
      res.status(404).json({ success: false, error: 'Target student not available or not verified.' });
      return;
    }

    const now = new Date().toISOString();

    // Insert like (or ignore if already exists)
    db.prepare(`
      INSERT OR IGNORE INTO likes (id, liker_id, liked_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(generateId(), currentUserId, targetUserId, now);

    // Check if target user has liked current user (Mutual Like Check)
    const reciprocalLike = db.prepare(`
      SELECT id FROM likes WHERE liker_id = ? AND liked_id = ?
    `).get(targetUserId, currentUserId);

    if (reciprocalLike) {
      // Order user IDs consistently to enforce unique constraint on matches
      const [u1, u2] = [currentUserId, targetUserId].sort();

      // Check if match already exists
      let match = db.prepare('SELECT id, is_active FROM matches WHERE user1_id = ? AND user2_id = ?').get(u1, u2) as any;
      let matchId = match?.id;

      if (!match) {
        matchId = generateId();
        const convId = generateId();

        db.exec('BEGIN TRANSACTION;');
        try {
          db.prepare(`
            INSERT INTO matches (
              id, user1_id, user2_id, is_active, reveal_state,
              user1_reveal_consent, user2_reveal_consent, created_at, updated_at
            ) VALUES (?, ?, ?, 1, 'anonymous', 0, 0, ?, ?)
          `).run(matchId, u1, u2, now, now);

          db.prepare(`
            INSERT INTO conversations (id, match_id, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `).run(convId, matchId, now, now);

          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        }
      } else if (match.is_active === 0) {
        // Reactivate match if both liked again
        db.prepare('UPDATE matches SET is_active = 1, unmatched_by = NULL, updated_at = ? WHERE id = ?')
          .run(now, matchId);
      }

      checkpointDatabase();

      const targetPhotos = JSON.parse(target.photos || '[]');
      const age = target.date_of_birth ? calculateAge(target.date_of_birth) : 18;
      const publicNickname = target.display_nickname || target.display_name || 'CampusPeer';

      const conv = db.prepare('SELECT id FROM conversations WHERE match_id = ?').get(matchId) as any;

      res.status(200).json({
        success: true,
        isMatch: true,
        match: {
          id: matchId,
          matchId,
          conversationId: conv?.id,
          revealState: 'anonymous',
          matchedUser: {
            id: target.id,
            displayName: publicNickname,
            displayNickname: publicNickname,
            age,
            course: target.show_course ? target.course : 'Verified Course',
            academicYear: target.show_academic_year ? target.academic_year : 'Student',
            photos: targetPhotos,
            photo: targetPhotos[0] || null,
            anonymousAvatarGradient: target.anonymous_avatar_gradient || 'rose',
          }
        }
      });
      return;
    }

    checkpointDatabase();
    res.status(200).json({
      success: true,
      isMatch: false,
    });
  } catch (error) {
    console.error('handleLike error:', error);
    res.status(500).json({ success: false, error: 'Failed to record like.' });
  }
};

export const getMatches = (req: AuthRequest, res: Response): void => {
  try {
    const currentUserId = req.user!.id;

    const matches = db.prepare(`
      SELECT m.id AS match_id, m.created_at AS matched_at, m.reveal_state, m.reveal_requested_by,
             m.user1_id, m.user2_id, m.user1_reveal_consent, m.user2_reveal_consent,
             c.id AS conversation_id,
             CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END AS partner_id,
             p.display_name, p.display_nickname, p.photos, p.course, p.academic_year,
             p.anonymous_avatar_gradient, p.show_course, p.show_academic_year,
             v.date_of_birth, v.first_name AS verified_first_name,
             (
               SELECT content FROM messages
               WHERE conversation_id = c.id
               ORDER BY created_at DESC LIMIT 1
             ) AS last_message,
             (
               SELECT created_at FROM messages
               WHERE conversation_id = c.id
               ORDER BY created_at DESC LIMIT 1
             ) AS last_message_time,
             (
               SELECT COUNT(*) FROM messages
               WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0
             ) AS unread_count
      FROM matches m
      JOIN conversations c ON c.match_id = m.id
      JOIN users u ON u.id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
      JOIN profiles p ON p.user_id = u.id
      JOIN student_verifications v ON v.user_id = u.id
      WHERE (m.user1_id = ? OR m.user2_id = ?)
        AND m.is_active = 1
        AND u.is_deleted = 0
      ORDER BY COALESCE(last_message_time, m.created_at) DESC
    `).all(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId) as any[];

    const formattedMatches = matches.map((m) => {
      const photos = JSON.parse(m.photos || '[]');
      const age = m.date_of_birth ? calculateAge(m.date_of_birth) : 18;
      const isRevealed = m.reveal_state === 'revealed';
      const publicNickname = m.display_nickname || m.display_name || 'CampusPeer';

      // Determine revealState from current user's perspective
      let clientRevealState: 'anonymous' | 'reveal_requested' | 'reveal_pending' | 'revealed' | 'reverted_to_anonymous' = 'anonymous';
      if (m.reveal_state === 'revealed') {
        clientRevealState = 'revealed';
      } else if (m.reveal_state === 'reveal_requested') {
        clientRevealState = m.reveal_requested_by === currentUserId ? 'reveal_requested' : 'reveal_pending';
      } else if (m.reveal_state === 'reverted_to_anonymous') {
        clientRevealState = 'reverted_to_anonymous';
      }

      return {
        matchId: m.match_id,
        conversationId: m.conversation_id,
        matchedAt: m.matched_at,
        lastMessage: m.last_message || null,
        lastMessageTime: m.last_message_time || null,
        unreadCount: Number(m.unread_count || 0),
        revealState: clientRevealState,
        revealRequestedBy: m.reveal_requested_by,
        revealedIdentity: isRevealed
          ? { realFirstName: m.verified_first_name, course: m.course }
          : null,
        partner: {
          id: m.partner_id,
          displayName: publicNickname,
          displayNickname: publicNickname,
          age,
          course: m.show_course ? m.course : 'Verified Course',
          academicYear: m.show_academic_year ? m.academic_year : 'Student',
          photos,
          photo: photos[0] || null,
          anonymousAvatarGradient: m.anonymous_avatar_gradient || 'rose',
        }
      };
    });

    res.status(200).json({ success: true, matches: formattedMatches });
  } catch (error) {
    console.error('getMatches error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve matches.' });
  }
};

/**
 * Request identity reveal in chat
 */
export const requestIdentityReveal = (req: AuthRequest, res: Response): void => {
  try {
    const { matchId } = req.params;
    const currentUserId = req.user!.id;

    const match = db.prepare(`
      SELECT m.id, m.user1_id, m.user2_id, m.is_active, m.reveal_state, c.id AS conversation_id,
             p.display_nickname, p.display_name
      FROM matches m
      JOIN conversations c ON c.match_id = m.id
      JOIN profiles p ON p.user_id = ?
      WHERE m.id = ? AND (m.user1_id = ? OR m.user2_id = ?)
    `).get(currentUserId, matchId, currentUserId, currentUserId) as any;

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found.' });
      return;
    }

    if (match.is_active === 0) {
      res.status(403).json({ success: false, error: 'Match is no longer active.' });
      return;
    }

    if (match.reveal_state === 'revealed') {
      res.status(400).json({ success: false, error: 'Identities are already revealed.' });
      return;
    }

    const isUser1 = match.user1_id === currentUserId;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE matches
      SET reveal_state = 'reveal_requested',
          reveal_requested_by = ?,
          user1_reveal_consent = CASE WHEN ? = 1 THEN 1 ELSE user1_reveal_consent END,
          user2_reveal_consent = CASE WHEN ? = 0 THEN 1 ELSE user2_reveal_consent END,
          updated_at = ?
      WHERE id = ?
    `).run(currentUserId, isUser1 ? 1 : 0, isUser1 ? 1 : 0, now, matchId);

    // Record system notification message in conversation
    const requesterNickname = match.display_nickname || match.display_name || 'Campus Student';
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      generateId(),
      match.conversation_id,
      currentUserId,
      `[SYSTEM]: ${requesterNickname} requested to exchange verified real names. Both students must consent to reveal.`,
      now
    );

    checkpointDatabase();

    res.status(200).json({
      success: true,
      revealState: 'reveal_requested',
      message: 'Identity reveal request sent. Waiting for partner consent.'
    });
  } catch (error) {
    console.error('requestIdentityReveal error:', error);
    res.status(500).json({ success: false, error: 'Failed to request identity reveal.' });
  }
};

/**
 * Accept partner's identity reveal request
 */
export const acceptIdentityReveal = (req: AuthRequest, res: Response): void => {
  try {
    const { matchId } = req.params;
    const currentUserId = req.user!.id;

    const match = db.prepare(`
      SELECT m.id, m.user1_id, m.user2_id, m.is_active, m.reveal_state, m.reveal_requested_by,
             c.id AS conversation_id,
             v_partner.first_name AS partner_real_first_name,
             p_partner.course AS partner_course
      FROM matches m
      JOIN conversations c ON c.match_id = m.id
      JOIN student_verifications v_partner ON v_partner.user_id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
      JOIN profiles p_partner ON p_partner.user_id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
      WHERE m.id = ? AND (m.user1_id = ? OR m.user2_id = ?)
    `).get(currentUserId, currentUserId, matchId, currentUserId, currentUserId) as any;

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found.' });
      return;
    }

    if (match.is_active === 0) {
      res.status(403).json({ success: false, error: 'Match is no longer active.' });
      return;
    }

    if (match.reveal_state === 'revealed') {
      res.status(200).json({ success: true, revealState: 'revealed', message: 'Identities are already revealed.' });
      return;
    }

    if (match.reveal_requested_by === currentUserId) {
      res.status(400).json({ success: false, error: 'You are the requester. Waiting for partner acceptance.' });
      return;
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE matches
      SET reveal_state = 'revealed',
          user1_reveal_consent = 1,
          user2_reveal_consent = 1,
          revealed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, matchId);

    // Record system celebration in conversation
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      generateId(),
      match.conversation_id,
      currentUserId,
      `[SYSTEM]: Mutual consent confirmed! Real identities have been revealed for both students. You can return to Anonymous Mode at any time in options.`,
      now
    );

    checkpointDatabase();

    res.status(200).json({
      success: true,
      revealState: 'revealed',
      message: 'Mutual consent granted. Identities revealed.',
      revealedIdentity: {
        realFirstName: match.partner_real_first_name,
        course: match.partner_course
      }
    });
  } catch (error) {
    console.error('acceptIdentityReveal error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept identity reveal.' });
  }
};

/**
 * Decline partner's identity reveal request
 */
export const declineIdentityReveal = (req: AuthRequest, res: Response): void => {
  try {
    const { matchId } = req.params;
    const currentUserId = req.user!.id;

    const match = db.prepare(`
      SELECT m.id, m.user1_id, m.user2_id, m.is_active, m.reveal_state, m.reveal_requested_by,
             c.id AS conversation_id
      FROM matches m
      JOIN conversations c ON c.match_id = m.id
      WHERE m.id = ? AND (m.user1_id = ? OR m.user2_id = ?)
    `).get(matchId, currentUserId, currentUserId) as any;

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found.' });
      return;
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE matches
      SET reveal_state = 'anonymous',
          reveal_requested_by = NULL,
          user1_reveal_consent = 0,
          user2_reveal_consent = 0,
          updated_at = ?
      WHERE id = ?
    `).run(now, matchId);

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      generateId(),
      match.conversation_id,
      currentUserId,
      `[SYSTEM]: The identity reveal request was declined. Conversation remains completely anonymous.`,
      now
    );

    checkpointDatabase();

    res.status(200).json({
      success: true,
      revealState: 'anonymous',
      message: 'Identity reveal request declined.'
    });
  } catch (error) {
    console.error('declineIdentityReveal error:', error);
    res.status(500).json({ success: false, error: 'Failed to decline identity reveal.' });
  }
};

/**
 * Reversible Identity Reveal: Return conversation to Anonymous Mode
 * Either user can independently activate this at any time without partner permission.
 */
export const revertIdentityReveal = (req: AuthRequest, res: Response): void => {
  try {
    const { matchId } = req.params;
    const currentUserId = req.user!.id;

    const match = db.prepare(`
      SELECT m.id, m.user1_id, m.user2_id, m.is_active, m.reveal_state,
             c.id AS conversation_id
      FROM matches m
      JOIN conversations c ON c.match_id = m.id
      WHERE m.id = ? AND (m.user1_id = ? OR m.user2_id = ?)
    `).get(matchId, currentUserId, currentUserId) as any;

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found.' });
      return;
    }

    if (match.reveal_state !== 'revealed') {
      res.status(400).json({ success: false, error: 'Conversation is not in revealed mode.' });
      return;
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE matches
      SET reveal_state = 'reverted_to_anonymous',
          reveal_requested_by = NULL,
          user1_reveal_consent = 0,
          user2_reveal_consent = 0,
          reverted_at = ?,
          reverted_by = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, currentUserId, now, matchId);

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      generateId(),
      match.conversation_id,
      currentUserId,
      `[SYSTEM]: A participant returned this chat to Anonymous Mode. Real names and identity fields are hidden again. (Previously viewed information cannot be erased from human memory).`,
      now
    );

    checkpointDatabase();

    res.status(200).json({
      success: true,
      revealState: 'reverted_to_anonymous',
      message: 'Returned to anonymous mode. Real names are hidden again.'
    });
  } catch (error) {
    console.error('revertIdentityReveal error:', error);
    res.status(500).json({ success: false, error: 'Failed to revert to anonymous mode.' });
  }
};

export const unmatch = (req: AuthRequest, res: Response): void => {
  try {
    const { matchId } = req.params;
    const currentUserId = req.user!.id;

    const match = db.prepare(`
      SELECT id, user1_id, user2_id FROM matches
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    `).get(matchId, currentUserId, currentUserId) as any;

    if (!match) {
      res.status(404).json({ success: false, error: 'Match not found.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE matches SET is_active = 0, unmatched_by = ?, updated_at = ? WHERE id = ?')
      .run(currentUserId, now, matchId);

    checkpointDatabase();

    res.status(200).json({ success: true, message: 'Unmatched successfully. Chat access revoked.' });
  } catch (error) {
    console.error('unmatch error:', error);
    res.status(500).json({ success: false, error: 'Failed to unmatch.' });
  }
};
