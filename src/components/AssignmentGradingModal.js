import React, { useState } from 'react';
import { X, FileText, Download, Star, MessageSquare, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { assignmentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const AssignmentGradingModal = ({ isOpen, onClose, submission, onGradeSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [grade, setGrade] = useState(submission?.grade || '');
  const [feedback, setFeedback] = useState(submission?.feedback || '');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!grade || grade < 0 || grade > submission.max_score) {
      toast.error(`Grade must be between 0 and ${submission.max_score}`);
      return;
    }

    setIsLoading(true);
    try {
      await assignmentsAPI.gradeSubmission(submission.id, {
        grade: parseInt(grade),
        feedback: feedback.trim()
      });

      toast.success('Grade submitted successfully!');
      onGradeSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit grade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGrade(submission?.grade || '');
    setFeedback(submission?.feedback || '');
    onClose();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isLate = submission?.submitted_at && new Date(submission.submitted_at) > new Date(submission.due_date);

  if (!isOpen || !submission) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Grade Assignment</h2>
              <p className="text-sm text-gray-600">
                {submission.assignment_title} - {submission.first_name} {submission.last_name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Student Submission */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Submission</h3>

              {/* Student Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Student:</span>
                    <p className="text-gray-900">{submission.first_name} {submission.last_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Index:</span>
                    <p className="text-gray-900">{submission.student_index || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{submission.email}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Submitted:</span>
                    <p className="text-gray-900">{formatDate(submission.submitted_at)}</p>
                  </div>
                </div>
                {isLate && (
                  <div className="mt-3 flex items-center text-red-600">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Late Submission</span>
                  </div>
                )}
              </div>

              {/* Submission Text */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Submission Text</h4>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">
                  {submission.submission_text || 'No text submission provided.'}
                </div>
              </div>

              {/* File Attachment */}
              {submission.submission_file_url && (
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Attached File</h4>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1 min-w-[200px]">
                        <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-blue-900 truncate">
                            {submission.submission_filename || 'Submission File'}
                          </p>
                          <p className="text-xs text-blue-600">
                            {submission.submission_file_size ? `${(submission.submission_file_size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0 mt-2 sm:mt-0">
                        <button
                          onClick={() => window.open(submission.submission_file_url, '_blank')}
                          className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = submission.submission_file_url;
                            link.download = submission.submission_filename || 'submission_file';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grading Form */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Grade Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade (0 - {submission.max_score})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={submission.max_score}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Enter grade"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      / {submission.max_score}
                    </div>
                  </div>
                  {grade && (
                    <div className="mt-2 text-sm text-gray-600">
                      Percentage: {Math.round((grade / submission.max_score) * 100)}%
                    </div>
                  )}
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Provide feedback to the student..."
                  />
                </div>

                {/* Assignment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Assignment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="text-gray-900">{formatDate(submission.due_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Score:</span>
                      <span className="text-gray-900">{submission.max_score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class:</span>
                      <span className="text-gray-900">{submission.class_name}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !grade}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Grading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Submit Grade
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentGradingModal;

