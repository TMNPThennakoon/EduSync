const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');

/**
 * Start a new attendance session
 */
const startSession = async (req, res) => {
  try {
    const { class_code } = req.body;
    const lecturer_id = req.user.id;

    if (!class_code) {
      return res.status(400).json({ error: 'Class code is required' });
    }

    // Verify class exists
    const classCheck = await pool.query(
      'SELECT class_code, class_name FROM classes WHERE class_code = $1',
      [class_code]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if there's an active session for this class
    const activeSession = await pool.query(
      'SELECT id FROM attendance_sessions WHERE class_code = $1 AND is_active = TRUE',
      [class_code]
    );

    if (activeSession.rows.length > 0) {
      return res.status(400).json({
        error: 'An active session already exists for this class',
        sessionId: activeSession.rows[0].id
      });
    }

    // Create new session
    const result = await pool.query(
      `INSERT INTO attendance_sessions (class_code, lecturer_id, start_time, is_active)
       VALUES ($1, $2, CURRENT_TIMESTAMP, TRUE)
       RETURNING *`,
      [class_code, lecturer_id]
    );

    const session = result.rows[0];

    logUserAction('attendance_session_started', lecturer_id, {
      sessionId: session.id,
      classCode: class_code
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session started successfully',
      session: session
    });
  } catch (error) {
    console.error('startSession Error:', error);
    logError(error, { action: 'start_attendance_session', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

/**
 * End/Complete an attendance session
 */
const endSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    const lecturer_id = req.user.id;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists and belongs to lecturer
    const sessionCheck = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1 AND lecturer_id = $2',
      [session_id, lecturer_id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }

    const session = sessionCheck.rows[0];

    if (!session.is_active) {
      return res.status(400).json({ error: 'Session is already completed' });
    }

    // === AUTO-ABSENT LOGIC START ===
    // 1. Get all students enrolled in this class
    const enrolledStudents = await pool.query(

      `SELECT u.id as student_id, e.student_index, u.first_name || ' ' || u.last_name as student_name, u.email as student_email
       FROM enrollments e
       JOIN users u ON e.student_index = u.index_no
       WHERE e.class_code = $1`,
      [session.class_code]
    );

    // 2. Get all students who have marked attendance for this session
    const markedStudents = await pool.query(
      'SELECT student_id FROM attendance WHERE session_id = $1',
      [session_id]
    );

    const markedStudentIds = new Set(markedStudents.rows.map(row => row.student_id));
    const absentRecords = [];

    // 3. Identify students who are enrolled but NOT marked
    for (const student of enrolledStudents.rows) {
      // Need to find user ID from enrollments (which might store index/email) if student_id is not directly usable
      // Assuming enrollments table has student_id linked to users table. 
      // If enrollments only has index_no, we might need a JOIN.
      // Let's assume enrollments has valid student_id for now as per previous queries.

      if (!markedStudentIds.has(student.student_id)) {
        // Prepare absent record
        absentRecords.push({
          student_id: student.student_id,
          class_code: session.class_code,
          status: 'absent',
          recorded_by: lecturer_id,
          session_id: session_id,
          notes: 'Auto-marked as absent upon session completion',
          // Need to fetch extra details for the attendance table structure
          // We can do this via specific query or just insert essential IDs and let a trigger handle it?
          // No, we should insert full details as per other inserts.
        });
      }
    }

    // 4. Bulk Insert Absent Records
    if (absentRecords.length > 0) {
      // We need to fetch user details for the absent students to populate name, index, dept etc.
      const absentStudentIds = absentRecords.map(r => r.student_id);

      // Get details for all absent students
      const studentDetails = await pool.query(
        `SELECT id, first_name, last_name, index_no, department, academic_year, semester 
          FROM users WHERE id = ANY($1)`,
        [absentStudentIds]
      );

      const studentMap = new Map();
      studentDetails.rows.forEach(s => studentMap.set(s.id, s));

      for (const record of absentRecords) {
        const student = studentMap.get(record.student_id);
        if (student) {
          await pool.query(
            `INSERT INTO attendance (
                student_id, class_code, date, status, recorded_by, 
                session_id, notes,
                name, index, department, academic_year, semester
               ) 
               VALUES ($1, $2, CURRENT_DATE, 'absent', $3, $4, $5, $6, $7, $8, $9, $10)
               ON CONFLICT (student_id, class_code, date) DO NOTHING`, // Prevent duplicate if somehow already marked for date but not session?
            // Actually session_id logic prevents this usually, but ON CONFLICT is safe.
            // However, unique constraint is usually on (student_id, class_code, date) OR (session_id, student_id)
            [
              record.student_id,
              record.class_code,
              lecturer_id,
              session_id,
              record.notes,
              `${student.first_name} ${student.last_name}`,
              student.index_no,
              student.department,
              parseInt(student.academic_year?.toString().match(/\d+/)?.[0] || 0), // Extract numeric year safely
              parseInt(student.semester?.toString().match(/\d+/)?.[0] || 0)       // Extract numeric semester safely
            ]
          );
        }
      }
    }
    // === AUTO-ABSENT LOGIC END ===

    // Update session to inactive
    const result = await pool.query(
      `UPDATE attendance_sessions 
       SET is_active = FALSE, end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [session_id]
    );

    // Get FINAL attendance statistics for the session
    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_marked,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count
       FROM attendance 
       WHERE session_id = $1`,
      [session_id]
    );

    // Get FULL attendance list for immediate table update
    const fullAttendanceList = await pool.query(
      `SELECT a.id, a.class_code, a.student_id, a.date::text, a.status, a.notes, a.recorded_by, a.created_at,
              a.name, a.index, a.department, a.academic_year, a.semester,
              u.first_name, u.last_name, u.index_no as student_index, u.email,
              u.department as user_department,
              recorded_by_user.first_name as recorded_by_first_name,
              recorded_by_user.last_name as recorded_by_last_name
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       LEFT JOIN users recorded_by_user ON a.recorded_by = recorded_by_user.id
       WHERE a.session_id = $1
       ORDER BY u.index_no ASC`,
      [session_id]
    );

    logUserAction('attendance_session_ended', lecturer_id, {
      sessionId: session_id,
      classCode: session.class_code,
      stats: stats.rows[0],
      autoAbsentCount: absentRecords.length
    });

    res.json({
      success: true,
      message: 'Attendance session completed successfully',
      session: result.rows[0],
      stats: stats.rows[0],
      autoAbsentCount: absentRecords.length,
      allAttendance: fullAttendanceList.rows // Return full list
    });
  } catch (error) {
    console.error('endSession Error:', error);
    logError(error, { action: 'end_attendance_session', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

/**
 * Clear/Reset an attendance session (Protected)
 */
const clearSession = async (req, res) => {
  try {
    const { session_id, password, class_code } = req.body;
    const lecturer_id = req.user.id; // Or admin

    if (!session_id || !password) {
      return res.status(400).json({ error: 'Session ID and password are required' });
    }

    // 1. Verify Password
    if (password !== 'Napi@1009') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // 2. Verify Session exists (optional, but good for safety)
    const sessionCheck = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1',
      [session_id]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 3. Delete all attendance records for this session
    const deleteResult = await pool.query(
      'DELETE FROM attendance WHERE session_id = $1',
      [session_id]
    );

    // 4. Reset session status if it was inactive (optional: reuse session or just clear data?)
    // User asked: "delete all attendance records... to allow a fresh start"
    // Usually "fresh start" implies setting session back to active if it was closed? 
    // Or just clearing data so they can rescan.
    // If we want to allow rescanning, we should ensure session is active.

    await pool.query(
      'UPDATE attendance_sessions SET is_active = TRUE WHERE id = $1',
      [session_id]
    );

    logUserAction('session_cleared_reset', lecturer_id, {
      sessionId: session_id,
      classCode: class_code || sessionCheck.rows[0].class_code,
      recordsDeleted: deleteResult.rowCount
    });

    res.json({
      success: true,
      message: 'Session cleared and reset successfully. You can start scanning again.',
      data: {
        recordsDeleted: deleteResult.rowCount
      }
    });

  } catch (error) {
    console.error('clearSession Error:', error);
    logError(error, { action: 'clear_session', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

/**
 * Get active session for a class
 */
const getActiveSession = async (req, res) => {
  try {
    const { class_code } = req.query;

    if (!class_code) {
      return res.status(400).json({ error: 'Class code is required' });
    }

    const result = await pool.query(
      `SELECT * FROM attendance_sessions 
       WHERE class_code = $1 AND is_active = TRUE 
       ORDER BY start_time DESC 
       LIMIT 1`,
      [class_code]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        session: null,
        message: 'No active session found'
      });
    }

    // Get current attendance count
    const countResult = await pool.query(
      `SELECT COUNT(*) as marked_count 
       FROM attendance 
       WHERE session_id = $1`,
      [result.rows[0].id]
    );

    res.json({
      success: true,
      session: result.rows[0],
      markedCount: parseInt(countResult.rows[0].marked_count)
    });
  } catch (error) {
    console.error('getActiveSession Error:', error);
    logError(error, { action: 'get_active_session', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

/**
 * Get session statistics
 */
const getSessionStats = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session info
    const sessionResult = await pool.query(
      'SELECT * FROM attendance_sessions WHERE id = $1',
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get total enrolled students for this class
    const enrolledResult = await pool.query(
      `SELECT COUNT(DISTINCT e.student_index) as total_enrolled
       FROM enrollments e
       WHERE e.class_code = $1`,
      [session.class_code]
    );

    const totalEnrolled = parseInt(enrolledResult.rows[0]?.total_enrolled || 0);

    // Get marked attendance
    const attendanceResult = await pool.query(
      `SELECT 
        COUNT(*) as total_marked,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count
       FROM attendance 
       WHERE session_id = $1`,
      [session_id]
    );

    const stats = attendanceResult.rows[0];

    res.json({
      success: true,
      session: session,
      stats: {
        totalEnrolled,
        totalMarked: parseInt(stats.total_marked || 0),
        presentCount: parseInt(stats.present_count || 0),
        lateCount: parseInt(stats.late_count || 0),
        excusedCount: parseInt(stats.excused_count || 0),
        absentCount: parseInt(stats.absent_count || 0)
      }
    });
  } catch (error) {
    console.error('getSessionStats Error:', error);
    logError(error, { action: 'get_session_stats', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

module.exports = {
  startSession,
  endSession,
  getActiveSession,
  getSessionStats,
  clearSession
};

