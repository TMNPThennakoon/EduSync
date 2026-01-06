const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');

const getAllClasses = async (req, res) => {
  try {
    const { lecturer_id, academic_year, semester, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userRole = req.user?.role;
    const userDepartment = req.user?.department;

    console.log('📋 getAllClasses called with:', {
      lecturer_id,
      academic_year,
      semester,
      page,
      limit,
      userRole,
      userDepartment,
      userId: req.user?.id
    });

    let query = `
      SELECT 
        c.class_code as id,
        c.class_name as name,
        c.class_code as subject,
        '' as description,
        c.department,
        c.academic_year,
        c.semester,
        c.lecturer_id,
        c.created_at,
        c.updated_at,
        u.first_name as lecturer_first_name,
        u.last_name as lecturer_last_name,
        (SELECT COUNT(*)::INTEGER FROM enrollments e 
         WHERE e.class_code = c.class_code) as student_count
      FROM classes c
      LEFT JOIN users u ON c.lecturer_id = u.id
    `;

    let conditions = [];
    let params = [];
    let paramCount = 0;

    // Auto-filter for lecturers if not explicitly searching for something else
    // But allow admin to see everything
    if (userRole === 'lecturer' && !lecturer_id) {
      // Force filter to own classes
      conditions.push(`c.lecturer_id = $${++paramCount}`);
      params.push(req.user.id);
    }

    // Filter by department for students only
    // Lecturers should see all their own classes regardless of department
    if (userRole === 'student') {
      if (userDepartment) {
        conditions.push(`c.department = $${++paramCount}`);
        params.push(userDepartment);
      }

      // Filter by student's academic_year and semester
      const { academic_year: userYear, semester: userSem } = req.user;
      if (userYear) {
        conditions.push(`c.academic_year = $${++paramCount}`);
        params.push(parseInt(userYear));
      }
      if (userSem) {
        conditions.push(`c.semester = $${++paramCount}`);
        params.push(parseInt(userSem));
      }
    }
    // Note: Lecturers see their own classes via lecturer_id filter, not department filter

    // Filter by lecturer_id
    if (lecturer_id) {
      conditions.push(`c.lecturer_id = $${++paramCount}`);
      params.push(parseInt(lecturer_id)); // Cast to integer to match database column type
    }

    // Filter by academic_year if provided
    if (academic_year) {
      const yearNum = typeof academic_year === 'string' && academic_year.includes('Year')
        ? parseInt(academic_year.charAt(0))
        : parseInt(academic_year);
      conditions.push(`c.academic_year = $${++paramCount}`);
      params.push(yearNum);
    }

    // Filter by semester if provided
    if (semester) {
      conditions.push(`c.semester = $${++paramCount}`);
      params.push(parseInt(semester));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` GROUP BY c.class_code, u.first_name, u.last_name ORDER BY c.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('📋 Query:', query);
    console.log('📋 Params:', params);

    const result = await pool.query(query, params);

    console.log('📋 Query result:', result.rows.length, 'classes found');
    console.log('📋 Sample row:', result.rows[0] ? JSON.stringify(result.rows[0], null, 2) : 'No rows');

    // Get total count - rebuild conditions with correct parameter indices
    let countQuery = `
      SELECT COUNT(DISTINCT c.class_code) as count
      FROM classes c
      LEFT JOIN users u ON c.lecturer_id = u.id
    `;

    // Rebuild conditions for count query with fresh parameter indices
    const countConditions = [];
    const countParams = [];
    let countParamCount = 0;

    // Rebuild all conditions with new parameter indices
    // Filter by department for students only
    // Lecturers see their own classes via lecturer_id filter, not department filter
    if (userRole === 'student' && userDepartment) {
      countConditions.push(`c.department = $${++countParamCount}`);
      countParams.push(userDepartment);
    }

    // Note: New schema doesn't have academic_year or semester in courses table
    // These filters are removed as courses don't have these fields

    if (lecturer_id) {
      countConditions.push(`c.lecturer_id = $${++countParamCount}`);
      countParams.push(parseInt(lecturer_id));
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    console.log('📋 Total count:', total);
    console.log('📋 Returning classes:', result.rows.length);
    console.log('📋 Response structure:', {
      hasData: !!result.rows,
      rowsCount: result.rows.length,
      firstRow: result.rows[0] || null
    });

    const response = {
      classes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    console.log('📋 Full response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    logError(error, { action: 'get_all_classes', userId: req.user?.id });
    console.error('Error in getAllClasses:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classResult = await pool.query(`
      SELECT 
        c.class_code as id,
        c.class_name as name,
        c.class_code as subject,
        c.class_name,
        c.department,
        c.academic_year,
        c.semester,
        c.lecturer_id,
        c.created_at,
        c.updated_at,
        u.first_name as lecturer_first_name, 
        u.last_name as lecturer_last_name
      FROM classes c
      LEFT JOIN users u ON c.lecturer_id = u.id
      WHERE c.class_code = $1
    `, [id]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get enrolled students (new schema uses student_index and class_code)
    const studentsResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.index_no, e.enrolled_date
      FROM enrollments e
      JOIN users u ON e.student_index = u.index_no
      WHERE e.class_code = $1
      ORDER BY u.last_name, u.first_name
    `, [id]);

    res.json({
      class: classResult.rows[0],
      students: studentsResult.rows
    });
  } catch (error) {
    logError(error, { action: 'get_class_by_id', userId: req.user?.id, classId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createClass = async (req, res) => {
  try {
    const { name, subject, description, academic_year, semester, department } = req.body;
    const lecturer_id = req.user.id; // Use the authenticated user's ID as the lecturer

    // Generate class_code from subject (e.g., "IA3204" from subject "IA3204")
    let class_code = subject || name.substring(0, 20).toUpperCase().replace(/\s+/g, '');

    // Check if class_code already exists, if so, append a suffix
    let classCodeExists = true;
    let suffix = 1;
    let finalClassCode = class_code;

    while (classCodeExists) {
      const checkResult = await pool.query(
        'SELECT class_code FROM classes WHERE class_code = $1',
        [finalClassCode]
      );

      if (checkResult.rows.length === 0) {
        classCodeExists = false;
      } else {
        // If exists, append suffix (e.g., IA3208-1, IA3208-2)
        finalClassCode = `${class_code}-${suffix}`;
        suffix++;

        // Safety check to prevent infinite loop
        if (suffix > 100) {
          return res.status(400).json({
            error: 'Unable to generate unique class code. Please try a different subject code.'
          });
        }
      }
    }

    class_code = finalClassCode;

    // Convert academic_year from "1st Year" to 1, "2nd Year" to 2, etc.
    let academicYearNum = null;
    if (academic_year) {
      if (typeof academic_year === 'string' && academic_year.includes('Year')) {
        academicYearNum = parseInt(academic_year.charAt(0));
      } else {
        academicYearNum = parseInt(academic_year);
      }
    }

    // Convert semester to integer
    const semesterNum = semester ? parseInt(semester) : null;

    console.log('📝 Creating class with:', {
      class_code,
      class_name: name,
      department,
      lecturer_id,
      academic_year: academicYearNum,
      semester: semesterNum
    });

    const result = await pool.query(`
      INSERT INTO classes (class_code, class_name, department, lecturer_id, academic_year, semester)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [class_code, name, department, lecturer_id, academicYearNum, semesterNum]);

    logUserAction('class_created', req.user.id, {
      class_code: result.rows[0].class_code,
      class_name: result.rows[0].class_name,
      lecturer_id,
      department
    });

    // Auto-enroll logic
    if (department && academicYearNum && semesterNum) {
      try {
        console.log(`🔄 Auto-enrolling students for ${class_code} (Dept: ${department}, Year: ${academicYearNum}, Sem: ${semesterNum})`);

        // This query finds generic students matching the criteria and inserts them
        // using WHERE NOT EXISTS to avoid duplicates if no unique constraint exists
        const autoEnrollQuery = `
          INSERT INTO enrollments (class_code, student_index)
          SELECT $1::text, index_no 
          FROM users 
          WHERE role = 'student' 
          AND department = $2 
          AND semester::text = $3::text
          AND (
            academic_year::text = $4::text 
            OR academic_year::text ILIKE $5
          )
          AND index_no IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM enrollments e 
            WHERE e.class_code = $1::text 
            AND e.student_index = users.index_no
          )
        `;

        const enrollResult = await pool.query(autoEnrollQuery, [
          class_code,
          department,
          semesterNum,
          academicYearNum,
          `${academicYearNum}%` // Matches "3rd Year", "3", etc.
        ]);

        console.log(`✅ Auto-enrolled ${enrollResult.rowCount} students into ${class_code}`);
      } catch (enrollError) {
        console.error('❌ Auto-enrollment failed:', enrollError);
        // Don't fail the request, just log it
      }
    }

    res.status(201).json({
      message: 'Class created successfully',
      class: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'create_class', userId: req.user?.id });
    console.error('❌ Error creating class:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);

    // Handle duplicate key error specifically
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({
        error: 'A class with this subject code already exists. Please use a different subject code.'
      });
    }

    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, description, academic_year, semester, department } = req.body;

    const result = await pool.query(`
      UPDATE classes 
      SET class_name = $1, department = $2, updated_at = CURRENT_TIMESTAMP
      WHERE class_code = $3
      RETURNING *
    `, [name, department, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    logUserAction('class_updated', req.user.id, {
      classId: id,
      name,
      subject,
      department
    });

    res.json({
      message: 'Class updated successfully',
      class: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'update_class', userId: req.user?.id, classId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class exists
    const classResult = await pool.query('SELECT class_code, class_name FROM classes WHERE class_code = $1', [id]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete related records manually
      await client.query('DELETE FROM attendance WHERE class_code = $1', [id]);
      await client.query('DELETE FROM attendance_sessions WHERE class_code = $1', [id]);
      await client.query('DELETE FROM assignments WHERE class_code = $1', [id]);
      await client.query('DELETE FROM enrollments WHERE class_code = $1', [id]);

      // Now delete the class
      await client.query('DELETE FROM classes WHERE class_code = $1', [id]);

      await client.query('COMMIT');

      logUserAction('class_deleted', req.user.id, {
        classId: id,
        className: classResult.rows[0].name
      });

      res.json({ message: 'Class deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(error, { action: 'delete_class', userId: req.user?.id, classId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const enrollStudent = async (req, res) => {
  try {
    const { class_id, student_id } = req.body;

    // Get student's index_no from user id
    const studentResult = await pool.query('SELECT index_no FROM users WHERE id = $1', [student_id]);
    if (studentResult.rows.length === 0 || !studentResult.rows[0].index_no) {
      return res.status(404).json({ error: 'Student not found or missing index number' });
    }
    const student_index = studentResult.rows[0].index_no;

    // Check if enrollment already exists
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE class_code = $1 AND student_index = $2',
      [class_id, student_index]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Student is already enrolled in this class' });
    }

    const result = await pool.query(`
      INSERT INTO enrollments (class_code, student_index)
      VALUES ($1, $2)
      RETURNING *
    `, [class_id, student_index]);

    logUserAction('student_enrolled', req.user.id, {
      classId: class_id,
      studentId: student_id
    });

    res.status(201).json({
      message: 'Student enrolled successfully',
      enrollment: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'enroll_student', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const unenrollStudent = async (req, res) => {
  try {
    const { class_id, student_id } = req.body;

    // Get student's index_no from user id
    const studentResult = await pool.query('SELECT index_no FROM users WHERE id = $1', [student_id]);
    if (studentResult.rows.length === 0 || !studentResult.rows[0].index_no) {
      return res.status(404).json({ error: 'Student not found or missing index number' });
    }
    const student_index = studentResult.rows[0].index_no;

    const result = await pool.query(
      'DELETE FROM enrollments WHERE class_code = $1 AND student_index = $2 RETURNING *',
      [class_id, student_index]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    logUserAction('student_unenrolled', req.user.id, {
      classId: class_id,
      studentId: student_id
    });

    res.json({ message: 'Student unenrolled successfully' });
  } catch (error) {
    logError(error, { action: 'unenroll_student', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getEnrolledStudents = async (req, res) => {
  try {
    const { classId } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.index_no, 
        u.department, 
        u.academic_year,
        u.semester,
        u.phone,
        u.address,
        u.profile_image_url,
        e.enrolled_date
      FROM enrollments e
      JOIN users u ON e.student_index = u.index_no
      WHERE e.class_code = $1
      ORDER BY u.first_name, u.last_name
    `, [classId]);

    res.json({
      success: true,
      data: {
        students: result.rows
      }
    });
  } catch (error) {
    logError('Error getting enrolled students', error);
    res.status(500).json({ error: 'Failed to get enrolled students' });
  }
};

const getStudentClasses = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student's index_no from user id
    const studentResult = await pool.query('SELECT index_no FROM users WHERE id = $1', [studentId]);
    if (studentResult.rows.length === 0 || !studentResult.rows[0].index_no) {
      return res.status(404).json({ error: 'Student not found or missing index number' });
    }
    const student_index = studentResult.rows[0].index_no;

    let result = await pool.query(`
      SELECT c.*, u.first_name as lecturer_first_name, u.last_name as lecturer_last_name,
             e.enrolled_date,
             (SELECT COUNT(*)::INTEGER FROM enrollments en WHERE en.class_code = c.class_code) as student_count,
             (SELECT COUNT(*)::INTEGER FROM assignments a WHERE a.class_code = c.class_code) as assignment_count,
              COALESCE((
               SELECT ROUND((COUNT(CASE WHEN att.status = 'present' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100)
               FROM attendance att
               JOIN attendance_sessions s ON att.session_id = s.id
               WHERE s.class_code = c.class_code AND att.student_id = (SELECT id FROM users WHERE index_no = $1)
             ), 0) as attendance_rate
      FROM enrollments e
      JOIN classes c ON e.class_code = c.class_code
      LEFT JOIN users u ON c.lecturer_id = u.id
      WHERE e.student_index = $1
      ORDER BY c.created_at DESC
    `, [student_index]);

    // Lazy Enrollment: If no classes found, try to auto-enroll based on profile
    if (result.rows.length === 0) {
      const userProfile = await pool.query(
        'SELECT department, academic_year, semester FROM users WHERE id = $1',
        [studentId]
      );

      if (userProfile.rows.length > 0) {
        const { department, academic_year, semester } = userProfile.rows[0];

        if (department && academic_year && semester) {
          console.log(`🔄 Lazy enrolling student ${student_index}(Dept: ${department}, Year: ${academic_year}, Sem: ${semester})`);

          let academicYearNum = null;
          if (typeof academic_year === 'string' && academic_year.includes('Year')) {
            academicYearNum = parseInt(academic_year.charAt(0));
          } else {
            academicYearNum = parseInt(academic_year);
          }
          const semesterNum = parseInt(semester);

          const autoEnrollQuery = `
             INSERT INTO enrollments(class_code, student_index)
             SELECT class_code, $1:: text 
             FROM classes 
             WHERE department = $2 
             AND semester = $3
             AND(
        academic_year = $4 
               OR academic_year:: text ILIKE $5
      )
             AND NOT EXISTS(
        SELECT 1 FROM enrollments e 
               WHERE e.class_code = classes.class_code 
               AND e.student_index = $1:: text
      )
      `;

          await pool.query(autoEnrollQuery, [
            student_index,
            department,
            semesterNum,
            academicYearNum,
            `${academicYearNum} % `
          ]);

          // Re-fetch classes after auto-enrollment
          result = await pool.query(`
             SELECT c.*, u.first_name as lecturer_first_name, u.last_name as lecturer_last_name,
             e.enrolled_date,
             (SELECT COUNT(*)::INTEGER FROM enrollments en WHERE en.class_code = c.class_code) as student_count,
             (SELECT COUNT(*)::INTEGER FROM assignments a WHERE a.class_code = c.class_code) as assignment_count,
             COALESCE((
               SELECT ROUND((COUNT(CASE WHEN att.status = 'present' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100)
               FROM attendance att
               JOIN attendance_sessions s ON att.session_id = s.id
               WHERE s.class_code = c.class_code AND att.student_id = (SELECT id FROM users WHERE index_no = $1)
             ), 0) as attendance_rate
             FROM enrollments e
             JOIN classes c ON e.class_code = c.class_code
             LEFT JOIN users u ON c.lecturer_id = u.id
             WHERE e.student_index = $1
             ORDER BY c.created_at DESC
      `, [student_index]);
        }
      }
    }

    res.json({
      success: true,
      data: {
        classes: result.rows
      }
    });
  } catch (error) {
    logError(error, { action: 'get_student_classes', studentId: req.params.studentId });
    res.status(500).json({ error: 'Failed to get student classes' });
  }
};

// Get course statistics (student count, assignment count, attendance rate)
const getCourseStats = async (req, res) => {
  try {
    const { classId } = req.params;

    // Get student count
    const studentCountQuery = `
      SELECT COUNT(*) as student_count
      FROM enrollments e
      WHERE e.class_code = $1
      `;
    const studentCountResult = await pool.query(studentCountQuery, [classId]);

    // Get assignment count
    const assignmentCountQuery = `
      SELECT COUNT(*) as assignment_count
      FROM assignments a
      WHERE a.class_code = $1
      `;
    const assignmentCountResult = await pool.query(assignmentCountQuery, [classId]);

    // Get attendance rate (last 30 days) - using attendance_sessions and attendance_records
    const attendanceRateQuery = `
      SELECT 
        COUNT(*) as total_records,
      COUNT(CASE WHEN ar.status IN('present', 'late') THEN 1 END) as present_records
      FROM attendance_sessions att_s
      JOIN attendance ar ON att_s.id = ar.session_id
      WHERE att_s.class_code = $1 
      AND att_s.start_time >= CURRENT_DATE - INTERVAL '30 days'
      `;
    const attendanceRateResult = await pool.query(attendanceRateQuery, [classId]);

    const totalRecords = parseInt(attendanceRateResult.rows[0].total_records);
    const presentRecords = parseInt(attendanceRateResult.rows[0].present_records);
    const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    res.json({
      studentCount: parseInt(studentCountResult.rows[0].student_count),
      assignmentCount: parseInt(assignmentCountResult.rows[0].assignment_count),
      attendanceRate: attendanceRate,
      totalAttendanceRecords: totalRecords
    });
  } catch (error) {
    logError(error, { action: 'get_course_stats', userId: req.user?.id, classId: req.params.classId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Sync enrollments for a specific class (auto-enroll matching students)
const syncClassEnrollments = async (req, res) => {
  try {
    const { id: class_code } = req.params;

    // Get class details
    const classResult = await pool.query(
      'SELECT department, academic_year, semester FROM classes WHERE class_code = $1',
      [class_code]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const { department, academic_year, semester } = classResult.rows[0];

    if (!department || !academic_year || !semester) {
      return res.status(400).json({ error: 'Class missing necessary details (Department, Year, or Semester) for auto-enrollment.' });
    }

    console.log(`🔄 Syncing enrollments for ${class_code}(Dept: ${department}, Year: ${academic_year}, Sem: ${semester})`);

    const autoEnrollQuery = `
      INSERT INTO enrollments(class_code, student_index)
      SELECT $1:: text, index_no 
      FROM users 
      WHERE role = 'student' 
      AND department = $2 
      AND semester:: text = $3:: text
    AND(
      academic_year:: text = $4:: text 
        OR academic_year:: text ILIKE $5
    )
      AND index_no IS NOT NULL
      AND NOT EXISTS(
      SELECT 1 FROM enrollments e 
        WHERE e.class_code = $1:: text 
        AND e.student_index = users.index_no
    )
    `;

    // Convert academic_year to numeric if possible for fallback matching
    let academicYearNum = null;
    if (typeof academic_year === 'string' && academic_year.includes('Year')) {
      academicYearNum = parseInt(academic_year.charAt(0));
    } else {
      academicYearNum = parseInt(academic_year);
    }
    const semesterNum = parseInt(semester);


    const enrollResult = await pool.query(autoEnrollQuery, [
      class_code,
      department,
      semesterNum,
      academicYearNum,
      `${academicYearNum}% `
    ]);

    logUserAction('class_sync_enrollments', req.user.id, {
      classId: class_code,
      addedCount: enrollResult.rowCount
    });

    res.json({
      message: 'Enrollments synced successfully',
      addedCount: enrollResult.rowCount
    });

  } catch (error) {
    logError(error, { action: 'sync_class_enrollments', userId: req.user?.id, classId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all classes with statistics for dashboard
const getAllClassesWithStats = async (req, res) => {
  try {
    const { page = 1, limit = 10, lecturer_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
    SELECT
    c.class_code as id,
      c.*,
      u.first_name,
      u.last_name,
      u.email as lecturer_email,
      COALESCE(student_stats.student_count, 0) as student_count,
      COALESCE(assignment_stats.assignment_count, 0) as assignment_count,
      COALESCE(attendance_stats.attendance_rate, 0) as attendance_rate
      FROM classes c
      LEFT JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN(
        SELECT 
          e.class_code,
        COUNT(*) as student_count
        FROM enrollments e
        GROUP BY e.class_code
      ) student_stats ON c.class_code = student_stats.class_code
      LEFT JOIN(
        SELECT 
          a.class_code,
        COUNT(*) as assignment_count
        FROM assignments a
        GROUP BY a.class_code
      ) assignment_stats ON c.class_code = assignment_stats.class_code
      LEFT JOIN(
        SELECT 
          att_s.class_code,
        CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(CASE WHEN ar.status IN('present', 'late') THEN 1 END):: FLOAT / COUNT(*)) * 100)
            ELSE 0
    END as attendance_rate
        FROM attendance_sessions att_s
        JOIN attendance ar ON att_s.id = ar.session_id
        WHERE att_s.start_time >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY att_s.class_code
      ) attendance_stats ON c.class_code = attendance_stats.class_code
      WHERE 1 = 1
  `;

    const params = [];
    let paramCount = 0;

    if (lecturer_id) {
      paramCount++;
      query += ` AND c.lecturer_id = $${paramCount} `;
      params.push(parseInt(lecturer_id)); // Cast to integer to match database column type
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2} `;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as count
      FROM classes c
      WHERE 1 = 1
  `;
    const countParams = [];
    let countParamCount = 0;

    if (lecturer_id) {
      countParamCount++;
      countQuery += ` AND c.lecturer_id = $${countParamCount} `;
      countParams.push(parseInt(lecturer_id));
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      classes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logError(error, { action: 'get_all_classes_with_stats', userId: req.user?.id });
    console.error('Error in getAllClassesWithStats:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
  getStudentClasses,
  getCourseStats,
  getAllClassesWithStats,
  syncClassEnrollments
};
