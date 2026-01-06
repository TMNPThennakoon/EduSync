const pool = require('../config/database');

const updateSchema = async () => {
    try {
        console.log('Checking announcements table schema...');

        // Add priority column if not exists
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'priority') THEN
              ALTER TABLE announcements ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
              RAISE NOTICE 'Added priority column';
          END IF;
      END
      $$;
    `);

        // Add course_id column if not exists
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'course_id') THEN
              ALTER TABLE announcements ADD COLUMN course_id INTEGER; -- Removed FK constraint to avoid errors
              RAISE NOTICE 'Added course_id column';
          END IF;
      END
      $$;
    `);

        console.log('Schema update completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

updateSchema();
