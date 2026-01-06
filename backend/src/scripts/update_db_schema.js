const pool = require('../config/database');

const runMigration = async () => {
    console.log('🔄 Starting Database Migration...');

    try {
        // 1. Add 'status' column to 'exam_grades' if it doesn't exist
        console.log('Checking exam_grades table...');
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_grades' AND column_name = 'status') THEN
              ALTER TABLE exam_grades ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
              ALTER TABLE exam_grades ADD CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'draft'));
              RAISE NOTICE 'Added status column to exam_grades';
          ELSE
              RAISE NOTICE 'status column already exists in exam_grades';
          END IF;
      END
      $$;
    `);
        console.log('✅ exam_grades table updated.');

        // 2. Ensure 'is_approved' column exists in 'users'
        console.log('Checking users table...');
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_approved') THEN
              ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
              RAISE NOTICE 'Added is_approved column to users';
          ELSE
              RAISE NOTICE 'is_approved column already exists in users';
          END IF;
      END
      $$;
    `);
        console.log('✅ users table checked.');

        console.log('🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

runMigration();
