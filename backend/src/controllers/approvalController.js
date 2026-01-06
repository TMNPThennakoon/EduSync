const pool = require('../config/database');
const { logError, logUserAction } = require('../utils/logger');
const { sendRegistrationApprovedEmail } = require('../utils/emailService');

// Get pending registrations
const getPendingRegistrations = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, email, first_name, last_name, role, address, dob, 
        academic_year, semester, nic, index_no, phone, department, gender,
        lecturer_id, is_approved, profile_image_url, type, created_at
      FROM users 
      WHERE is_approved = false
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      registrations: result.rows
    });
  } catch (error) {
    logError(error, { action: 'get_pending_registrations', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve a registration
const approveRegistration = async (req, res) => {
  try {
    const { userId } = req.params;

    // Update user approval status (new schema uses is_approved boolean)
    const result = await pool.query(
      'UPDATE users SET is_approved = $1 WHERE id = $2 RETURNING *',
      [true, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    logUserAction('user_approved', req.user.id, {
      approvedUserId: userId,
      email: user.email,
      role: user.role
    });

    // Send approval email (non-blocking)
    sendRegistrationApprovedEmail(user.email, user.first_name, user.last_name)
      .then(result => {
        if (result.success) {
          console.log(`✅ Approval email sent to ${user.email} `);
        } else {
          console.error(`❌ Failed to send approval email to ${user.email}: `, result.error);
        }
      })
      .catch(err => {
        console.error(`❌ Error sending approval email to ${user.email}: `, err);
      });

    res.json({
      message: 'User approved successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    logError(error, { action: 'approve_registration', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a registration
const rejectRegistration = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user details before deletion for logging
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // If it's a lecturer, free up the lecturer ID
    if (user.role === 'lecturer' && user.lecturer_id) {
      await pool.query(
        'UPDATE lecturer_ids SET is_used = FALSE WHERE lecturer_id = $1',
        [user.lecturer_id]
      );
    }

    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    logUserAction('user_rejected', req.user.id, {
      rejectedUserId: userId,
      email: user.email,
      role: user.role
    });

    res.json({
      message: 'User rejected and removed successfully'
    });
  } catch (error) {
    logError(error, { action: 'reject_registration', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get approval statistics
const getApprovalStats = async (req, res) => {
  try {
    const query = `
    SELECT
    COUNT(*) as total_pending,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as pending_students,
      COUNT(CASE WHEN role = 'lecturer' THEN 1 END) as pending_lecturers
      FROM users 
      WHERE is_approved = false
      `;

    const result = await pool.query(query);

    res.json({
      stats: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'get_approval_stats', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getApprovalStats
};