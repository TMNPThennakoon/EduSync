import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Mail, Phone, MapPin, Calendar, CreditCard, GraduationCap, UserCheck } from 'lucide-react';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const EditUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const watchRole = watch('role');

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen && user) {
      setSelectedRole(user.role);
      // Pre-populate form with existing user data
      const formData = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || '',
        department: user.department || '',
        gender: (user.gender || '').toLowerCase(),
        academic_year: user.academic_year ? String(user.academic_year) : '',
        semester: user.semester ? String(user.semester) : '',
        student_index: user.index_no || user.student_index || '',
        lecturer_id: user.lecturer_id || '',
        lecturer_type: user.type || user.lecturer_type || '', // Note: Backend column is 'type' usually for lecturer type? Let's check userController. 
        // Controller returns 'type'. So we should map that too.
        lecturer_type: user.type || user.lecturer_type || '',
        nic: user.nic || '',
        phone_number: user.phone || user.phone_number || '',
        address: user.address || '',
        date_of_birth: (user.dob || user.date_of_birth) ? ((user.dob || user.date_of_birth).toString().includes('T') ? (user.dob || user.date_of_birth).toString().split('T')[0] : (user.dob || user.date_of_birth)) : ''
      };
      reset(formData);
    }
  }, [isOpen, user, reset]);

  // Update selectedRole when form role changes
  useEffect(() => {
    if (watchRole) {
      setSelectedRole(watchRole);
    }
  }, [watchRole]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Transform data to ensure correct types and formats
      const transformedData = {
        ...data,
        academic_year: data.academic_year ? parseInt(data.academic_year) : undefined,
        semester: data.semester ? parseInt(data.semester) : undefined,
        // Convert date from MM/DD/YYYY to YYYY-MM-DD format
        date_of_birth: data.date_of_birth ? (() => {
          if (data.date_of_birth.includes('/')) {
            // Convert MM/DD/YYYY to YYYY-MM-DD
            const [month, day, year] = data.date_of_birth.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return data.date_of_birth;
        })() : undefined
      };

      // Clean up empty strings to avoid backend validation errors
      Object.keys(transformedData).forEach(key => {
        if (transformedData[key] === '' || transformedData[key] === null) {
          delete transformedData[key];
        }
      });

      // Remove irrelevant fields based on role
      if (data.role === 'student') {
        delete transformedData.lecturer_id;
        delete transformedData.lecturer_type;
      } else if (data.role === 'lecturer') {
        delete transformedData.academic_year;
        delete transformedData.semester;
        delete transformedData.student_index;
      }

      console.log('Form data being sent:', transformedData);
      await usersAPI.update(user.id, transformedData);
      toast.success(`${selectedRole === 'student' ? 'Student' : 'Lecturer'} updated successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Update error:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to update user');
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

  const getAcademicYearOptions = () => {
    return [
      { value: '1', label: '1st Year' },
      { value: '2', label: '2nd Year' },
      { value: '3', label: '3rd Year' },
      { value: '4', label: '4th Year' }
    ];
  };

  const getSemesterOptions = () => {
    return [
      { value: '1', label: '1st Semester' },
      { value: '2', label: '2nd Semester' }
    ];
  };

  const getLecturerTypeOptions = () => {
    return [
      { value: 'senior', label: 'Senior Lecturer' },
      { value: 'assistant', label: 'Assistant Lecturer' },
      { value: 'visiting', label: 'Visiting Lecturer' },
      { value: 'temporary', label: 'Temporary Lecturer' },
      { value: 'permanent', label: 'Permanent Lecturer (In University)' }
    ];
  };

  const validateNIC = (value) => {
    if (!value) return true; // Optional field
    const nicRegex = /^(\d{9}[VvXx]|\d{12})$/;
    return nicRegex.test(value) || 'Invalid NIC format (e.g., 123456789V or 200123456789)';
  };

  const validatePhone = (value) => {
    if (!value) return true; // Optional field
    const phoneRegex = /^\+94\d{9}$/;
    return phoneRegex.test(value) || 'Invalid phone format (e.g., +94771234567)';
  };

  const validateDateOfBirth = (value) => {
    if (!value) return true; // Optional field
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return 'Invalid date format (yyyy-mm-dd)';

    const date = new Date(value);
    const today = new Date();
    if (date > today) return 'Date of birth cannot be in the future';

    const age = today.getFullYear() - date.getFullYear();
    if (age < 16 || age > 100) return 'Age must be between 16 and 100 years';

    return true;
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
              <p className="text-sm text-gray-500">
                Update {user.first_name} {user.last_name}'s information
              </p>
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Basic Information</span>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Role
                </label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Select Department</option>
                  {getDepartmentOptions().map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Gender *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  {...register('gender', { required: 'Gender is required' })}
                  value="male"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Male</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  {...register('gender', { required: 'Gender is required' })}
                  value="female"
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Female</span>
              </label>
            </div>
            {errors.gender && (
              <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
            )}
          </div>

          {/* Student-specific fields */}
          {selectedRole === 'student' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>University Information</span>
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Student Index
                </label>
                <input
                  type="text"
                  {...register('student_index', {
                    required: selectedRole === 'student' ? 'Student index is required' : false
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter student index (e.g., 2024/ICT/001)"
                />
                {errors.student_index && (
                  <p className="mt-1 text-sm text-red-600">{errors.student_index.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Academic Year *
                  </label>
                  <select
                    {...register('academic_year', {
                      required: selectedRole === 'student' ? 'Academic year is required' : false
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select Academic Year</option>
                    {getAcademicYearOptions().map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                  {errors.academic_year && (
                    <p className="mt-1 text-sm text-red-600">{errors.academic_year.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Semester *
                  </label>
                  <select
                    {...register('semester', {
                      required: selectedRole === 'student' ? 'Semester is required' : false
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select Semester</option>
                    {getSemesterOptions().map((sem) => (
                      <option key={sem.value} value={sem.value}>
                        {sem.label}
                      </option>
                    ))}
                  </select>
                  {errors.semester && (
                    <p className="mt-1 text-sm text-red-600">{errors.semester.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lecturer-specific fields */}
          {selectedRole === 'lecturer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <UserCheck className="h-5 w-5" />
                <span>Lecturer Information</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lecturer ID
                  </label>
                  <input
                    type="text"
                    {...register('lecturer_id', {
                      required: selectedRole === 'lecturer' ? 'Lecturer ID is required' : false
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter lecturer ID (e.g., LEC001)"
                  />
                  {errors.lecturer_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.lecturer_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Lecturer Type *
                  </label>
                  <select
                    {...register('lecturer_type', {
                      required: selectedRole === 'lecturer' ? 'Lecturer type is required' : false
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select Lecturer Type</option>
                    {getLecturerTypeOptions().map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.lecturer_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.lecturer_type.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Personal Details</span>
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NIC Number *
              </label>
              <input
                type="text"
                {...register('nic', {
                  required: false,
                  validate: validateNIC
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter NIC (e.g., 123456789V or 200123456789)"
              />
              {errors.nic && (
                <p className="mt-1 text-sm text-red-600">{errors.nic.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    {...register('phone_number', {
                      required: false,
                      validate: validatePhone
                    })}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="+94771234567"
                  />
                </div>
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                )}
              </div>

              {selectedRole === 'student' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      {...register('date_of_birth', {
                        required: selectedRole === 'student' ? 'Date of birth is required' : false,
                        validate: validateDateOfBirth
                      })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  {errors.date_of_birth && (
                    <p className="mt-1 text-sm text-red-600">{errors.date_of_birth.message}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  {...register('address', { required: false })}
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Enter full address"
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>
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
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  <span>Update {selectedRole === 'student' ? 'Student' : 'Lecturer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
