const pool = require('../config/database');

const createExamGradesTable = async () => {
    try {
        console.log('🔄 Creating exam_grades table...');
        await pool.connect();

        await pool.query('DROP TABLE IF EXISTS exam_grades CASCADE');

        await pool.query(`
      CREATE TABLE exam_grades (
        id SERIAL PRIMARY KEY,
        class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_type VARCHAR(20) CHECK (exam_type IN ('Mid-term', 'Final')),
        marks_obtained DECIMAL(5,2),
        max_marks DECIMAL(5,2),
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_code, student_id, exam_type)
      );
    `);

        // Create index for faster lookups
        await pool.query(`CREATE INDEX idx_exam_grades_class ON exam_grades(class_code)`);
        await pool.query(`CREATE INDEX idx_exam_grades_student ON exam_grades(student_id)`);

        console.log('✅ exam_grades table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating exam_grades table:', error);
        process.exit(1);
    }
};

createExamGradesTable();
