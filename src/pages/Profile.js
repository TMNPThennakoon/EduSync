import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Lock, Save, Loader2, Phone, MapPin, Calendar, GraduationCap, Hash, CreditCard, Users, Edit, Eye, EyeOff, RefreshCw, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../components/ChangePasswordModal';
import StudentInfoCard from '../components/StudentInfoCard';
import ImagePreviewModal from '../components/ImagePreviewModal';

const Profile = () => {
  const { user, isLecturer, updateProfile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'card'
  const [profileImage, setProfileImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Function to get full department name
  const getDepartmentName = (departmentCode) => {
    const departments = {
      'AT': 'Agricultural Technology',
      'ET': 'Environmental Technology',
      'IAT': 'Instrumentation & Automation Engineering Technology',
      'ICT': 'Information & Communication Technology'
    };
    return departments[departmentCode] || departmentCode;
  };

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || ''
    }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await updateProfile(data);
      if (result.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    setIsLoading(true);
    try {
      const result = await refreshProfile();
      if (result.success) {
        toast.success('Profile data refreshed successfully');
        // Refresh profile image
        if (user?.id) {
          fetchProfileImage();
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfileImage = async () => {
    if (!user?.id) return;

    try {
      const response = await usersAPI.getImage(user.id);
      const imageUrl = response.data.imageUrl;

      if (imageUrl) {
        const fullImageUrl = imageUrl.startsWith('/')
          ? `http://localhost:5001${imageUrl}`
          : imageUrl;
        setProfileImage(fullImageUrl);
      } else {
        setProfileImage(null);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
      setProfileImage(null);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    const loadingToast = toast.loading('Uploading image...');
    setIsLoading(true);

    try {
      if (user?.id) {
        await usersAPI.uploadImage(user.id, formData);

        // Fetch the new image explicitly
        await fetchProfileImage();

        // Refresh global profile to update sidebar
        const result = await refreshProfile();

        if (result.success) {
          toast.success('Profile image updated successfully', { id: loadingToast });
        } else {
          toast.error('Image uploaded but profile refresh failed', { id: loadingToast });
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.error || 'Failed to upload profile image', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfileImage();
    }
  }, [user?.id]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={handleRefreshProfile}
              disabled={isLoading}
              className="btn btn-secondary flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('form')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'form'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Edit Form
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'card'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Detailed View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Image Header */}
      <div className="card">
        <div className="flex items-center space-x-6">
          <div className="relative">
            {profileImage ? (
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                onClick={() => setShowImagePreview(true)}
                title="Click to view full-size image"
              >
                <img
                  src={profileImage}
                  alt={`${user?.first_name} ${user?.last_name}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center border-4 border-blue-200">
                <span className="text-3xl font-semibold text-blue-600">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
            )}

            {user?.role === 'admin' && (
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 transition-colors border-4 border-white shadow-sm z-10 group">
                <Camera className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-gray-600">{user?.email}</p>
            <div className="mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                user?.role === 'lecturer' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {
        viewMode === 'card' ? (
          <StudentInfoCard user={user} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Profile Information */}
            <div className="lg:col-span-3 space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">User Account Information</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Editable Fields */}
                    <div>
                      <label htmlFor="first_name" className="label flex items-center">
                        <Edit className="h-4 w-4 mr-2 text-green-600" />
                        First Name
                        <span className="text-green-600 text-xs ml-1">(Editable)</span>
                      </label>
                      <input
                        {...register('first_name', {
                          required: 'First name is required',
                          minLength: {
                            value: 2,
                            message: 'First name must be at least 2 characters'
                          }
                        })}
                        type="text"
                        className={`input ${errors.first_name ? 'input-error' : ''}`}
                        placeholder="Enter your first name"
                      />
                      {errors.first_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="last_name" className="label flex items-center">
                        <Edit className="h-4 w-4 mr-2 text-green-600" />
                        Last Name
                        <span className="text-green-600 text-xs ml-1">(Editable)</span>
                      </label>
                      <input
                        {...register('last_name', {
                          required: 'Last name is required',
                          minLength: {
                            value: 2,
                            message: 'Last name must be at least 2 characters'
                          }
                        })}
                        type="text"
                        className={`input ${errors.last_name ? 'input-error' : ''}`}
                        placeholder="Enter your last name"
                      />
                      {errors.last_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                      )}
                    </div>

                    {/* Non-editable Fields */}
                    <div>
                      <label className="label flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        Gender
                        <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                      </label>
                      <input
                        type="text"
                        value={user?.gender || 'Not specified'}
                        className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    {!isLecturer && (
                      <>
                        <div>
                          <label className="label flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-gray-400" />
                            Academic Year
                            <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                          </label>
                          <input
                            type="text"
                            value={user?.academic_year ? `Year ${user.academic_year}` : 'Not specified'}
                            className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                            disabled
                          />
                        </div>

                        <div>
                          <label className="label flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-gray-400" />
                            Semester
                            <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                          </label>
                          <input
                            type="text"
                            value={user?.semester ? `Semester ${user.semester}` : 'Not specified'}
                            className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                            disabled
                          />
                        </div>

                        <div>
                          <label className="label flex items-center">
                            <Lock className="h-4 w-4 mr-2 text-gray-400" />
                            Student Index
                            <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                          </label>
                          <input
                            type="text"
                            value={user?.student_index || 'Not specified'}
                            className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                            disabled
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="label flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        Department
                        <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                      </label>
                      <input
                        type="text"
                        value={user?.department ? getDepartmentName(user.department) : 'Not specified'}
                        className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    {user?.role === 'lecturer' && user?.lecturer_id && (
                      <div>
                        <label className="label flex items-center">
                          <Lock className="h-4 w-4 mr-2 text-gray-400" />
                          Lecturer ID
                          <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                        </label>
                        <input
                          type="text"
                          value={user.lecturer_id}
                          className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                          disabled
                        />
                      </div>
                    )}

                    <div>
                      <label className="label flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        NIC Number
                        <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showSensitiveInfo ? "text" : "password"}
                          value={user?.nic || 'Not specified'}
                          className="input bg-gray-50 text-gray-600 cursor-not-allowed pr-10"
                          disabled
                        />
                        <button
                          type="button"
                          onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="label flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        Date of Birth
                        <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                      </label>
                      <input
                        type="text"
                        value={user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not specified'}
                        className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="label flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        Phone Number
                        <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                      </label>
                      <input
                        type="text"
                        value={user?.phone_number || 'Not specified'}
                        className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                        disabled
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-gray-400" />
                        Address
                        <span className="text-gray-500 text-xs ml-1">(Read-only)</span>
                      </label>
                      <textarea
                        value={user?.address || 'Not specified'}
                        className="input bg-gray-50 text-gray-600 cursor-not-allowed h-20 resize-none"
                        disabled
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <p>• Fields marked with <Edit className="inline h-3 w-3 text-green-600 mx-1" /> can be edited</p>
                        <p>• Fields marked with <Lock className="inline h-3 w-3 text-gray-400 mx-1" /> are read-only for security</p>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Security</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50">
                    <div className="flex items-center">
                      <Lock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Password</p>
                        <p className="text-sm text-gray-600">Last updated 30 days ago</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowChangePasswordModal(true)}
                      className="btn btn-secondary btn-sm"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Role</p>
                      <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Gender</p>
                      <p className="text-sm text-gray-600 capitalize">{user?.gender || 'Not specified'}</p>
                    </div>
                  </div>
                  {!isLecturer && (
                    <>
                      <div className="flex items-center">
                        <GraduationCap className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Academic Year</p>
                          <p className="text-sm text-gray-600">{user?.academic_year ? `Year ${user.academic_year}` : 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Semester</p>
                          <p className="text-sm text-gray-600">{user?.semester ? `Semester ${user.semester}` : 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Student Index</p>
                          <p className="text-sm text-gray-600">{user?.student_index || 'Not specified'}</p>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center">
                    <GraduationCap className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Department</p>
                      <p className="text-sm text-gray-600">{user?.department ? getDepartmentName(user.department) : 'Not specified'}</p>
                    </div>
                  </div>
                  {user?.role === 'lecturer' && user?.lecturer_id && (
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Lecturer ID</p>
                        <p className="text-sm text-gray-600">{user.lecturer_id}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">NIC Number</p>
                      <p className="text-sm text-gray-600">
                        {user?.nic ? (showSensitiveInfo ? user.nic : '••••••••••••') : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                      <p className="text-sm text-gray-600">
                        {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone Number</p>
                      <p className="text-sm text-gray-600">{user?.phone_number || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">{user?.address || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Member Since</p>
                      <p className="text-sm text-gray-600">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Account Status</p>
                      <p className={`text-sm font-medium ${user?.approval_status === 'approved' ? 'text-green-600' :
                        user?.approval_status === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                        {user?.approval_status ? user.approval_status.charAt(0).toUpperCase() + user.approval_status.slice(1) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )
      }

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={profileImage}
        studentName={`${user?.first_name} ${user?.last_name}`}
        altText={`${user?.first_name} ${user?.last_name} profile image`}
      />
    </div >
  );
};

export default Profile;
