import { Response } from 'express';
import { db, generateId } from '../db/database';
import { AuthRequest } from '../middleware/auth';

export const blockUser = (req: AuthRequest, res: Response): void => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user!.id;

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ success: false, error: 'Cannot block yourself or invalid user.' });
      return;
    }

    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      // Insert block
      db.prepare(`
        INSERT OR IGNORE INTO blocks (id, blocker_id, blocked_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(generateId(), currentUserId, targetUserId, now);

      // Deactivate any existing match between them
      const [u1, u2] = [currentUserId, targetUserId].sort();
      db.prepare(`
        UPDATE matches
        SET is_active = 0, unmatched_by = ?, updated_at = ?
        WHERE user1_id = ? AND user2_id = ?
      `).run(currentUserId, now, u1, u2);

      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    res.status(200).json({
      success: true,
      message: 'User has been blocked. They will no longer appear in your discovery deck or matches.'
    });
  } catch (error) {
    console.error('blockUser error:', error);
    res.status(500).json({ success: false, error: 'Failed to block user.' });
  }
};

export const reportItem = (req: AuthRequest, res: Response): void => {
  try {
    const { reportedUserId, category, details } = req.body;
    const currentUserId = req.user!.id;

    if (!reportedUserId || !category || !details) {
      res.status(400).json({ success: false, error: 'Missing required report fields.' });
      return;
    }

    const validCategories = [
      'FAKE_PROFILE',
      'HARASSMENT',
      'INAPPROPRIATE_CONTENT',
      'SPAM',
      'IMPERSONATION',
      'UNDERAGE',
      'OTHER',
    ];

    if (!validCategories.includes(category)) {
      res.status(400).json({ success: false, error: 'Invalid report category.' });
      return;
    }

    const reportId = generateId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reports (id, reporter_id, reported_id, category, details, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `).run(reportId, currentUserId, reportedUserId, category, details.slice(0, 1000), now, now);

    res.status(201).json({
      success: true,
      message: 'Thank you for your report. The founder will review this matter promptly to maintain campus community standards.'
    });
  } catch (error) {
    console.error('reportItem error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit report.' });
  }
};
