import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Users, Calendar, BookOpen, Target, Clock, FileText, Edit, Trash2, CheckCircle, AlertCircle, Star, Download, Eye } from 'lucide-react';
import { assignmentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AssignmentSubmissionModal from '../components/AssignmentSubmissionModal';
import AssignmentGradingModal from '../components/AssignmentGradingModal';
import toast from 'react-hot-toast';

const AssignmentDetail = () => {
  const { id } = useParams();
  const { isLecturer, user, isStudent } = useAuth();
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Fetch assignment details
  const { data: assignmentData, isLoading, error, refetch: refetchAssignment } = useQuery(
    ['assignment', id],
    () => assignmentsAPI.getById(id),
    { enabled: !!id }
  );

  // Fetch submissions (for lecturers)
  const { data: submissionsData, isLoading: submissionsLoading, refetch: refetchSubmissions } = useQuery(
    ['assignment-submissions', id],
    () => assignmentsAPI.getSubmissions(id),
    {
      enabled: !!id && isLecturer,
      onError: (error) => {
        console.error('Error fetching submissions:', error);
        toast.error('Failed to load submissions');
      }
    }
  );

  const assignment = assignmentData?.data?.assignment;
  const submissions = submissionsData?.data?.submissions || [];

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (error || !assignment) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <FileText className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Not Found</h3>
        <p className="text-gray-500">The assignment you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = new Date(assignment.due_date) < new Date();
  const isDueSoon = new Date(assignment.due_date) - new Date() < 24 * 60 * 60 * 1000; // 24 hours

  const handleGradeSubmission = (submission) => {
    setSelectedSubmission(submission);
    setShowGradingModal(true);
  };

  const handleGradeSuccess = () => {
    refetchSubmissions();
    refetchAssignment();
  };

  const handleSubmitAssignment = () => {
    setShowSubmissionModal(true);
  };

  const getSubmissionStatus = (submission) => {
    if (submission.grade !== null) return 'graded';
    if (submission.submitted_at && new Date(submission.submitted_at) > new Date(assignment.due_date)) return 'late';
    if (submission.submitted_at) return 'submitted';
    return 'not_submitted';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_submitted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`)) {
      try {
        await assignmentsAPI.delete(assignment.id);
        toast.success('Assignment deleted successfully!');
        window.location.href = '/assignments';
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete assignment');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Details</h1>
          <p className="text-gray-600">Assignment ID: {id}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${isOverdue
            ? 'bg-red-100 text-red-800'
            : isDueSoon
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
            }`}>
            {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Active'}
          </span>

          {isLecturer && (
            <div className="flex items-center space-x-2 ml-4">
              {user?.role !== 'admin' && (
                <Link
                  to={`/assignments/${id}/edit`}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit assignment"
                >
                  <Edit className="h-4 w-4" />
                </Link>
              )}
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete assignment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-primary-600" />
          Assignment Information
        </h2>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center mb-2">
              <FileText className="h-4 w-4 mr-1" />
              Title
            </label>
            <p className="text-lg text-gray-900 font-medium">{assignment.title}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center mb-2">
              <FileText className="h-4 w-4 mr-1" />
              Description
            </label>
            <p className="text-gray-900 leading-relaxed">
              {assignment.description || 'No description provided.'}
            </p>
          </div>

          {/* Assignment File Attachment */}
          {assignment.attachment_url && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <label className="text-sm font-medium text-green-700 flex items-center mb-3">
                <FileText className="h-4 w-4 mr-1" />
                Assignment File
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-900 truncate" title={assignment.attachment_filename}>
                      {assignment.attachment_filename || 'Assignment File'}
                    </p>
                    <p className="text-xs text-green-600">
                      {assignment.attachment_size ? `${(assignment.attachment_size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    onClick={() => window.open(assignment.attachment_url, '_blank')}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = assignment.attachment_url;
                      link.download = assignment.attachment_filename || 'assignment_file';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500 flex items-center mb-2">
                <Target className="h-4 w-4 mr-1" />
                Max Score
              </label>
              <p className="text-2xl font-bold text-gray-900">{assignment.max_score}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500 flex items-center mb-2">
                <Calendar className="h-4 w-4 mr-1" />
                Due Date
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(assignment.due_date)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500 flex items-center mb-2">
                <BookOpen className="h-4 w-4 mr-1" />
                Type
              </label>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {assignment.assignment_type}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500 flex items-center mb-2">
                <Target className="h-4 w-4 mr-1" />
                Department
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {assignment.department}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="text-sm font-medium text-blue-700 flex items-center mb-2">
              <Clock className="h-4 w-4 mr-1" />
              Class Information
            </label>
            <p className="text-blue-900">
              <span className="font-medium">Class:</span> {assignment.class_name} ({assignment.subject})
            </p>
          </div>
        </div>
      </div>

      {/* Student Submission Button or Status */}
      {isStudent && (
        <div className="card">
          {assignmentData?.data?.your_submission ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              {assignmentData.data.your_submission.grade !== undefined && assignmentData.data.your_submission.grade !== null ? (
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <Star className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-green-900">Assignment Graded</h3>
                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {assignmentData.data.your_submission.grade} / {assignment.max_score}
                  </p>
                  {assignmentData.data.your_submission.feedback && (
                    <p className="mt-2 text-sm text-green-800 italic">
                      "{assignmentData.data.your_submission.feedback}"
                    </p>
                  )}
                  <p className="mt-4 text-sm text-green-600">
                    Submitted on {formatDate(assignmentData.data.your_submission.submitted_at)}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-blue-900">Assignment Submitted</h3>
                  <p className="mt-1 text-sm text-blue-600">
                    Your assignment has been submitted and is awaiting grading.
                  </p>
                  <p className="mt-2 text-xs text-blue-500">
                    Submitted on {formatDate(assignmentData.data.your_submission.submitted_at)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Submit Assignment</h2>
                <p className="text-sm text-gray-600">Submit your assignment before the due date</p>
              </div>
              <button
                onClick={handleSubmitAssignment}
                className="btn btn-primary"
              >
                <FileText className="h-4 w-4 mr-2" />
                Submit Assignment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Student Submissions (for Lecturers) */}
      {isLecturer && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary-600" />
              Student Submissions ({submissions.length})
            </h2>
            <div className="text-sm text-gray-500">
              {submissions.filter(s => s.grade !== null).length} graded, {submissions.filter(s => s.grade === null && s.submitted_at).length} pending, {submissions.length} total submissions
            </div>
          </div>

          {submissionsLoading ? (
            <LoadingSpinner size="md" className="py-8" />
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
              <p className="mt-1 text-sm text-gray-500">Student submissions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const status = getSubmissionStatus(submission);
                return (
                  <div key={submission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {submission.first_name[0]}{submission.last_name[0]}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900">
                            {submission.first_name} {submission.last_name}
                          </h3>
                          <p className="text-sm text-gray-500">{submission.email}</p>
                          <p className="text-xs text-gray-400">Index: {submission.student_index || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                              {status === 'graded' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {status === 'late' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {status === 'submitted' && <Clock className="h-3 w-3 mr-1" />}
                              {status === 'not_submitted' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {status.replace('_', ' ')}
                            </span>
                          </div>
                          {submission.submitted_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted: {formatDate(submission.submitted_at)}
                            </p>
                          )}
                          {submission.grade !== null && (
                            <p className="text-sm font-medium text-gray-900">
                              Grade: {submission.grade}/{submission.max_score}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleGradeSubmission(submission)}
                            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Grade submission"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {submission.submission_text && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {submission.submission_text}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isStudent && (
        <AssignmentSubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          assignment={assignment}
          onSuccess={() => {
            refetchAssignment();
            toast.success('Assignment submitted successfully!');
          }}
        />
      )}

      {isLecturer && (
        <AssignmentGradingModal
          isOpen={showGradingModal}
          onClose={() => setShowGradingModal(false)}
          submission={selectedSubmission}
          onGradeSuccess={handleGradeSuccess}
        />
      )}
    </div>
  );
};

export default AssignmentDetail;
