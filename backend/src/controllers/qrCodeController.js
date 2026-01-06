const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');
const { 
  generateQRCodeImage, 
  generateQRCodeSVG, 
  parseQRCodeData,
  generateQRCodeId 
} = require('../utils/qrCode');

/**
 * Generate QR code for a student
 */
const generateStudentQRCode = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { format = 'png' } = req.query;

    // Get student information
    const studentResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role = $2',
      [studentId, 'student']
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];

    let qrCodeData;
    if (format === 'svg') {
      qrCodeData = await generateQRCodeSVG(student);
    } else {
      qrCodeData = await generateQRCodeImage(student);
    }

    const qrCodeId = await generateQRCodeId();

    logUserAction('qr_code_generated', req.user.id, { 
      studentId, 
      format,
      qrCodeId 
    });

    res.json({
      success: true,
      qrCodeId,
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email
      },
      qrCode: qrCodeData,
      format,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logError(error, { action: 'generate_student_qr_code', userId: req.user?.id });
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

/**
 * Scan QR code and record attendance
 */
const scanQRCode = async (req, res) => {
  try {
    const { qrCodeData, classId, date } = req.body;

    if (!qrCodeData || !classId || !date) {
      return res.status(400).json({ 
        error: 'QR code data, class ID, and date are required' 
      });
    }

    // Parse QR code data
    const parsedData = parseQRCodeData(qrCodeData);
    const { studentId, firstName, lastName } = parsedData;

    // Verify student exists and is enrolled in the class
    const enrollmentResult = await pool.query(`
      SELECT e.*, u.first_name, u.last_name, u.email, u.student_index, u.department, c.name as class_name
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN classes c ON e.class_id = c.id
      WHERE e.student_id = $1 AND e.class_id = $2 AND e.status = 'active'
    `, [studentId, classId]);

    if (enrollmentResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Student is not enrolled in this class' 
      });
    }

    const enrollment = enrollmentResult.rows[0];

    // Check if attendance already exists for this student on this date
    const existingAttendance = await pool.query(
      'SELECT id, status FROM attendance WHERE class_id = $1 AND student_id = $2 AND date = $3',
      [classId, studentId, date]
    );

    const attendanceData = {
      class_id: classId,
      student_id: studentId,
      date: date,
      status: 'present',
      notes: `QR Code scanned on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      recorded_by: req.user.id,
      name: `${enrollment.first_name} ${enrollment.last_name}`,
      index: enrollment.student_index,
      department: enrollment.department
    };

    let attendanceRecord;

    if (existingAttendance.rows.length > 0) {
      // Update existing attendance
      const updateResult = await pool.query(`
        UPDATE attendance 
        SET status = $1, notes = $2, recorded_by = $3, name = $4, index = $5, department = $6, created_at = CURRENT_TIMESTAMP
        WHERE class_id = $7 AND student_id = $8 AND date = $9
        RETURNING *
      `, [attendanceData.status, attendanceData.notes, attendanceData.recorded_by, 
          attendanceData.name, attendanceData.index, attendanceData.department,
          attendanceData.class_id, attendanceData.student_id, attendanceData.date]);

      attendanceRecord = updateResult.rows[0];
    } else {
      // Create new attendance record
      const insertResult = await pool.query(`
        INSERT INTO attendance (class_id, student_id, date, status, notes, recorded_by, name, index, department)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [attendanceData.class_id, attendanceData.student_id, attendanceData.date, 
          attendanceData.status, attendanceData.notes, attendanceData.recorded_by,
          attendanceData.name, attendanceData.index, attendanceData.department]);

      attendanceRecord = insertResult.rows[0];
    }

    logUserAction('qr_code_attendance_recorded', req.user.id, { 
      studentId, 
      classId, 
      date,
      attendanceId: attendanceRecord.id
    });

    res.json({
      success: true,
      message: `Attendance recorded for ${firstName} ${lastName}`,
      attendance: attendanceRecord,
      student: {
        id: studentId,
        first_name: firstName,
        last_name: lastName,
        email: enrollment.email
      },
      class: {
        id: classId,
        name: enrollment.class_name
      },
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    logError(error, { action: 'scan_qr_code', userId: req.user?.id });
    
    if (error.message.includes('Invalid QR code')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to process QR code scan' });
  }
};

/**
 * Get QR code scan history for a class
 */
const getQRScanHistory = async (req, res) => {
  try {
    const { classId, date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, u.first_name, u.last_name, u.email, c.name as class_name,
             recorded_by_user.first_name as recorded_by_first_name,
             recorded_by_user.last_name as recorded_by_last_name
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN users recorded_by_user ON a.recorded_by = recorded_by_user.id
      WHERE a.notes LIKE '%QR Code scanned%'
    `;
    
    let params = [];
    let paramCount = 0;

    if (classId) {
      query += ` AND a.class_id = $${++paramCount}`;
      params.push(classId);
    }

    if (date) {
      query += ` AND a.date = $${++paramCount}`;
      params.push(date);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM attendance a
      WHERE a.notes LIKE '%QR Code scanned%'
    `;
    let countParams = [];
    let countParamCount = 0;

    if (classId) {
      countQuery += ` AND a.class_id = $${++countParamCount}`;
      countParams.push(classId);
    }

    if (date) {
      countQuery += ` AND a.date = $${++countParamCount}`;
      countParams.push(date);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      scans: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logError(error, { action: 'get_qr_scan_history', userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get QR scan history' });
  }
};

module.exports = {
  generateStudentQRCode,
  scanQRCode,
  getQRScanHistory
};
