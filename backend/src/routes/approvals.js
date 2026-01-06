const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getApprovalStats
} = require('../controllers/approvalController');

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// Get pending registrations
router.get('/pending', getPendingRegistrations);

// Get approval statistics
router.get('/stats', getApprovalStats);

// Approve a registration
router.post('/:userId/approve', approveRegistration);

// Reject a registration
router.post('/:userId/reject', rejectRegistration);

module.exports = router;