import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Users,
  Calendar,
  BarChart3,
  ArrowLeft,
  Clock,
  GraduationCap,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  RefreshCw,
  Plus
} from 'lucide-react';
import { classesAPI, attendanceAPI, assignmentsAPI, gradesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import LectureMaterialsSection from '../components/LectureMaterialsSection';
import AnnouncementsSection from '../components/AnnouncementsSection';
import StudentDetailsModal from '../components/StudentDetailsModal';
import ExamGradesManager from '../components/ExamGradesManager';
import CreateAssignmentModal from '../components/CreateAssignmentModal';

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLecturer } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showExamGradesModal, setShowExamGradesModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch class details
  const { data: classData, isLoading: classLoading } = useQuery(
    ['class', id],
    () => classesAPI.getById(id),
    { enabled: !!id }
  );

  // Fetch student's attendance for this class
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery(
    ['attendance', id, user?.id],
    () => attendanceAPI.getByStudentAndClass(user?.id, id),
    { enabled: !!user?.id && !!id }
  );

  // Fetch assignments for this class
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useQuery(
    ['assignments', id],
    () => assignmentsAPI.getByClass(id),
    { enabled: !!id }
  );

  // Fetch student's grades for this class
  const { data: gradesData, isLoading: gradesLoading } = useQuery(
    ['grades', id, user?.id],
    () => gradesAPI.getByStudentAndClass(user?.id, id),
    { enabled: !!user?.id && !!id && !isLecturer }
  );

  // Fetch enrolled students (for lecturers)
  const { data: enrolledStudentsData, isLoading: enrolledStudentsLoading, refetch: refetchEnrolledStudents } = useQuery(
    ['enrolled-students', id],
    () => classesAPI.getEnrolledStudents(id),
    { enabled: !!id && isLecturer }
  );

  const classInfo = classData?.data?.class || classData?.data?.data?.class;
  console.log('Class Info:', classInfo);
  const attendance = attendanceData?.data?.attendance || [];
  const assignments = assignmentsData?.data?.assignments || [];
  const grades = gradesData?.data?.grades || [];
  const enrolledStudents = enrolledStudentsData?.data?.students || enrolledStudentsData?.data?.data?.students || [];

  // Format academic year and semester
  const formatAcademicInfo = (academicYear, semester) => {
    const yearMap = {
      '1st Year': '1st Year Students',
      '2nd Year': '2nd Year Students',
      '3rd Year': '3rd Year Students',
      '4th Year': '4th Year Students'
    };

    const semesterMap = {
      '1': '1st Semester',
      '2': '2nd Semester'
    };

    const formattedYear = yearMap[academicYear] || academicYear;
    const formattedSemester = semesterMap[semester] || semester;

    return `${formattedYear} - ${formattedSemester}`;
  };

  // Calculate attendance stats
  const totalDays = attendance.length;
  const presentDays = attendance.filter(record => record.status === 'present').length;
  const lateDays = attendance.filter(record => record.status === 'late').length;
  const absentDays = attendance.filter(record => record.status === 'absent').length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Calculate grade stats
  const totalAssignments = assignments.length;
  const completedAssignments = grades.length;
  const averageGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length)
    : 0;

  // Handle student click
  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  if (classLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Class not found</h3>
        <p className="mt-1 text-sm text-gray-500">The class you're looking for doesn't exist.</p>
        <Link to="/classes" className="btn btn-primary mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/classes"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Back to Classes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classInfo.name}</h1>
            <p className="text-gray-600">{classInfo.subject}</p>
          </div>
        </div>

        {isLecturer && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowExamGradesModal(true)}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
            >
              <Award className="h-4 w-4 mr-2" />
              Manage Exam Grades
            </button>
            <button
              onClick={() => navigate('/attendance', {
                state: {
                  classId: classInfo.id,
                  classCode: classInfo.class_code,
                  academicYear: classInfo.academic_year,
                  semester: classInfo.semester,
                  department: classInfo.department
                }
              })}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Get Attendance
            </button>
          </div>
        )}
      </div>

      {showExamGradesModal && (
        <ExamGradesManager
          classId={classInfo.id}
          classCode={classInfo.class_code || classInfo.subject || classInfo.id}
          onClose={() => setShowExamGradesModal(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Class Name</label>
                  <p className="text-lg text-gray-900">{classInfo.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Subject Code</label>
                  <p className="text-lg text-gray-900">{classInfo.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Academic Year & Semester</label>
                  <p className="text-lg text-gray-900">
                    {formatAcademicInfo(classInfo.academic_year, classInfo.semester)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="text-lg text-gray-900">{classInfo.department || 'N/A'}</p>
                </div>
              </div>
              {classInfo.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1">{classInfo.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lecture Materials Section (for lecturers) */}
          {/* Announcements Section */}
          <AnnouncementsSection classCode={classInfo?.class_code} isLecturer={isLecturer} />

          {/* Lecture Materials Section */}
          <LectureMaterialsSection classId={id} readOnly={!isLecturer} />

          {/* Recent Attendance (for students only) */}
          {!isLecturer && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h2>
              {attendanceLoading ? (
                <LoadingSpinner size="sm" />
              ) : attendance.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
                  <p className="mt-1 text-sm text-gray-500">Your attendance will appear here once recorded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendance.slice(0, 5).map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {record.status === 'present' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Present
                          </span>
                        )}
                        {record.status === 'late' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Late
                          </span>
                        )}
                        {record.status === 'absent' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Absent
                          </span>
                        )}
                        {record.status === 'excused' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Excused
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {attendance.length > 5 && (
                    <Link
                      to={`/attendance?class=${id}`}
                      className="block text-center text-sm text-primary-600 hover:text-primary-700 py-2"
                    >
                      View all attendance records
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Assignments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Assignments</h2>
              {isLecturer && (
                <button
                  onClick={() => setShowAssignmentModal(true)}
                  className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Assignment
                </button>
              )}
            </div>
            {assignmentsLoading ? (
              <LoadingSpinner size="sm" />
            ) : assignments.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments yet</h3>
                <p className="mt-1 text-sm text-gray-500">Assignments will appear here when created.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 3).map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{assignment.title}</h4>
                      <p className="text-xs text-gray-500">
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      to={`/assignments/${assignment.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
                {assignments.length > 3 && (
                  <Link
                    to={`/assignments?class=${id}`}
                    className="block text-center text-sm text-primary-600 hover:text-primary-700 py-2"
                  >
                    View all assignments
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Assignment Modal */}
          {showAssignmentModal && (
            <CreateAssignmentModal
              isOpen={showAssignmentModal}
              onClose={() => setShowAssignmentModal(false)}
              onSuccess={async () => {
                await refetchAssignments();
                toast.success('Assignment created successfully!');
              }}
              prefilledClass={{
                id: classInfo.id,
                name: classInfo.name,
                department: classInfo.department
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enrolled Students (for lecturers) */}
          {isLecturer && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary-600" />
                  Enrolled Students ({enrolledStudents.length})
                </div>
                <button
                  onClick={async () => {
                    if (isSyncing) return;
                    if (!window.confirm('Sync enrollments? This will search for matching students and enroll them.')) return;

                    setIsSyncing(true);
                    try {
                      const res = await classesAPI.syncEnrollments(id);
                      toast.success(res.data.message + (res.data.addedCount ? ` (${res.data.addedCount} added)` : ''));
                      await refetchEnrolledStudents();
                    } catch (err) {
                      toast.error('Failed to sync: ' + (err.response?.data?.error || err.message));
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  className={`p-1 text-gray-400 hover:text-blue-600 transition-colors ${isSyncing ? 'cursor-not-allowed opacity-50' : ''}`}
                  title="Sync Students from Database"
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </h2>
              {enrolledStudentsLoading ? (
                <LoadingSpinner size="sm" />
              ) : enrolledStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students enrolled</h3>
                  <p className="mt-1 text-sm text-gray-500">Students will appear here once enrolled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleStudentClick(student)}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <img
                        src={student.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.first_name + ' ' + student.last_name)}&background=2563eb&color=fff&size=64`}
                        alt={`${student.first_name} ${student.last_name}`}
                        className="w-10 h-10 rounded-full object-cover border-2 border-primary-200 group-hover:border-primary-400 transition-colors"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.first_name + ' ' + student.last_name)}&background=2563eb&color=fff&size=64`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                          {student.first_name} {student.last_name}
                        </p>
                        {student.index_no && (
                          <p className="text-xs text-gray-500">{student.index_no}</p>
                        )}
                      </div>
                      <User className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Your Stats (for students only) */}
          {!isLecturer && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Attendance Rate</span>
                  <span className="text-lg font-semibold text-gray-900">{attendancePercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Present Days</span>
                  <span className="text-lg font-semibold text-gray-900">{presentDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Late Days</span>
                  <span className="text-lg font-semibold text-gray-900">{lateDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Absent Days</span>
                  <span className="text-lg font-semibold text-gray-900">{absentDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Assignments</span>
                  <span className="text-lg font-semibold text-gray-900">{completedAssignments}/{totalAssignments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Grade</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {averageGrade > 0 ? `${averageGrade}%` : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      <StudentDetailsModal
        isOpen={showStudentModal}
        onClose={() => {
          setShowStudentModal(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </div >
  );
};

export default ClassDetail;
