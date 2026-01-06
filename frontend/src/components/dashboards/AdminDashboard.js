import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  TrendingUp,
  Settings,
  Shield,
  Activity,
  CheckCircle,
  AlertCircle,
  Search,
  Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import DatabaseStatus from '../DatabaseStatus';
import DashboardCalendar from '../DashboardCalendar';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch admin dashboard stats
  const { data: dashboardData, isLoading: statsLoading } = useQuery(
    'admin-stats',
    () => adminAPI.getStats()
  );

  const { data: announcementsData } = useQuery(
    'admin-announcements',
    () => adminAPI.getAnnouncements()
  );

  const stats = dashboardData?.data?.stats || {};
  const charts = dashboardData?.data?.charts || {};
  const rawAttendanceData = dashboardData?.data?.charts?.attendance || [];
  const activeAnnouncements = announcementsData?.data?.announcements || [];

  // Process attendance data for chart (Last 7 Days, Grouped by Day)
  const processAttendanceData = () => {
    if (!rawAttendanceData.length) return [];

    const days = {};
    const today = new Date();
    const last7Days = new Date(today.setDate(today.getDate() - 7));

    rawAttendanceData.forEach(item => {
      const date = new Date(item.day);
      if (date >= last7Days) {
        const dateStr = date.toISOString().split('T')[0];
        if (!days[dateStr]) {
          days[dateStr] = { day: dateStr, present: 0, absent: 0, late: 0, excused: 0 };
        }
        const status = item.status?.toLowerCase() || 'present';
        days[dateStr][status] = (days[dateStr][status] || 0) + item.count;
      }
    });

    return Object.values(days).sort((a, b) => new Date(a.day) - new Date(b.day));
  };

  const attendanceChartData = processAttendanceData();

  console.log('Dashboard Data:', dashboardData);
  console.log('Parsed Stats:', stats);

  const StatCard = ({ title, value, icon: Icon, color, subtext, onClick, clickable = false }) => (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${clickable ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <div className="flex items-center text-sm mt-2 text-gray-500">
              {subtext}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, href, color }) => (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group"
      onClick={() => navigate(href)}
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );

  if (statsLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome, {user?.first_name}! 👨‍💼
              </h1>
              <p className="text-red-100 text-lg">
                Admin Dashboard - Manage the entire system
              </p>
            </div>
            <div className="hidden md:block">
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Banner */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <Bell className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Latest Announcement</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p><strong>{activeAnnouncements[0].title}:</strong> {activeAnnouncements[0].message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users?.total || 0}
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtext={`${stats.users?.students || 0} Students, ${stats.users?.lecturers || 0} Lecturers`}
          clickable={true}
          onClick={() => navigate('/users')}
        />
        <StatCard
          title="Active Classes"
          value={stats.classes || 0}
          icon={BookOpen}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtext="Currently running"
          clickable={true}
          onClick={() => navigate('/classes')}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pending_approvals || 0}
          icon={AlertCircle}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          subtext="Action required"
          clickable={true}
          onClick={() => navigate('/approvals')}
        />
        <StatCard
          title="System Status"
          value="Healthy"
          icon={Activity}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtext="All services operational"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            title="User Management"
            description="Manage students & lecturers"
            icon={Users}
            href="/users"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <QuickActionCard
            title="Classes"
            description="View and manage classes"
            icon={BookOpen}
            href="/classes"
            color="bg-gradient-to-br from-green-500 to-green-600"
          />
          <QuickActionCard
            title="Reports & Logs"
            description="View system audit logs"
            icon={FileText}
            href="/admin/logs"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <QuickActionCard
            title="System Settings"
            description="Announcements & IDs"
            icon={Settings}
            href="/admin/settings"
            color="bg-gradient-to-br from-gray-500 to-gray-600"
          />
        </div>
      </div>

      {/* Main Content Grid with Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Trends */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-96">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Attendance Trends (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip labelFormatter={(val) => new Date(val).toLocaleDateString()} />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
                <Bar dataKey="excused" stackId="a" fill="#3b82f6" name="Excused" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Distribution */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Students by Department</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={charts.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="department"
                >
                  {charts.distribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sidebar / Extra Info */}
      <div className="space-y-6">
        <DashboardCalendar />
        <DatabaseStatus />
      </div>
    </div>
  );
};

export default AdminDashboard;
