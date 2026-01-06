const pool = require('../config/database');

const recreateClassesTable = async () => {
  try {
    console.log('🔄 Recreating classes table...');

    // Drop existing classes table (this will cascade delete related records)
    console.log('Dropping existing classes table...');
    await pool.query('DROP TABLE IF EXISTS classes CASCADE');
    console.log('✅ Classes table dropped');

    // Recreate classes table with correct schema
    console.log('Creating new classes table...');
    await pool.query(`
      CREATE TABLE classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        lecturer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL,
        semester VARCHAR(20) NOT NULL,
        department VARCHAR(10) CHECK (department IN ('AT', 'ET', 'IAT', 'ICT', 'CS')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Classes table created with correct schema');

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_lecturer_id ON classes(lecturer_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_department ON classes(department)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_classes_semester ON classes(semester)');
    console.log('✅ Indexes created');

    console.log('✅ Classes table recreated successfully!');
    console.log('📝 Note: All existing classes data has been deleted.');
    console.log('   You can now create new classes through the application.');
  } catch (error) {
    console.error('❌ Error recreating classes table:', error);
    throw error;
  }
};

if (require.main === module) {
  recreateClassesTable()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { recreateClassesTable };



