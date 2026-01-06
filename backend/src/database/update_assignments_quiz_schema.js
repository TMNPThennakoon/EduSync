const pool = require('../config/database');

const updateSchema = async () => {
    try {
        console.log('Checking assignments table for quiz_data...');

        // Add quiz_data to assignments
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'quiz_data') THEN
              ALTER TABLE assignments ADD COLUMN quiz_data JSONB;
              RAISE NOTICE 'Added quiz_data column to assignments';
          END IF;
      END
      $$;
    `);

        console.log('Checking/Creating assignment_submissions table...');

        // Create assignment_submissions table if not exists
        await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
          id SERIAL PRIMARY KEY,
          assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          submission_text TEXT,
          submission_file_url TEXT,
          submission_filename TEXT,
          submission_file_size INTEGER,
          status VARCHAR(20) DEFAULT 'submitted',
          can_edit_until TIMESTAMP,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          grade INTEGER,
          feedback TEXT,
          graded_by INTEGER REFERENCES users(id),
          graded_at TIMESTAMP,
          last_edited_at TIMESTAMP
      );
    `);

        console.log('Checking assignment_submissions table for plagiarism_confirmed...');

        // Add plagiarism_confirmed to assignment_submissions
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignment_submissions' AND column_name = 'plagiarism_confirmed') THEN
              ALTER TABLE assignment_submissions ADD COLUMN plagiarism_confirmed BOOLEAN DEFAULT FALSE;
              RAISE NOTICE 'Added plagiarism_confirmed column to assignment_submissions';
          END IF;
      END
      $$;
    `);

        console.log('Schema update completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

updateSchema();
