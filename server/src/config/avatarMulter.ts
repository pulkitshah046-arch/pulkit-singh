import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const AVATAR_DIR = path.resolve(process.cwd(), 'storage', 'public_avatars');

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (_req, file, cb) => {
    const randomHex = crypto.randomBytes(12).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar_${Date.now()}_${randomHex}${ext}`);
  }
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per photo
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, or WEBP photos are allowed for profile pictures.'));
    }
    cb(null, true);
  }
});
