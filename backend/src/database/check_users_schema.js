const pool = require('../config/database');

const checkUsers = async () => {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
        console.log(result.rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUsers();
