const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { logRequest, logError } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const attendanceSessionRoutes = require('./routes/attendanceSessions');
const assignmentRoutes = require('./routes/assignments');
const uploadRoutes = require('./routes/uploads');
const gradeRoutes = require('./routes/grades');
const reportRoutes = require('./routes/reports');
const qrCodeRoutes = require('./routes/qrCode');
const approvalRoutes = require('./routes/approvals');
const exportRoutes = require('./routes/exports');
const lectureMaterialsRoutes = require('./routes/lectureMaterials');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Static files
app.use(express.static('public'));
// Serve uploaded student images
app.use('/uploads', express.static('uploads'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));
app.use(logRequest);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Classroom Attendance & Gradebook API',
      version: '1.0.0',
      description: 'A comprehensive API for managing classroom attendance and gradebook functionality',
      contact: {
        name: 'Classroom Team',
        email: 'support@classroom.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
const pool = require('./config/database');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Database Connection
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Connected'
    });
  } catch (error) {
    console.error('Health Check Failed:', error);
    res.status(500).json({
      status: 'Error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-sessions', attendanceSessionRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/qr-code', qrCodeRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/lecture-materials', lectureMaterialsRoutes);

app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/announcements', require('./routes/announcements'));


// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Classroom Attendance & Gradebook API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  logError(error, {
    url: req.url,
    method: req.method,
    body: req.body,
    userId: req.user?.id
  });

  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  });
});

// Socket.io setup
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Attach io to app so it can be used in controllers
app.set('io', io);

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room based on User ID
  socket.on('join_room', (userId) => {
    socket.join(String(userId));
    console.log(`User ${userId} joined room ${userId}`);
  });




  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
