import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  FileText,
  Award,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  QrCode,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { classesAPI, attendanceAPI, assignmentsAPI, gradesAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner';
import StudentLectureMaterials from '../StudentLectureMaterials';
import DashboardCalendar from '../DashboardCalendar';
import AnnouncementDisplay from '../AnnouncementDisplay';

import MyQRCode from '../../pages/MyQRCode';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch student dashboard data
  const { data: classesData, isLoading: classesLoading } = useQuery(
    ['student-classes', user?.id],
    () => classesAPI.getStudentClasses(user?.id),
    {
      enabled: !!user?.id,
    }
  );

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery(
    ['student-attendance', user?.id],
    () => attendanceAPI.getAll({ student_id: user?.id }),
    {
      enabled: !!user?.id,
    }
  );

  // Get assignments from student's enrolled classes
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery(
    ['student-assignments', user?.id, classesData?.data?.classes],
    async () => {
      if (!classesData?.data?.classes?.length) return { data: { assignments: [] } };

      // Get assignments for all enrolled classes
      const assignmentPromises = classesData.data.classes.map(classItem =>
        assignmentsAPI.getByClass(classItem.id).catch(() => ({ data: { assignments: [] } }))
      );

      const results = await Promise.all(assignmentPromises);
      const allAssignments = results.flatMap(result => result.data?.assignments || []);

      // Get student submissions to check which assignments are submitted
      const submissionsResponse = await assignmentsAPI.getStudentSubmissions(user?.id, {}).catch(() => ({ data: { submissions: [] } }));
      const submissions = submissionsResponse.data?.submissions || [];
      const submittedAssignmentIds = new Set(submissions.map(s => s.assignment_id));

      // Mark assignments as submitted
      const assignmentsWithStatus = allAssignments.map(assignment => ({
        ...assignment,
        submitted: submittedAssignmentIds.has(assignment.id),
        class_name: classesData.data.classes.find(c => c.id === assignment.class_id)?.name || 'Unknown Class'
      }));

      return { data: { assignments: assignmentsWithStatus } };
    },
    {
      enabled: !!user?.id && !!classesData?.data?.classes?.length,
    }
  );

  const { data: gradesData, isLoading: gradesLoading } = useQuery(
    ['student-grades', user?.id],
    () => gradesAPI.getStudentGrades(user?.id),
    {
      enabled: !!user?.id,
    }
  );

  // Debug Logs
  console.log('StudentDashboard User:', user);
  console.log('Classes Data:', classesData);
  console.log('Attendance Data:', attendanceData);
  console.log('Grades Data:', gradesData);

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

  const CourseCard = ({ course, attendance, assignments }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
            <p className="text-sm text-gray-600">{course.subject || course.department}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          Enrolled
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{attendance}%</p>
          <p className="text-xs text-gray-600">Attendance</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{assignments}</p>
          <p className="text-xs text-gray-600">Assignments</p>
        </div>
      </div>

      <button
        className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        onClick={() => navigate(`/classes/${course.id}`)}
      >
        View Class Details
      </button>
    </div>
  );

  const UpcomingDeadlineItem = ({ title, course, dueDate, priority, submitted }) => (
    <div className={`p-4 rounded-lg border-l-4 ${submitted ? 'bg-green-50 border-green-400' :
      priority === 'high' ? 'bg-red-50 border-red-400' :
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
          <p className={`text-xs ${submitted ? 'text-green-600' :
            priority === 'high' ? 'text-red-600' :
              priority === 'medium' ? 'text-yellow-600' :
                'text-green-600'
            }`}>
            {submitted ? 'Submitted' : priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Due Soon' : 'Upcoming'}
          </p>
        </div>
      </div>
    </div>
  );

  if (classesLoading || attendanceLoading || assignmentsLoading || gradesLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  const enrolledClasses = classesData?.data?.classes || [];
  const totalAssignments = assignmentsData?.data?.assignments?.length || 0;
  const pendingAssignments = assignmentsData?.data?.assignments?.filter(a =>
    new Date(a.due_date) > new Date() && !a.submitted
  ).length || 0;
  const attendanceRecords = attendanceData?.data?.attendance || attendanceData?.data || [];
  const averageAttendance = attendanceRecords.length > 0
    ? Math.round(attendanceRecords.reduce((sum, record) =>
      sum + (record.status === 'present' ? 100 : 0), 0) / attendanceRecords.length)
    : 0;
  const averageGrade = gradesData?.data?.grades?.length > 0
    ? Math.round(gradesData.data.grades.reduce((sum, grade) => sum + grade.score, 0) / gradesData.data.grades.length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome, {user?.first_name}! 🎓
              </h1>
              <p className="text-green-100 text-lg">
                Student Dashboard - Track your progress and assignments
              </p>
            </div>
            <div className="hidden md:block">
              <div className="p-4 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="My Classes"
          value={enrolledClasses.length}
          icon={BookOpen}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          change="Enrolled"
          changeType="positive"
          clickable={true}
          onClick={() => navigate('/classes')}
        />
        <StatCard
          title="Avg. Attendance"
          value={`${averageAttendance}%`}
          icon={CheckCircle}
          color="bg-gradient-to-br from-green-500 to-green-600"
          change="Good standing"
          changeType="positive"
          clickable={true}
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          title="Pending Assignments"
          value={pendingAssignments}
          icon={FileText}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          change="Due soon"
          changeType={pendingAssignments > 0 ? 'warning' : 'positive'}
          clickable={true}
          onClick={() => navigate('/assignments')}
        />
        <StatCard
          title="Avg. Grade"
          value={averageGrade > 0 ? `${averageGrade}%` : 'N/A'}
          icon={Award}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          change="Keep it up!"
          changeType="positive"
          clickable={true}
          onClick={() => navigate('/grades')}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            title="My Classes"
            description="View enrolled classes"
            icon={BookOpen}
            href="/classes"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <QuickActionCard
            title="My Assignments"
            description="View and submit assignments"
            icon={FileText}
            href="/assignments"
            color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          />
          <QuickActionCard
            title="My QR Code"
            description="View attendance QR code"
            icon={QrCode}
            href="#"
            color="bg-gradient-to-br from-orange-500 to-orange-600"
            onClick={() => {
              const element = document.getElementById('my-qr-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/my-qrcode'); // Fallback
              }
            }}
          />
          <QuickActionCard
            title="My Grades"
            description="View your grades"
            icon={Award}
            href="/grades"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <QuickActionCard
            title="My Reports"
            description="View transcripts & attendance"
            icon={BarChart3}
            href="/reports"
            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Classes */}
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
              {enrolledClasses.slice(0, 4).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  attendance={course.attendance_rate || 0}
                  assignments={course.assignment_count || 0}
                />
              ))}
              {enrolledClasses.length === 0 && (
                <div className="col-span-2 text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No classes enrolled</h3>
                  <p className="mt-1 text-sm text-gray-500 mb-4">You haven't been enrolled in any classes yet.</p>
                  <button
                    onClick={() => navigate('/classes')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Browse Available Classes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Announcements */}
          <AnnouncementDisplay />

          {/* Calendar Widget */}
          <DashboardCalendar />

          {/* Lecture Materials */}
          <StudentLectureMaterials />

          {/* QR Code Section */}
          <div id="my-qr-section" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My QR Code</h3>
            <MyQRCode isWidget={true} />
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {assignmentsData?.data?.assignments?.slice(0, 5).map((assignment) => {
                const dueDate = new Date(assignment.due_date);
                const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                const priority = daysUntilDue <= 1 ? 'high' : daysUntilDue <= 3 ? 'medium' : 'low';

                return (
                  <UpcomingDeadlineItem
                    key={assignment.id}
                    title={assignment.title}
                    course={assignment.class_name || 'Unknown Class'}
                    dueDate={daysUntilDue <= 0 ? 'Overdue' : daysUntilDue === 1 ? 'Tomorrow' : `In ${daysUntilDue} days`}
                    priority={priority}
                    submitted={assignment.submitted}
                  />
                );
              })}
              {(!assignmentsData?.data?.assignments || assignmentsData.data.assignments.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming assignments</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

