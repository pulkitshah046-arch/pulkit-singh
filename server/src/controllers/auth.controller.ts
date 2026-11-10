import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, generateId, checkpointDatabase } from '../db/database';
import { isAtLeast18 } from '../utils/ageValidator';
import { AuthRequest, getJwtSecret } from '../middleware/auth';
import fs from 'fs';

export const getFounderEmail = (): string => (process.env.FOUNDER_EMAIL || 'pulkitshah046@gmail.com').trim().toLowerCase();

export const register = async (req: Request, res: Response): Promise<void> => {
  const uploadedFile = req.file;

  try {
    const {
      firstName,
      displayNickname,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      course,
      academicYear,
      termsAccepted
    } = req.body;

    if (!firstName || !email || !password || !confirmPassword || !dateOfBirth || !course || !academicYear) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      res.status(400).json({ success: false, error: 'All fields are mandatory.' });
      return;
    }

    if (termsAccepted !== 'true' && termsAccepted !== true) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      res.status(400).json({ success: false, error: 'You must accept the Terms of Service & Privacy Policy.' });
      return;
    }

    if (password !== confirmPassword) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      res.status(400).json({ success: false, error: 'Passwords do not match.' });
      return;
    }

    if (password.length < 8) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
      return;
    }

    const parsedDob = new Date(dateOfBirth);
    if (isNaN(parsedDob.getTime())) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      res.status(400).json({ success: false, error: 'Invalid Date of Birth.' });
      return;
    }

    if (!isAtLeast18(parsedDob)) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      res.status(403).json({
        success: false,
        error: 'Registration rejected: PCTE MATCH is strictly for students aged 18 and older.'
      });
      return;
    }

    if (!uploadedFile) {
      res.status(400).json({ success: false, error: 'A photograph of your physical PCTE student ID card is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing email
    const existingStmt = db.prepare('SELECT id, is_deleted, role FROM users WHERE email = ?');
    const existingUser = existingStmt.get(normalizedEmail) as any;
    if (existingUser) {
      if (uploadedFile) fs.unlinkSync(uploadedFile.path);
      if (existingUser.is_deleted === 1) {
        res.status(409).json({ success: false, error: 'This account was previously deactivated. Please contact founder support.' });
      } else {
        res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const founderEmail = getFounderEmail();
    const isFounder = founderEmail !== '' && normalizedEmail === founderEmail;
    const initialRole = isFounder ? 'FOUNDER' : 'STUDENT';
    const initialStatus = isFounder ? 'APPROVED' : 'PENDING_VERIFICATION';

    const userId = generateId();
    const verificationId = generateId();
    const profileId = generateId();
    const now = new Date().toISOString();

    const publicNickname = (displayNickname || '').trim() || `${firstName.trim()}_${Math.floor(100 + Math.random() * 900)}`;
    const randomGradients = ['rose', 'emerald', 'cyan', 'purple', 'amber'];
    const chosenGradient = randomGradients[Math.floor(Math.random() * randomGradients.length)];

    // Insert user, verification, profile
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, role, verification_status, is_discovery_paused, is_deleted, anonymous_handle, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `);
    insertUser.run(userId, normalizedEmail, passwordHash, initialRole, initialStatus, publicNickname.toLowerCase().replace(/\s+/g, '_'), now, now);

    const insertVerification = db.prepare(`
      INSERT INTO student_verifications (
        id, user_id, first_name, date_of_birth, course, academic_year,
        id_card_image_path, id_card_mime_type, id_card_file_size, status,
        rejection_reason, reviewed_at, reviewed_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertVerification.run(
      verificationId,
      userId,
      firstName.trim(),
      dateOfBirth,
      course.trim(),
      academicYear.trim(),
      uploadedFile.path,
      uploadedFile.mimetype,
      uploadedFile.size,
      initialStatus,
      null,
      isFounder ? now : null,
      isFounder ? 'SYSTEM_FOUNDER_CLAIM' : null,
      now,
      now
    );

    const insertProfile = db.prepare(`
      INSERT INTO profiles (
        id, user_id, display_name, display_nickname, anonymous_avatar_gradient, show_course, show_academic_year,
        bio, gender, match_preference, course, academic_year,
        photos, interests, favourite_music, favourite_media, prompts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, ?, 'MAN', 'EVERYONE', ?, ?, '[]', '[]', NULL, NULL, '[]', ?, ?)
    `);
    insertProfile.run(
      profileId,
      userId,
      publicNickname,
      publicNickname,
      chosenGradient,
      `PCTE student in ${course.trim()}. Ready to connect anonymously and authentically on campus!`,
      course.trim(),
      academicYear.trim(),
      now,
      now
    );

    checkpointDatabase();

    const token = jwt.sign(
      { id: userId, email: normalizedEmail, role: initialRole },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: isFounder
        ? 'Founder Super Admin registered and verified automatically.'
        : 'Application submitted! The founder will review your physical student ID shortly.',
      token,
      user: {
        id: userId,
        email: normalizedEmail,
        role: initialRole,
        verificationStatus: initialStatus,
        displayName: publicNickname,
        displayNickname: publicNickname,
        anonymousAvatarGradient: chosenGradient,
      }
    });
  } catch (error: any) {
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      try { fs.unlinkSync(uploadedFile.path); } catch {}
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed due to a server error.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userStmt = db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.role, u.verification_status, u.is_deleted,
             p.display_name, p.display_nickname, p.anonymous_avatar_gradient,
             v.rejection_reason, v.first_name
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN student_verifications v ON v.user_id = u.id
      WHERE u.email = ?
    `);
    const user = userStmt.get(normalizedEmail) as any;

    if (!user || user.is_deleted === 1) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    const publicNickname = user.display_nickname || user.display_name || user.first_name || 'Student';

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        verificationStatus: user.verification_status,
        displayName: publicNickname,
        displayNickname: publicNickname,
        anonymousAvatarGradient: user.anonymous_avatar_gradient || 'rose',
        rejectionReason: user.rejection_reason,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed due to a server error.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }

    const userStmt = db.prepare(`
      SELECT u.id, u.email, u.role, u.verification_status, u.is_discovery_paused,
             v.first_name, v.date_of_birth, v.course, v.academic_year, v.status AS verification_status_record, v.rejection_reason,
             p.display_name, p.display_nickname, p.anonymous_avatar_gradient, p.show_course, p.show_academic_year,
             p.bio, p.gender, p.match_preference, p.photos, p.interests, p.favourite_music, p.favourite_media, p.prompts
      FROM users u
      LEFT JOIN student_verifications v ON v.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ?
    `);
    const row = userStmt.get(req.user.id) as any;

    if (!row) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const publicNickname = row.display_nickname || row.display_name || 'Student';

    res.status(200).json({
      success: true,
      user: {
        id: row.id,
        email: row.email,
        role: row.role,
        verificationStatus: row.verification_status,
        isDiscoveryPaused: row.is_discovery_paused === 1,
        displayName: publicNickname,
        displayNickname: publicNickname,
        anonymousAvatarGradient: row.anonymous_avatar_gradient || 'rose',
        realFirstName: row.first_name,
        verification: {
          firstName: row.first_name,
          dateOfBirth: row.date_of_birth,
          course: row.course,
          academicYear: row.academic_year,
          status: row.verification_status,
          rejectionReason: row.rejection_reason,
        },
        profile: {
          displayName: publicNickname,
          displayNickname: publicNickname,
          anonymousAvatarGradient: row.anonymous_avatar_gradient || 'rose',
          showCourse: row.show_course !== 0,
          showAcademicYear: row.show_academic_year !== 0,
          bio: row.bio,
          gender: row.gender,
          matchPreference: row.match_preference,
          course: row.course,
          academicYear: row.academic_year,
          photos: JSON.parse(row.photos || '[]'),
          interests: JSON.parse(row.interests || '[]'),
          favouriteMusic: row.favourite_music,
          favouriteMedia: row.favourite_media,
          prompts: JSON.parse(row.prompts || '[]'),
        }
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve authenticated user.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ success: false, error: 'All password fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, error: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
      return;
    }

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
    if (!isMatch) {
      res.status(400).json({ success: false, error: 'Incorrect current password.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, userId);

    checkpointDatabase();

    res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password.' });
  }
};
