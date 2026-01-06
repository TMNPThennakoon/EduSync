const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getLectureMaterials,
  uploadLectureMaterial,
  deleteLectureMaterial,
  toggleMaterialVisibility
} = require('../controllers/lectureMaterialsController');
const { authenticateToken, requireLecturer } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// All routes require authentication
router.use(authenticateToken);

// Get lecture materials (for both lecturers and students)
router.get('/:classId', getLectureMaterials);

// Upload lecture material (lecturer only)
router.post('/:classId', requireLecturer, uploadLectureMaterial);

// Delete lecture material (lecturer only)
router.delete('/:materialId', requireLecturer, deleteLectureMaterial);

// Toggle visibility (lecturer only)
router.put('/:materialId/visibility', requireLecturer, toggleMaterialVisibility);

module.exports = router;

