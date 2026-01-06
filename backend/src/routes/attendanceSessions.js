const express = require('express');
const router = express.Router();
const {
  startSession,
  endSession,
  getActiveSession,
  getSessionStats,
  clearSession
} = require('../controllers/attendanceSessionController');
const { authenticateToken, requireLecturer, authorizeRole } = require('../middleware/auth'); // Added authorizeRole

// All routes require authentication
router.use(authenticateToken);

// Lecturer only routes
router.post('/start', requireLecturer, startSession);
// End session
router.post('/end', authorizeRole(['lecturer', 'admin']), endSession);

// Clear/Reset session (Protected)
router.post('/clear', authorizeRole(['lecturer', 'admin']), clearSession);

// Get active session
router.get('/active', authorizeRole(['lecturer', 'student', 'admin']), getActiveSession);
router.get('/stats', requireLecturer, getSessionStats);

module.exports = router;
