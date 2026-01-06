const pool = require('../config/database');

const addProfileImageColumn = async () => {
  try {
    console.log('Adding profile_image_url column to users table...');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    `);

    console.log('Column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding column:', error);
    process.exit(1);
  }
};

addProfileImageColumn();
