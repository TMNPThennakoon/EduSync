const pool = require('../config/database');

const createOtpTable = async () => {
    try {
        console.log('🔄 Creating otp_verifications table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_verifications (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create index for faster lookups and cleanup
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
        `);

        // Add index for expiration to help with cleanup jobs if needed
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_verifications(expires_at);
        `);

        console.log('✅ otp_verifications table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating otp_verifications table:', error);
        process.exit(1);
    }
};

createOtpTable();
