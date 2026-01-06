const express = require('express');
const multer = require('multer');
const { uploadTempImage } = require('../controllers/uploadController');

const router = express.Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for Cloudinary
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'));
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'File upload error' });
  }
  next();
};

// Route for temporary image upload (no authentication required)
router.post('/temp-image', upload.single('image'), handleMulterError, uploadTempImage);

// Test endpoint to verify Cloudinary connection
router.get('/test', (req, res) => {
  const cloudinary = require('../config/cloudinary');
  const config = cloudinary.config();
  
  res.json({
    configured: !!(config.cloud_name && config.api_key && config.api_secret),
    cloud_name: config.cloud_name,
    has_api_key: !!config.api_key,
    has_api_secret: !!config.api_secret
  });
});

module.exports = router;




