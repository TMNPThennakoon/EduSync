const pool = require('../config/database');
const cloudinary = require('../config/cloudinary');
const { logUserAction, logError } = require('../utils/logger');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Gemini Config
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const getAllAssignments = async (req, res) => {
  try {
    const { class_id, assignment_type, page = 1, limit = 10, department } = req.query;
    const offset = (page - 1) * limit;
    const userRole = req.user?.role;
    const userDepartment = req.user?.department;

    let conditions = [];
    let params = [];
    let paramCount = 0;

    // Add user ID for student grade lookup - student specific logic
    if (userRole === 'student') {
      params.push(req.user.id);
      paramCount = 1;
    } else {
      params.push(null);
      paramCount = 1;
    }

    let query = `
      SELECT a.*, c.name as class_name, c.id as class_id, c.subject, c.department,
             u.first_name as lecturer_first_name, u.last_name as lecturer_last_name, u.email as lecturer_email, u.department as lecturer_department,
             COUNT(DISTINCT g.id) as graded_count,
             COUNT(DISTINCT e.student_id) as total_students,
             COUNT(DISTINCT s.id) as submission_count,
             gr.score as student_grade,
             gr.feedback as student_feedback
      FROM assignments a
      JOIN classes c ON a.class_code = c.id
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN grades g ON a.id = g.assignment_id
      LEFT JOIN enrollments e ON c.id = e.class_id
      LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
      LEFT JOIN grades gr ON a.id = gr.assignment_id AND gr.student_id = $1
    `;


    // Filter by department for students (security)
    if (userRole === 'student' && userDepartment) {
      conditions.push(`a.department = $${++paramCount}`);
      params.push(userDepartment);
    }
    // Filter by department for lecturers (Security Update: Strict Isolation)
    else if (userRole === 'lecturer') {
      // Lecturers can ONLY see assignments for classes they teach
      conditions.push(`c.lecturer_id = $${++paramCount}`);
      params.push(req.user.id);
    }
    // Admin filter (Optional: filter by department if provided, else view all)
    else if (userRole === 'admin' && department) {
      conditions.push(`a.department = $${++paramCount}`);
      params.push(department);
    }

    if (class_id) {
      conditions.push(`a.class_code = $${++paramCount}`);
      params.push(class_id);
    }

    if (assignment_type) {
      conditions.push(`a.assignment_type = $${++paramCount}`);
      params.push(assignment_type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` GROUP BY a.id, c.name, c.id, c.subject, c.department, u.first_name, u.last_name, u.email, u.department, gr.score, gr.feedback ORDER BY a.due_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    console.log('GET Assignments Query Values:', params); // Debug log

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT a.id) FROM assignments a
      JOIN classes c ON a.class_code = c.id
    `;
    let countParams = [];
    let countParamCount = 0;
    let countConditions = [];

    // Replay valid conditions for count
    if (userRole === 'student' && userDepartment) {
      countConditions.push(`a.department = $${++countParamCount}`);
      countParams.push(userDepartment);
    } else if (userRole === 'lecturer') {
      countConditions.push(`c.lecturer_id = $${++countParamCount}`);
      countParams.push(req.user.id);
    } else if (userRole === 'admin' && department) {
      countConditions.push(`a.department = $${++countParamCount}`);
      countParams.push(department);
    }

    if (class_id) {
      countConditions.push(`a.class_code = $${++countParamCount}`);
      countParams.push(class_id);
    }

    if (assignment_type) {
      countConditions.push(`a.assignment_type = $${++countParamCount}`);
      countParams.push(assignment_type);
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      assignments: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET Assignments Error Exact:', error); // Log full error
    logError(error, { action: 'get_all_assignments', userId: req.user?.id });
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const assignmentResult = await pool.query(`
      SELECT a.*, c.class_name, c.class_name as class_name_display, c.class_id as subject
      FROM assignments a
      JOIN classes c ON a.class_id = c.class_id
      WHERE a.id = $1
    `, [id]);

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get grades for this assignment (if lecturer)
    let gradesResult = { rows: [] };
    if (userRole === 'lecturer' || userRole === 'admin') {
      gradesResult = await pool.query(`
        SELECT g.*, u.first_name, u.last_name, u.email
        FROM grades g
        JOIN users u ON g.student_index = u.index_no
        WHERE g.assignment_id = $1
        ORDER BY u.last_name, u.first_name
      `, [id]);
    }

    // Get YOUR submission (if student)
    let yourSubmission = null;
    if (userRole === 'student') {
      const submissionResult = await pool.query(`
        SELECT s.*, g.marks_obtained as grade, g.feedback
        FROM assignment_submissions s
        LEFT JOIN grades g ON s.assignment_id = g.assignment_id AND s.student_id = $2
        WHERE s.assignment_id = $1 AND s.student_id = $2
      `, [id, userId]);

      // Note: The JOIN condition for grades needs to match how grades are linked.
      // Since grades table uses student_index, not student_id, we might need a more complex join
      // OR rely on the fact that we can get the grade by assignment_id + student_index.
      // Let's refine this to be safe: Get user's index_no first.

      const userIndexResult = await pool.query('SELECT index_no FROM users WHERE id = $1', [userId]);
      const userIndex = userIndexResult.rows[0]?.index_no;

      if (userIndex) {
        const studentGradeResult = await pool.query(`
             SELECT marks_obtained as grade, feedback FROM grades 
             WHERE assignment_id = $1 AND student_index = $2
         `, [id, userIndex]);

        const studentSubmissionResult = await pool.query(`
             SELECT * FROM assignment_submissions 
             WHERE assignment_id = $1 AND student_id = $2
         `, [id, userId]);

        if (studentSubmissionResult.rows.length > 0) {
          yourSubmission = {
            ...studentSubmissionResult.rows[0],
            ...studentGradeResult.rows[0] // Add grade/feedback if exists
          };
        }
      }
    }

    res.json({
      assignment: assignmentResult.rows[0],
      grades: gradesResult.rows,
      your_submission: yourSubmission
    });
  } catch (error) {
    console.error('getAssignmentById Error:', error);
    logError(error, { action: 'get_assignment_by_id', userId: req.user?.id, assignmentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createAssignment = async (req, res) => {
  try {
    console.log('Create Assignment Body:', req.body);
    const { class_id, title, description, max_score, due_date, assignment_type, department } = req.body;

    // Validate required fields
    if (!class_id || !title || !max_score || !due_date || !assignment_type || !department) {
      console.error('Missing fields:', { class_id, title, max_score, due_date, assignment_type, department });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // NOTE: Database has class_code column, but frontend sends class_id
    const result = await pool.query(`
      INSERT INTO assignments (class_code, title, description, max_score, due_date, assignment_type, department, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [class_id, title, description, max_score, due_date, assignment_type, department, req.user.id]);

    logUserAction('assignment_created', req.user.id, {
      assignmentId: result.rows[0].id,
      title,
      class_id,
    });

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Create Assignment Error Detailed:', error);
    logError(error, { action: 'create_assignment', userId: req.user?.id });
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, max_score, due_date, assignment_type } = req.body;

    const result = await pool.query(`
      UPDATE assignments 
      SET title = $1, description = $2, max_score = $3, due_date = $4, assignment_type = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [title, description, max_score, due_date, assignment_type, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    logUserAction('assignment_updated', req.user.id, {
      assignmentId: id,
      title
    });

    res.json({
      message: 'Assignment updated successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'update_assignment', userId: req.user?.id, assignmentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if assignment exists
    const assignmentResult = await pool.query('SELECT id, title FROM assignments WHERE id = $1', [id]);
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Delete assignment (cascade will handle related grades)
    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);

    logUserAction('assignment_deleted', req.user.id, {
      assignmentId: id,
      title: assignmentResult.rows[0].title
    });

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    logError(error, { action: 'delete_assignment', userId: req.user?.id, assignmentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAssignmentGrades = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT g.*, u.first_name, u.last_name, u.email, a.title as assignment_title, a.max_score
      FROM grades g
      JOIN users u ON g.student_index = u.index_no
      JOIN assignments a ON g.assignment_id = a.id
      WHERE g.assignment_id = $1
      ORDER BY u.last_name, u.first_name
    `, [id]);

    res.json({ grades: result.rows });
  } catch (error) {
    console.error('getAssignmentGrades Error:', error);
    logError(error, { action: 'get_assignment_grades', userId: req.user?.id, assignmentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit assignment
const submitAssignment = async (req, res) => {
  try {
    const { assignment_id, submission_text, submission_file_url, submission_filename, submission_file_size } = req.body;
    const student_id = req.user.id;

    // Check if assignment exists and is not past due
    const assignmentResult = await pool.query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignment_id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];
    const now = new Date();
    const dueDate = new Date(assignment.due_date);

    const isLate = now > dueDate;
    const submissionStatus = isLate ? 'late' : 'submitted';

    // Allow late submissions (removed blocking check)
    if (isLate) {
      console.log(`Late submission detected for assignment ${assignment_id} by student ${student_id}`);
    }

    // Check if student has already submitted
    const existingSubmission = await pool.query(
      'SELECT id, can_edit_until FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignment_id, student_id]
    );

    let canEditUntil = null;

    if (existingSubmission.rows.length > 0) {
      // Check if still within edit window
      const editUntil = new Date(existingSubmission.rows[0].can_edit_until);
      if (now > editUntil) {
        return res.status(400).json({ error: 'Edit window has expired. You can no longer modify your submission.' });
      }

      // Update existing submission
      const result = await pool.query(
        `UPDATE assignment_submissions 
         SET submission_text = $1, submission_file_url = $2, submission_filename = $3, 
             submission_file_size = $4, last_edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             status = $7 
         WHERE assignment_id = $5 AND student_id = $6
         RETURNING *`,
        [submission_text, submission_file_url, submission_filename, submission_file_size, assignment_id, student_id, submissionStatus]
      );

      logUserAction('assignment_resubmitted', student_id, {
        assignment_id,
        assignment_title: assignment.title
      });

      res.json({
        message: 'Assignment updated successfully',
        submission: result.rows[0]
      });
    } else {
      // Create new submission with 15-minute edit window
      canEditUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      const result = await pool.query(
        `INSERT INTO assignment_submissions 
         (assignment_id, student_id, submission_text, submission_file_url, submission_filename, 
          submission_file_size, status, can_edit_until) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [assignment_id, student_id, submission_text, submission_file_url, submission_filename, submission_file_size, submissionStatus, canEditUntil]
      );

      logUserAction('assignment_submitted', student_id, {
        assignment_id,
        assignment_title: assignment.title
      });

      res.json({
        message: 'Assignment submitted successfully',
        submission: result.rows[0],
        canEditUntil: canEditUntil
      });
    }
  } catch (error) {
    logError(error, { action: 'submit_assignment', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get assignment submissions (for lecturers)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT s.*, u.first_name, u.last_name, u.email, u.index_no as student_index,
             a.title as assignment_title, a.max_score, a.due_date,
             g.marks_obtained as grade, g.feedback
      FROM assignment_submissions s
      JOIN users u ON s.student_id = u.id
      JOIN assignments a ON s.assignment_id = a.id
      LEFT JOIN grades g ON s.assignment_id = g.assignment_id AND u.index_no = g.student_index
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [id]);

    res.json({ submissions: result.rows });
  } catch (error) {
    console.error('getAssignmentSubmissions Error:', error);
    logError(error, { action: 'get_assignment_submissions', userId: req.user?.id, assignmentId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper to update total assignment marks in exam_grades
const updateAssignmentTotal = async (studentIndex, studentId, classCode) => {
  try {
    // 1. Calculate total marks obtained for this student in this class
    // We join assignments to filter by class_id
    const totalResult = await pool.query(`
      SELECT SUM(g.marks_obtained) as total
      FROM grades g
      JOIN assignments a ON g.assignment_id = a.id
      WHERE g.student_index = $1 AND a.class_id = $2
    `, [studentIndex, classCode]);

    const totalMarks = totalResult.rows[0]?.total || 0;

    console.log(`Updating assignment total for ${studentIndex} in ${classCode}: ${totalMarks}`);

    // 2. Update exam_grades table
    await pool.query(`
      INSERT INTO exam_grades (class_id, student_id, student_index, total_assignment_marks)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (class_id, student_id)
      DO UPDATE SET 
        total_assignment_marks = $4,
        student_index = $3, -- Ensure index is set
        updated_at = CURRENT_TIMESTAMP
    `, [classCode, studentId, studentIndex, totalMarks]);

  } catch (error) {
    console.error('Error updating assignment total:', error);
    // Don't throw, just log. This is a side effect.
  }
};

// Grade assignment submission
const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const graded_by = req.user.id;

    // Validate grade
    if (grade < 0 || grade > 1000) {
      return res.status(400).json({ error: 'Grade must be between 0 and 1000' });
    }

    // Get submission details first
    const submissionResult = await pool.query(
      'SELECT * FROM assignment_submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Update assignment_submissions table
    const updateResult = await pool.query(
      `UPDATE assignment_submissions 
       SET grade = $1, feedback = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP, status = 'graded'
       WHERE id = $4 
       RETURNING *`,
      [grade, feedback, graded_by, submissionId]
    );

    // Insert or update grades table
    // Get student's index number first
    const studentUser = await pool.query('SELECT index_no FROM users WHERE id = $1', [submission.student_id]);
    const student_index = studentUser.rows[0]?.index_no;

    await pool.query(
      `INSERT INTO grades (assignment_id, student_index, marks_obtained, feedback, graded_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (assignment_id, student_index)
       DO UPDATE SET marks_obtained = $3, feedback = $4, graded_by = $5, updated_at = CURRENT_TIMESTAMP`,
      [submission.assignment_id, student_index, grade, feedback, graded_by]
    );

    logUserAction('assignment_graded', graded_by, {
      submission_id: submissionId,
      grade,
      student_id: submission.student_id
    });

    // [New Feature] Auto-update total assignment marks in exam_grades
    // We need class_id for this.
    const assignmentDetails = await pool.query('SELECT class_id FROM assignments WHERE id = $1', [submission.assignment_id]);
    const classCode = assignmentDetails.rows[0]?.class_id;

    if (classCode && student_index) {
      await updateAssignmentTotal(student_index, submission.student_id, classCode);
    }

    res.json({
      message: 'Assignment graded successfully',
      submission: updateResult.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'grade_submission', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get student submissions (for students to view their own submissions)
// Get student submissions (for students to view their own submissions)
const getStudentSubmissions = async (req, res) => {
  try {
    const studentId = req.user.id; // Strictly use the logged-in user's ID
    const { search, status } = req.query;

    console.log('Fetching submissions for student:', studentId);

    // 1. Get student's index number for grade lookup
    const userResult = await pool.query('SELECT index_no FROM users WHERE id = $1', [studentId]);
    const studentIndex = userResult.rows[0]?.index_no;

    // 2. Build the query
    let query = `
      SELECT s.id, s.assignment_id, s.student_id, s.submission_text, s.submission_file, 
             s.submission_filename, s.submission_file_size, s.submitted_at, s.status as submission_status, 
             s.can_edit_until, s.last_edited_at, s.graded_at,
             a.title as assignment_title, a.max_score, a.due_date, a.assignment_type, a.description,
             c.class_name, c.class_id as subject, c.department,
             g.marks_obtained as grade, g.feedback
      FROM assignment_submissions s
      INNER JOIN assignments a ON s.assignment_id = a.id
      LEFT JOIN classes c ON a.class_id = c.class_id
      LEFT JOIN grades g ON s.assignment_id = g.assignment_id AND g.student_index = $2
      WHERE s.student_id = $1
    `;

    // Ensure studentIndex is handled properly (null if not found)
    const safeStudentIndex = studentIndex || null;

    console.log(`[getStudentSubmissions] Student ID: ${studentId}, Index No: ${safeStudentIndex}`);

    let params = [studentId, safeStudentIndex]; // $1 = studentId, $2 = studentIndex
    let paramCount = 2; // Start after existing params

    // Add search filter
    if (search) {
      query += ` AND (a.title ILIKE $${++paramCount} OR a.description ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add status filter
    if (status) {
      if (status === 'graded') {
        query += ` AND g.marks_obtained IS NOT NULL`;
      } else if (status === 'submitted') {
        query += ` AND g.marks_obtained IS NULL`;
      } else if (status === 'late') {
        query += ` AND s.submitted_at > a.due_date`;
      } else if (status === 'overdue') {
        query += ` AND s.submitted_at IS NULL AND a.due_date < CURRENT_TIMESTAMP`;
      }
    }

    query += ` ORDER BY s.submitted_at DESC, a.due_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      submissions: result.rows
    });
  } catch (error) {
    console.error('getStudentSubmissions Error:', error);
    logError(error, { action: 'get_student_submissions', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

// Generate Quiz using Google Gemini
const generateQuiz = async (req, res) => {
  try {
    const { topic, count = 5 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Use gemini-1.5-flash as requested (or gemini-flash-latest as fallback if needed in future)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate a quiz about "${topic}" with ${count} multiple choice questions. 
    Provide the output strictly in JSON format as an object with a key "questions" containing an array of objects.
    Each question object must clearly have: 
    - "id": index (number)
    - "question": string
    - "options": array of 4 strings
    - "correct_answer": string (must be exactly one of the options)
    
    Example JSON structure:
    {
      "questions": [
        { "id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "B" }
      ]
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up Gemini's potential markdown response
    text = text.replace(/```json|```/g, "").trim();

    // Parse JSON
    let quizData;
    try {
      quizData = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Gemini response:', text);
      return res.status(500).json({ error: 'Failed to generate valid quiz data from AI' });
    }

    res.json(quizData);

  } catch (error) {
    logError(error, { action: 'generate_quiz', userId: req.user?.id });
    console.error('Gemini API Details:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    });

    if (error.message.includes('429') || error.message.includes('Quota') || error.message.includes('Too Many Requests')) {
      return res.status(429).json({ error: 'AI usage limit reached. Please wait a moment before trying again.' });
    }

    res.status(500).json({ error: `Failed to generate quiz: ${error.message}` });
  }
};

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentGrades,
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getStudentSubmissions,
  generateQuiz
};
