const pool = require('./config/database');

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, email, role, is_approved, created_at FROM users WHERE is_approved = false');
        console.log('Pending Users:', res.rows);

        const allUsers = await pool.query('SELECT id, email, role, is_approved FROM users ORDER BY created_at DESC LIMIT 5');
        console.log('Recent Users:', allUsers.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkUsers();
