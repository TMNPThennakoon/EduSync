const express = require('express');
const router = express.Router();
const {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
  getStudentClasses,
  getCourseStats,
  getAllClassesWithStats,
  syncClassEnrollments
} = require('../controllers/courseController');
const { validateClass } = require('../middleware/validation');
const { authenticateToken, requireLecturer } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Public routes (authenticated users)
router.get('/', getAllClasses);
router.get('/with-stats', getAllClassesWithStats);
router.get('/:id', getClassById);
router.get('/:classId/stats', getCourseStats);
router.get('/:classId/students', getEnrolledStudents);
router.get('/student/:studentId', getStudentClasses);

// Lecturer/Admin only routes
router.post('/', requireLecturer, validateClass, createClass);
router.put('/:id', requireLecturer, updateClass);
router.delete('/:id', requireLecturer, deleteClass);
router.post('/:id/enroll', requireLecturer, enrollStudent);
router.delete('/:id/unenroll', requireLecturer, unenrollStudent);
router.post('/:id/sync-enrollments', requireLecturer, syncClassEnrollments);

module.exports = router;
