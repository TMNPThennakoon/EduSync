const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { logUserAction, logError } = require('../utils/logger');
const { sendRegistrationPendingEmail } = require('../utils/emailService');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const axios = require('axios');

// Transporter for OTP emails (Reuse config or env vars)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Updated to match .env
  }
});

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Validate email format to prevent 500 errors
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in DB (Delete existing OTPs for this email first)
    await pool.query('DELETE FROM otp_verifications WHERE email = $1', [email]);
    await pool.query(
      'INSERT INTO otp_verifications (email, code, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );

    // Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Verification Code - EduSync',
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-align: center;">EduSync Verification</h2>
                <p style="font-size: 16px; color: #333;">Hello,</p>
                <p style="font-size: 16px; color: #333;">Your verification code is:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #666;">This code will expire in 5 minutes.</p>
                <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    logError(error, { action: 'send_otp', email: req.body.email });
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = await pool.query(
      'SELECT * FROM otp_verifications WHERE email = $1 AND code = $2',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const otpRecord = result.rows[0];
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Clean up used OTP
    await pool.query('DELETE FROM otp_verifications WHERE email = $1', [email]);

    res.json({ message: 'Email verified successfully', success: true });
  } catch (error) {
    logError(error, { action: 'verify_otp', email: req.body.email });
    res.status(500).json({ error: 'Verification failed' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    // Disable verification if token is "google_test_token" for dev testing
    let userData = {};
    if (token === 'google_test_token') {
      userData = {
        email: 'test_google@classroom.com',
        name: 'Test Google User',
        picture: 'https://via.placeholder.com/150',
        email_verified: true
      };
    } else {
      // Verify Google Token
      const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      const { email, name, picture, email_verified } = googleRes.data;

      if (!email_verified) {
        return res.status(400).json({ error: 'Google email not verified' });
      }
      userData = { email, name, picture };
    }

    const { email, name, picture } = userData;

    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      // Login existing user
      const user = result.rows[0];

      if (!user.is_approved) {
        return res.status(403).json({ error: 'Account pending approval' });
      }

      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, department: user.department },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logUserAction('user_login_google', user.id, { email });

      res.json({
        message: 'Login successful',
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          department: user.department,
          profile_image_url: user.profile_image_url
        },
        isNewUser: false
      });
    } else {
      // New User - Return info for registration form
      res.json({
        message: 'New user',
        isNewUser: true,
        googleData: {
          email,
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          profile_image_url: picture
        }
      });
    }

  } catch (error) {
    logError(error, { action: 'google_login' });
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      address,
      date_of_birth,
      academic_year,
      semester,
      nic,
      student_index,
      phone_number,
      gender,
      lecturer_id,
      department,
      profile_image_url,
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

    // If lecturer, validate lecturer ID
    if (role === 'lecturer' && lecturer_id) {
      const lecturerIdCheck = await pool.query(
        'SELECT id, is_used FROM lecturer_ids WHERE lecturer_id = $1',
        [lecturer_id]
      );

      if (lecturerIdCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid lecturer ID. Please contact admin for a valid ID.' });
      }

      if (lecturerIdCheck.rows[0].is_used) {
        return res.status(400).json({ error: 'Lecturer ID already used. Please contact admin for a new ID.' });
      }
    }

    // Check for duplicate NIC if provided
    if (nic) {
      const existingNIC = await pool.query(
        'SELECT id FROM users WHERE nic = $1',
        [nic]
      );
      if (existingNIC.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists with this NIC number' });
      }
    }

    // Check for duplicate student index if provided (new schema uses index_no)
    const index_no = student_index || req.body.index_no;
    if (index_no && role === 'student') {
      const existingIndex = await pool.query(
        'SELECT id FROM users WHERE index_no = $1',
        [index_no]
      );
      if (existingIndex.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists with this student index' });
      }
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Debug: Log password hashing
    console.log(`Password hashing for ${email}: ${password ? 'Password provided' : 'No password'}`);
    console.log(`Hashed password: ${password_hash ? 'Successfully hashed' : 'Failed to hash'}`);

    // Set approval status based on role (new schema uses is_approved boolean)
    const is_approved = role === 'admin' ? true : false;

    // Map old field names to new schema
    const dob = date_of_birth || req.body.dob;
    const phone = phone_number || req.body.phone;
    const lecturer_type = req.body.type || null; // visiting/permanent for lecturers

    // Validate profile_image_url is required
    if (!profile_image_url) {
      return res.status(400).json({ error: 'Profile image is required. Please capture a photo using webcam.' });
    }

    // Create user with new schema columns
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, address, dob, academic_year, semester, nic, index_no, phone, lecturer_id, is_approved, department, profile_image_url, type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
       RETURNING id, email, first_name, last_name, role, address, dob, academic_year, semester, nic, index_no, phone, lecturer_id, is_approved, department, profile_image_url, type, created_at`,
      [email, password_hash, first_name, last_name, role, address, dob, academic_year, semester, nic, index_no, phone, lecturer_id, is_approved, department, profile_image_url, lecturer_type]
    );

    const user = result.rows[0];

    // If lecturer, mark lecturer ID as used
    if (role === 'lecturer' && lecturer_id) {
      await pool.query(
        'UPDATE lecturer_ids SET is_used = TRUE WHERE lecturer_id = $1',
        [lecturer_id]
      );
    }

    logUserAction('user_registered', user.id, { email, role, nic, index_no: user.index_no });

    // Auto-enroll student in matching classes
    if (role === 'student') {
      try {
        const matchingClasses = await pool.query(`
            SELECT class_code FROM classes 
            WHERE department = $1 AND academic_year = $2 AND semester = $3
        `, [department, academic_year, semester]);

        if (matchingClasses.rows.length > 0) {
          for (const cls of matchingClasses.rows) {
            await pool.query(`
                INSERT INTO enrollments (class_code, student_index, enrolled_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (class_code, student_index) DO NOTHING
            `, [cls.class_code, user.index_no]);
          }
          console.log(`Auto-enrolled new student ${user.index_no} in ${matchingClasses.rows.length} classes`);
        }
      } catch (enrollErr) {
        console.error('Auto-enrollment error during registration:', enrollErr);
        // Don't fail the registration
      }
    }

    // Send registration email (non-blocking - don't wait for email to send)
    if (!is_approved) {
      sendRegistrationPendingEmail(email, first_name, last_name)
        .then(result => {
          if (result.success) {
            console.log(`✅ Registration email sent to ${email}`);
          } else {
            console.error(`❌ Failed to send registration email to ${email}:`, result.error);
          }
        })
        .catch(err => {
          console.error(`❌ Error sending registration email to ${email}:`, err);
        });
    }

    // Only generate token for approved users (admin registrations)
    let token = null;
    if (is_approved) {
      token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );
    }

    res.status(201).json({
      message: !is_approved ? 'Registration submitted! Please wait for admin approval.' : 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        address: user.address,
        dob: user.dob,
        academic_year: user.academic_year,
        semester: user.semester,
        nic: user.nic,
        index_no: user.index_no,
        phone: user.phone,
        lecturer_id: user.lecturer_id,
        type: user.type,
        is_approved: user.is_approved,
        department: user.department,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    logError(error, { action: 'register', email: req.body.email });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (new schema uses is_approved)
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_approved, department, profile_image_url FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check approval status (new schema uses is_approved boolean)
    if (!user.is_approved) {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait for approval.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, department: user.department },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logUserAction('user_login', user.id, { email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        role: user.role,
        department: user.department,
        profile_image_url: user.profile_image_url
      },
      token
    });
  } catch (error) {
    logError(error, { action: 'login', email: req.body.email });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, address, dob, academic_year, semester, nic, index_no, phone, department, is_approved, profile_image_url, type, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    logError(error, { action: 'get_profile', userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name } = req.body;

    const result = await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, first_name, last_name, role, profile_image_url, updated_at',
      [first_name, last_name, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logUserAction('profile_updated', userId, { first_name, last_name });

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    logError(error, { action: 'update_profile', userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find user by email (new schema uses is_approved)
    const result = await pool.query(
      'SELECT id, email, is_approved FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if user is approved
    if (!user.is_approved) {
      return res.status(403).json({ error: 'Account must be approved before password reset' });
    }

    // Hash new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, user.id]
    );

    logUserAction('password_reset', user.id, { email });

    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    logError(error, { action: 'reset_password', email: req.body.email });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user data
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidCurrentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    logUserAction('password_changed', userId, {
      email: user.email
    });

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logError(error, { action: 'change_password', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  resetPassword,
  changePassword,
  sendOtp,
  verifyOtp,
  googleLogin
};
