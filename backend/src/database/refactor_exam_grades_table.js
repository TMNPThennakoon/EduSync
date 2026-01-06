const pool = require('../config/database');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Dropping old exam_grades table...');
        await client.query('DROP TABLE IF EXISTS exam_grades CASCADE');

        console.log('Creating new exam_grades table...');
        await client.query(`
            CREATE TABLE exam_grades (
                id SERIAL PRIMARY KEY,
                class_code VARCHAR(20) NOT NULL REFERENCES classes(class_code) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_index VARCHAR(20), -- For quick reference/display as requested
                mid_exam_marks DECIMAL(5,2),
                final_exam_marks DECIMAL(5,2),
                total_assignment_marks DECIMAL(5,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending', 'approved'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_student_class_grade UNIQUE (class_code, student_id)
            )
        `);

        // Index for performance
        await client.query('CREATE INDEX idx_exam_grades_student_class ON exam_grades(student_id, class_code)');

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
