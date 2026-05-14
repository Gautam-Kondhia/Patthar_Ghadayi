const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── Allowed MIME types ──
const ALLOWED = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  pdf:   ['application/pdf'],
};

// ── Multer storage factory ──
const makeStorage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const uuid = uuidv4();
      cb(null, `${uuid}${ext}`);
    },
  });

const fileFilter = (allowed) => (req, file, cb) => {
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

const uploadImage = multer({
  storage: makeStorage('images'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: fileFilter(ALLOWED.image),
});

const uploadVideo = multer({
  storage: makeStorage('videos'),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: fileFilter(ALLOWED.video),
});

const uploadPdf = multer({
  storage: makeStorage('pdfs'),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: fileFilter(ALLOWED.pdf),
});

const BASE_URL = () => `http://localhost:${process.env.PORT || 5000}`;

// ── POST /api/upload/image ──
router.post('/image', protect, (req, res) => {
  uploadImage.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    res.json({
      fileKey:     req.file.filename,
      displayName: req.file.originalname,
      url:         `${BASE_URL()}/uploads/images/${req.file.filename}`,
      altText:     '',
    });
  });
});

// ── POST /api/upload/video ──
router.post('/video', protect, (req, res) => {
  uploadVideo.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    res.json({
      fileKey:       req.file.filename,
      displayName:   req.file.originalname,
      url:           `${BASE_URL()}/uploads/videos/${req.file.filename}`,
      posterUrl:     null,
      fileSizeBytes: req.file.size,
    });
  });
});

// ── POST /api/upload/pdf ──
router.post('/pdf', protect, (req, res) => {
  uploadPdf.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    res.json({
      fileKey:       req.file.filename,
      displayName:   req.file.originalname,
      url:           `${BASE_URL()}/uploads/pdfs/${req.file.filename}`,
      fileSizeBytes: req.file.size,
    });
  });
});

module.exports = router;
