const pool = require('../config/database');

async function checkConstraints() {
    try {
        const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'exam_grades'::regclass
    `);

        console.log('Constraints on exam_grades:', res.rows);
    } catch (err) {
        console.error('Error checking constraints:', err);
    } finally {
        pool.end();
    }
}

checkConstraints();
