import { Response } from 'express';
import { db, checkpointDatabase } from '../db/database';
import { AuthRequest } from '../middleware/auth';
import { calculateAge } from '../utils/ageValidator';
import fs from 'fs';
import path from 'path';

export const getMyProfile = (req: AuthRequest, res: Response): void => {
  try {
    const profile = db.prepare(`
      SELECT p.id, p.user_id, p.display_name, p.display_nickname, p.anonymous_avatar_gradient,
             p.show_course, p.show_academic_year, p.bio, p.gender, p.match_preference,
             p.course, p.academic_year, p.photos, p.interests, p.favourite_music, p.favourite_media, p.prompts,
             u.email, u.role, u.verification_status, u.is_discovery_paused,
             v.date_of_birth, v.first_name AS verified_first_name
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      JOIN student_verifications v ON v.user_id = u.id
      WHERE p.user_id = ?
    `).get(req.user!.id) as any;

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found.' });
      return;
    }

    const age = profile.date_of_birth ? calculateAge(profile.date_of_birth) : 18;
    const nickname = profile.display_nickname || profile.display_name;

    res.status(200).json({
      success: true,
      profile: {
        id: profile.id,
        userId: profile.user_id,
        email: profile.email,
        displayName: nickname,
        displayNickname: nickname,
        realFirstName: profile.verified_first_name, // Strictly for the account owner in their private settings
        anonymousAvatarGradient: profile.anonymous_avatar_gradient || 'rose',
        showCourse: profile.show_course !== 0,
        showAcademicYear: profile.show_academic_year !== 0,
        age,
        bio: profile.bio || '',
        gender: profile.gender,
        matchPreference: profile.match_preference,
        course: profile.course,
        academicYear: profile.academic_year,
        photos: JSON.parse(profile.photos || '[]'),
        interests: JSON.parse(profile.interests || '[]'),
        favouriteMusic: profile.favourite_music,
        favouriteMedia: profile.favourite_media,
        prompts: JSON.parse(profile.prompts || '[]'),
        isDiscoveryPaused: profile.is_discovery_paused === 1,
        role: profile.role,
        verificationStatus: profile.verification_status,
      }
    });
  } catch (error) {
    console.error('getMyProfile error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
};

export const updateProfile = (req: AuthRequest, res: Response): void => {
  try {
    const {
      displayName,
      displayNickname,
      anonymousAvatarGradient,
      showCourse,
      showAcademicYear,
      bio,
      gender,
      matchPreference,
      interests,
      favouriteMusic,
      favouriteMedia,
      prompts,
      isDiscoveryPaused,
    } = req.body;

    const currentUserId = req.user!.id;
    const now = new Date().toISOString();

    const finalNickname = (displayNickname || displayName || '').trim();
    if (finalNickname.length > 30) {
      res.status(400).json({ success: false, error: 'Nickname must be 30 characters or fewer.' });
      return;
    }

    // Update user discovery pause status
    if (typeof isDiscoveryPaused === 'boolean') {
      db.prepare('UPDATE users SET is_discovery_paused = ?, updated_at = ? WHERE id = ?')
        .run(isDiscoveryPaused ? 1 : 0, now, currentUserId);
    }

    const current = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(currentUserId) as any;
    if (!current) {
      res.status(404).json({ success: false, error: 'Profile not found.' });
      return;
    }

    const newNickname = finalNickname || current.display_nickname || current.display_name;
    const newGradient = anonymousAvatarGradient || current.anonymous_avatar_gradient || 'rose';
    const newShowCourse = typeof showCourse === 'boolean' ? (showCourse ? 1 : 0) : current.show_course;
    const newShowYear = typeof showAcademicYear === 'boolean' ? (showAcademicYear ? 1 : 0) : current.show_academic_year;
    const newBio = typeof bio === 'string' ? bio.slice(0, 500) : current.bio;
    const newGender = gender || current.gender;
    const newMatchPreference = matchPreference || current.match_preference;
    const newInterests = interests ? JSON.stringify(interests.slice(0, 8)) : current.interests;
    const newMusic = favouriteMusic !== undefined ? favouriteMusic : current.favourite_music;
    const newMedia = favouriteMedia !== undefined ? favouriteMedia : current.favourite_media;
    const newPrompts = prompts ? JSON.stringify(prompts.slice(0, 3)) : current.prompts;

    db.prepare(`
      UPDATE profiles
      SET display_name = ?, display_nickname = ?, anonymous_avatar_gradient = ?,
          show_course = ?, show_academic_year = ?, bio = ?, gender = ?, match_preference = ?,
          interests = ?, favourite_music = ?, favourite_media = ?, prompts = ?, updated_at = ?
      WHERE user_id = ?
    `).run(
      newNickname, newNickname, newGradient,
      newShowCourse, newShowYear, newBio, newGender, newMatchPreference,
      newInterests, newMusic, newMedia, newPrompts, now, currentUserId
    );

    checkpointDatabase();

    const updatedProfile = {
      displayName: newNickname,
      displayNickname: newNickname,
      anonymousAvatarGradient: newGradient,
      showCourse: newShowCourse === 1,
      showAcademicYear: newShowYear === 1,
      bio: newBio,
      gender: newGender,
      matchPreference: newMatchPreference,
      interests: JSON.parse(newInterests || '[]'),
      photos: JSON.parse(current.photos || '[]'),
      prompts: JSON.parse(newPrompts || '[]'),
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
};

export const uploadProfilePhotos = (req: AuthRequest, res: Response): void => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded.' });
      return;
    }

    const current = db.prepare('SELECT photos FROM profiles WHERE user_id = ?').get(req.user!.id) as any;
    const existingPhotos: string[] = current ? JSON.parse(current.photos || '[]') : [];

    if (existingPhotos.length + files.length > 4) {
      files.forEach((f) => {
        try { fs.unlinkSync(f.path); } catch {}
      });
      res.status(400).json({ success: false, error: 'You can have at most 4 profile pictures.' });
      return;
    }

    const newPhotoUrls = files.map((f) => `/uploads/avatars/${path.basename(f.path)}`);
    const mergedPhotos = [...existingPhotos, ...newPhotoUrls];
    const now = new Date().toISOString();

    db.prepare('UPDATE profiles SET photos = ?, updated_at = ? WHERE user_id = ?')
      .run(JSON.stringify(mergedPhotos), now, req.user!.id);

    checkpointDatabase();

    res.status(200).json({ success: true, photos: mergedPhotos });
  } catch (error) {
    console.error('uploadProfilePhotos error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload photo.' });
  }
};

export const deleteProfilePhoto = (req: AuthRequest, res: Response): void => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      res.status(400).json({ success: false, error: 'photoUrl is required.' });
      return;
    }

    const current = db.prepare('SELECT photos FROM profiles WHERE user_id = ?').get(req.user!.id) as any;
    if (!current) {
      res.status(404).json({ success: false, error: 'Profile not found.' });
      return;
    }

    const existingPhotos: string[] = JSON.parse(current.photos || '[]');
    const updatedPhotos = existingPhotos.filter((p) => p !== photoUrl);

    if (photoUrl.startsWith('/uploads/avatars/')) {
      const filename = path.basename(photoUrl);
      const filePath = path.resolve(process.cwd(), 'storage', 'public_avatars', filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE profiles SET photos = ?, updated_at = ? WHERE user_id = ?')
      .run(JSON.stringify(updatedPhotos), now, req.user!.id);

    checkpointDatabase();

    res.status(200).json({ success: true, photos: updatedPhotos });
  } catch (error) {
    console.error('deleteProfilePhoto error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete photo.' });
  }
};

export const deleteMyAccount = (req: AuthRequest, res: Response): void => {
  try {
    // Strictly prevent deletion of the Founder Super Admin account
    if (req.user!.role === 'FOUNDER') {
      res.status(403).json({ success: false, error: 'The Founder Super Admin account cannot be deleted.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users
      SET is_deleted = 1, is_discovery_paused = 1, verification_status = 'SUSPENDED', updated_at = ?
      WHERE id = ?
    `).run(now, req.user!.id);

    // Revoke all active matches
    db.prepare(`
      UPDATE matches
      SET is_active = 0, unmatched_by = ?, updated_at = ?
      WHERE user1_id = ? OR user2_id = ?
    `).run(req.user!.id, now, req.user!.id, req.user!.id);

    checkpointDatabase();

    res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('deleteMyAccount error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account.' });
  }
};
