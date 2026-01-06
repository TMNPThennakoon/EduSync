const pool = require('../config/database');

const addStatusColumn = async () => {
    try {
        await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_grades' AND column_name = 'status') THEN 
          ALTER TABLE exam_grades ADD COLUMN status VARCHAR(20) DEFAULT 'draft'; 
        END IF; 
      END $$;
    `);
        console.log('Successfully added status column to exam_grades table');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        process.exit();
    }
};

addStatusColumn();
