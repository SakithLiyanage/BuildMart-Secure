const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/qualifications';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, `qualification-${uniqueSuffix}${fileExt}`);
  }
});

// File filter: V14-class remediation extended to qualification documents.
// `file.mimetype` is client-supplied and trivially spoofable (an attacker can set
// Content-Type: image/jpeg on any file), so it must never be trusted alone.
// Requiring the file extension to also match a safe allow-list closes that gap and
// blocks SVG/HTML/script uploads disguised with a fake MIME type.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type: Only JPG, PNG images and PDF files are allowed (SVG/HTML/script files are prohibited for security)'), false);
  }
};

// Create multer instance
const qualificationUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024, // 1MB limit aligned with frontend
  }
});

module.exports = qualificationUpload;