const pool = require('../config/database');

const createNewSchema = async () => {
  try {
    console.log('🔄 Creating new database schema...\n');

    // Drop existing tables in correct order (respecting foreign keys)
    console.log('🗑️  Dropping existing tables...');
    const tablesToDrop = [
      'attendance_records',
      'attendance_sessions',
      'grades',
      'assignments',
      'enrollments',
      'courses',
      'users'
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ Dropped: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }

    console.log('\n📋 Creating new tables...\n');

    // 1. Users table (Updated schema)
    console.log('1. Creating users table...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('admin', 'student', 'lecturer')) NOT NULL,
        department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT')),
        profile_image_url TEXT NOT NULL,
        is_approved BOOLEAN DEFAULT FALSE,
        nic VARCHAR(20) UNIQUE,
        phone VARCHAR(20),
        address TEXT,
        -- Student specific fields
        index_no VARCHAR(20) UNIQUE,
        academic_year INTEGER CHECK (academic_year >= 1 AND academic_year <= 4),
        semester INTEGER CHECK (semester >= 1 AND semester <= 8),
        dob DATE,
        -- Lecturer specific fields
        lecturer_id VARCHAR(20) UNIQUE,
        type VARCHAR(20) CHECK (type IN ('visiting', 'permanent')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ users table created');

    // 2. Courses table (course_code as PK)
    console.log('2. Creating courses table...');
    await pool.query(`
      CREATE TABLE courses (
        course_code VARCHAR(20) PRIMARY KEY,
        course_name VARCHAR(255) NOT NULL,
        department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT')) NOT NULL,
        lecturer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ courses table created');

    // 3. Enrollments table (student_index + course_code)
    console.log('3. Creating enrollments table...');
    await pool.query(`
      CREATE TABLE enrollments (
        id SERIAL PRIMARY KEY,
        student_index VARCHAR(20) NOT NULL,
        course_code VARCHAR(20) REFERENCES courses(course_code) ON DELETE CASCADE,
        enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_index, course_code)
      );
    `);
    console.log('   ✅ enrollments table created');

    // 4. Attendance Sessions table
    console.log('4. Creating attendance_sessions table...');
    await pool.query(`
      CREATE TABLE attendance_sessions (
        session_id SERIAL PRIMARY KEY,
        course_code VARCHAR(20) REFERENCES courses(course_code) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ attendance_sessions table created');

    // 5. Attendance Records table
    console.log('5. Creating attendance_records table...');
    await pool.query(`
      CREATE TABLE attendance_records (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
        student_index VARCHAR(20) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('Present', 'Late', 'Excuse', 'Absent')) NOT NULL,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        marked_by INTEGER REFERENCES users(id),
        UNIQUE(session_id, student_index)
      );
    `);
    console.log('   ✅ attendance_records table created');

    // 6. Assignments table
    console.log('6. Creating assignments table...');
    await pool.query(`
      CREATE TABLE assignments (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(20) REFERENCES courses(course_code) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        max_marks INTEGER NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ assignments table created');

    // 7. Grades table
    console.log('7. Creating grades table...');
    await pool.query(`
      CREATE TABLE grades (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
        student_index VARCHAR(20) NOT NULL,
        marks_obtained INTEGER NOT NULL CHECK (marks_obtained >= 0),
        feedback TEXT,
        graded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assignment_id, student_index)
      );
    `);
    console.log('   ✅ grades table created');

    // 8. Lecturer IDs table (for validation)
    console.log('8. Creating lecturer_ids table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lecturer_ids (
        id SERIAL PRIMARY KEY,
        lecturer_id VARCHAR(20) UNIQUE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ lecturer_ids table created');

    // Create indexes for better performance
    console.log('\n📊 Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_index_no ON users(index_no)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_lecturer_id ON users(lecturer_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id ON courses(lecturer_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_enrollments_student_index ON enrollments(student_index)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_enrollments_course_code ON enrollments(course_code)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_code ON attendance_sessions(course_code)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_attendance_records_student_index ON attendance_records(student_index)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_assignments_course_code ON assignments(course_code)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_grades_student_index ON grades(student_index)');
    console.log('   ✅ Indexes created');

    console.log('\n✅ New database schema created successfully!');
    console.log('\n📋 Tables created:');
    console.log('   1. users');
    console.log('   2. courses');
    console.log('   3. enrollments');
    console.log('   4. attendance_sessions');
    console.log('   5. attendance_records');
    console.log('   6. assignments');
    console.log('   7. grades');
    console.log('   8. lecturer_ids');

  } catch (error) {
    console.error('❌ Error creating new schema:', error);
    throw error;
  }
};

if (require.main === module) {
  createNewSchema()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { createNewSchema };

