const pool = require('../config/database');

const runMigration = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Starting Advanced Schema Migration...');

        // 1. Create messages table for Chat
        console.log('Creating messages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Add indexes for performance
        await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`);
        console.log('✅ messages table created.');

        // 2. Update announcements table
        console.log('Updating announcements table...');
        await client.query(`
            ALTER TABLE announcements 
            ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent'))
        `);
        console.log('✅ announcements table updated.');

        // 3. Create exams table (needed for Calendar if not exists)
        // Checking if we should create it or just stick to assignments/classes. User mentioned "Exams".
        // Let's create a simple exams table to be safe, or just use assignments with a 'type'.
        // For now, let's assume exams are part of assignments or separate. 
        // Let's create a simple exams table as requested for the Calendar.
        console.log('Creating exams table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                duration_minutes INTEGER,
                location VARCHAR(100),
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ exams table created.');

        await client.query('COMMIT');
        console.log('🎉 Advanced Migration completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
