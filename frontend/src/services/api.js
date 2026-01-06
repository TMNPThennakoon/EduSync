import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-logout for password validation errors in clear attendance
    if (error.response?.status === 401 &&
      error.config?.url?.includes('/attendance/clear-all') &&
      error.response?.data?.error === 'Invalid password') {
      // Just return the error without auto-logout
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  sendOtp: (email) => api.post('/auth/send-otp', { email }),
  verifyOtp: (email, code) => api.post('/auth/verify-otp', { email, code }),
  googleLogin: (token) => api.post('/auth/google', { token }),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  // Stats and helpers for lecturers
  getStudentCount: () => api.get('/users/stats/students/count'),
  getAllStudentIds: (params) => api.get('/users/students/ids', { params }),
  getDashboardActivity: () => api.get('/users/dashboard/activity'),
  // Image upload/retrieval
  uploadTempImage: (formData) => {
    const uploadApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000 // Increased to 60 seconds for large images
    });

    return uploadApi.post('/uploads/temp-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
  },
  uploadImage: (id, formData) => {
    // Create a new axios instance without default headers for file uploads
    const uploadApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000
    });

    // Add auth token if available (for authenticated users)
    const token = localStorage.getItem('token');
    if (token) {
      uploadApi.defaults.headers.Authorization = `Bearer ${token}`;
    }

    return uploadApi.post(`/users/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getImage: (id) => api.get(`/users/${id}/image`),
};

// Classes API
export const classesAPI = {
  getAll: (params) => api.get('/classes', { params }),
  getAllWithStats: (params) => api.get('/classes/with-stats', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  getStats: (classId) => api.get(`/classes/${classId}/stats`),
  create: (classData) => api.post('/classes', classData),
  update: (id, classData) => api.put(`/classes/${id}`, classData),
  delete: (id) => api.delete(`/classes/${id}`),
  enrollStudent: (classId, studentId) => api.post(`/classes/${classId}/enroll`, { class_id: classId, student_id: studentId }),
  unenrollStudent: (classId, studentId) => api.delete(`/classes/${classId}/unenroll`, { data: { class_id: classId, student_id: studentId } }),
  getEnrolledStudents: (classId) => api.get(`/classes/${classId}/students`),
  getStudentClasses: (studentId) => api.get(`/classes/student/${studentId}`),
  syncEnrollments: (id) => api.post(`/classes/${id}/sync-enrollments`),
};

// Lecture Materials API
export const lectureMaterialsAPI = {
  getAll: (classId) => api.get(`/lecture-materials/${classId}`),
  upload: (classId, data) => api.post(`/lecture-materials/${classId}`, data),
  delete: (materialId) => api.delete(`/lecture-materials/${materialId}`),
  toggleVisibility: (materialId) => api.put(`/lecture-materials/${materialId}/visibility`),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  record: (attendanceData) => api.post('/attendance', attendanceData),
  bulkRecord: (attendanceData) => api.post('/attendance/bulk', attendanceData),
  recordFromQR: (qrData) => api.post('/attendance/qr-scan', qrData),
  markSmart: (qrData) => api.post('/attendance/mark-smart', qrData),
  updateStatus: (data) => api.patch('/attendance/update-status', data),
  getStats: (params) => api.get('/attendance/stats', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
  clearAll: (password) => api.delete('/attendance/clear-all', { data: { password } }),
  getByStudentAndClass: (studentId, classId) => api.get('/attendance', { params: { student_id: studentId, class_code: classId } }),
};

// Attendance Sessions API
export const attendanceSessionAPI = {
  start: (classCode) => api.post('/attendance-sessions/start', { class_code: classCode }),
  end: (data) => api.post('/attendance-sessions/end', data),
  clearSession: (data) => api.post('/attendance-sessions/clear', data),
  getActive: (class_code) => api.get(`/attendance-sessions/active?class_code=${class_code}`),
  getStats: (sessionId) => api.get('/attendance-sessions/stats', { params: { session_id: sessionId } }),
};

// Export API
export const exportAPI = {
  daily: (params) => api.get('/exports/daily', {
    params,
    responseType: params.format === 'pdf' ? 'blob' : 'text'
  }),
  monthly: (params) => api.get('/exports/monthly', {
    params,
    responseType: params.format === 'pdf' ? 'blob' : 'text'
  }),
};

// Admin API
export const adminAPI = {
  getStats: (params) => api.get('/admin/stats', { params }),
  getLogs: (params) => api.get('/admin/logs', { params }),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  getAnnouncements: () => api.get('/admin/announcements'),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  generateLecturerIds: (data) => api.post('/admin/lecturer-ids/generate', data),
  getLecturerIds: (status) => api.get('/admin/lecturer-ids', { params: { status } }),
  resetAttendance: (data) => api.post('/admin/attendance/reset', data),
  getPendingRegistrations: () => api.get('/approvals/pending'),
  approveRegistration: (userId) => api.post(`/approvals/${userId}/approve`),
  rejectRegistration: (userId) => api.post(`/approvals/${userId}/reject`),
};

// Announcements API
// Announcements API
export const announcementsAPI = {
  create: (data) => api.post('/announcements', data),
  getByClass: (classCode) => api.get(`/announcements/class/${classCode}`),
  getMyAnnouncements: () => api.get('/announcements/my'),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// Assignments API
export const assignmentsAPI = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (assignmentData) => api.post('/assignments', assignmentData),
  createWithFile: (data) => api.post('/assignments', data),
  update: (id, assignmentData) => api.put(`/assignments/${id}`, assignmentData),
  delete: (id) => api.delete(`/assignments/${id}`),
  getGrades: (id) => api.get(`/assignments/${id}/grades`),
  submitAssignment: (data) => api.post('/assignments/submit', data),
  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, gradeData) => api.put(`/assignments/submissions/${submissionId}/grade`, gradeData),
  getByClass: (classId) => api.get('/assignments', { params: { class_id: classId } }),
  getStudentSubmissions: (studentId, params) => api.get(`/assignments/student/${studentId}/submissions`, { params }),
  generateQuiz: (data) => api.post('/assignments/ai-generate', data),
};

// Grades API
export const gradesAPI = {
  getAll: (params) => api.get('/grades', { params }),
  getById: (id) => api.get(`/grades/${id}`),
  create: (gradeData) => api.post('/grades', gradeData),
  update: (id, gradeData) => api.put(`/grades/${id}`, gradeData),
  delete: (id) => api.delete(`/grades/${id}`),
  bulkCreate: (gradesData) => api.post('/grades/bulk', gradesData),
  getStudentGrades: (studentId, params) => api.get(`/grades/student/${studentId}`, { params }),
  getByStudentAndClass: (studentId, classId) => api.get('/grades', { params: { student_id: studentId, class_id: classId } }),
  bulkUpdateExamGrades: (data) => api.post('/grades/exam-grades/bulk-update', data),
  getExamGrades: (params) => api.get('/grades/exam-grades/all', { params }),
  approveExamGrades: (data) => api.post('/grades/exam-grades/approve', data),
  getPendingApprovals: () => api.get('/grades/exam-grades/pending'),
};

// Reports API
export const reportsAPI = {
  dailyAttendance: (params) => api.get('/reports/attendance/daily', { params, responseType: 'blob' }),
  monthlyAttendance: (params) => api.get('/reports/attendance/monthly', { params, responseType: 'blob' }),
  grades: (params) => api.get('/reports/grades', { params, responseType: 'blob' }),
};

// QR Code API
export const qrCodeAPI = {
  generateStudentQR: (studentId, format = 'png') => api.get(`/qr-code/student/${studentId}?format=${format}`),
  scan: (scanData) => api.post('/qr-code/scan', scanData),
  getScanHistory: (params) => api.get('/qr-code/history', { params }),
};

// Utility functions
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const reportAPI = {
  getStudentReport: (studentId, params) => api.get(`/reports/student/${studentId}`, { params }),
  getLecturerReport: (params) => api.get('/reports/lecturer/class-merit', { params }),
  getAdminReport: () => api.get('/admin/overview') // This route needs to match backend: /api/reports/admin/overview
};

// Fix the admin route path in definition:
reportAPI.getAdminReport = () => api.get('/reports/admin/overview');

export default api;
