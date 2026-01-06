const pool = require('../config/database');

const addSectionColumn = async () => {
    try {
        console.log('🔄 Adding section column to lecture_materials table...\n');
        await pool.connect();

        // Add section column if it doesn't exist
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'lecture_materials' AND column_name = 'section') THEN
          ALTER TABLE lecture_materials ADD COLUMN section VARCHAR(255) DEFAULT 'General Resources';
        END IF;
      END $$;
    `);

        console.log('✅ Section column added successfully!');

    } catch (error) {
        console.error('❌ Error adding section column:', error);
        throw error;
    } finally {
        // Keep connection open or close it? The other script closed it.
        // Ideally we rely on the pool to manage connections, but for a script it's fine.
        // Wait, pool.end() closes the pool.
        // We should probably just exit process.
        await pool.end();
    }
};

if (require.main === module) {
    addSectionColumn()
        .then(() => {
            console.log('\n✅ Migration completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addSectionColumn };
