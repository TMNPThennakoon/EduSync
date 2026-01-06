const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadStudentImage,
  getStudentImage,
  getStudentCount,
  getAllStudentIds,
  getDashboardActivity
} = require('../controllers/userController');
const { validateUser, validateUserUpdate } = require('../middleware/validation');
const { authenticateToken, requireAdmin, requireLecturer } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Stats routes for lecturers and admins (must be before /:id routes)
router.get('/stats/students/count', getStudentCount);
router.get('/students/ids', getAllStudentIds);
router.get('/dashboard/activity', requireLecturer, getDashboardActivity);

// Admin and lecturer routes
router.get('/', requireLecturer, getAllUsers);
router.get('/:id', requireLecturer, getUserById);
router.post('/', requireAdmin, validateUser, createUser);
router.put('/:id', requireAdmin, validateUserUpdate, updateUser);
router.delete('/:id', requireAdmin, deleteUser);

// Image upload/retrieval routes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer file filter - File received:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      console.log('File accepted by multer');
      return cb(null, true);
    } else {
      console.log('File rejected by multer - type not allowed');
      cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'));
    }
  }
});

// Student image upload (for students, lecturers and admins)
router.post('/:id/image', upload.single('image'), uploadStudentImage);
// Get student image (for students, lecturers and admins)
router.get('/:id/image', getStudentImage);

module.exports = router;
