const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protect all admin routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Stats
router.get('/stats', adminController.getDashboardStats);

// Logs
router.get('/logs', adminController.getSystemLogs);

// Announcements
router.post('/announcements', adminController.createAnnouncement);
router.get('/announcements', adminController.getActiveAnnouncements); // This might be public for students? No, admin management. Active ones for students should be in a public route.
// Actually, active announcements should be visible to all authenticated users. 
// I'll keep this as admin management for now, and maybe add a public route in userController or a separate one.
router.delete('/announcements/:id', adminController.deleteAnnouncement);

// Lecturer IDs
router.post('/lecturer-ids/generate', adminController.generateLecturerIds);
router.get('/lecturer-ids', adminController.getLecturerIds);

// Reset Attendance
router.post('/attendance/reset', adminController.resetAttendance);

module.exports = router;
