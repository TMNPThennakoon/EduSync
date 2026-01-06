const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentGrades,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getStudentSubmissions,
  generateQuiz
} = require('../controllers/assignmentController');
const { validateAssignment } = require('../middleware/validation');
const { authenticateToken, requireLecturer } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, document, and archive files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Student routes
router.post('/submit', submitAssignment);
router.get('/student/:studentId/submissions', getStudentSubmissions);

// Public routes (authenticated users)
router.get('/', getAllAssignments);
router.get('/:id', getAssignmentById);
router.get('/:id/grades', getAssignmentGrades);

// Lecturer/Admin only routes
router.post('/', requireLecturer, validateAssignment, createAssignment);
router.put('/:id', requireLecturer, updateAssignment);
router.delete('/:id', requireLecturer, deleteAssignment);
router.get('/:id/submissions', requireLecturer, getAssignmentSubmissions);
router.put('/submissions/:submissionId/grade', requireLecturer, gradeSubmission);

// AI Quiz Generation
router.post('/ai-generate', authenticateToken, requireLecturer, generateQuiz);

module.exports = router;
