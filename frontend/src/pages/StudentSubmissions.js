import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  BookOpen,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { assignmentsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const StudentSubmissions = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data, isLoading } = useQuery(
    ['student-submissions', { search: searchTerm, status: selectedStatus, userId: user?.id }],
    () => assignmentsAPI.getStudentSubmissions(user?.id, {
      search: searchTerm,
      status: selectedStatus
    }),
    {
      enabled: !!user?.id,
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Error fetching student submissions:', error);
        toast.error('Failed to load submissions');
      }
    }
  );

  const submissions = data?.submissions || [];

  // Debug logging
  console.log('StudentSubmissions Render:', {
    isLoading,
    user: user?.id,
    dataExists: !!data,
    submissionsCount: submissions.length,
    submissionsData: submissions
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (!user) {
    return <div className="text-center py-12">Please log in to view submissions.</div>;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'graded':
        return <CheckCircle className="h-4 w-4" />;
      case 'late':
        return <AlertCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate, submittedAt) => {
    if (!submittedAt) return new Date(dueDate) < new Date();
    return new Date(submittedAt) > new Date(dueDate);
  };

  const SubmissionCard = ({ submission }) => {
    const isLate = isOverdue(submission.due_date, submission.submitted_at);
    const status = submission.grade !== null ? 'graded' : isLate ? 'late' : 'submitted';

    return (
      <div className="card hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {submission.assignment_title}
                </h3>
                <p className="text-sm text-gray-600">{submission.class_name}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {formatDate(submission.due_date)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Max Score: {submission.max_score}</span>
                </div>
                {submission.submitted_at && (
                  <div className="flex items-center space-x-1">
                    <span>Submitted: {formatDate(submission.submitted_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submission Text Preview */}
            {submission.submission_text && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Submission:</h4>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {submission.submission_text}
                </p>
              </div>
            )}

            {/* File Attachment */}
            {(submission.submission_filename || submission.submission_file) && (
              <div className="mb-4 flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {submission.submission_filename || submission.submission_file}
                </span>
                {submission.submission_file_url && (
                  <button
                    onClick={() => window.open(submission.submission_file_url, '_blank')}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    title="Download/View File"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Grade and Feedback */}
            {submission.grade !== null && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Grade & Feedback</h4>
                    <p className="text-xs text-green-600">
                      {submission.class_name} - {submission.subject}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-green-600">
                      {submission.grade}/{submission.max_score}
                    </span>
                    <span className="text-sm text-green-600">
                      ({Math.round((submission.grade / submission.max_score) * 100)}%)
                    </span>
                  </div>
                </div>
                {submission.feedback && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-green-700 mb-1">Feedback:</p>
                    <p className="text-sm text-green-700 bg-white p-2 rounded border">{submission.feedback}</p>
                  </div>
                )}
                <p className="text-xs text-green-600 mt-2">
                  Graded on: {formatDate(submission.graded_at)}
                </p>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                <span className="ml-1 capitalize">{status}</span>
              </span>
              {isLate && (
                <span className="text-xs text-red-600 font-medium">Late Submission</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-gray-600">View your submitted assignments and grades</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="late">Late</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
              }}
              className="btn btn-secondary w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Submissions */}
      <div>
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedStatus
                ? 'Try adjusting your search criteria.'
                : 'You haven\'t submitted any assignments yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSubmissions;
