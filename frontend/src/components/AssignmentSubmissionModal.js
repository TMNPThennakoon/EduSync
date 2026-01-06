import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Upload, FileText, Clock, AlertCircle } from 'lucide-react';
import { assignmentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const AssignmentSubmissionModal = ({ isOpen, onClose, assignment, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      let submissionParams = {};

      if (selectedFile) {
        const { supabase } = await import('../utils/supabase');
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `submission-${assignment.id}-${Date.now()}.${fileExt}`;
        const filePath = `submissions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        submissionParams = {
          submission_file_url: publicUrl,
          submission_filename: selectedFile.name,
          submission_file_size: selectedFile.size
        };
      }

      await assignmentsAPI.submitAssignment({
        assignment_id: assignment.id,
        submission_text: data.submission_text,
        ...submissionParams
      });

      toast.success('Assignment submitted successfully!');
      reset();
      setSelectedFile(null);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || error.response?.data?.error || 'Failed to submit assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedFile(null);
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isOverdue = new Date(assignment?.due_date) < new Date();

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Submit Assignment</h2>
              <p className="text-sm text-gray-600">{assignment.title}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Assignment Details */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900">Class</h3>
              <p className="text-sm text-gray-600">{assignment.class_name} - {assignment.subject}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Type</h3>
              <p className="text-sm text-gray-600 capitalize">{assignment.assignment_type}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Max Score</h3>
              <p className="text-sm text-gray-600">{assignment.max_score} points</p>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <h3 className="font-medium text-gray-900">Due Date</h3>
                <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                  {formatDate(assignment.due_date)}
                  {isOverdue && <span className="ml-2 text-red-600 font-medium">(Overdue)</span>}
                </p>
              </div>
            </div>
          </div>

          {assignment.description && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-900">Description</h3>
              <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
            </div>
          )}
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Submission Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submission Text *
            </label>
            <textarea
              {...register('submission_text', {
                required: 'Submission text is required',
                minLength: {
                  value: 10,
                  message: 'Submission must be at least 10 characters'
                }
              })}
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.submission_text ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Describe your solution, approach, or any additional notes..."
            />
            {errors.submission_text && (
              <p className="mt-1 text-sm text-red-600">{errors.submission_text.message}</p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach File (Optional)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB
                </p>
              </div>
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2" />
                <span>{selectedFile.name}</span>
                <span className="ml-2 text-gray-400">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>

          {/* Overdue Warning */}
          {isOverdue && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-sm text-red-700">
                This assignment is overdue. Late submissions may affect your grade.
              </span>
            </div>
          )}

          {/* Buttons */}
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
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentSubmissionModal;





