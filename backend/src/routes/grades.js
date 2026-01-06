const express = require('express');
const router = express.Router();
const {
  getAllGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
  bulkCreateGrades,
  getStudentGrades,
  bulkUpdateExamGrades,
  getExamGrades,
  approveExamGrades,
  getPendingApprovals
} = require('../controllers/gradeController');
const { validateGrade } = require('../middleware/validation');
const { authenticateToken, requireLecturer, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Exam Grades Routes - Must be before /:id
router.get('/exam-grades/all', getExamGrades);
router.post('/exam-grades/bulk-update', requireLecturer, bulkUpdateExamGrades);
router.post('/exam-grades/approve', requireAdmin, approveExamGrades);
router.get('/exam-grades/pending', requireAdmin, getPendingApprovals);

// Public routes (authenticated users)
router.get('/', getAllGrades);
router.get('/student/:student_id', getStudentGrades);
router.get('/:id', getGradeById);

module.exports = router;
