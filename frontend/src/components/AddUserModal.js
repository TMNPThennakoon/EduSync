import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Mail, Lock, Building, GraduationCap, UserCheck } from 'lucide-react';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const watchRole = watch('role');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset();
      setSelectedRole('student');
      setValue('role', 'student', { shouldValidate: true });
    }
  }, [isOpen, reset, setValue]);

  // Update selectedRole when form role changes
  useEffect(() => {
    if (watchRole) {
      setSelectedRole(watchRole);
    }
  }, [watchRole]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Set default password if not provided
      const userData = {
        ...data,
        password: data.password || 'password123', // Default password
        status: 'active' // Admin-created users are automatically active
      };

      await usersAPI.create(userData);
      toast.success(`${selectedRole === 'student' ? 'Student' : 'Lecturer'} created successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const getDepartmentOptions = () => {
    return [
      { value: 'AT', label: 'Agricultural Technology (AT)' },
      { value: 'ET', label: 'Environmental Technology (ET)' },
      { value: 'IAT', label: 'Instrumentation & Automation Engineering Technology (IAT)' },
      { value: 'ICT', label: 'Information & Communication Technology (ICT)' }
    ];
  };

  const getRoleIcon = (role) => {
    return role === 'student' ? <GraduationCap className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />;
  };

  const getRoleColor = (role) => {
    return role === 'student' ? 'text-green-600' : 'text-blue-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
              <p className="text-sm text-gray-500">Create a new student or lecturer account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              User Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setValue('role', 'student', { shouldValidate: true });
                  setSelectedRole('student');
                }}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedRole === 'student'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <GraduationCap className="h-6 w-6" />
                  <span className="font-medium">Student</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('role', 'lecturer', { shouldValidate: true });
                  setSelectedRole('lecturer');
                }}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedRole === 'lecturer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <UserCheck className="h-6 w-6" />
                  <span className="font-medium">Lecturer</span>
                </div>
              </button>
            </div>
            <input
              type="hidden"
              {...register('role', { required: 'Role is required' })}
            />
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  {...register('first_name', { required: 'First name is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter first name"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  {...register('last_name', { required: 'Last name is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter last name"
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                {...register('department', { required: 'Department is required' })}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select Department</option>
                {getDepartmentOptions().map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.department && (
              <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
            )}
          </div>

          {/* Student-specific fields */}
          {selectedRole === 'student' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Student Index
              </label>
              <input
                type="text"
                {...register('student_index', { required: 'Student index is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter student index (e.g., 2021/ICT/001)"
              />
              {errors.student_index && (
                <p className="mt-1 text-sm text-red-600">{errors.student_index.message}</p>
              )}
            </div>
          )}

          {/* Lecturer-specific fields */}
          {selectedRole === 'lecturer' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lecturer ID
              </label>
              <input
                type="text"
                {...register('lecturer_id', { required: 'Lecturer ID is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter lecturer ID (e.g., LEC001)"
              />
              {errors.lecturer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.lecturer_id.message}</p>
              )}
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                {...register('password', { 
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter password (default: password123)"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to use default password: <span className="font-mono">password123</span>
            </p>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span>Create {selectedRole === 'student' ? 'Student' : 'Lecturer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
