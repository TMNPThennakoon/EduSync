const express = require('express');
const router = express.Router();
const { getStudentReport, getLecturerReport, getAdminReport } = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Student Report
router.get('/student/:studentId', authenticateToken, getStudentReport);

// Lecturer Report
router.get('/lecturer/class-merit', authenticateToken, requireRole(['lecturer', 'admin']), getLecturerReport);

// Admin Report
router.get('/admin/overview', authenticateToken, requireRole(['admin']), getAdminReport);

module.exports = router;
