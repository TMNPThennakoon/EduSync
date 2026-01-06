const pool = require('../config/database');

const recreateClassesTable = async () => {
  try {
    console.log('🔄 Recreating classes table...\n');

    // Drop existing classes table first (if it exists)
    console.log('🗑️  Dropping existing classes table...');
    await pool.query('DROP TABLE IF EXISTS classes CASCADE');
    console.log('   ✅ Classes table dropped');

    // Drop existing courses table (this will cascade delete related records)
    console.log('🗑️  Dropping courses table...');
    await pool.query('DROP TABLE IF EXISTS courses CASCADE');
    console.log('   ✅ Courses table dropped');

    // Drop enrollments table if it exists (will recreate with new structure)
    console.log('🗑️  Dropping enrollments table...');
    await pool.query('DROP TABLE IF EXISTS enrollments CASCADE');
    console.log('   ✅ Enrollments table dropped');

    // Create new classes table
    console.log('\n📋 Creating new classes table...');
    await pool.query(`
      CREATE TABLE classes (
        class_code VARCHAR(20) PRIMARY KEY,
        class_name VARCHAR(255) NOT NULL,
        department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT')) NOT NULL,
        lecturer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Classes table created');

    // Recreate enrollments table with new structure
    console.log('📋 Creating enrollments table...');
    await pool.query(`
      CREATE TABLE enrollments (
        id SERIAL PRIMARY KEY,
        student_index VARCHAR(20) NOT NULL,
        class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
        enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_index, class_code)
      );
    `);
    console.log('   ✅ Enrollments table created');

    // Create indexes for better performance
    console.log('\n📊 Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_lecturer_id ON classes(lecturer_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_department ON classes(department)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_enrollments_student_index ON enrollments(student_index)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_enrollments_class_code ON enrollments(class_code)');
    console.log('   ✅ Indexes created');

    console.log('\n✅ Classes table recreated successfully!');
    console.log('\n📋 New table structure:');
    console.log('   - class_code (VARCHAR(20), PRIMARY KEY)');
    console.log('   - class_name (VARCHAR(255))');
    console.log('   - department (VARCHAR(10))');
    console.log('   - lecturer_id (INTEGER, FK to users)');
    console.log('   - created_at (TIMESTAMP)');
    console.log('   - updated_at (TIMESTAMP)');

  } catch (error) {
    console.error('❌ Error recreating classes table:', error);
    throw error;
  }
};

if (require.main === module) {
  recreateClassesTable()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { recreateClassesTable };

