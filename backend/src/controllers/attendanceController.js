const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');
const { decryptQR } = require('../utils/qrSecurity');

const getAttendance = async (req, res) => {
  try {
    const { class_code, class_id, student_id, date, start_date, end_date, department, batch, academic_year, semester, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Use class_code or class_id (alias)
    const activeClassCode = class_code || class_id;

    let sqlQuery = `
      SELECT DISTINCT ON (a.student_id, a.date, a.class_code) a.*, 
             u.first_name, u.last_name, u.index_no, u.email as student_email, u.department as student_department, u.profile_image_url,
             c.class_name
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN classes c ON a.class_code = c.class_code
      WHERE 1=1
    `;

    let conditions = [];
    let params = [];
    let paramCount = 0;

    if (activeClassCode) {
      conditions.push(`a.class_code = $${++paramCount}::text`);
      params.push(String(activeClassCode));
    }

    if (student_id) {
      conditions.push(`a.student_id = $${++paramCount}`);
      params.push(student_id);
    }

    if (date) {
      conditions.push(`a.date = $${++paramCount}::date`);
      params.push(date);
    }

    if (start_date) {
      conditions.push(`a.date >= $${++paramCount}::date`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`a.date <= $${++paramCount}::date`);
      params.push(end_date);
    }

    if (department) {
      conditions.push(`u.department = $${++paramCount}::text`);
      params.push(String(department));
    }

    if (academic_year) {
      conditions.push(`a.academic_year::text = $${++paramCount}::text`);
      params.push(String(academic_year));
    }

    if (semester) {
      conditions.push(`a.semester::text = $${++paramCount}::text`);
      params.push(String(semester));
    }

    // Role-based filtering
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === 'lecturer') {
      conditions.push(`c.lecturer_id = $${++paramCount}`);
      params.push(userId);
    }

    if (conditions.length > 0) {
      sqlQuery += ' AND ' + conditions.join(' AND ');
    }

    sqlQuery += ` ORDER BY a.student_id, a.date DESC, a.class_code, u.last_name, u.first_name LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(sqlQuery, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM attendance a';
    let countParams = [];

    if (conditions.length > 0) {
      countQuery = `
          SELECT COUNT(*) 
          FROM attendance a
          JOIN users u ON a.student_id = u.id
          JOIN classes c ON a.class_code = c.class_code
        `;
      countQuery += ' WHERE ' + conditions.join(' AND ');
      countParams = params.slice(0, -2); // Remove limit and offset
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalRecords = parseInt(countResult.rows[0].count);

    if (totalRecords === 0) {
      return res.json({
        attendance: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    res.json({
      attendance: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit)
      }
    });
  } catch (error) {
    console.error('getAttendance Error:', error);
    logError(error, { action: 'get_attendance', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordAttendance = async (req, res) => {
  try {
    const { class_code, student_id, date, status, notes } = req.body;
    const recorded_by = req.user.id;

    // Check if attendance already exists for this student on this date
    const existingAttendance = await pool.query(
      'SELECT id FROM attendance WHERE class_code = $1 AND student_id = $2 AND date = $3',
      [class_code, student_id, date]
    );

    if (existingAttendance.rows.length > 0) {
      // Update existing attendance
      const result = await pool.query(`
        UPDATE attendance 
        SET status = $1, notes = $2, recorded_by = $3,
            name = (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = $5),
            index = (SELECT index_no FROM users WHERE id = $5),
            department = (SELECT department FROM users WHERE id = $5)
        WHERE class_code = $4 AND student_id = $5 AND date = $6
        RETURNING *
      `, [status, notes, recorded_by, class_code, student_id, date]);

      logUserAction('attendance_updated', req.user.id, {
        classCode: class_code,
        studentId: student_id,
        date,
        status
      });

      res.json({
        message: 'Attendance updated successfully',
        attendance: result.rows[0]
      });
    } else {
      // Create new attendance record
      const result = await pool.query(`
        INSERT INTO attendance (class_code, student_id, date, status, notes, recorded_by, name, index, department)
        VALUES ($1, $2, $3, $4, $5, $6, 
                (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = $2),
                (SELECT index_no FROM users WHERE id = $2),
                (SELECT department FROM users WHERE id = $2))
        RETURNING *
      `, [class_code, student_id, date, status, notes, recorded_by]);

      logUserAction('attendance_recorded', req.user.id, {
        classCode: class_code,
        studentId: student_id,
        date,
        status
      });

      res.status(201).json({
        message: 'Attendance recorded successfully',
        attendance: result.rows[0]
      });
    }
  } catch (error) {
    console.error('recordAttendance Error:', error);
    logError(error, { action: 'record_attendance', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const bulkRecordAttendance = async (req, res) => {
  try {
    const { class_code, date, attendance_records } = req.body;
    const recorded_by = req.user.id;

    const results = [];
    const errors = [];

    for (const record of attendance_records) {
      try {
        const { student_id, status, notes } = record;

        // Check if attendance already exists
        const existingAttendance = await pool.query(
          'SELECT id FROM attendance WHERE class_code = $1 AND student_id = $2 AND date = $3',
          [class_code, student_id, date]
        );

        if (existingAttendance.rows.length > 0) {
          // Update existing
          const result = await pool.query(`
            UPDATE attendance 
            SET status = $1, notes = $2, recorded_by = $3,
                name = (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = $5),
                index = (SELECT index_no FROM users WHERE id = $5)
            WHERE class_code = $4 AND student_id = $5 AND date = $6
            RETURNING *
          `, [status, notes, recorded_by, class_code, student_id, date]);

          results.push({ student_id, action: 'updated', attendance: result.rows[0] });
        } else {
          // Create new
          const result = await pool.query(`
            INSERT INTO attendance (class_code, student_id, date, status, notes, recorded_by, name, index)
            VALUES ($1, $2, $3, $4, $5, $6,
                    (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = $2),
                    (SELECT index_no FROM users WHERE id = $2))
            RETURNING *
          `, [class_code, student_id, date, status, notes, recorded_by]);

          results.push({ student_id, action: 'created', attendance: result.rows[0] });
        }
      } catch (error) {
        errors.push({ student_id: record.student_id, error: error.message });
      }
    }

    logUserAction('bulk_attendance_recorded', req.user.id, {
      classCode: class_code,
      date,
      recordsCount: attendance_records.length
    });

    res.json({
      message: 'Bulk attendance recording completed',
      results,
      errors,
      summary: {
        total: attendance_records.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    logError(error, { action: 'bulk_record_attendance', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAttendanceStats = async (req, res) => {
  try {
    const { class_code, student_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_days,
        CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            (COUNT(CASE WHEN status = 'present' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
          )
        END as attendance_percentage
      FROM attendance
    `;

    let conditions = [];
    let params = [];
    let paramCount = 0;

    if (class_code) {
      conditions.push(`class_code = $${++paramCount}`);
      params.push(class_code);
    }

    if (student_id) {
      conditions.push(`student_id = $${++paramCount}`);
      params.push(student_id);
    }

    if (start_date) {
      conditions.push(`date >= $${++paramCount}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`date <= $${++paramCount}`);
      params.push(end_date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);

    res.json({
      stats: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'get_attendance_stats', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordAttendanceFromQR = async (req, res) => {
  try {
    const { student_id, class_code, date, status = 'present' } = req.body;
    const recorded_by = req.user.id;
    const notes = `QR Code scanned on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;

    // Validate required fields
    if (!student_id || !class_code || !date) {
      return res.status(400).json({ error: 'Missing required fields: student_id, class_code, date' });
    }

    // Check if student exists and get details
    const studentCheck = await pool.query('SELECT id, academic_year, semester, department, first_name, last_name, index_no FROM users WHERE id = $1 AND role = $2', [student_id, 'student']);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentCheck.rows[0];

    // Check if class exists
    const classCheck = await pool.query('SELECT class_code FROM classes WHERE class_code = $1', [class_code]);
    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if attendance already exists for this student, class, and date
    const existingAttendance = await pool.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND class_code = $2 AND date = $3',
      [student_id, class_code, date]
    );

    if (existingAttendance.rows.length > 0) {
      // Update existing attendance
      const result = await pool.query(
        `UPDATE attendance 
         SET status = $1, recorded_by = $2, notes = $3, 
             name = $4, index = $5, department = $6, academic_year = $7, semester = $8
         WHERE id = $9 
         RETURNING *`,
        [status, recorded_by, notes,
          `${student.first_name} ${student.last_name}`, student.index_no, student.department, student.academic_year, student.semester,
          existingAttendance.rows[0].id]
      );

      logUserAction('attendance_updated_qr', recorded_by, { student_id, class_code, date, status });

      res.json({
        message: 'Attendance updated successfully',
        attendance: result.rows[0]
      });
    } else {
      // Create new attendance record
      const result = await pool.query(
        `INSERT INTO attendance (student_id, class_code, date, status, recorded_by, notes, name, index, department, academic_year, semester) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
         RETURNING *`,
        [student_id, class_code, date, status, recorded_by, notes,
          `${student.first_name} ${student.last_name}`, student.index_no, student.department, student.academic_year, student.semester]
      );

      logUserAction('attendance_recorded_qr', recorded_by, { student_id, class_code, date, status });

      res.status(201).json({
        message: 'Attendance recorded successfully',
        attendance: result.rows[0]
      });
    }
  } catch (error) {
    console.error('recordAttendanceFromQR Error:', error); // Better logging
    logError(error, { action: 'record_attendance_from_qr', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

const clearAllAttendance = async (req, res) => {
  try {
    const { password } = req.body;

    // Verify the admin password by checking against the database
    const adminResult = await pool.query('SELECT password_hash FROM users WHERE id = $1 AND role = $2', [req.user.id, 'admin']);

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'Admin user not found' });
    }

    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, adminResult.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can clear all attendance' });
    }

    // Get count before deletion for logging
    const countResult = await pool.query('SELECT COUNT(*) FROM attendance');
    const recordCount = parseInt(countResult.rows[0].count);

    // Delete all attendance records
    await pool.query('DELETE FROM attendance');

    // Log the action
    logUserAction('clear_all_attendance', req.user.id, {
      recordsDeleted: recordCount,
      clearedBy: req.user.email
    });

    res.json({
      message: 'All attendance records have been cleared successfully',
      recordsDeleted: recordCount
    });
  } catch (error) {
    logError(error, { action: 'clear_all_attendance', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Smart attendance marking from QR code with session-based tracking
 * Features:
 * - QR decryption with 15-second expiry validation
 * - Automatic status determination (PRESENT within 30min, LATE after 30min)
 * - Duplicate prevention within same session
 * - Session-based tracking
 */
const markSmartAttendance = async (req, res) => {
  try {
    const { qrData, classCode, sessionId } = req.body;
    const recorded_by = req.user.id;

    // Validate required fields
    if (!qrData || !classCode) {
      return res.status(400).json({
        success: false,
        message: 'QR data and class code are required'
      });
    }

    // Decrypt and validate QR code
    const decrypted = decryptQR(qrData);

    if (decrypted.error) {
      return res.status(400).json({
        success: false,
        message: decrypted.error
      });
    }

    const student_id = decrypted.studentId;

    // Verify student exists and get full details including profile image
    const studentCheck = await pool.query(
      `SELECT id, first_name, last_name, index_no, email, department, 
              academic_year, semester, profile_image_url 
       FROM users 
       WHERE id = $1 AND role = $2`,
      [student_id, 'student']
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentCheck.rows[0];

    // Verify class exists
    const classCheck = await pool.query(
      'SELECT class_code, class_name FROM classes WHERE class_code = $1',
      [classCode]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get or create active session
    let activeSessionId = sessionId;

    // Validate provided sessionId exists if given
    if (sessionId) {
      const validationResult = await pool.query(
        'SELECT id, is_active FROM attendance_sessions WHERE id = $1 AND class_code = $2',
        [sessionId, classCode]
      );

      if (validationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Provided session ID not found or does not match class'
        });
      }

      if (!validationResult.rows[0].is_active) {
        // Session expired, create new one
        activeSessionId = null;
      }
    }

    // Find or create active session if none provided or previous expired
    if (!activeSessionId) {
      // Try to find active session
      const sessionResult = await pool.query(
        'SELECT id FROM attendance_sessions WHERE class_code = $1 AND is_active = TRUE LIMIT 1',
        [classCode]
      );

      if (sessionResult.rows.length === 0) {
        // Create new session if none exists
        try {
          const newSessionResult = await pool.query(
            `INSERT INTO attendance_sessions (class_code, lecturer_id, start_time, is_active)
             VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE)
             RETURNING id`,
            [classCode, recorded_by]
          );
          activeSessionId = newSessionResult.rows[0].id;
          console.log(`[markSmartAttendance] Created new session: ${activeSessionId}`);
        } catch (sessionError) {
          console.error('[markSmartAttendance] Failed to create session:', sessionError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create attendance session'
          });
        }
      } else {
        activeSessionId = sessionResult.rows[0].id;
        console.log(`[markSmartAttendance] Using existing session: ${activeSessionId}`);
      }
    }

    // Verify session exists and is active
    const sessionCheck = await pool.query(
      `SELECT id, start_time, is_active 
       FROM attendance_sessions 
       WHERE id = $1 AND class_code = $2`,
      [activeSessionId, classCode]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or does not match class'
      });
    }

    const session = sessionCheck.rows[0];

    if (!session.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Session is not active. Please start a new session.'
      });
    }

    // Check for duplicate attendance in this session
    const duplicateCheck = await pool.query(
      'SELECT id, status FROM attendance WHERE session_id = $1 AND student_id = $2',
      [activeSessionId, student_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Student already marked in this session',
        alreadyMarked: true
      });
    }

    // Calculate time difference from session start
    const sessionStartTime = new Date(session.start_time);
    const now = new Date();
    const timeDifferenceMinutes = (now - sessionStartTime) / (1000 * 60);

    // Determine status: PRESENT within 30 minutes, LATE after 30 minutes
    let status = 'present';
    if (timeDifferenceMinutes > 30) {
      status = 'late';
    }

    // Insert attendance record
    console.log(`[markSmartAttendance] Inserting record for Student ID: ${student_id}, Session: ${activeSessionId}`);

    const result = await pool.query(
      `INSERT INTO attendance (
        student_id, class_code, date, status, recorded_by, 
        session_id, scanned_at, notes,
        name, index, department, academic_year, semester
      ) 
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        student_id,
        classCode,
        status,
        recorded_by,
        activeSessionId,
        `QR Code scanned at ${now.toLocaleTimeString()}`,
        `${student.first_name} ${student.last_name}`,
        student.index_no,
        student.department,
        student.academic_year,
        student.semester
      ]
    );

    logUserAction('smart_attendance_marked', recorded_by, {
      student_id,
      classCode,
      sessionId: activeSessionId,
      status,
      timeDifferenceMinutes
    });

    // Get session stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_marked
       FROM attendance 
       WHERE session_id = $1`,
      [activeSessionId]
    );

    // Return student data with profile image for display
    const attendanceRecord = result.rows[0];
    res.json({
      success: true,
      message: `Attendance marked as ${status.toUpperCase()}`,
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        index_no: student.index_no,
        profile_image_url: student.profile_image_url,
        email: student.email,
        status: attendanceRecord.status,
        attendance_id: attendanceRecord.id
      },
      attendance: attendanceRecord,
      sessionId: activeSessionId,
      markedCount: typeof statsResult.rows[0].total_marked === 'bigint'
        ? Number(statsResult.rows[0].total_marked)
        : parseInt(statsResult.rows[0].total_marked || 0)
    });

  } catch (error) {
    console.error('markSmartAttendance Error:', error);
    // Log specifically which part failed if possible (e.g. database error code)
    if (error.code) {
      console.error(`DB Error Code: ${error.code}, Message: ${error.message}`);
    }
    logError(error, { action: 'mark_smart_attendance', userId: req.user?.id });

    // Handle unique constraint violation (duplicate)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Student already marked in this session'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
};

/**
 * Update attendance status manually (e.g., change to EXCUSED)
 */
const updateAttendanceStatus = async (req, res) => {
  try {
    const { attendance_id, status, note } = req.body;
    const updated_by = req.user.id;

    if (!attendance_id || !status) {
      return res.status(400).json({ error: 'Attendance ID and status are required' });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: present, absent, late, excused' });
    }

    // Get current attendance record
    const currentRecord = await pool.query(
      'SELECT * FROM attendance WHERE id = $1',
      [attendance_id]
    );

    if (currentRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Update attendance
    const result = await pool.query(
      `UPDATE attendance 
       SET status = $1, 
           notes = COALESCE($2, notes),
           recorded_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status.toLowerCase(), note, updated_by, attendance_id]
    );

    logUserAction('attendance_status_updated', updated_by, {
      attendanceId: attendance_id,
      oldStatus: currentRecord.rows[0].status,
      newStatus: status,
      note
    });

    res.json({
      success: true,
      message: 'Attendance status updated successfully',
      attendance: result.rows[0]
    });

  } catch (error) {
    console.error('updateAttendanceStatus Error:', error);
    logError(error, { action: 'update_attendance_status', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

/**
 * Get attendance summary for admin monitoring
 * Shows list of classes with enrollment vs presence count for a specific date
 */
const getAttendanceSummary = async (req, res) => {
  try {
    const { date, department, academic_year, semester } = req.query; // Remove start_date/end_date to focus on single date summary

    let query = `
      SELECT 
        c.class_code, 
        c.class_name, 
        CONCAT(u.first_name, ' ', u.last_name) as lecturer_name,
        c.department,
        c.academic_year,
        c.semester,
        (
            SELECT COUNT(*) 
            FROM enrollments e 
            WHERE e.class_code = c.class_code
        ) as total_enrolled,
        (
            SELECT COUNT(DISTINCT a.student_id) 
            FROM attendance a 
            WHERE a.class_code = c.class_code 
              AND a.date = $1::date 
              AND a.status IN ('present', 'late', 'excused')
        ) as present_count
      FROM classes c
      LEFT JOIN users u ON c.lecturer_id = u.id
      WHERE 1=1
    `;

    const params = [date || new Date().toISOString().split('T')[0]];
    let paramCount = 1;

    if (department) {
      query += ` AND c.department = $${++paramCount}`;
      params.push(department);
    }

    if (academic_year) {
      query += ` AND c.academic_year = $${++paramCount}::text`; // Cast to text if needed, or consistent type
      params.push(String(academic_year));
    }

    if (semester) {
      query += ` AND c.semester = $${++paramCount}::text`;
      params.push(String(semester));
    }

    query += ` ORDER BY c.department, c.academic_year, c.class_name`;

    const result = await pool.query(query, params);

    // Calculate percentage
    const summary = result.rows.map(row => ({
      ...row,
      total_enrolled: parseInt(row.total_enrolled || 0),
      present_count: parseInt(row.present_count || 0),
      percentage: parseInt(row.total_enrolled) > 0
        ? Math.round((parseInt(row.present_count) / parseInt(row.total_enrolled)) * 100)
        : 0
    }));

    res.json({
      summary
    });

  } catch (error) {
    logError(error, { action: 'get_attendance_summary', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAttendance,
  recordAttendance,
  bulkRecordAttendance,
  getAttendanceStats,
  recordAttendanceFromQR,
  markSmartAttendance,
  updateAttendanceStatus,
  clearAllAttendance,
  getAttendanceSummary
};
