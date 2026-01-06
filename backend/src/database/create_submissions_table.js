const pool = require('../config/database');

const createSubmissionsTable = async () => {
    try {
        console.log('🔧 Creating assignment_submissions table...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        submission_text TEXT,
        submission_file_url TEXT,
        submission_filename VARCHAR(255),
        submission_file_size BIGINT,
        status VARCHAR(50) DEFAULT 'submitted',
        grade INTEGER CHECK (grade >= 0),
        feedback TEXT,
        graded_by INTEGER REFERENCES users(id),
        graded_at TIMESTAMP,
        can_edit_until TIMESTAMP,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_edited_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assignment_id, student_id)
      );
    `);

        // Create indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_subs_assignment_id ON assignment_submissions(assignment_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_subs_student_id ON assignment_submissions(student_id)');

        console.log('✅ assignment_submissions table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create table:', error);
        process.exit(1);
    }
};

createSubmissionsTable();
