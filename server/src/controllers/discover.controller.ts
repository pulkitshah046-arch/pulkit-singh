import { Response } from 'express';
import { db, generateId, checkpointDatabase } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { calculateAge } from '../utils/ageValidator';

export const getDiscoveryDeck = (req: AuthRequest, res: Response): void => {
  try {
    const currentUserId = req.user!.id;

    // Fetch me to check gender and match preference
    const me = db.prepare(`
      SELECT p.gender, p.match_preference
      FROM profiles p
      WHERE p.user_id = ?
    `).get(currentUserId) as any;

    const myPref = me?.match_preference || 'EVERYONE';

    // Find all users to exclude: self, already liked, already passed, blocked either way
    const excludedRows = db.prepare(`
      SELECT liked_id AS id FROM likes WHERE liker_id = ?
      UNION
      SELECT passed_id AS id FROM passes WHERE passer_id = ?
      UNION
      SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?
      UNION
      SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?
    `).all(currentUserId, currentUserId, currentUserId, currentUserId) as { id: string }[];

    const excludedIds = new Set<string>(excludedRows.map((r) => r.id));
    excludedIds.add(currentUserId);

    // Query active and approved student profiles
    // NOTE: Strictly exclude v.first_name, u.email, v.id_card_image_path from the query
    const candidates = db.prepare(`
      SELECT u.id, p.display_name, p.display_nickname, p.anonymous_avatar_gradient,
             p.show_course, p.show_academic_year, p.bio, p.gender, p.course, p.academic_year,
             p.photos, p.interests, p.favourite_music, p.favourite_media, p.prompts,
             v.date_of_birth
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN student_verifications v ON v.user_id = u.id
      WHERE u.verification_status = 'APPROVED'
        AND u.role = 'STUDENT'
        AND u.is_discovery_paused = 0
        AND u.is_deleted = 0
      ORDER BY u.created_at DESC
    `).all() as any[];

    const deck = candidates
      .filter((candidate) => !excludedIds.has(candidate.id))
      .filter((candidate) => {
        // Gender preference filtering
        if (myPref === 'MEN' && candidate.gender !== 'MAN') return false;
        if (myPref === 'WOMEN' && candidate.gender !== 'WOMAN') return false;
        return true;
      })
      .map((candidate) => {
        const photos = JSON.parse(candidate.photos || '[]');
        const age = candidate.date_of_birth ? calculateAge(candidate.date_of_birth) : 18;
        const nickname = candidate.display_nickname || candidate.display_name || 'CampusPeer';
        const showCourse = candidate.show_course !== 0;
        const showYear = candidate.show_academic_year !== 0;

        return {
          id: candidate.id,
          userId: candidate.id,
          displayName: nickname,
          displayNickname: nickname,
          age,
          course: showCourse ? candidate.course : 'Verified Course',
          academicYear: showYear ? candidate.academic_year : 'Student',
          bio: candidate.bio || '',
          gender: candidate.gender,
          photos, // Optional! Can be empty array []
          anonymousAvatarGradient: candidate.anonymous_avatar_gradient || 'rose',
          interests: JSON.parse(candidate.interests || '[]'),
          favouriteMusic: candidate.favourite_music,
          favouriteMedia: candidate.favourite_media,
          prompts: JSON.parse(candidate.prompts || '[]'),
        };
      });

    res.status(200).json({ success: true, deck, cards: deck });
  } catch (error) {
    console.error('getDiscoveryDeck error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve discovery candidates.' });
  }
};

export const recordPass = (req: AuthRequest, res: Response): void => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user!.id;

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ success: false, error: 'Invalid candidate.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO passes (id, passer_id, passed_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(generateId(), currentUserId, targetUserId, now);

    checkpointDatabase();

    res.status(200).json({ success: true, message: 'Profile passed.' });
  } catch (error) {
    console.error('recordPass error:', error);
    res.status(500).json({ success: false, error: 'Failed to record pass.' });
  }
};
