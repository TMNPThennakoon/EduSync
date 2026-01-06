const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { logUserAction, logError } = require('../utils/logger');

const getAllUsers = async (req, res) => {
  try {
    const { role, department, academic_year, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Base select - include all user fields for admin view
    let selectColumns = 'id, email, first_name, last_name, role, department, created_at, updated_at, dob, phone, nic, index_no, academic_year, semester, lecturer_id, is_approved, address, profile_image_url, type, gender';
    let query = `SELECT ${selectColumns} FROM users`;
    let whereClauses = [];
    let params = [];
    let paramCount = 0;

    // If requester is a lecturer, limit listing to students only
    if (req.user?.role === 'lecturer') {
      whereClauses.push(`role = $${++paramCount}`);
      params.push('student');
    }

    if (role) {
      whereClauses.push(`role = $${++paramCount}`);
      params.push(role);
    }

    if (department) {
      whereClauses.push(`department = $${++paramCount}`);
      params.push(department);
    }

    if (academic_year) {
      whereClauses.push(`academic_year = $${++paramCount}`);
      params.push(academic_year);
    }

    if (search) {
      const searchParam = `%${search}%`;
      // Search by first_name, last_name, email, index_no, or lecturer_id
      whereClauses.push(`(
        first_name ILIKE $${++paramCount} OR 
        last_name ILIKE $${paramCount} OR 
        email ILIKE $${paramCount} OR 
        index_no ILIKE $${paramCount} OR 
        lecturer_id ILIKE $${paramCount}
      )`);
      params.push(searchParam);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sort by created_at DESC default, could make this dynamic too
    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users';
    // Re-use logic for count query WHERE clause
    // Note: Can't easily reuse the paramCount logic without resetting or copying params. 
    // Constructing count query separately for simplicity.

    let countParams = [];
    let countWhere = [];
    let countParamIndex = 0;

    if (req.user?.role === 'lecturer') {
      countWhere.push(`role = $${++countParamIndex}`);
      countParams.push('student');
    }
    if (role) {
      countWhere.push(`role = $${++countParamIndex}`);
      countParams.push(role);
    }
    if (department) {
      countWhere.push(`department = $${++countParamIndex}`);
      countParams.push(department);
    }
    if (academic_year) {
      countWhere.push(`academic_year = $${++countParamIndex}`);
      countParams.push(academic_year);
    }
    if (search) {
      const searchParam = `%${search}%`;
      countWhere.push(`(
        first_name ILIKE $${++countParamIndex} OR 
        last_name ILIKE $${countParamIndex} OR 
        email ILIKE $${countParamIndex} OR 
        index_no ILIKE $${countParamIndex} OR 
        lecturer_id ILIKE $${countParamIndex}
      )`);
      countParams.push(searchParam);
    }

    if (countWhere.length > 0) {
      countQuery += ` WHERE ${countWhere.join(' AND ')}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logError(error, { action: 'get_all_users', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] getUserById called for ID: ${id}`);

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department, created_at, profile_image_url, index_no, phone, address, dob, academic_year, semester, gender FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`[DEBUG] User not found for ID: ${id}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[DEBUG] User found: ${result.rows[0].email}`);
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(`[DEBUG] Error in getUserById: ${error.message}`);
    logError(error, { action: 'get_user_by_id', userId: req.user?.id, targetUserId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      department,
      student_index,
      lecturer_id,
      status = 'active',
      batch
    } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Prepare insert query based on role
    let insertQuery, insertParams;

    if (role === 'student') {
      insertQuery = `
        INSERT INTO users (email, password_hash, first_name, last_name, role, department, index_no, is_approved, profile_image_url) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, email, first_name, last_name, role, department, index_no, is_approved, profile_image_url, created_at
      `;
      insertParams = [email, password_hash, first_name, last_name, role, department, student_index || req.body.index_no, true, req.body.profile_image_url || 'https://via.placeholder.com/200'];
    } else if (role === 'lecturer') {
      insertQuery = `
        INSERT INTO users (email, password_hash, first_name, last_name, role, department, lecturer_id, is_approved, profile_image_url, type) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING id, email, first_name, last_name, role, department, lecturer_id, is_approved, profile_image_url, type, created_at
      `;
      insertParams = [email, password_hash, first_name, last_name, role, department, lecturer_id, true, req.body.profile_image_url || 'https://via.placeholder.com/200', req.body.type || 'permanent'];
    } else {
      return res.status(400).json({ error: 'Invalid role. Must be student or lecturer' });
    }

    const result = await pool.query(insertQuery, insertParams);

    logUserAction('user_created', req.user.id, {
      newUserId: result.rows[0].id,
      email,
      role,
      department,
      createdBy: 'admin'
    });

    // Auto-enroll student in matching classes
    if (role === 'student') {
      try {
        const academicYear = req.body.academic_year || academic_year; // Use body if not in destructured vars
        const semester = req.body.semester || semester; // Assuming semester is passed

        if (department && academicYear && semester) {
          const matchingClasses = await pool.query(`
                    SELECT class_code FROM classes 
                    WHERE department = $1 AND academic_year = $2 AND semester = $3
                `, [department, academicYear, semester]);

          if (matchingClasses.rows.length > 0) {
            for (const cls of matchingClasses.rows) {
              try {
                await pool.query(`
                                INSERT INTO enrollments (class_code, student_index, enrolled_at)
                                VALUES ($1, $2, CURRENT_TIMESTAMP)
                                ON CONFLICT (class_code, student_index) DO NOTHING
                            `, [cls.class_code, result.rows[0].index_no]);
              } catch (enrollErr) {
                console.error(`Failed to auto-enroll in ${cls.class_code}:`, enrollErr);
              }
            }
            console.log(`Auto-enrolled student in ${matchingClasses.rows.length} classes`);
          }
        }
      } catch (autoEnrollError) {
        console.error('Auto-enrollment error:', autoEnrollError);
        // Don't fail the whole request, just log it
      }
    }

    res.status(201).json({
      message: `${role === 'student' ? 'Student' : 'Lecturer'} created successfully`,
      user: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'create_user', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      role,
      department,
      gender,
      academic_year,
      semester,
      index_no,
      lecturer_id,
      type,
      nic,
      phone,
      address,
      dob,
      profile_image_url
    } = req.body;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Build dynamic update query based on provided fields
    let updateFields = [];
    let updateValues = [];
    let paramCount = 0;

    if (first_name) {
      updateFields.push(`first_name = $${++paramCount}`);
      updateValues.push(first_name);
    }
    if (last_name) {
      updateFields.push(`last_name = $${++paramCount}`);
      updateValues.push(last_name);
    }
    if (email) {
      updateFields.push(`email = $${++paramCount}`);
      updateValues.push(email);
    }
    if (role) {
      updateFields.push(`role = $${++paramCount}`);
      updateValues.push(role);
    }
    if (department) {
      updateFields.push(`department = $${++paramCount}`);
      updateValues.push(department);
    }
    if (gender) {
      updateFields.push(`gender = $${++paramCount}`);
      updateValues.push(gender);
    }
    if (academic_year) {
      updateFields.push(`academic_year = $${++paramCount}`);
      updateValues.push(academic_year);
    }
    if (semester) {
      updateFields.push(`semester = $${++paramCount}`);
      updateValues.push(semester);
    }
    const indexNo = index_no || req.body.index_no || req.body.student_index;
    if (indexNo) {
      updateFields.push(`index_no = $${++paramCount}`);
      updateValues.push(indexNo);
    }
    if (lecturer_id) {
      updateFields.push(`lecturer_id = $${++paramCount}`);
      updateValues.push(lecturer_id);
    }
    const lecturerType = type || req.body.lecturer_type;
    if (lecturerType) {
      updateFields.push(`type = $${++paramCount}`);
      updateValues.push(lecturerType);
    }
    if (nic) {
      updateFields.push(`nic = $${++paramCount}`);
      updateValues.push(nic);
    }
    const phoneNum = phone || req.body.phone || req.body.phone_number;
    if (phoneNum) {
      updateFields.push(`phone = $${++paramCount}`);
      updateValues.push(phoneNum);
    }
    if (address) {
      updateFields.push(`address = $${++paramCount}`);
      updateValues.push(address);
    }
    const dateOfBirth = dob || req.body.dob || req.body.date_of_birth;
    if (dateOfBirth) {
      updateFields.push(`dob = $${++paramCount}`);
      updateValues.push(dateOfBirth);
    }
    if (profile_image_url) {
      updateFields.push(`profile_image_url = $${++paramCount}`);
      updateValues.push(profile_image_url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at and id
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${++paramCount}
      RETURNING id, email, first_name, last_name, role, department, academic_year, semester, index_no, lecturer_id, type, nic, phone, address, dob, profile_image_url, is_approved, updated_at
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logUserAction('user_updated', req.user.id, {
      targetUserId: id,
      updatedFields: updateFields,
      updatedBy: 'admin'
    });

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'update_user', userId: req.user?.id, targetUserId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userResult.rows[0];

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Prevent deletion of admin users
    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Admin users cannot be deleted' });
    }

    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    logUserAction('user_deleted', req.user.id, {
      targetUserId: id,
      targetUserEmail: targetUser.email
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logError(error, { action: 'delete_user', userId: req.user?.id, targetUserId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload student profile image using Cloudinary
const uploadStudentImage = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Upload request for user ID:', id);
    console.log('File received:', req.file ? 'Yes' : 'No');

    // Check if user exists and is a student
    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow students and lecturers to upload their own images, or admins to upload for any user
    // During registration, req.user might be undefined, so we allow upload for newly registered users
    console.log('--- Upload Permission Debug ---');
    console.log('User Role (DB):', userResult.rows[0].role);
    console.log('Requester Role:', req.user?.role);
    console.log('Target ID:', id);
    console.log('Requester ID:', req.user?.id);

    if (req.user && (userResult.rows[0].role !== 'student' && userResult.rows[0].role !== 'lecturer') && req.user.role !== 'admin') {
      console.log('Blocked: Target is not student/lecturer and requester is not admin');
      return res.status(400).json({ error: 'Only students and lecturers can upload profile images' });
    }

    // Students and lecturers can only upload their own images (when authenticated)
    if (req.user && (req.user.role === 'student' || req.user.role === 'lecturer') && parseInt(id) !== req.user.id) {
      console.log('Blocked: Student/Lecturer trying to upload for someone else');
      return res.status(403).json({ error: 'You can only upload your own profile image' });
    }

    if (!req.file) {
      console.log('No file received in request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`Processing file upload: Size=${req.file.size} bytes, Mime=${req.file.mimetype}`);

    // Helper function to upload to Cloudinary with Promise and Timeout
    const uploadToCloudinary = (buffer) => {
      return new Promise((resolve, reject) => {
        // Timeout logic: Fail after 60 seconds (increased from 15s)
        const timeoutId = setTimeout(() => {
          reject(new Error('Cloudinary upload timed out after 60 seconds'));
        }, 60000);

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'classroom-attendance/profiles',
            public_id: `user_${id}_${Date.now()}`,
            transformation: [
              { width: 300, height: 300, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            clearTimeout(timeoutId); // Clear timeout on completion
            if (error) {
              console.error('Cloudinary stream error:', error);
              return reject(error);
            }
            resolve(result);
          }
        );

        // Handle stream errors (e.g. network pipe broke)
        uploadStream.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        uploadStream.end(buffer);
      });
    };

    // Execute Cloudinary Upload
    console.log('Starting Cloudinary upload...');
    const result = await uploadToCloudinary(req.file.buffer);
    console.log('Cloudinary upload success:', result.secure_url);

    // Update DB
    await pool.query(
      'UPDATE users SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [result.secure_url, id]
    );

    logUserAction('student_image_uploaded', req.user?.id, {
      targetUserId: id,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id
    });

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,
      publicId: result.public_id
    });

  } catch (error) {
    console.error('Upload Error Flow:', error);
    logError(error, { action: 'upload_student_image', userId: req.user?.id, targetUserId: req.params.id });
    // Return actual error for debugging
    res.status(500).json({
      error: 'Failed to upload image',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get student profile image
const getStudentImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, role, profile_image_url FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Allow access for admins, lecturers, or the user themselves
    if (req.user) {
      const requesterId = req.user.id;
      const requesterRole = req.user.role;
      const targetRole = user.role;
      const targetId = parseInt(id);

      let allowed = false;

      // 1. Admin can view anyone
      if (requesterRole === 'admin') allowed = true;
      // 2. Users can view themselves
      else if (requesterId === targetId) allowed = true;
      // 3. Lecturers can view students
      else if (requesterRole === 'lecturer' && targetRole === 'student') allowed = true;
      // 4. Everyone can view public staff (Lecturers/Admins)
      else if (targetRole === 'lecturer' || targetRole === 'admin') allowed = true;

      // Optional: Allow students to view other students? (Currently keeping strict)

      if (!allowed) {
        return res.status(403).json({ error: 'You do not have permission to view this profile image' });
      }
    }

    const imageUrl = user.profile_image_url;

    if (!imageUrl) {
      return res.json({ imageUrl: null, message: 'No profile image uploaded' });
    }

    // Return the image URL for frontend to display
    res.json({ imageUrl });
  } catch (error) {
    logError(error, { action: 'get_student_image', userId: req.user?.id, targetUserId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Return total number of students. Lecturers get students only; admins can pass role filter.
// Get recent dashboard activity for a user (lecturer)
const getDashboardActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'lecturer') {
      return res.json({ activities: [] }); // Currently only for lecturers
    }

    // 1. Recent Attendance Sessions
    const attendanceQuery = `
      SELECT 
        'attendance' as type,
        s.created_at,
        c.class_name as course,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status='present') as count,
        'success' as status
      FROM attendance_sessions s
      JOIN classes c ON s.class_code = c.class_code
      WHERE c.lecturer_id = $1
      ORDER BY s.created_at DESC
      LIMIT 3
    `;

    // 2. Recent Graded Assignments (Grouped by assignment to avoid clutter)
    const gradingQuery = `
      SELECT DISTINCT ON (a.id)
        'grading' as type,
        sub.graded_at as created_at,
        a.title as description,
        c.class_name as course,
        'success' as status
      FROM assignment_submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      JOIN classes c ON a.class_code = c.class_code
      WHERE c.lecturer_id = $1 AND sub.graded_at IS NOT NULL
      ORDER BY a.id, sub.graded_at DESC
      LIMIT 3
    `;

    // 3. New Enrollments
    const enrollmentQuery = `
      SELECT 
        'enrollment' as type,
        e.enrolled_date as created_at,
        u.first_name || ' ' || u.last_name as student_name,
        c.class_name as course,
        'info' as status
      FROM enrollments e
      JOIN classes c ON e.class_code = c.class_code
      JOIN users u ON e.student_index = u.index_no
      WHERE c.lecturer_id = $1
      ORDER BY e.enrolled_date DESC
      LIMIT 3
    `;

    // 4. Assignments Due Soon (for lecturer to know what's coming)
    const deadlineQuery = `
      SELECT 
        'deadline' as type,
        a.created_at as created_at, -- Just for sorting, we display due date
        a.title as description,
        c.class_name as course,
        CASE 
          WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 'warning'
          ELSE 'info'
        END as status,
        a.due_date
      FROM assignments a
      JOIN classes c ON a.class_code = c.class_code
      WHERE c.lecturer_id = $1 
      AND a.due_date > NOW() 
      AND a.due_date < NOW() + INTERVAL '3 days'
      ORDER BY a.due_date ASC
      LIMIT 2
    `;

    // 5. Recently Created Assignments
    const creationQuery = `
      SELECT 
        'creation' as type,
        a.created_at,
        a.title as description,
        c.class_name as course,
        'info' as status
      FROM assignments a
      JOIN classes c ON a.class_code = c.class_code
      WHERE c.lecturer_id = $1
      ORDER BY a.created_at DESC
      LIMIT 3
    `;

    const [attendanceRes, gradingRes, enrollmentRes, deadlineRes, creationRes] = await Promise.all([
      pool.query(attendanceQuery, [userId]),
      pool.query(gradingQuery, [userId]),
      pool.query(enrollmentQuery, [userId]),
      pool.query(deadlineQuery, [userId]),
      pool.query(creationQuery, [userId])
    ]);

    // Combine and Format
    let activities = [];

    // Attendance
    attendanceRes.rows.forEach(row => {
      activities.push({
        type: 'attendance',
        title: 'Attendance recorded',
        description: `${row.count} students marked present`,
        time: row.created_at,
        course: row.course,
        status: 'success'
      });
    });

    // Grading
    gradingRes.rows.forEach(row => {
      activities.push({
        type: 'grading',
        title: 'Assignment graded',
        description: `${row.description} results uploaded`,
        time: row.created_at,
        course: row.course,
        status: 'success'
      });
    });

    // Enrollments
    enrollmentRes.rows.forEach(row => {
      activities.push({
        type: 'enrollment',
        title: 'New student enrolled',
        description: `${row.student_name} joined your class`,
        time: row.created_at,
        course: row.course,
        status: 'info' // Blue/Green
      });
    });

    // Deadlines
    deadlineRes.rows.forEach(row => {
      activities.push({
        type: 'deadline',
        title: 'Assignment due soon',
        description: `${row.description} due ${new Date(row.due_date).toLocaleDateString()}`,
        time: row.created_at, // Sort by creation or "now" to keep meaningful? Actually sorting by time usually implies "happened at". For upcoming, maybe put at top?
        // Let's rely on sort.
        course: row.course,
        status: 'warning'
      });
    });

    // Created Assignments
    creationRes.rows.forEach(row => {
      activities.push({
        type: 'assignment', // Use generic assignment type or specific 'creation' if frontend handles it
        title: 'Assignment Created',
        description: `${row.description}`,
        time: row.created_at,
        course: row.course,
        status: 'info'
      });
    });

    // Sort by time DESC
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Limit to 5 total
    activities = activities.slice(0, 5);

    res.json({ activities });

  } catch (error) {
    logError(error, { action: 'get_dashboard_activity', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStudentCount = async (req, res) => {
  try {
    let query = 'SELECT COUNT(*)::INT AS count FROM users WHERE role = $1';
    const params = ['student'];
    const result = await pool.query(query, params);
    return res.json({ count: result.rows[0].count });
  } catch (error) {
    logError(error, { action: 'get_student_count', userId: req.user?.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Return all student IDs as an array (for completing attendance)
const getAllStudentIds = async (req, res) => {
  try {
    const { department, batch } = req.query;
    let query = 'SELECT id FROM users WHERE role = $1';
    const params = ['student'];
    let paramCount = 1;

    if (department) {
      query += ` AND department = $${++paramCount}`;
      params.push(department);
    }

    if (batch) {
      query += ` AND batch = $${++paramCount}`;
      params.push(batch);
    }

    if (req.query.academic_year) {
      query += ` AND academic_year = $${++paramCount}`;
      params.push(req.query.academic_year);
    }

    if (req.query.semester) {
      query += ` AND semester = $${++paramCount}`;
      params.push(req.query.semester);
    }

    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    return res.json({ ids: result.rows.map(r => r.id) });
  } catch (error) {
    logError(error, { action: 'get_all_student_ids', userId: req.user?.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadStudentImage,
  getStudentImage,
  getStudentCount,
  getAllStudentIds,
  getDashboardActivity
};

