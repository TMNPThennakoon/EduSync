const pool = require('../config/database');

async function checkGrades() {
    try {
        // 1. Find the student
        const userRes = await pool.query("SELECT id, first_name, index_no FROM users WHERE first_name ILIKE '%hamal%'");
        const students = userRes.rows;
        console.log('Found students:', students);

        if (students.length === 0) return;

        const studentIds = students.map(s => s.id);

        // 2. Check exam grades for this student and class IA3209
        const gradesRes = await pool.query(`
      SELECT * FROM exam_grades 
      WHERE student_id = ANY($1) 
      AND class_code = 'IA3209'
    `, [studentIds]);

        console.log('Exam Grades for IA3209:', gradesRes.rows);

    } catch (err) {
        console.error('Error checking grades:', err);
    } finally {
        pool.end();
    }
}

checkGrades();
