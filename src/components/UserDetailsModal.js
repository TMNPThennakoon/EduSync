import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Calendar, MapPin, Phone, CreditCard, Hash, GraduationCap, UserCheck, Eye, Camera, Loader } from 'lucide-react';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const UserDetailsModal = ({ isOpen, onClose, user, userImage, onImageClick, onUserUpdated }) => {
  const [currentImage, setCurrentImage] = useState(userImage);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setCurrentImage(userImage);
  }, [userImage]);

  if (!isOpen || !user) return null;

  console.log('UserDetailsModal received user data:', user);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <UserCheck className="h-5 w-5 text-red-600" />;
      case 'lecturer':
        return <UserCheck className="h-5 w-5 text-blue-600" />;
      case 'student':
        return <GraduationCap className="h-5 w-5 text-green-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'lecturer':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    console.log('Starting upload for User ID:', user?.id);

    try {
      if (!user?.id) {
        throw new Error('User ID is missing');
      }

      const response = await usersAPI.uploadImage(user.id, formData);
      console.log('Upload response:', response);
      setCurrentImage(response.data.imageUrl);
      toast.success('Profile image updated successfully');
      if (onUserUpdated) onUserUpdated();
    } catch (error) {
      console.error('Upload error details:', {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        response: {
          status: error.response?.status,
          data: error.response?.data
        }
      });
      toast.error(error.response?.data?.error || 'Failed to update profile image');
    } finally {
      setIsUploading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `http://localhost:5001${url}`;
    // If it's a raw filename or something else that's not a full URL or absolute path, handle gracefully
    return null;
  };

  const displayImage = currentImage ? getImageUrl(currentImage) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-xl font-semibold text-gray-900">
              User Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* User Info Header */}
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <div
                  className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-md cursor-pointer relative"
                  onClick={() => onImageClick ? onImageClick(displayImage, `${user.first_name} ${user.last_name}`) : null}
                >
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={`${user.first_name}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-500 text-2xl font-bold">
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                  )}

                  {/* Upload Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                      <Loader className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                {/* Edit Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                  title="Change Profile Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <div className="flex items-center space-x-2 mt-2">
                  {getRoleIcon(user.role)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                    {user.role.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.is_approved
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {user.is_approved ? 'Active' : 'Pending Approval'}
                  </span>
                </div>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b pb-2">Basic Information</h4>

                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
                    <p className="text-sm text-gray-900 font-medium break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Date of Birth</p>
                    <p className="text-sm text-gray-900 font-medium">{formatDate(user.dob || user.date_of_birth)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Gender</p>
                    <p className="text-sm text-gray-900 font-medium capitalize">{user.gender || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
                    <p className="text-sm text-gray-900 font-medium">{user.phone || user.phone_number || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">NIC</p>
                    <p className="text-sm text-gray-900 font-medium">{user.nic || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Academic/Professional Information */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b pb-2">
                  {user.role === 'student' ? 'Academic Information' : 'Professional Information'}
                </h4>

                {user.role === 'student' && (
                  <>
                    <div className="flex items-start space-x-3">
                      <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Student Index</p>
                        <p className="text-sm text-gray-900 font-medium">{user.index_no || user.student_index || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <GraduationCap className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Academic Year</p>
                        <p className="text-sm text-gray-900 font-medium">{user.academic_year ? `Year ${user.academic_year}` : 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Semester</p>
                        <p className="text-sm text-gray-900 font-medium">{user.semester || 'Not provided'}</p>
                      </div>
                    </div>
                  </>
                )}

                {user.role === 'lecturer' && (
                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Lecturer ID</p>
                      <p className="text-sm text-gray-900 font-medium">{user.lecturer_id || 'Not provided'}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <UserCheck className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Department</p>
                    <p className="text-sm text-gray-900 font-medium">{user.department || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Joined</p>
                    <p className="text-sm text-gray-900 font-medium">{formatDate(user.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                  <p className="text-sm text-gray-900 font-medium">{user.address || 'Not provided'}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
