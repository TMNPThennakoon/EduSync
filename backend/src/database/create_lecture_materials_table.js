const pool = require('../config/database');

const createLectureMaterialsTable = async () => {
  try {
    console.log('🔄 Creating lecture_materials table...\n');
    await pool.connect();

    // Create lecture_materials table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lecture_materials (
        id SERIAL PRIMARY KEY,
        class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('link', 'file')) NOT NULL,
        url TEXT,
        file_url TEXT,
        file_name VARCHAR(255),
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ lecture_materials table created successfully!');

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lecture_materials_class_code 
      ON lecture_materials(class_code);
    `);

    console.log('✅ Index created successfully!');

  } catch (error) {
    console.error('❌ Error creating lecture_materials table:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  createLectureMaterialsTable()
    .then(() => {
      console.log('\n✅ Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createLectureMaterialsTable };



