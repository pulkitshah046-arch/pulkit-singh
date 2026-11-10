import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const PRIVATE_ID_DIR = path.resolve(process.cwd(), 'storage', 'private_ids');

if (!fs.existsSync(PRIVATE_ID_DIR)) {
  fs.mkdirSync(PRIVATE_ID_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PRIVATE_ID_DIR);
  },
  filename: (_req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `pcte_id_${Date.now()}_${randomHex}${ext}`);
  }
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const idCardUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file format. Only JPG, PNG, and WEBP images are accepted.'));
    }
    cb(null, true);
  }
});
