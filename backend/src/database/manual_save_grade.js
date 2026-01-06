const pool = require('../config/database');

async function testSave() {
    try {
        const classCode = 'IA3209';
        const examType = 'Mid-term';
        const studentId = 4; // hamal
        const marks = 75.5;

        console.log(`Attempting to save ${examType} mark ${marks} for student ${studentId} in ${classCode}`);

        const query = `
      INSERT INTO exam_grades (class_code, student_id, exam_type, marks_obtained, max_marks, status)
      VALUES ($1, $2, $3, $4, 100, 'pending')
      ON CONFLICT (class_code, student_id, exam_type)
      DO UPDATE SET 
        marks_obtained = $4, 
        status = 'pending',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

        const res = await pool.query(query, [classCode, studentId, examType, marks]);
        console.log('Save Result:', res.rows[0]);

    } catch (err) {
        console.error('Error saving grade:', err);
    } finally {
        pool.end();
    }
}

testSave();
