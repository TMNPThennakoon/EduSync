import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { X, BookOpen } from 'lucide-react';
import { classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CreateClassModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm();

  // Set default department when modal opens
  useEffect(() => {
    if (isOpen && user?.department) {
      setValue('department', user.department);
    }
  }, [isOpen, user?.department, setValue]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await classesAPI.create(data);
      console.log('Class created successfully:', response.data);
      toast.success('Class created successfully!');
      reset();
      onClose();
      
      // Invalidate and refetch all classes-related queries
      // This ensures both the Classes page and Dashboard are updated
      await queryClient.invalidateQueries(['classes'], { exact: false });
      await queryClient.invalidateQueries(['lecturer-classes'], { exact: false });
      await queryClient.invalidateQueries(['classes', 'lecturer-classes'], { exact: false });
      
      // Force refetch all matching queries with a small delay to ensure backend is ready
      setTimeout(async () => {
        await queryClient.refetchQueries(['classes'], { exact: false });
        await queryClient.refetchQueries(['lecturer-classes'], { exact: false });
        console.log('Queries invalidated and refetched');
      }, 100);
      
      // Also call onSuccess callback as a backup
      if (onSuccess) {
        setTimeout(() => {
          console.log('Calling onSuccess callback...');
          onSuccess();
        }, 200);
      }
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error(error.response?.data?.error || 'Failed to create class');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.role === 'admin' ? 'Create Class for Department' : 'Create New Class'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Class Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Name *
            </label>
            <input
              {...register('name', {
                required: 'Class name is required',
                minLength: {
                  value: 3,
                  message: 'Class name must be at least 3 characters'
                }
              })}
              type="text"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="e.g., Digital Electronics Lab"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              {...register('subject', {
                required: 'Subject is required',
                minLength: {
                  value: 2,
                  message: 'Subject must be at least 2 characters'
                }
              })}
              type="text"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.subject ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="e.g., IAT201"
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <select
              {...register('department', {
                required: 'Department is required'
              })}
              disabled={user?.role !== 'admin'}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.department ? 'border-red-300' : 'border-gray-300'
                } ${user?.role !== 'admin' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select Department</option>
              <option value="AT">Agricultural Technology (AT)</option>
              <option value="ET">Environmental Technology (ET)</option>
              <option value="IAT">Instrumentation & Automation Engineering Technology (IAT)</option>
              <option value="ICT">Information & Communication Technology (ICT)</option>
              <option value="CS">Computer Science (CS)</option>
            </select>
            {errors.department && (
              <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
            )}
            {user?.role === 'admin' ? (
              <p className="mt-1 text-sm text-gray-500">Select which department this class is for</p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Department is automatically set based on your profile</p>
            )}
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year *
            </label>
            <select
              {...register('academic_year', {
                required: 'Academic year is required'
              })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.academic_year ? 'border-red-300' : 'border-gray-300'
                }`}
            >
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
            {errors.academic_year && (
              <p className="mt-1 text-sm text-red-600">{errors.academic_year.message}</p>
            )}
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester *
            </label>
            <select
              {...register('semester', {
                required: 'Semester is required'
              })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.semester ? 'border-red-300' : 'border-gray-300'
                }`}
            >
              <option value="">Select Semester</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>
            {errors.semester && (
              <p className="mt-1 text-sm text-red-600">{errors.semester.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Optional class description..."
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-medium"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Class'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClassModal;
