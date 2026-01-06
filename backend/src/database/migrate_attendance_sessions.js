const pool = require('../config/database');
require('dotenv').config();

/**
 * Migration script to add attendance_sessions table and update attendance table
 * Run this script to implement the new session-based attendance system
 */
async function migrateAttendanceSessions() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Starting attendance sessions migration...');

    // 1. Create attendance_sessions table
    console.log('1. Creating attendance_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        class_code VARCHAR(20) REFERENCES classes(class_code) ON DELETE CASCADE,
        lecturer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ attendance_sessions table created');

    // 2. Add new columns to attendance table
    console.log('2. Adding columns to attendance table...');
    
    // Check if session_id column exists
    const sessionIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'session_id'
    `);
    
    if (sessionIdCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE attendance 
        ADD COLUMN session_id INTEGER REFERENCES attendance_sessions(id) ON DELETE SET NULL
      `);
      console.log('   ✅ Added session_id column');
    } else {
      console.log('   ℹ️  session_id column already exists');
    }

    // Check if scanned_at column exists
    const scannedAtCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'scanned_at'
    `);
    
    if (scannedAtCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE attendance 
        ADD COLUMN scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('   ✅ Added scanned_at column');
    } else {
      console.log('   ℹ️  scanned_at column already exists');
    }

    // Check if note column exists (checking for both 'note' and 'notes')
    const noteCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name IN ('note', 'notes')
    `);
    
    // If 'notes' exists but 'note' doesn't, we can use notes. Otherwise add note.
    if (noteCheck.rows.length === 0 || !noteCheck.rows.find(r => r.column_name === 'note')) {
      // Check if 'notes' exists (which it should based on current schema)
      const notesExists = noteCheck.rows.find(r => r.column_name === 'notes');
      if (!notesExists) {
        await client.query(`
          ALTER TABLE attendance 
          ADD COLUMN note TEXT
        `);
        console.log('   ✅ Added note column');
      } else {
        console.log('   ℹ️  notes column already exists (will be used for manual notes)');
      }
    } else {
      console.log('   ℹ️  note column already exists');
    }

    // 3. Create index on session_id for better query performance
    console.log('3. Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_code ON attendance_sessions(class_code)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_sessions_is_active ON attendance_sessions(is_active)
    `);
    console.log('   ✅ Indexes created');

    // 4. Create unique constraint for session + student to prevent duplicates
    console.log('4. Creating unique constraint...');
    try {
      await client.query(`
        ALTER TABLE attendance 
        ADD CONSTRAINT unique_session_student 
        UNIQUE (session_id, student_id)
        WHERE session_id IS NOT NULL
      `);
      console.log('   ✅ Unique constraint created (for session-based attendance)');
    } catch (error) {
      if (error.code === '42710' || error.message.includes('already exists')) {
        console.log('   ℹ️  Unique constraint already exists');
      } else {
        throw error;
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - attendance_sessions table: ✅');
    console.log('   - session_id column: ✅');
    console.log('   - scanned_at column: ✅');
    console.log('   - note column: ✅');
    console.log('   - Indexes: ✅');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAttendanceSessions()
    .then(() => {
      console.log('\n🎉 Migration script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateAttendanceSessions;

