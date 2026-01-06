const pool = require('./config/database');

async function checkUser9() {
    try {
        const res = await pool.query('SELECT * FROM users WHERE id = 9');
        console.log('User 9:', res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkUser9();
