import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  QrCode,
  FileText,
  Award,
  Eye,
  Plus,
  GraduationCap,
  Target,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { classesAPI, attendanceAPI, assignmentsAPI, gradesAPI, usersAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import WebcamQRScanner from '../WebcamQRScanner';
import AnnouncementDisplay from '../AnnouncementDisplay';

const LecturerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Fetch lecturer dashboard data
  const { data: classesData, isLoading: classesLoading, error: classesError, refetch: refetchClasses } = useQuery(
    ['lecturer-classes', user?.id],
    () => classesAPI.getAllWithStats({ page: 1, limit: 10, lecturer_id: user?.id }),
    {
      enabled: !!user?.id,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      onSuccess: (data) => {
        console.log('✅ Classes data received:', data);
        console.log('✅ Classes count:', data?.data?.classes?.length);
        console.log('✅ Full response:', JSON.stringify(data, null, 2));
      },
      onError: (error) => {
        console.error('❌ Classes API error:', error);
        console.error('❌ Error response:', error.response);
      }
    }
  );

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery(
    'lecturer-attendance',
    () => attendanceAPI.getStats({
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    })
  );

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery(
    'lecturer-assignments',
    () => assignmentsAPI.getAll({ page: 1, limit: 10 })
  );

  const { data: activityData, isLoading: activityLoading } = useQuery(
    'lecturer-activity',
    () => usersAPI.getDashboardActivity()
  );

  // Student count is now derived from classes data to ensure accuracy for the lecturer

  const StatCard = ({ title, value, icon: Icon, color, change, changeType, onClick, clickable = false }) => (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${clickable ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center text-sm mt-2 ${changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, href, color, onClick }) => (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group"
      onClick={onClick || (() => navigate(href))}
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

  const CourseCard = ({ course, students, assignments, attendance }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{course.class_name || course.name}</h3>
            <p className="text-sm text-gray-600">{course.subject || course.department}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{students}</p>
          <p className="text-xs text-gray-600">Students</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{assignments}</p>
          <p className="text-xs text-gray-600">Assignments</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{attendance}%</p>
          <p className="text-xs text-gray-600">Attendance</p>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          onClick={() => navigate(`/classes/${course.id}`)}
        >
          <Eye className="h-4 w-4 inline mr-1" />
          View Class
        </button>
        <button
          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          onClick={() => navigate('/attendance', {
            state: {
              classId: course.id,
              classCode: course.class_code,
              academicYear: course.academic_year,
              semester: course.semester,
              department: course.department
            }
          })}
        >
          <Calendar className="h-4 w-4 inline mr-1" />
          Get Attendance
        </button>
      </div>
    </div>
  );

  const RecentActivityItem = ({ title, description, time, icon: Icon, status, course }) => (
    <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`p-2 rounded-full ${status === 'success' ? 'bg-green-100 text-green-600' :
        status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
          status === 'error' ? 'bg-red-100 text-red-600' :
            'bg-blue-100 text-blue-600'
        }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        {course && <p className="text-xs text-gray-500 mt-1">in {course}</p>}
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );

  const UpcomingDeadlineItem = ({ title, course, dueDate, priority }) => (
    <div className={`p-4 rounded-lg border-l-4 ${priority === 'high' ? 'bg-red-50 border-red-400' :
      priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
        'bg-green-50 border-green-400'
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-600">{course}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{dueDate}</p>
          <p className={`text-xs ${priority === 'high' ? 'text-red-600' :
            priority === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
            {priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Due Soon' : 'Upcoming'}
          </p>
        </div>
      </div>
    </div>
  );

  // QR Scanner handlers
  const handleQRScan = async (qrData) => {
    try {
      const parsedData = JSON.parse(qrData);
      if (parsedData.type === 'attendance' && parsedData.studentId) {
        await attendanceAPI.recordFromQR({
          student_id: parsedData.studentId,
          class_id: selectedClassId,
          date: new Date().toISOString().split('T')[0],
          status: 'present'
        });
        setIsQRScannerOpen(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
    }
  };

  const handleOpenQRScanner = () => {
    if (classesData?.data?.classes?.length > 0) {
      setSelectedClassId(classesData.data.classes[0].id);
      setIsQRScannerOpen(true);
    }
  };

  if (classesLoading || attendanceLoading || assignmentsLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.first_name}! 👨‍🏫
              </h1>
              <p className="text-blue-100 text-lg">
                Teaching Dashboard - Manage your classes and students
              </p>
            </div>
            <div className="hidden md:block">
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <GraduationCap className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="My Classes"
          value={(() => {
            const count = classesData?.data?.classes?.length || 0;
            console.log('Classes count for StatCard:', count, 'Data:', classesData);
            return count;
          })()}
          icon={BookOpen}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          change="+1 this week"
          changeType="positive"
          clickable={true}
          onClick={() => navigate('/classes')}
        />
        <StatCard
          title="Total Students"
          value={classesData?.data?.classes?.reduce((acc, curr) => acc + (parseInt(curr.student_count) || 0), 0) || 0}
          icon={Users}
          color="bg-gradient-to-br from-green-500 to-green-600"
          change="+5 new enrollments"
          changeType="positive"
          clickable={true}
          onClick={() => navigate('/users')}
        />
        <StatCard
          title="Pending Grading"
          value={assignmentsData?.assignments?.filter(assignment =>
            new Date(assignment.due_date) < new Date() &&
            !assignment.graded
          ).length || 0}
          icon={FileText}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          change="3 urgent"
          changeType="warning"
          clickable={true}
          onClick={() => navigate('/assignments')}
        />
        <StatCard
          title="Avg. Attendance"
          value={`${Math.round(classesData?.data?.classes?.reduce((total, classItem) =>
            total + (classItem.attendance_rate || 0), 0) / (classesData?.data?.classes?.length || 1)) || 0}%`}
          icon={Target}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          change="+2% this week"
          changeType="positive"
          clickable={true}
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            title="Take Attendance"
            description="Record today's attendance"
            icon={Calendar}
            href="/attendance"
            color="bg-gradient-to-br from-green-500 to-green-600"
          />
          <QuickActionCard
            title="QR Scanner"
            description="Scan QR codes for attendance"
            icon={QrCode}
            color="bg-gradient-to-br from-orange-500 to-orange-600"
            onClick={handleOpenQRScanner}
          />
          <QuickActionCard
            title="Create Assignment"
            description="Add a new assignment"
            icon={Plus}
            href="/assignments"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <QuickActionCard
            title="View Reports"
            description="Generate class reports"
            icon={BarChart3}
            href="/reports"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Courses Overview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">My Classes</h3>
              <button
                className="text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => navigate('/classes')}
              >
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {classesData?.data?.classes?.slice(0, 4).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  students={course.student_count || 0}
                  assignments={course.assignment_count || 0}
                  attendance={course.attendance_rate || 0}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Announcements */}
          <AnnouncementDisplay />

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-1">
              {activityLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : activityData?.data?.activities?.length > 0 ? (
                activityData.data.activities.map((activity, index) => (
                  <RecentActivityItem
                    key={index}
                    title={activity.title}
                    description={activity.description}
                    time={new Date(activity.time).toLocaleDateString() === new Date().toLocaleDateString()
                      ? 'Today'
                      : new Date(activity.time).toLocaleDateString()}
                    icon={
                      activity.type === 'attendance' ? CheckCircle :
                        activity.type === 'grading' ? Award :
                          activity.type === 'enrollment' ? Users :
                            activity.type === 'assignment' ? BookOpen :
                              AlertCircle
                    }
                    status={activity.status}
                    course={activity.course}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <WebcamQRScanner
        isOpen={isQRScannerOpen}
        onScan={handleQRScan}
        onClose={() => setIsQRScannerOpen(false)}
        classId={selectedClassId}
        date={new Date().toISOString().split('T')[0]}
      />
    </div>
  );
};

export default LecturerDashboard;
