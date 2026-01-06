const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../../debug_app.log');

const debugLog = (message, data = {}) => {
    const timestamp = new Date().toISOString();
    // Safe stringify to avoid circular reference errors
    const safeStringify = (obj) => {
        try {
            return JSON.stringify(obj, (key, value) => {
                if (key === 'buffer') return '[Buffer]'; // Don't log file buffers
                return value;
            });
        } catch (e) {
            return '[Circular/Error]';
        }
    };

    const logEntry = `[${timestamp}] ${message} ${safeStringify(data)}\n`;
    try {
        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        // console.error('Failed to write to debug log', err);
    }
};

module.exports = debugLog;
