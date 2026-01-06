const pool = require('../config/database');

const addLecturerIdColumn = async () => {
  try {
    console.log('Adding lecturer_id column to classes table...');

    // Check if lecturer_id column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' AND column_name = 'lecturer_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ lecturer_id column already exists');
      return;
    }

    // Check if teacher_id column exists (old column name)
    const checkTeacherId = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' AND column_name = 'teacher_id'
    `);

    if (checkTeacherId.rows.length > 0) {
      // Rename teacher_id to lecturer_id
      await pool.query(`
        ALTER TABLE classes 
        RENAME COLUMN teacher_id TO lecturer_id
      `);
      console.log('✅ Renamed teacher_id to lecturer_id');
    } else {
      // Add new lecturer_id column
      await pool.query(`
        ALTER TABLE classes 
        ADD COLUMN lecturer_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('✅ Added lecturer_id column');
    }

    // Check if department column exists, if not add it
    const checkDepartment = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' AND column_name = 'department'
    `);

    if (checkDepartment.rows.length === 0) {
      await pool.query(`
        ALTER TABLE classes 
        ADD COLUMN department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT', 'CS'))
      `);
      console.log('✅ Added department column');
    } else {
      console.log('✅ department column already exists');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  }
};

if (require.main === module) {
  addLecturerIdColumn()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addLecturerIdColumn };



