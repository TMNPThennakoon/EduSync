const pool = require('../config/database');
const { logError } = require('../utils/logger');

// Student Report: Transcript (Grades + Attendance)
const getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { semester, academic_year } = req.query;

    // Get User Details
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [studentId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const student = userResult.rows[0];

    // Get Grades (Join with Assignments and Classes)
    let gradesQuery = `
      SELECT g.marks_obtained, a.max_marks, a.title, c.class_name, c.class_code
      FROM grades g
      LEFT JOIN assignments a ON g.assignment_id = a.id
      LEFT JOIN classes c ON a.class_code = c.class_code
      WHERE g.student_index = $1
    `;
    let gradesParams = [student.index_no];

    if (semester) {
      gradesQuery += ` AND c.semester = $2`;
      gradesParams.push(semester);
    }

    const gradesResult = await pool.query(gradesQuery, gradesParams);

    // Get Attendance Summary
    let attendanceQuery = `
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END)::DECIMAL / NULLIF(COUNT(*),0)) * 100, 2) as percentage
      FROM attendance a
      LEFT JOIN classes c ON a.class_code = c.class_code
      WHERE a.student_id = $1
    `;
    let attendanceParams = [studentId];

    if (semester) {
      attendanceQuery += ` AND c.semester = $2`;
      attendanceParams.push(semester);
    }

    const attendanceStats = await pool.query(attendanceQuery, attendanceParams);

    res.json({
      student: {
        name: `${student.first_name} ${student.last_name}`,
        index_no: student.index_no,
        department: student.department
      },
      grades: gradesResult.rows,
      attendance: attendanceStats.rows[0],
      gpa: 3.5 // Placeholder
    });

  } catch (error) {
    logError(error, { action: 'get_student_report', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Lecturer Report: Class Merit List
const getLecturerReport = async (req, res) => {
  try {
    const { class_code } = req.query;
    if (!class_code) return res.status(400).json({ error: 'Class Code required' });

    // Get Class Details
    const classResult = await pool.query('SELECT * FROM classes WHERE class_code = $1', [class_code]);
    if (classResult.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    const classInfo = classResult.rows[0];

    // Fetch grades for all students for assignments in this class
    const gradesQuery = `
      SELECT u.first_name, u.last_name, u.index_no, 
             a.title as assignment_title, a.max_marks, 
             g.marks_obtained
      FROM users u
      JOIN grades g ON u.index_no = g.student_index
      JOIN assignments a ON g.assignment_id = a.id
      WHERE a.class_code = $1
      ORDER BY u.index_no
    `;
    const gradesResult = await pool.query(gradesQuery, [class_code]);

    // Process data to pivot
    const studentMap = {};
    const assignmentNames = new Set();

    gradesResult.rows.forEach(row => {
      if (!studentMap[row.index_no]) {
        studentMap[row.index_no] = {
          name: `${row.first_name} ${row.last_name}`,
          index: row.index_no,
          scores: {}
        };
      }
      studentMap[row.index_no].scores[row.assignment_title] = row.marks_obtained;
      assignmentNames.add(row.assignment_title);
    });

    const students = Object.values(studentMap);

    res.json({
      class_info: classInfo,
      assignments: Array.from(assignmentNames),
      students
    });

  } catch (error) {
    logError(error, { action: 'get_lecturer_report', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAdminReport = async (req, res) => {
  try {
    // System Overview
    const userStats = await pool.query(`
            SELECT role, COUNT(*) as count FROM users GROUP BY role
        `);

    const classStats = await pool.query(`
            SELECT COUNT(*) as count FROM classes
        `);

    // Attendance Overview (Avg check-in rate today)
    const attendanceToday = await pool.query(`
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count
            FROM attendance
            WHERE date = CURRENT_DATE
        `);

    res.json({
      users: userStats.rows,
      classes: classStats.rows[0].count,
      attendance_today: attendanceToday.rows[0]
    });

  } catch (error) {
    logError(error, { action: 'get_admin_report', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getStudentReport,
  getLecturerReport,
  getAdminReport
};
