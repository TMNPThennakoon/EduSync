const pool = require('../config/database');

const updateSchema = async () => {
    try {
        console.log('Checking announcements table schema for advanced targeting...');

        // Add target_dept column
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'target_dept') THEN
              ALTER TABLE announcements ADD COLUMN target_dept VARCHAR(50);
              RAISE NOTICE 'Added target_dept column';
          END IF;
      END
      $$;
    `);

        // Add target_year column
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'target_year') THEN
              ALTER TABLE announcements ADD COLUMN target_year VARCHAR(20);
              RAISE NOTICE 'Added target_year column';
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
