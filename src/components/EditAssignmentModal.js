import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, BookOpen } from 'lucide-react';
import { assignmentsAPI, classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const EditAssignmentModal = ({ isOpen, onClose, assignment, onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const watchDepartment = watch('department');

  // Set initial values when assignment changes
  useEffect(() => {
    if (assignment && isOpen) {
      setValue('title', assignment.title);
      setValue('description', assignment.description);
      setValue('max_score', assignment.max_score);
      setValue('due_date', new Date(assignment.due_date).toISOString().slice(0, 16));
      setValue('assignment_type', assignment.assignment_type);
      setValue('department', assignment.department);
      setValue('class_id', assignment.class_id);

      // Fetch classes for the assignment's department
      fetchClasses(assignment.department);
    }
  }, [assignment, isOpen, setValue]);

  // Fetch classes when department changes
  useEffect(() => {
    if (watchDepartment) {
      fetchClasses(watchDepartment);
    } else {
      setClasses([]);
    }
  }, [watchDepartment]);

  const fetchClasses = async (department) => {
    try {
      const response = await classesAPI.getAll({ department });
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      setClasses([]);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await assignmentsAPI.update(assignment.id, data);
      toast.success('Assignment updated successfully!');
      reset();
      setClasses([]);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setClasses([]);
    onClose();
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Edit Assignment</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignment Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Title *
              </label>
              <input
                {...register('title', {
                  required: 'Assignment title is required',
                  minLength: {
                    value: 3,
                    message: 'Title must be at least 3 characters'
                  }
                })}
                type="text"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="e.g., Digital Circuit Design Assignment"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Department *
              </label>
              <select
                {...register('department', {
                  required: 'Department is required'
                })}
                disabled={true}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-gray-100 cursor-not-allowed ${errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <option value={user?.department || ''}>
                  {user?.department === 'AT' && 'Department of Agricultural Technology (AT)'}
                  {user?.department === 'ET' && 'Department of Environmental Technology (ET)'}
                  {user?.department === 'IAT' && 'Department of Instrumentation & Automation Engineering Technology (IAT)'}
                  {user?.department === 'ICT' && 'Department of Information & Communication Technology (ICT)'}
                </option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Assignment belongs to your department: <span className="font-semibold">{user?.department}</span>
              </p>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                {...register('class_id', {
                  required: 'Class is required'
                })}
                disabled={!watchDepartment || classes.length === 0}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.class_id ? 'border-red-300' : 'border-gray-300'
                  } ${!watchDepartment || classes.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.subject}
                  </option>
                ))}
              </select>
              {errors.class_id && (
                <p className="mt-1 text-sm text-red-600">{errors.class_id.message}</p>
              )}
              {!watchDepartment && (
                <p className="mt-1 text-sm text-gray-500">Please select a department first</p>
              )}
            </div>

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Type *
              </label>
              <select
                {...register('assignment_type', {
                  required: 'Assignment type is required'
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.assignment_type ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <option value="">Select Type</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="exam">Exam</option>
                <option value="homework">Homework</option>
              </select>
              {errors.assignment_type && (
                <p className="mt-1 text-sm text-red-600">{errors.assignment_type.message}</p>
              )}
            </div>

            {/* Max Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Score *
              </label>
              <input
                {...register('max_score', {
                  required: 'Maximum score is required',
                  min: {
                    value: 1,
                    message: 'Score must be at least 1'
                  },
                  max: {
                    value: 100,
                    message: 'Score cannot exceed 100'
                  }
                })}
                type="number"
                min="0"
                max="100"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.max_score ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="100"
              />
              {errors.max_score && (
                <p className="mt-1 text-sm text-red-600">{errors.max_score.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                {...register('due_date', {
                  required: 'Due date is required'
                })}
                type="datetime-local"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.due_date ? 'border-red-300' : 'border-gray-300'
                  }`}
              />
              {errors.due_date && (
                <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Description *
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
                minLength: {
                  value: 10,
                  message: 'Description must be at least 10 characters'
                }
              })}
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Provide detailed instructions for the assignment..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssignmentModal;
