const pool = require('../src/config/database');

async function checkUsers() {
    try {
        console.log('Checking users...');
        const result = await pool.query('SELECT id, email, role, profile_image_url FROM users WHERE id IN (1, 13)');
        console.log('Found users:', result.rows);

        const allUsers = await pool.query('SELECT id, email, role FROM users ORDER BY id ASC LIMIT 5');
        console.log('First 5 users:', allUsers.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkUsers();
