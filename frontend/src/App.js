import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import StudentRegister from './pages/StudentRegister';
import LecturerRegister from './pages/LecturerRegister';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Attendance from './pages/Attendance';
import StudentAttendance from './pages/StudentAttendance';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import StudentSubmissions from './pages/StudentSubmissions';
import Grades from './pages/Grades';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Users from './pages/Users';
import MyQRCode from './pages/MyQRCode';
import AdminApprovals from './pages/AdminApprovals';
import AdminLogs from './pages/AdminLogs';
import AdminSettings from './pages/AdminSettings';
import CalendarPage from './pages/CalendarPage';
import LoadingSpinner from './components/LoadingSpinner';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId="62052291333-6n9cenrhtfin5jojijj4dhsi9sr1kiqr.apps.googleusercontent.com">
        <AuthProvider>
          <Router>
            <div className="App">
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />

              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/role-selection"
                  element={
                    <PublicRoute>
                      <RoleSelection />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register/student"
                  element={
                    <PublicRoute>
                      <StudentRegister />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register/lecturer"
                  element={
                    <PublicRoute>
                      <LecturerRegister />
                    </PublicRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="classes/:id" element={<ClassDetail />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="my-attendance" element={<StudentAttendance />} />
                  <Route path="assignments" element={<Assignments />} />
                  <Route path="assignments/:id" element={<AssignmentDetail />} />
                  <Route path="my-submissions" element={<StudentSubmissions />} />
                  <Route path="grades" element={<Grades />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="profile" element={<Profile />} />
                  <Route
                    path="my-qr-code"
                    element={
                      <ProtectedRoute requiredRole="student">
                        <MyQRCode />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Users />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="approvals"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminApprovals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/logs"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminLogs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin/settings"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
