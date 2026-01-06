const express = require('express');
const router = express.Router();
const {
  exportDailyAttendance,
  exportMonthlyAttendance
} = require('../controllers/exportController');
const { authenticateToken, requireLecturer } = require('../middleware/auth');

// All routes require authentication and lecturer/admin role
router.use(authenticateToken);
router.use(requireLecturer);

// Daily attendance export
router.get('/daily', exportDailyAttendance);

// Monthly attendance export
router.get('/monthly', exportMonthlyAttendance);

module.exports = router;
