import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(env.UPLOAD_DIR, 'pia');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    const validExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
    const validMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(mime);
    if (validExt && validMime) cb(null, true);
    else cb(new Error('Only PDF, JPG and PNG files are allowed'));
  },
}).single('file');
