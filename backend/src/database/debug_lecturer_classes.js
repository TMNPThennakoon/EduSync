const pool = require('../config/database');

const checkLecturerClasses = async () => {
    try {
        const email = 'slnapa2002@gmail.com';
        const userRes = await pool.query('SELECT id, first_name, role FROM users WHERE email = $1', [email]);

        if (userRes.rows.length === 0) {
            console.log('User not found');
            return;
        }

        const startUser = userRes.rows[0];
        console.log('User:', startUser);

        const classesRes = await pool.query('SELECT class_code, class_name, lecturer_id FROM classes WHERE lecturer_id = $1', [startUser.id]);
        console.log('Classes owned by user:', classesRes.rows);

        const allClasses = await pool.query('SELECT class_code, class_name, lecturer_id FROM classes LIMIT 5');
        console.log('Sample of all classes:', allClasses.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
};

checkLecturerClasses();
