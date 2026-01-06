# Classroom Attendance & Gradebook - Backend API

A robust Node.js/Express backend API for managing classroom attendance and gradebook functionality.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=classroom_attendance
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_jwt_secret
```

3. **Database Setup**
```bash
# Run migrations to create tables and seed data
npm run migrate
```

4. **Start Development Server**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Access the interactive Swagger documentation at:
`http://localhost:5000/api-docs`

## 🗄️ Database Schema

The system uses PostgreSQL with the following main tables:

- **users** - User accounts and authentication
- **classes** - Class information and management
- **enrollments** - Student-class relationships
- **attendance** - Daily attendance records
- **assignments** - Assignment details and metadata
- **grades** - Student grades and feedback

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Key Features

### User Management
- User registration and login
- Role-based access control (Admin, Lecturer, Student)
- Profile management

### Class Management
- Create and manage classes
- Student enrollment
- Class statistics

### Attendance Tracking
- Record daily attendance
- Bulk attendance recording
- Attendance statistics and reports

### Assignment Management
- Create assignments with due dates
- Track assignment completion
- Grade management

### Reporting
- Daily attendance reports (PDF/CSV)
- Monthly attendance summaries
- Grade reports and analytics

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Classes
- `GET /api/classes` - Get all classes
- `GET /api/classes/:id` - Get class details
- `POST /api/classes` - Create class (Lecturer/Admin)
- `PUT /api/classes/:id` - Update class (Lecturer/Admin)
- `DELETE /api/classes/:id` - Delete class (Lecturer/Admin)
- `POST /api/classes/:id/enroll` - Enroll student
- `DELETE /api/classes/:id/unenroll` - Unenroll student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Record attendance (Lecturer/Admin)
- `POST /api/attendance/bulk` - Bulk attendance recording
- `GET /api/attendance/stats` - Get attendance statistics

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get assignment details
- `POST /api/assignments` - Create assignment (Lecturer/Admin)
- `PUT /api/assignments/:id` - Update assignment (Lecturer/Admin)
- `DELETE /api/assignments/:id` - Delete assignment (Lecturer/Admin)
- `GET /api/assignments/:id/grades` - Get assignment grades

### Grades
- `GET /api/grades` - Get all grades
- `GET /api/grades/:id` - Get grade by ID
- `POST /api/grades` - Create grade (Lecturer/Admin)
- `PUT /api/grades/:id` - Update grade (Lecturer/Admin)
- `DELETE /api/grades/:id` - Delete grade (Lecturer/Admin)
- `POST /api/grades/bulk` - Bulk grade creation
- `GET /api/grades/student/:studentId` - Get student grades

### Reports
- `GET /api/reports/attendance/daily` - Daily attendance report
- `GET /api/reports/attendance/monthly` - Monthly attendance report
- `GET /api/reports/grades` - Grade report

## 🔒 Security Features

- **Password Hashing** - bcryptjs for secure password storage
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Comprehensive server-side validation using express-validator
- **SQL Injection Prevention** - Parameterized queries with pg library
- **Rate Limiting** - API rate limiting to prevent abuse
- **CORS Protection** - Configurable cross-origin resource sharing
- **Helmet.js** - Security headers and protection

## 📝 Logging

The application uses Winston for comprehensive logging:

- **Error Logs** - Stored in `logs/error.log`
- **Combined Logs** - Stored in `logs/combined.log`
- **Console Logs** - Development environment only

Log levels: error, warn, info, debug

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📦 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm test` - Run test suite

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | classroom_attendance |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
```bash
NODE_ENV=production
DB_HOST=your_production_db_host
DB_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret
```

2. **Database Migration**
```bash
npm run migrate
```

3. **Start Production Server**
```bash
npm start
```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database exists

2. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper Authorization header format

3. **CORS Issues**
   - Verify FRONTEND_URL is correct
   - Check CORS configuration

## 📈 Performance

- **Database Indexing** - Optimized queries with proper indexes
- **Connection Pooling** - PostgreSQL connection pooling
- **Rate Limiting** - Prevents API abuse
- **Input Validation** - Reduces server load from invalid requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
