const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

// Create announcement (Lecturer only)
router.post(
    '/',
    authenticateToken,
    authorizeRole(['lecturer', 'admin']),
    announcementController.createAnnouncement
);

// Get announcements for a specific class (Accessible to enrolled students and lecturer)
router.get(
    '/class/:class_code',
    authenticateToken,
    announcementController.getClassAnnouncements
);

// Get all announcements for the logged-in student (For notification feed)
router.get(
    '/my',
    authenticateToken,
    authorizeRole(['student']),
    announcementController.getStudentAnnouncements
);

// Delete announcement (Lecturer only)
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(['lecturer', 'admin']),
    announcementController.deleteAnnouncement
);

module.exports = router;
