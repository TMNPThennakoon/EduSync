const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');

const getAllGrades = async (req, res) => {
  try {
    const { student_id, assignment_id, class_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT g.*, u.first_name, u.last_name, u.email, a.title as assignment_title, 
             a.max_score, a.due_date, c.name as class_name, c.subject,
             graded_by_user.first_name as graded_by_first_name,
             graded_by_user.last_name as graded_by_last_name
      FROM grades g
      JOIN users u ON g.student_id = u.id
      JOIN assignments a ON g.assignment_id = a.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN users graded_by_user ON g.graded_by = graded_by_user.id
    `;

    let conditions = [];
    let params = [];
    let paramCount = 0;

    if (student_id) {
      conditions.push(`g.student_id = $${++paramCount}`);
      params.push(student_id);
    }

    if (assignment_id) {
      conditions.push(`g.assignment_id = $${++paramCount}`);
      params.push(assignment_id);
    }

    if (class_id) {
      conditions.push(`a.class_id = $${++paramCount}`);
      params.push(class_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM grades g';
    let countParams = [];
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      countParams = params.slice(0, -2); // Remove limit and offset
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      grades: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logError(error, { action: 'get_all_grades', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getGradeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT g.*, u.first_name, u.last_name, u.email, a.title as assignment_title, 
             a.max_score, a.due_date, c.name as class_name, c.subject,
             graded_by_user.first_name as graded_by_first_name,
             graded_by_user.last_name as graded_by_last_name
      FROM grades g
      JOIN users u ON g.student_id = u.id
      JOIN assignments a ON g.assignment_id = a.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN users graded_by_user ON g.graded_by = graded_by_user.id
      WHERE g.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    res.json({ grade: result.rows[0] });
  } catch (error) {
    logError(error, { action: 'get_grade_by_id', userId: req.user?.id, gradeId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createGrade = async (req, res) => {
  try {
    const { assignment_id, student_index, marks_obtained, feedback } = req.body;
    const graded_by = req.user.id;

    // Check if grade already exists
    const existingGrade = await pool.query(
      'SELECT id FROM grades WHERE assignment_id = $1 AND student_index = $2',
      [assignment_id, student_index]
    );

    if (existingGrade.rows.length > 0) {
      return res.status(400).json({ error: 'Grade already exists for this student and assignment' });
    }

    // Validate marks_obtained against max_marks
    const assignmentResult = await pool.query(
      'SELECT max_marks FROM assignments WHERE id = $1',
      [assignment_id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const maxMarks = assignmentResult.rows[0].max_marks;
    if (marks_obtained > maxMarks) {
      return res.status(400).json({ error: `Marks obtained cannot exceed maximum marks of ${maxMarks}` });
    }

    const result = await pool.query(`
      INSERT INTO grades (assignment_id, student_index, marks_obtained, feedback, graded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [assignment_id, student_index, marks_obtained, feedback, graded_by]);

    logUserAction('grade_created', req.user.id, {
      gradeId: result.rows[0].id,
      assignmentId: assignment_id,
      studentIndex: student_index,
      marksObtained: marks_obtained
    });

    res.status(201).json({
      message: 'Grade created successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'create_grade', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { marks_obtained, feedback } = req.body;

    // Get current grade and assignment details
    const currentGrade = await pool.query(`
      SELECT g.*, a.max_marks 
      FROM grades g
      JOIN assignments a ON g.assignment_id = a.id
      WHERE g.id = $1
    `, [id]);

    if (currentGrade.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const maxMarks = currentGrade.rows[0].max_marks;
    if (marks_obtained > maxMarks) {
      return res.status(400).json({ error: `Marks obtained cannot exceed maximum marks of ${maxMarks}` });
    }

    const result = await pool.query(`
      UPDATE grades 
      SET marks_obtained = $1, feedback = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [marks_obtained, feedback, id]);

    logUserAction('grade_updated', req.user.id, {
      gradeId: id,
      marksObtained: marks_obtained,
      previousMarks: currentGrade.rows[0].marks_obtained
    });

    res.json({
      message: 'Grade updated successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'update_grade', userId: req.user?.id, gradeId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if grade exists
    const gradeResult = await pool.query('SELECT id FROM grades WHERE id = $1', [id]);
    if (gradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    // Delete grade
    await pool.query('DELETE FROM grades WHERE id = $1', [id]);

    logUserAction('grade_deleted', req.user.id, { gradeId: id });

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    logError(error, { action: 'delete_grade', userId: req.user?.id, gradeId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const bulkCreateGrades = async (req, res) => {
  try {
    const { assignment_id, grades } = req.body;
    const graded_by = req.user.id;

    if (!assignment_id || !Array.isArray(grades)) {
      return res.status(400).json({ error: 'Invalid request data. assignment_id and grades array are required.' });
    }

    // Validate max marks
    const assignmentResult = await pool.query(
      'SELECT max_marks FROM assignments WHERE id = $1',
      [assignment_id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const maxMarks = assignmentResult.rows[0].max_marks;
    const results = [];
    const errors = [];

    for (const gradeData of grades) {
      try {
        const { student_index, marks_obtained, feedback } = gradeData;

        if (!student_index || marks_obtained === undefined) {
          errors.push({ student_index: student_index || 'unknown', error: 'Missing student_index or marks_obtained' });
          continue;
        }

        // Validate marks_obtained
        if (marks_obtained > maxMarks) {
          errors.push({ student_index, error: `Marks obtained (${marks_obtained}) cannot exceed maximum marks of ${maxMarks}` });
          continue;
        }

        // Check if grade already exists
        const existingGrade = await pool.query(
          'SELECT id FROM grades WHERE assignment_id = $1 AND student_index = $2',
          [assignment_id, student_index]
        );

        if (existingGrade.rows.length > 0) {
          // Update existing grade
          const result = await pool.query(`
            UPDATE grades 
            SET marks_obtained = $1, feedback = $2, graded_by = $3, updated_at = CURRENT_TIMESTAMP
            WHERE assignment_id = $4 AND student_index = $5
            RETURNING *
          `, [marks_obtained, feedback, graded_by, assignment_id, student_index]);
          results.push({ student_index, action: 'updated', grade: result.rows[0] });
        } else {
          // Create new grade
          const result = await pool.query(`
            INSERT INTO grades (assignment_id, student_index, marks_obtained, feedback, graded_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `, [assignment_id, student_index, marks_obtained, feedback, graded_by]);
          results.push({ student_index, action: 'created', grade: result.rows[0] });
        }
      } catch (error) {
        errors.push({ student_index: gradeData.student_index, error: error.message });
      }
    }

    logUserAction('bulk_grades_processed', req.user.id, {
      assignmentId: assignment_id,
      successCount: results.length,
      errorCount: errors.length
    });

    res.json({
      message: 'Bulk grades processing completed',
      results,
      errors,
      summary: {
        total: grades.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    logError(error, { action: 'bulk_create_grades', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStudentGrades = async (req, res) => {
  try {
    const { student_id, class_id } = req.query;

    let query = `
      SELECT 
          g.id as grade_id, g.marks_obtained as score, g.feedback, g.created_at as graded_at,
          a.id as assignment_id, a.title as assignment_title, a.max_marks, a.due_date, a.assignment_type,
          c.class_name, c.class_code, c.class_code as subject,
          ROUND((g.marks_obtained::DECIMAL /NULLIF(a.max_marks, 0)) * 100, 2) as percentage
      FROM grades g
      JOIN users u ON g.student_index = u.index_no
      LEFT JOIN assignments a ON g.assignment_id = a.id
      LEFT JOIN classes c ON a.class_code = c.class_code
      WHERE u.id = $1
    `;

    let params = [student_id];
    let paramCount = 1;

    if (class_id) {
      query += ` AND a.class_code = $${++paramCount}`;
      params.push(class_id);
    }

    query += ' ORDER BY g.created_at DESC';

    const result = await pool.query(query, params);

    // Calculate overall statistics
    const stats = {
      total_assignments: result.rows.length,
      average_score: 0,
      average_percentage: 0,
      highest_score: 0,
      lowest_score: 0,
      pending_grading: 0
    };

    if (result.rows.length > 0) {
      const gradedRows = result.rows.filter(row => row.score !== null);
      stats.pending_grading = result.rows.length - gradedRows.length;

      if (gradedRows.length > 0) {
        const scores = gradedRows.map(row => parseFloat(row.score));
        // Calculate percentages for individual rows (optional, kept for existing frontend use)
        const percentages = gradedRows.map(row => parseFloat(row.percentage));

        stats.average_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // OLD: Simple average of percentages
        // stats.average_percentage = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);

        // NEW: Weighted average formula: (SUM(marks) / SUM(max_marks)) * 100
        const totalMarks = scores.reduce((a, b) => a + b, 0);
        const totalMax = gradedRows.reduce((a, row) => a + (parseInt(row.max_marks) || 0), 0);

        stats.average_percentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;
        stats.assignment_avg = stats.average_percentage; // Alias for specific frontend request

        stats.highest_score = Math.max(...scores);
        stats.lowest_score = Math.min(...scores);
      }
    }

    res.json({
      grades: result.rows,
      statistics: stats
    });
  } catch (error) {
    console.error('getStudentGrades Error:', error);
    logError(error, { action: 'get_student_grades', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const bulkUpdateExamGrades = async (req, res) => {
  try {
    const { class_code, exam_type, grades, status = 'pending' } = req.body;
    const graded_by = req.user.id;

    console.log('Bulk updating exam grades:', { class_code, exam_type, count: grades.length, status });

    if (!class_code || !exam_type) {
      return res.status(400).json({ error: 'Class code and exam type are required' });
    }

    // Map exam type to column name
    let targetColumn = '';
    if (exam_type === 'Mid-term') targetColumn = 'mid_exam_marks';
    else if (exam_type === 'Final') targetColumn = 'final_exam_marks';
    else return res.status(400).json({ error: 'Invalid exam type' });

    const results = [];
    const errors = [];

    await pool.query('BEGIN');

    for (const gradeData of grades) {
      try {
        const { student_id, marks_obtained } = gradeData;

        // Upsert query: Update specific column based on exam_type
        // We use dynamic SQL for the column name (safe here as we whitelist it above)
        // Upsert query: Update specific column based on exam_type
        // We use dynamic SQL for the column name (safe here as we whitelist it above)
        // [Fix]: Select student_index from users table if not provided
        const query = `
          INSERT INTO exam_grades (class_code, student_id, student_index, ${targetColumn}, status)
          VALUES (
            $1, 
            $2, 
            (SELECT index_no FROM users WHERE id = $2),
            $3, 
            $4
          )
          ON CONFLICT (class_code, student_id)
          DO UPDATE SET 
            ${targetColumn} = $3, 
            status = $4,
            -- Ensure student_index is set if it was null (e.g. data repair)
            student_index = COALESCE(exam_grades.student_index, EXCLUDED.student_index),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await pool.query(query, [class_code, student_id, marks_obtained, status]);

        results.push(result.rows[0]);
      } catch (err) {
        console.error(`Error updating grade for student ${gradeData.student_id}:`, err);
        errors.push({ student_id: gradeData.student_id, error: err.message });
      }
    }

    await pool.query('COMMIT');

    // Notify logic (simplified for brevity, can be expanded if functionality needed)
    const io = req.app.get('io');
    if (io && status === 'approved') {
      // Notification logic...
    }

    res.json({
      success: true,
      message: 'Exam grades updated successfully',
      results,
      errors
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('bulkUpdateExamGrades Error:', error);
    logError(error, { action: 'bulk_update_exam_grades', userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getExamGrades = async (req, res) => {
  try {
    const { class_id, class_code, student_id } = req.query;

    let query = `
      SELECT eg.*, u.first_name, u.last_name, u.index_no, u.profile_image_url
      FROM exam_grades eg
      JOIN users u ON eg.student_id = u.id
    `;

    const params = [];
    const conditions = [];
    let paramCount = 0;

    if (class_code) {
      conditions.push(`eg.class_code = $${++paramCount}`);
      params.push(class_code);
    }

    // For student view
    if (student_id) {
      conditions.push(`eg.student_id = $${++paramCount}`);
      params.push(student_id);
    }

    // [New Feature] Student Visibility Logic
    // If the requester is a student, only show approved grades.
    // With new table, status is per row (covering both exams).
    // If we want partial approval (Mid approved but Final not), we might need status columns per exam?
    // For now, based on schema, 'status' covers the whole record. 
    // Assumption: Status applies to the visibility of the whole record.
    if (req.user && req.user.role === 'student') {
      conditions.push(`eg.status = $${++paramCount}`);
      params.push('approved');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.last_name, u.first_name';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      grades: result.rows
    });
  } catch (error) {
    console.error('getExamGrades Error:', error);
    logError(error, { action: 'get_exam_grades', userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const approveExamGrades = async (req, res) => {
  try {
    const { class_code, exam_type } = req.body;

    if (!class_code || !exam_type) {
      return res.status(400).json({ error: 'Class code and exam type are required' });
    }

    // Update status to 'approved' for all records of this exam
    // Update status to 'approved' for all records of this class that are pending
    // Note: We ignore exam_type in the WHERE clause because status is row-level.
    // If a row is pending, it means the latest change (Mid or Final) is pending.
    const result = await pool.query(`
      UPDATE exam_grades
      SET status = 'approved', updated_at = CURRENT_TIMESTAMP
      WHERE class_code = $1 AND status = 'pending'
      RETURNING *
    `, [class_code]);

    // Get class name for richer notification
    const classResult = await pool.query('SELECT class_name, class_code FROM classes WHERE class_code = $1', [class_code]);
    const className = classResult.rows.length > 0 ? classResult.rows[0].class_name : class_code;

    // Notify students
    const io = req.app.get('io');
    if (io) {
      // We can iterate over result.rows to notify each student
      result.rows.forEach(record => {
        io.to(String(record.student_id)).emit('exam_grade_released', {
          title: 'Exam Grade Released',
          message: `Your grade for ${className} (${exam_type}) has been approved and released.`,
          class_code,
          class_name: className,
          exam_type,
          score: record.marks_obtained,
          type: 'exam_grade', // Changed from 'grade' to match frontend handler
          priority: 'urgent', // Add priority for styling
          created_at: new Date()
        });
      });
    }

    logUserAction('exam_grades_approved', req.user.id, { class_code, exam_type, count: result.rowCount });

    res.json({
      success: true,
      message: `Successfully approved ${result.rowCount} grades`,
      count: result.rowCount
    });
  } catch (error) {
    console.error('approveExamGrades Error:', error);
    logError(error, { action: 'approve_exam_grades', userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPendingApprovals = async (req, res) => {
  try {
    // Refactored for flattened schema. 
    // We can't group by exam_type because it's not a column.
    // We will return pending counts per class.
    // Logic: If status is pending, it counts.
    // We can try to guess "exam_type" for display if really needed, but it's ambiguous if both changed.
    // Let's just return per class.
    const result = await pool.query(`
            SELECT 
                eg.class_code, 
                c.class_name,
                u.first_name as lecturer_first_name,
                u.last_name as lecturer_last_name,
                COUNT(*) as student_count, 
                MAX(eg.updated_at) as last_updated,
                CASE 
                    WHEN COUNT(eg.mid_exam_marks) > 0 AND COUNT(eg.final_exam_marks) = 0 THEN 'Mid-term'
                    WHEN COUNT(eg.final_exam_marks) > 0 AND COUNT(eg.mid_exam_marks) = 0 THEN 'Final'
                    ELSE 'Exam Updates' 
                END as exam_type
            FROM exam_grades eg
            LEFT JOIN classes c ON eg.class_code = c.class_code
            LEFT JOIN users u ON c.lecturer_id = u.id
            WHERE eg.status = 'pending'
            GROUP BY eg.class_code, c.class_name, u.first_name, u.last_name
            ORDER BY last_updated DESC
        `);

    res.json({
      success: true,
      pending: result.rows
    });
  } catch (error) {
    console.error('getPendingApprovals Error:', error);
    logError(error, { action: 'get_pending_approvals', userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
  bulkCreateGrades,
  getStudentGrades,
  bulkUpdateExamGrades,
  getExamGrades,
  approveExamGrades,
  getPendingApprovals
};
