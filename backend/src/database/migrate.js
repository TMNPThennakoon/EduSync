const pool = require('../config/database');

const createTables = async () => {
  try {
    console.log('Creating database tables...');

    // Users table
    await pool.query(`
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
    `);

    // Classes table
    await pool.query(`
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
    `);
    
    // Add department column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'classes' AND column_name = 'department'
        ) THEN
          ALTER TABLE classes ADD COLUMN department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT', 'CS'));
        END IF;
      END $$;
    `);

    // Enrollment table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        UNIQUE(class_id, student_id)
      );
    `);

    // Attendance table
    await pool.query(`
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
    `);

    // Assignments table
    await pool.query(`
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
    `);

    // Assignment Submissions table
    await pool.query(`
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
    `);

    // Grades table
    await pool.query(`
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
    `);

    // Lecturer IDs table for validation and filtering
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lecturer_ids (
        id SERIAL PRIMARY KEY,
        lecturer_id VARCHAR(20) UNIQUE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('Seeding database with sample data...');

    // Check if admin user already exists
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@classroom.com']);
    
    if (adminExists.rows.length === 0) {
      // Create admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@classroom.com', hashedPassword, 'Admin', 'User', 'admin']);
    }

    // Check if lecturer exists
    const lecturerExists = await pool.query('SELECT id FROM users WHERE email = $1', ['lecturer@classroom.com']);
    
    if (lecturerExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('lecturer123', 10);
      
      const lecturerResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `, ['lecturer@classroom.com', hashedPassword, 'John', 'Smith', 'lecturer']);
      
      const lecturerId = lecturerResult.rows[0].id;

      // Create sample class
      const classResult = await pool.query(`
        INSERT INTO classes (name, subject, description, lecturer_id, academic_year, semester)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, ['Mathematics 101', 'Algebra', 'Introduction to Algebra', lecturerId, '2024', 'Spring']);
      
      const classId = classResult.rows[0].id;

      // Create sample students
      const students = [
        ['student1@classroom.com', 'Alice', 'Johnson'],
        ['student2@classroom.com', 'Bob', 'Wilson'],
        ['student3@classroom.com', 'Carol', 'Davis']
      ];

      for (const [email, firstName, lastName] of students) {
        const hashedPassword = await bcrypt.hash('student123', 10);
        const studentResult = await pool.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [email, hashedPassword, firstName, lastName, 'student']);
        
        const studentId = studentResult.rows[0].id;

        // Enroll student in class
        await pool.query(`
          INSERT INTO enrollments (class_id, student_id)
          VALUES ($1, $2)
        `, [classId, studentId]);
      }

      // Create sample assignment
      const assignmentResult = await pool.query(`
        INSERT INTO assignments (class_id, title, description, max_score, due_date, assignment_type)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [classId, 'Algebra Quiz 1', 'Basic algebraic operations', 100, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'quiz']);
    }

    // Seed lecturer IDs
    const lecturerIds = [
      'CS001', 'CS002', 'CS003', 'CS004', 'CS005',
      'IT001', 'IT002', 'IT003', 'IT004', 'IT005',
      'SE001', 'SE002', 'SE003', 'SE004', 'SE005',
      'IS001', 'IS002', 'IS003', 'IS004', 'IS005',
      'CE001', 'CE002', 'CE003', 'CE004', 'CE005',
      'EE001', 'EE002', 'EE003', 'EE004', 'EE005',
      'ME001', 'ME002', 'ME003', 'ME004', 'ME005',
      'PH001', 'PH002', 'PH003', 'PH004', 'PH005',
      'CH001', 'CH002', 'CH003', 'CH004', 'CH005',
      'MA001', 'MA002', 'MA003', 'MA004', 'MA005',
      'BI001', 'BI002', 'BI003', 'BI004', 'BI005',
      'EC001', 'EC002', 'EC003', 'EC004', 'EC005',
      'PS001', 'PS002', 'PS003', 'PS004', 'PS005',
      'HI001', 'HI002', 'HI003', 'HI004', 'HI005',
      'EN001', 'EN002', 'EN003', 'EN004', 'EN005',
      'AR001', 'AR002', 'AR003', 'AR004', 'AR005',
      'BU001', 'BU002', 'BU003', 'BU004', 'BU005',
      'AC001', 'AC002', 'AC003', 'AC004', 'AC005',
      'LA001', 'LA002', 'LA003', 'LA004', 'LA005',
      'ST001', 'ST002', 'ST003', 'ST004', 'ST005'
    ];

    for (const lecturerId of lecturerIds) {
      await pool.query(
        'INSERT INTO lecturer_ids (lecturer_id) VALUES ($1) ON CONFLICT (lecturer_id) DO NOTHING',
        [lecturerId]
      );
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

const migrate = async () => {
  try {
    await createTables();
    await seedDatabase();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  migrate();
}

module.exports = { createTables, seedDatabase };
