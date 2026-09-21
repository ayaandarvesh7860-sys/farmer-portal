/**
 * File-upload handling for farmer documents (multer).
 *
 * SECURITY: only PDF / JPG / JPEG / PNG are accepted, the size is capped at
 * 5 MB, and the file is saved under a randomised name so that the original
 * name cannot be used to overwrite anything on disk.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 6);
    cb(null, crypto.randomBytes(12).toString('hex') + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, JPEG and PNG files are allowed.'));
    }
    cb(null, true);
  }
});

module.exports = { upload, UPLOAD_DIR };
