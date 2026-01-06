-- =====================================================
-- EduSync Classroom Attendance System - Database Schema
-- =====================================================
-- This SQL script creates all necessary tables for the system
-- Run this in your cloud database (Neon, Supabase, etc.)

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'lecturer', 'student')) NOT NULL,
  
  -- University student specific fields
  address TEXT,
  date_of_birth DATE,
  academic_year INTEGER CHECK (academic_year >= 1 AND academic_year <= 4),
  semester INTEGER CHECK (semester >= 1 AND semester <= 8),
  student_index VARCHAR(20) UNIQUE,
  phone_number VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  
  -- Lecturer specific fields
  lecturer_id VARCHAR(20) UNIQUE,
  nic VARCHAR(20) UNIQUE,
  
  -- Department field for students
  department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT')),
  
  -- Approval status for new registrations
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CLASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  lecturer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT', 'CS')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ENROLLMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  UNIQUE(class_id, student_id)
);

-- =====================================================
-- ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id, date)
);

-- =====================================================
-- ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL,
  due_date TIMESTAMP,
  assignment_type VARCHAR(50) NOT NULL,
  department VARCHAR(10) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  submission_text TEXT,
  submission_file VARCHAR(255),
  status VARCHAR(20) DEFAULT 'submitted',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- =====================================================
-- GRADES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS grades (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  feedback TEXT,
  graded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- =====================================================
-- LECTURER IDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lecturer_ids (
  id SERIAL PRIMARY KEY,
  lecturer_id VARCHAR(20) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ATTENDANCE SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  lecturer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- OTP TABLE (for email verification)
-- =====================================================
CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EXAM GRADES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_grades (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  class_code VARCHAR(50) NOT NULL,
  exam_name VARCHAR(255) NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  graded_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_type VARCHAR(20) CHECK (target_type IN ('all', 'class', 'department', 'year')) NOT NULL,
  target_value VARCHAR(100),
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LECTURE MATERIALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lecture_materials (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ADMIN LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SEED LECTURER IDS
-- =====================================================
INSERT INTO lecturer_ids (lecturer_id) VALUES 
  ('CS001'), ('CS002'), ('CS003'), ('CS004'), ('CS005'),
  ('IT001'), ('IT002'), ('IT003'), ('IT004'), ('IT005'),
  ('SE001'), ('SE002'), ('SE003'), ('SE004'), ('SE005'),
  ('IS001'), ('IS002'), ('IS003'), ('IS004'), ('IS005'),
  ('CE001'), ('CE002'), ('CE003'), ('CE004'), ('CE005'),
  ('EE001'), ('EE002'), ('EE003'), ('EE004'), ('EE005'),
  ('ME001'), ('ME002'), ('ME003'), ('ME004'), ('ME005'),
  ('PH001'), ('PH002'), ('PH003'), ('PH004'), ('PH005'),
  ('CH001'), ('CH002'), ('CH003'), ('CH004'), ('CH005'),
  ('MA001'), ('MA002'), ('MA003'), ('MA004'), ('MA005'),
  ('BI001'), ('BI002'), ('BI003'), ('BI004'), ('BI005'),
  ('EC001'), ('EC002'), ('EC003'), ('EC004'), ('EC005'),
  ('PS001'), ('PS002'), ('PS003'), ('PS004'), ('PS005'),
  ('HI001'), ('HI002'), ('HI003'), ('HI004'), ('HI005'),
  ('EN001'), ('EN002'), ('EN003'), ('EN004'), ('EN005'),
  ('AR001'), ('AR002'), ('AR003'), ('AR004'), ('AR005'),
  ('BU001'), ('BU002'), ('BU003'), ('BU004'), ('BU005'),
  ('AC001'), ('AC002'), ('AC003'), ('AC004'), ('AC005'),
  ('LA001'), ('LA002'), ('LA003'), ('LA004'), ('LA005'),
  ('ST001'), ('ST002'), ('ST003'), ('ST004'), ('ST005')
ON CONFLICT (lecturer_id) DO NOTHING;

-- =====================================================
-- COMPLETE!
-- =====================================================
-- All tables created successfully!
-- You can now run this script in your cloud database.
