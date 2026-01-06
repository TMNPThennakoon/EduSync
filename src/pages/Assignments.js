import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { assignmentsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import EditAssignmentModal from '../components/EditAssignmentModal';
import toast from 'react-hot-toast';

const Assignments = () => {
  const { isLecturer, isStudent, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const { data, isLoading, refetch } = useQuery(
    ['assignments', { search: searchTerm, assignment_type: selectedType, userDepartment: user?.department, selectedDepartment }],
    () => assignmentsAPI.getAll({
      assignment_type: selectedType || undefined,
      department: user?.role === 'admin' ? (selectedDepartment || undefined) : (user?.department || undefined),
      page: 1,
      limit: 20
    }),
    { enabled: !!user?.department || user?.role === 'admin' }
  );

  const assignments = data?.data?.assignments || [];
  const filteredAssignments = assignments.filter(assignment =>
    assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return 'bg-blue-100 text-blue-800';
      case 'homework':
        return 'bg-green-100 text-green-800';
      case 'exam':
        return 'bg-red-100 text-red-800';
      case 'project':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const isDueSoon = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const handleEdit = (assignment) => {
    setSelectedAssignment(assignment);
    setShowEditModal(true);
  };

  const handleDelete = async (assignment) => {
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`)) {
      try {
        await assignmentsAPI.delete(assignment.id);
        toast.success('Assignment deleted successfully!');
        refetch();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete assignment');
      }
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedAssignment(null);
    refetch();
  };

  const AssignmentCard = ({ assignment, isStudent }) => (
    <div className="card hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {assignment.title}
              </h3>
              <p className="text-sm text-gray-600">{assignment.class_name}</p>
            </div>
          </div>

          {assignment.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{assignment.description}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Max Score: {assignment.max_score}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Submissions: {assignment.submission_count || 0}/{assignment.total_students || 0}</span>
            </div>
          </div>

          {/* Student Grade Display */}
          {isStudent && assignment.student_grade !== undefined && assignment.student_grade !== null && (
            <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-green-800">Your Grade</h4>
                  <p className="text-xs text-green-600">{assignment.class_name} - {assignment.subject}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {assignment.student_grade}/{assignment.max_score}
                  </div>
                  <div className="text-sm text-green-600">
                    ({Math.round((assignment.student_grade / assignment.max_score) * 100)}%)
                  </div>
                </div>
              </div>
              {assignment.student_feedback && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-green-700 mb-1">Feedback:</p>
                  <p className="text-xs text-green-700 bg-white p-2 rounded border">{assignment.student_feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Pending Grade Display */}
          {isStudent && assignment.student_grade === null && assignment.submission_count > 0 && (
            <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Grade Pending</h4>
                  <p className="text-xs text-yellow-600">Your submission is being reviewed by the lecturer</p>
                </div>
              </div>
            </div>
          )}

          {/* Lecturer Information for Admins */}
          {user?.role === 'admin' && assignment.lecturer_first_name && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {assignment.lecturer_first_name.charAt(0)}{assignment.lecturer_last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Created by: {assignment.lecturer_first_name} {assignment.lecturer_last_name}
                  </p>
                  <p className="text-xs text-blue-700">{assignment.lecturer_email}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    Department: {assignment.lecturer_department || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className={`badge ${getTypeColor(assignment.assignment_type)}`}>
              {assignment.assignment_type}
            </span>
            {isOverdue(assignment.due_date) && (
              <span className="badge bg-red-100 text-red-800">Overdue</span>
            )}
            {isDueSoon(assignment.due_date) && !isOverdue(assignment.due_date) && (
              <span className="badge bg-yellow-100 text-yellow-800">Due Soon</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/assignments/${assignment.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {isLecturer && (
            <>
              {user?.role !== 'admin' && (
                <button
                  onClick={() => handleEdit(assignment)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit assignment"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(assignment)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete assignment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignments</h1>
          <p className="text-lg text-gray-600">Manage assignments and track progress</p>
          {user?.role === 'admin' ? (
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Admin View
              </span>
              <span className="text-sm text-gray-500">
                {selectedDepartment ? `Showing assignments from ${selectedDepartment} department` : 'Showing all assignments from all departments'}
              </span>
            </div>
          ) : user?.department && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {user.department} Department
              </span>
              <span className="text-sm text-gray-500">
                {isLecturer ? 'Showing assignments for your department only' : 'Showing assignments from your department'}
              </span>
            </div>
          )}
        </div>
        {isLecturer && user?.role !== 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className={`grid grid-cols-1 ${user?.role === 'admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Assignments
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, description, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assignment Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
            >
              <option value="">All Types</option>
              <option value="quiz">Quiz</option>
              <option value="homework">Homework</option>
              <option value="exam">Exam</option>
              <option value="project">Project</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>

          {/* Department Filter for Admins */}
          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              >
                <option value="">All Departments</option>
                <option value="AT">Agricultural Technology (AT)</option>
                <option value="ET">Environmental Technology (ET)</option>
                <option value="IAT">Instrumentation & Automation (IAT)</option>
                <option value="ICT">Information & Communication (ICT)</option>
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
                setSelectedDepartment('');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <Filter className="h-5 w-5" />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assignments */}
      <div>
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedType
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating a new assignment.'
              }
            </p>
            {isLecturer && user?.role !== 'admin' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assignment
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} isStudent={isStudent} />
            ))}
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          window.scrollTo(0, 0);
        }}
      />

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Assignments;
