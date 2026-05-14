const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const router = require('express').Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer — store file in memory, we'll write to disk after sharp processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /api/upload — receives multipart/form-data with field "image"
// Returns { fullUrl, thumbnailUrl }
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const baseName = uuidv4();
    const fullName = `${baseName}_full.webp`;
    const thumbName = `${baseName}_thumb.webp`;

    const fullPath = path.join(UPLOADS_DIR, fullName);
    const thumbPath = path.join(UPLOADS_DIR, thumbName);

    // Compress & convert to WebP — full size (max 800px, ~200KB)
    await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(fullPath);

    // Thumbnail (max 300px, ~50KB)
    await sharp(req.file.buffer)
      .resize({ width: 300, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // Build public URLs (served from /uploads static route)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fullUrl = `${baseUrl}/uploads/${fullName}`;
    const thumbnailUrl = `${baseUrl}/uploads/${thumbName}`;

    res.json({ fullUrl, thumbnailUrl });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
