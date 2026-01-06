const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'classroom-attendance' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Logging middleware for Express
const logRequest = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Log user actions to DB and file
const logUserAction = async (action, userId, details = {}, req = null) => {
  // File log
  logger.info('User Action', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString()
  });

  // Database log
  try {
    // Lazy load pool to avoid circular dependency if possible, or just require it at top if safe.
    // Assuming pool is available or can be required.
    const pool = require('../config/database');

    const ipAddress = req?.ip || details?.ip || (req?.socket?.remoteAddress) || null;
    const deviceInfo = (req && typeof req.get === 'function') ? req.get('User-Agent') : (details?.deviceInfo || null);

    await pool.query(
      'INSERT INTO action_logs (user_id, action, details, ip_address, device_info) VALUES ($1, $2, $3, $4, $5)',
      [userId || null, action, JSON.stringify(details), ipAddress, deviceInfo]
    );
  } catch (error) {
    console.error('Failed to log action to DB:', error.message);
  }
};

// Log errors
const logError = (error, context = {}) => {
  logger.error('Application Error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logRequest,
  logUserAction,
  logError
};
