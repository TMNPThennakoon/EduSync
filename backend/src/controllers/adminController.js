const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');
// This part must be exactly like this 
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

// 1. Dashboard Statistics
const getDashboardStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        // Basic Counts
        const usersCount = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        const classesCount = await pool.query('SELECT COUNT(*) as count FROM classes');
        const pendingUserApprovals = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_approved = false');
        const pendingGradeApprovals = await pool.query("SELECT COUNT(*) as count FROM exam_grades WHERE status = 'pending'");

        // Process user counts
        let stats = {
            users: { total: 0, students: 0, lecturers: 0, admins: 0 },
            classes: parseInt(classesCount.rows[0]?.count || 0),
            pending_approvals: parseInt(pendingUserApprovals.rows[0]?.count || 0) + parseInt(pendingGradeApprovals.rows[0]?.count || 0)
        };

        usersCount.rows.forEach(row => {
            const count = parseInt(row.count) || 0;
            const role = row.role ? row.role.toLowerCase() : '';

            stats.users.total += count;
            if (role === 'student') stats.users.students = (stats.users.students || 0) + count;
            if (role === 'lecturer') stats.users.lecturers = (stats.users.lecturers || 0) + count;
            if (role === 'admin') stats.users.admins = (stats.users.admins || 0) + count;
        });

        // Chart Data: Attendance Trends (Last 7 days or specified range)
        const attendanceTrends = await pool.query(`
      SELECT 
        DATE(s.start_time) as day, 
        r.status, 
        COUNT(*) as count 
      FROM attendance r
      JOIN attendance_sessions s ON r.session_id = s.id
      WHERE s.start_time >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(s.start_time), r.status
      ORDER BY DATE(s.start_time) ASC
    `);

        // Chart Data: Student Distribution by Department
        const studentDistribution = await pool.query(`
      SELECT department, COUNT(*) as count 
      FROM users 
      WHERE role = 'student' 
      GROUP BY department
    `);

        const responseData = {
            stats,
            charts: {
                attendance: attendanceTrends.rows.map(r => ({ ...r, count: parseInt(r.count) })),
                distribution: studentDistribution.rows.map(r => ({ ...r, count: parseInt(r.count) }))
            }
        };

        console.log('Admin Stats Response:', JSON.stringify(responseData.stats, null, 2));

        res.json(responseData);

    } catch (error) {
        logError(error, { action: 'get_dashboard_stats', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 2. System Logs (Audit Trail)
const getSystemLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, action, user_id } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT al.*, u.email, u.role, u.first_name, u.last_name 
      FROM action_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
        let params = [];
        let whereClauses = [];
        let paramCount = 0;

        if (action) {
            whereClauses.push(`al.action ILIKE $${++paramCount}`);
            params.push(`%${action}%`);
        }

        if (user_id) {
            whereClauses.push(`al.user_id = $${++paramCount}`);
            params.push(user_id);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);

        const logs = await pool.query(query, params);

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) FROM action_logs`; // Simplified count
        const totalResult = await pool.query(countQuery);

        res.json({
            logs: logs.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(totalResult.rows[0].count)
            }
        });
    } catch (error) {
        logError(error, { action: 'get_system_logs', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. Announcements
const createAnnouncement = async (req, res) => {
    try {
        const { title, message, type, expires_at, course_id, priority, target_audience, target_dept, target_year } = req.body;

        if (!expires_at) {
            return res.status(400).json({ error: 'Expiration date is required' });
        }

        const result = await pool.query(`
      INSERT INTO announcements (title, message, type, expires_at, created_by, course_id, priority, target_audience, target_dept, target_year)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [title, message, type || 'info', expires_at, req.user.id, course_id || null, priority || 'normal', target_audience || 'all', target_dept || null, target_year || null]);

        logUserAction('create_announcement', req.user.id, { title, type, priority, course_id, target_audience }, req);

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            io.emit('new_announcement', result.rows[0]);
        }

        // Email Integration (Simple check for urgent)
        if (priority === 'urgent' || type === 'important') {
            const { sendAnnouncementEmail } = require('../utils/emailService');
            // Logic to fetch emails based on targeting would be complex, simplistically sending to all for now or filtering in email service
            // For now, we rely on the implementation in emailService or expand it later.
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        logError(error, { action: 'create_announcement', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getActiveAnnouncements = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT * FROM announcements 
      WHERE expires_at > NOW() 
      ORDER BY created_at DESC
    `);
        res.json({ announcements: result.rows });
    } catch (error) {
        logError(error, { action: 'get_active_announcements', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);

        // Emit delete event
        const io = req.app.get('io');
        if (io) {
            io.emit('delete_announcement', id);
        }

        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        logError(error, { action: 'delete_announcement', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. Lecturer ID Management
const generateLecturerIds = async (req, res) => {
    try {
        const { count = 10, department = 'IAT' } = req.body;
        const createdBy = req.user.id;

        // Prefix Map
        const prefixMap = {
            'IAT': 'IA',
            'ICT': 'IC',
            'AT': 'AT',
            'ET': 'ET'
        };

        const prefix = prefixMap[department];
        if (!prefix) {
            return res.status(400).json({ error: 'Invalid department. Must be IAT, ICT, AT, or ET.' });
        }

        // Get latest ID for this department to find start number
        const lastIdResult = await pool.query('SELECT lecturer_id FROM lecturer_ids WHERE department = $1 ORDER BY lecturer_id DESC LIMIT 1', [department]);

        let currentNumber = 0;
        if (lastIdResult.rows.length > 0) {
            const lastId = lastIdResult.rows[0].lecturer_id;
            const numPart = lastId.replace(/\D/g, '');
            currentNumber = parseInt(numPart) || 0;
        }

        const generatedIds = [];

        for (let i = 0; i < count; i++) {
            currentNumber++;
            const idString = `${prefix}${String(currentNumber).padStart(4, '0')}`;

            const result = await pool.query(`
                INSERT INTO lecturer_ids (lecturer_id, department, generated_by)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [idString, department, createdBy]);

            const row = result.rows[0];
            row.lecturer_id_string = row.lecturer_id; // Frontend compatibility
            generatedIds.push(row);
        }

        logUserAction('generate_lecturer_ids', req.user.id, { count, department }, req);
        res.json({ ids: generatedIds });
    } catch (error) {
        logError(error, { action: 'generate_lecturer_ids', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getLecturerIds = async (req, res) => {
    try {
        const { status } = req.query; // 'all', 'used', 'unused'
        let query = 'SELECT * FROM lecturer_ids';

        if (status === 'used') {
            query += ' WHERE is_used = true';
        } else if (status === 'unused') {
            query += ' WHERE is_used = false';
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query);
        res.json({ ids: result.rows.map(r => ({ ...r, lecturer_id_string: r.lecturer_id, id: r.id })) });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 5. Secure Attendance Reset
const resetAttendance = async (req, res) => {
    try {
        const { password, start_date, end_date } = req.body;

        // Re-verify admin password
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        const bcrypt = require('bcryptjs');
        const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password provided for confirmation.' });
        }

        // Perform Deletion (Delete sessions, cascade will delete records)
        const result = await pool.query(`
            DELETE FROM attendance_sessions 
            WHERE date BETWEEN $1 AND $2
        `, [start_date, end_date]);

        logUserAction('reset_attendance', req.user.id, { start_date, end_date, deleted_sessions: result.rowCount }, req);

        res.json({ message: `Successfully deleted ${result.rowCount} attendance records.` });
    } catch (error) {
        logError(error, { action: 'reset_attendance', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getVisibleAnnouncements = async (req, res) => {
    try {
        const { role } = req.user;
        let query = 'SELECT * FROM announcements WHERE expires_at > NOW()';
        let params = [];

        if (role !== 'admin') {
            query += ' AND (target_audience = $1 OR target_audience = $2)';
            params.push('all', role);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json({ announcements: result.rows });
    } catch (error) {
        logError(error, { action: 'get_visible_announcements', userId: req.user?.id });
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDashboardStats,
    getSystemLogs,
    createAnnouncement,
    getActiveAnnouncements,
    deleteAnnouncement,
    generateLecturerIds,
    getLecturerIds,
    resetAttendance,
    getVisibleAnnouncements
};
