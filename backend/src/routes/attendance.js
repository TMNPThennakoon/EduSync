const express = require('express');
const router = express.Router();
const {
  getAttendance,
  recordAttendance,
  bulkRecordAttendance,
  getAttendanceStats,
  recordAttendanceFromQR,
  markSmartAttendance,
  updateAttendanceStatus,
  clearAllAttendance,
  getAttendanceSummary
} = require('../controllers/attendanceController');
const { validateAttendance } = require('../middleware/validation');
const { authenticateToken, requireLecturer, requireAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Public routes (authenticated users)
router.get('/', getAttendance);
router.get('/stats', getAttendanceStats);
router.get('/summary', requireAdmin, getAttendanceSummary);

// Lecturer/Admin only routes
router.post('/', requireLecturer, validateAttendance, recordAttendance);
router.post('/bulk', requireLecturer, bulkRecordAttendance);
router.post('/qr-scan', requireLecturer, recordAttendanceFromQR);
router.post('/mark-smart', requireLecturer, markSmartAttendance);
router.patch('/update-status', requireLecturer, updateAttendanceStatus);

// Admin only routes
router.delete('/clear-all', requireAdmin, clearAllAttendance);

module.exports = router;
