import { Response } from 'express';
import { db, generateId, checkpointDatabase } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

/**
 * Platform analytics for Founder Super Admin
 */
export const getAdminAnalytics = (req: AuthRequest, res: Response): void => {
  try {
    const totalUsers = (db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'STUDENT' AND is_deleted = 0").get() as any).count;
    const pendingCount = (db.prepare("SELECT COUNT(*) AS count FROM student_verifications WHERE status = 'PENDING_VERIFICATION'").get() as any).count;
    const approvedCount = (db.prepare("SELECT COUNT(*) AS count FROM student_verifications WHERE status = 'APPROVED'").get() as any).count;
    const rejectedCount = (db.prepare("SELECT COUNT(*) AS count FROM student_verifications WHERE status = 'REJECTED'").get() as any).count;
    const suspendedCount = (db.prepare("SELECT COUNT(*) AS count FROM users WHERE verification_status = 'SUSPENDED'").get() as any).count;
    const totalMatches = (db.prepare("SELECT COUNT(*) AS count FROM matches WHERE is_active = 1").get() as any).count;
    const totalReports = (db.prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'PENDING'").get() as any).count;

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        pendingCount,
        approvedCount,
        rejectedCount,
        suspendedCount,
        totalMatches,
        totalReports,
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to compute analytics.' });
  }
};

/**
 * Retrieve verification applications
 */
export const getVerifications = (req: AuthRequest, res: Response): void => {
  try {
    const { status } = req.query;

    let query = `
      SELECT v.id, v.user_id, v.first_name, v.date_of_birth, v.course, v.academic_year,
             v.status, v.rejection_reason, v.created_at, v.reviewed_at,
             u.email, u.verification_status, u.is_discovery_paused
      FROM student_verifications v
      JOIN users u ON u.id = v.user_id
    `;

    const params: any[] = [];
    if (status && typeof status === 'string' && status !== 'ALL') {
      query += ' WHERE v.status = ?';
      params.push(status);
    }
    query += ' ORDER BY v.created_at DESC';

    const applications = db.prepare(query).all(...params).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      dateOfBirth: row.date_of_birth,
      course: row.course,
      academicYear: row.academic_year,
      status: row.status,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      user: {
        email: row.email,
        verificationStatus: row.verification_status,
        isDiscoveryPaused: row.is_discovery_paused === 1,
      }
    }));

    res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error('getVerifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch verifications.' });
  }
};

/**
 * Securely stream private student ID image to verified founder
 */
export const streamIdCardImage = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;

    const row = db.prepare('SELECT id_card_image_path, id_card_mime_type FROM student_verifications WHERE id = ?').get(id) as any;

    if (!row || !row.id_card_image_path) {
      res.status(404).json({ success: false, error: 'ID card record not found.' });
      return;
    }

    const PRIVATE_ID_DIR = path.resolve(process.cwd(), 'storage', 'private_ids');
    const filePath = path.resolve(row.id_card_image_path);
    if (!filePath.startsWith(PRIVATE_ID_DIR)) {
      res.status(403).json({ success: false, error: 'Access violation: Path outside private storage.' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Physical ID image missing from secure storage.' });
      return;
    }

    res.setHeader('Content-Type', row.id_card_mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    console.error('streamIdCardImage error:', error);
    res.status(500).json({ success: false, error: 'Failed to stream ID card.' });
  }
};

/**
 * Approve or reject an applicant
 */
export const reviewVerification = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ success: false, error: 'Action must be APPROVE or REJECT.' });
      return;
    }

    const verification = db.prepare('SELECT id, user_id, first_name FROM student_verifications WHERE id = ? OR user_id = ?').get(id, id) as any;
    if (!verification) {
      res.status(404).json({ success: false, error: 'Verification application not found.' });
      return;
    }

    // Security Check: No user can approve their own verification
    if (verification.user_id === req.user!.id) {
      res.status(403).json({
        success: false,
        error: 'Self-approval forbidden: An applicant cannot review or approve their own student ID verification.'
      });
      return;
    }

    const isApproval = action === 'APPROVE';
    const newStatus = isApproval ? 'APPROVED' : 'REJECTED';
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE student_verifications
        SET status = ?, rejection_reason = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, isApproval ? null : (rejectionReason || 'Physical ID did not meet verification criteria.'), now, req.user!.id, now, verification.id);

      db.prepare(`
        UPDATE users
        SET verification_status = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, now, verification.user_id);

      db.prepare(`
        INSERT INTO admin_audit_logs (id, actor_id, action, target_id, details, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        req.user!.id,
        isApproval ? 'APPROVE_STUDENT' : 'REJECT_STUDENT',
        verification.user_id,
        JSON.stringify({ verificationId: id, applicantName: verification.first_name, rejectionReason }),
        req.ip || null,
        now
      );

      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    checkpointDatabase();

    res.status(200).json({
      success: true,
      message: `Student application has been ${isApproval ? 'approved' : 'rejected'}.`
    });
  } catch (error) {
    console.error('reviewVerification error:', error);
    res.status(500).json({ success: false, error: 'Failed to process verification decision.' });
  }
};

/**
 * Suspend or reinstate user
 */
export const toggleUserSuspension = (req: AuthRequest, res: Response): void => {
  try {
    const { userId } = req.params;
    const { suspend, reason } = req.body;

    const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(userId) as any;
    if (!user || user.role === 'FOUNDER') {
      res.status(400).json({ success: false, error: 'Cannot modify status for founder or non-existent user.' });
      return;
    }

    const newStatus = suspend ? 'SUSPENDED' : 'APPROVED';
    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE users
        SET verification_status = ?, is_discovery_paused = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, suspend ? 1 : 0, now, userId);

      db.prepare(`
        INSERT INTO admin_audit_logs (id, actor_id, action, target_id, details, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        req.user!.id,
        suspend ? 'SUSPEND_ACCOUNT' : 'REINSTATE_ACCOUNT',
        userId,
        JSON.stringify({ reason: reason || 'Founder discretion', userEmail: user.email }),
        req.ip || null,
        now
      );

      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    res.status(200).json({
      success: true,
      message: `User has been ${suspend ? 'suspended' : 'reinstated'}.`
    });
  } catch (error) {
    console.error('toggleUserSuspension error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user suspension.' });
  }
};

/**
 * View safety reports
 */
export const getReports = (req: AuthRequest, res: Response): void => {
  try {
    const reports = db.prepare(`
      SELECT r.id, r.category, r.details, r.status, r.action_taken, r.created_at,
             reporter.email AS reporter_email,
             reported.id AS reported_id, reported.email AS reported_email,
             p.display_name AS reported_name
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      JOIN users reported ON reported.id = r.reported_id
      LEFT JOIN profiles p ON p.user_id = reported.id
      ORDER BY r.created_at DESC
    `).all();

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error('getReports error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports.' });
  }
};

/**
 * Resolve report
 */
export const resolveReport = (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, actionTaken } = req.body; // 'RESOLVED' | 'DISMISSED'

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE reports
      SET status = ?, action_taken = ?, reviewed_by = ?, updated_at = ?
      WHERE id = ?
    `).run(status, actionTaken || 'Reviewed by founder', req.user!.id, now, id);

    db.prepare(`
      INSERT INTO admin_audit_logs (id, actor_id, action, target_id, details, ip_address, created_at)
      VALUES (?, ?, 'RESOLVE_REPORT', ?, ?, ?, ?)
    `).run(
      generateId(),
      req.user!.id,
      id,
      JSON.stringify({ status, actionTaken }),
      req.ip || null,
      now
    );

    res.status(200).json({ success: true, message: 'Report updated.' });
  } catch (error) {
    console.error('resolveReport error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve report.' });
  }
};

/**
 * View audit logs
 */
export const getAuditLogs = (req: AuthRequest, res: Response): void => {
  try {
    const logs = db.prepare(`
      SELECT l.id, l.action, l.target_id, l.details, l.ip_address, l.created_at,
             u.email AS actor_email
      FROM admin_audit_logs l
      JOIN users u ON u.id = l.actor_id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).all().map((l: any) => ({
      ...l,
      details: l.details ? JSON.parse(l.details) : null,
    }));

    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs.' });
  }
};

/**
 * Demo Mode Seed: Fictional PCTE student profiles for testing
 */
export const seedDemoProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const demoStudents = [
      {
        email: 'demo.ananya@pcte.test',
        firstName: 'Ananya',
        dob: '2004-03-14',
        course: 'B.Tech CSE',
        year: '3rd Year',
        gender: 'WOMAN',
        bio: 'Tech lead at PCTE Coding Club. Obsessed with indie acoustic songs, hot cold brews, and hackathons.',
        photos: [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
        ],
        interests: ['Coding', 'Coffee', 'Music Production', 'Badminton', 'Startups'],
        music: 'Prateek Kuhad, The Local Train',
        media: 'Silicon Valley, Interstellar',
        prompts: [
          { prompt: 'My ideal weekend looks like...', answer: 'Coding on a side project at a cozy Ludhiana cafe with good headphones.' },
          { prompt: 'The fastest way to make me smile...', answer: 'Surprise me with an iced Americano and talk about startup ideas.' }
        ]
      },
      {
        email: 'demo.kabir@pcte.test',
        firstName: 'Kabir',
        dob: '2003-08-22',
        course: 'B.Tech AI & DS',
        year: '4th Year',
        gender: 'MAN',
        bio: 'Machine learning nerd by day, campus guitarist by night. Looking for someone to explore food spots near campus with.',
        photos: [
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
        ],
        interests: ['Gym', 'Gaming', 'Formula Student', 'Anime', 'Debate'],
        music: 'Coldplay, Diljit Dosanjh, Linkin Park',
        media: 'Peaky Blinders, Arcane',
        prompts: [
          { prompt: 'Together we could...', answer: 'Find the undisputed best late-night momo place near campus.' },
          { prompt: 'My unpopular opinion is...', answer: 'Morning lectures are actually great if you bring a large cup of coffee.' }
        ]
      },
      {
        email: 'demo.meher@pcte.test',
        firstName: 'Meher',
        dob: '2004-11-05',
        course: 'BBA',
        year: '2nd Year',
        gender: 'WOMAN',
        bio: 'Event coordinator, podcast enthusiast, and amateur photographer. Let us capture memories.',
        photos: [
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
        ],
        interests: ['Photography', 'Reading', 'Culinary', 'Coffee', 'Debate'],
        music: 'Taylor Swift, Arijit Singh',
        media: 'Succession, Fleabag',
        prompts: [
          { prompt: 'One thing I want to try...', answer: 'Taking candid film camera portraits of interesting people around campus.' },
          { prompt: 'My perfect first date...', answer: 'A stroll around Sarabha Nagar market talking about our biggest dreams.' }
        ]
      },
      {
        email: 'demo.rohan@pcte.test',
        firstName: 'Rohan',
        dob: '2003-05-18',
        course: 'BCA',
        year: '3rd Year',
        gender: 'MAN',
        bio: 'Full-stack builder and fitness fanatic. If I am not in the gym or computer lab, I am probably watching Formula 1.',
        photos: [
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80'
        ],
        interests: ['Gym', 'Coding', 'Formula Student', 'Startups'],
        music: 'The Weeknd, AP Dhillon',
        media: 'Drive to Survive, Dark',
        prompts: [
          { prompt: 'The fastest way to make me smile...', answer: 'Remind me that race day is tomorrow.' }
        ]
      }
    ];

    const now = new Date().toISOString();

    for (const s of demoStudents) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(s.email);
      if (existing) continue;

      const userId = generateId();
      const vId = generateId();
      const pId = generateId();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, role, verification_status, is_discovery_paused, is_deleted, created_at, updated_at)
        VALUES (?, ?, '$2a$10$fakesecretpasshashnotvalid', 'STUDENT', 'APPROVED', 0, 0, ?, ?)
      `).run(userId, s.email, now, now);

      db.prepare(`
        INSERT INTO student_verifications (
          id, user_id, first_name, date_of_birth, course, academic_year,
          id_card_image_path, id_card_mime_type, id_card_file_size, status,
          rejection_reason, reviewed_at, reviewed_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'DEMO_MODE_VERIFIED', 'image/jpeg', 1024, 'APPROVED', NULL, ?, 'FOUNDER_DEMO_SEED', ?, ?)
      `).run(vId, userId, s.firstName, s.dob, s.course, s.year, now, now, now);

      db.prepare(`
        INSERT INTO profiles (
          id, user_id, display_name, bio, gender, match_preference, course, academic_year,
          photos, interests, favourite_music, favourite_media, prompts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'EVERYONE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pId,
        userId,
        s.firstName,
        s.bio,
        s.gender,
        s.course,
        s.year,
        JSON.stringify(s.photos),
        JSON.stringify(s.interests),
        s.music,
        s.media,
        JSON.stringify(s.prompts),
        now,
        now
      );
    }

    res.status(200).json({ success: true, message: 'Fictional demo PCTE student profiles seeded successfully!' });
  } catch (error) {
    console.error('seedDemoProfiles error:', error);
    res.status(500).json({ success: false, error: 'Failed to seed demo profiles.' });
  }
};
