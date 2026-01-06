const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, resetPassword, changePassword, sendOtp, verifyOtp, googleLogin } = require('../controllers/authController');
const { validateUser } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', validateUser, register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
