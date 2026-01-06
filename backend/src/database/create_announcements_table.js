const pool = require('../config/database');

const createAnnouncementsTable = async () => {
    try {
        console.log('🔄 Creating announcements table...\n');
        await pool.connect();

        // Drop existing table to fix schema mismatch
        await pool.query('DROP TABLE IF EXISTS announcements CASCADE');

        // Create announcements table
        await pool.query(`
      CREATE TABLE announcements (
        id SERIAL PRIMARY KEY,
        class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('✅ announcements table created successfully!');

        // Create index for faster queries
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_announcements_class_code 
      ON announcements(class_code);
    `);

        console.log('✅ Index created successfully!');

    } catch (error) {
        console.error('❌ Error creating announcements table:', error);
        throw error;
    } finally {
        // We don't end the pool here if the script is imported, 
        // but looking at the example, they do end it. 
        // However, if we run it via node directly, ending it is fine.
        // I'll stick to the pattern.
        // Note: The previous example ends the pool in finally block, but if we want to chain migrations/seeds or use it in app startup, that might be an issue.
        // But for a standalone script, it is correct.
        // Wait, `pool` from `../config/database` might be a singleton used by the app. 
        // If I run this script as a standalone process (node script.js), it creates its own process and pool instance, so ending it is correct.
        // If I import it, I should maybe check if I should end it.
        // For now, I'll follow the exact pattern of the existing file which ends it.
        await pool.end();
    }
};

if (require.main === module) {
    createAnnouncementsTable()
        .then(() => {
            console.log('\n✅ Migration completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { createAnnouncementsTable };
