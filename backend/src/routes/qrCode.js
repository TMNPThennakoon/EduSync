const express = require('express');
const router = express.Router();
const { 
  generateStudentQRCode, 
  scanQRCode, 
  getQRScanHistory 
} = require('../controllers/qrCodeController');
const { authenticateToken, requireLecturer } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Generate QR code for a student (accessible by student themselves or lecturers/admins)
router.get('/student/:studentId', generateStudentQRCode);

// Scan QR code and record attendance (lecturers/admins only)
router.post('/scan', requireLecturer, scanQRCode);

// Get QR scan history (lecturers/admins only)
router.get('/history', requireLecturer, getQRScanHistory);

module.exports = router;
