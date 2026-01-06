import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import LecturerDashboard from '../components/dashboards/LecturerDashboard';
import StudentDashboard from '../components/dashboards/StudentDashboard';

const Dashboard = () => {
  const { user, isAdmin, isLecturer, isStudent } = useAuth();

  // Render role-specific dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  } else if (isLecturer) {
    return <LecturerDashboard />;
  } else if (isStudent) {
    return <StudentDashboard />;
  }

  // Fallback for unknown roles
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h2>
        <p className="text-gray-600">Please contact your administrator to set up your account.</p>
      </div>
    </div>
  );
};

export default Dashboard;
