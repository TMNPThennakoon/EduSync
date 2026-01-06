const pool = require('../config/database');

const addYearSemesterToClasses = async () => {
  try {
    console.log('🔄 Adding academic_year and semester to classes table...\n');

    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classes' 
      AND column_name IN ('academic_year', 'semester')
    `);

    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    if (!existingColumns.includes('academic_year')) {
      console.log('📋 Adding academic_year column...');
      await pool.query(`
        ALTER TABLE classes 
        ADD COLUMN academic_year INTEGER CHECK (academic_year >= 1 AND academic_year <= 4)
      `);
      console.log('   ✅ academic_year column added');
    } else {
      console.log('   ℹ️  academic_year column already exists');
    }

    if (!existingColumns.includes('semester')) {
      console.log('📋 Adding semester column...');
      await pool.query(`
        ALTER TABLE classes 
        ADD COLUMN semester INTEGER CHECK (semester >= 1 AND semester <= 8)
      `);
      console.log('   ✅ semester column added');
    } else {
      console.log('   ℹ️  semester column already exists');
    }

    // Update existing classes with default values if needed
    const updateExisting = await pool.query(`
      UPDATE classes 
      SET academic_year = 1, semester = 1 
      WHERE academic_year IS NULL OR semester IS NULL
    `);
    console.log(`   ℹ️  Updated ${updateExisting.rowCount} existing classes with default values`);

    console.log('\n✅ Columns added successfully!');

  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  }
};

if (require.main === module) {
  addYearSemesterToClasses()
    .then(() => {
      console.log('\n✅ Migration completed!');
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      pool.end();
      process.exit(1);
    });
}

module.exports = { addYearSemesterToClasses };



