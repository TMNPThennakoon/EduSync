const pool = require('../config/database');

const updateSchema = async () => {
    try {
        console.log('Updating database schema...');

        // 1. Ensure lecture_materials table exists (if not already)
        // Note: Based on controller usage, it has columns: class_code, title, type, url, file_url, file_name, uploaded_by
        await pool.query(`
      CREATE TABLE IF NOT EXISTS lecture_materials (
        id SERIAL PRIMARY KEY,
        class_code VARCHAR(50) NOT NULL, 
        title VARCHAR(255) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('link', 'file')) NOT NULL,
        url TEXT,
        file_url TEXT,
        file_name VARCHAR(255),
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Add is_hidden column
        await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'lecture_materials' AND column_name = 'is_hidden'
        ) THEN
          ALTER TABLE lecture_materials ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
          RAISE NOTICE 'Added is_hidden column to lecture_materials';
        END IF;
      END $$;
    `);

        console.log('Schema update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

updateSchema();
