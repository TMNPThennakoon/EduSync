const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Get user details from database
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department, academic_year, semester FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role ? req.user.role.trim() : '';

    console.log('--- Auth Debug ---');
    console.log('User ID:', req.user.id);
    console.log('User Role (DB):', req.user.role);
    console.log('User Role (Trimmed):', userRole);
    console.log('Required Roles:', roles);
    console.log('Is Admin?:', userRole === 'admin');
    console.log('Is Allowed?:', roles.includes(userRole));
    console.log('------------------');

    // Always allow admin
    if (userRole === 'admin' || roles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ error: `Insufficient permissions. Role: ${userRole}, Required: ${roles.join(',')}` });
  };
};

const requireAdmin = requireRole(['admin']);
const requireLecturer = requireRole(['admin', 'lecturer']);
const requireStudent = requireRole(['admin', 'lecturer', 'student']);

module.exports = {
  authenticateToken,
  requireRole,
  authorizeRole: requireRole, // Alias for consistency
  requireAdmin,
  requireLecturer,
  requireStudent
};
