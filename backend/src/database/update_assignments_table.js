const pool = require('../config/database');

const updateAssignmentsTable = async () => {
  try {
    console.log('🔄 Updating assignments table...\n');

    // Check if course_code column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assignments' AND column_name = 'course_code'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('📋 Renaming course_code to class_code in assignments table...');
      
      // Drop foreign key constraint if exists
      await pool.query(`
        ALTER TABLE assignments 
        DROP CONSTRAINT IF EXISTS assignments_course_code_fkey
      `);
      
      // Rename column
      await pool.query(`
        ALTER TABLE assignments 
        RENAME COLUMN course_code TO class_code
      `);
      
      // Add new foreign key constraint
      await pool.query(`
        ALTER TABLE assignments 
        ADD CONSTRAINT assignments_class_code_fkey 
        FOREIGN KEY (class_code) 
        REFERENCES classes(class_code) 
        ON DELETE CASCADE
      `);
      
      console.log('   ✅ Column renamed and foreign key updated');
    } else {
      console.log('   ℹ️  Column already renamed or doesn\'t exist');
    }

    // Check if class_id column exists (old structure)
    const checkClassId = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assignments' AND column_name = 'class_id'
    `);

    if (checkClassId.rows.length > 0) {
      console.log('📋 Renaming class_id to class_code in assignments table...');
      
      // Drop foreign key constraint if exists
      await pool.query(`
        ALTER TABLE assignments 
        DROP CONSTRAINT IF EXISTS assignments_class_id_fkey
      `);
      
      // We need to convert class_id (integer) to class_code (varchar)
      // First, let's check if we can map them
      console.log('   ⚠️  Note: class_id is integer, class_code is varchar');
      console.log('   ⚠️  Manual data migration may be required');
      
      // For now, just rename the column (this will fail if data exists, which is expected)
      try {
        await pool.query(`
          ALTER TABLE assignments 
          RENAME COLUMN class_id TO class_code
        `);
        
        // Change column type
        await pool.query(`
          ALTER TABLE assignments 
          ALTER COLUMN class_code TYPE VARCHAR(20)
        `);
        
        // Add new foreign key constraint
        await pool.query(`
          ALTER TABLE assignments 
          ADD CONSTRAINT assignments_class_code_fkey 
          FOREIGN KEY (class_code) 
          REFERENCES classes(class_code) 
          ON DELETE CASCADE
        `);
        
        console.log('   ✅ Column renamed and foreign key updated');
      } catch (error) {
        console.log('   ⚠️  Could not rename class_id (data may need migration):', error.message);
      }
    }

    console.log('\n✅ Assignments table update completed!');

  } catch (error) {
    console.error('❌ Error updating assignments table:', error);
    throw error;
  }
};

if (require.main === module) {
  updateAssignmentsTable()
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

module.exports = { updateAssignmentsTable };



