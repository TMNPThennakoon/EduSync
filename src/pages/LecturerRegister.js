import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, User, Mail, Hash, MapPin, CreditCard, Phone, ArrowLeft, UserCheck, Camera, Upload, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import WebcamCapture from '../components/WebcamCapture';
import { uploadToCloudinary } from '../utils/cloudinary';

const LecturerRegister = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [isPreUploading, setIsPreUploading] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const { submitRegistration } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm();

  const password = watch('password');

  // Removed processImageFile and handleImageChange as they are no longer needed
  // Only webcam capture is allowed

  const handleWebcamCapture = (file) => {
    setSelectedImage(file);
    setUploadedImageUrl(null);
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setShowWebcam(false);
    toast.success('Photo captured! Please upload it now.');
  };

  const handlePreUpload = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setIsPreUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      console.log('Uploading image:', {
        name: selectedImage.name,
        size: selectedImage.size,
        type: selectedImage.type
      });

      const response = await uploadToCloudinary(selectedImage);
      // Cloudinary returns secure_url
      const imageUrl = response.secure_url;
      console.log('Upload response:', response);

      if (imageUrl) {
        setUploadedImageUrl(imageUrl);
        toast.success('Photo uploaded successfully! You can now create your account.');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Pre-upload failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorData = error.response?.data?.error;
      const errorMessage = (typeof errorData === 'string' ? errorData : errorData?.message) ||
        error.message ||
        'Photo upload failed. Please try again.';

      toast.error(errorMessage);
    } finally {
      setIsPreUploading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Set role to lecturer
      data.role = 'lecturer';

      if (!uploadedImageUrl) {
        toast.error('Please capture and upload a profile photo first');
        return;
      }

      // Include pre-uploaded image URL if available
      if (uploadedImageUrl) {
        data.profile_image_url = uploadedImageUrl;
      }

      const result = await submitRegistration(data);

      if (result.success) {
        toast.success('Registration submitted! Please wait for admin approval.');

        // Auto-redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mb-4">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Lecturer Registration
          </h1>
          <p className="text-gray-600">
            Join as a university lecturer
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            {/* Hidden dummy fields to prevent autofill */}
            <div style={{ display: 'none' }}>
              <input type="text" name="fake-email" autoComplete="off" />
              <input type="password" name="fake-password" autoComplete="off" />
            </div>
            {/* Basic Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Basic Information
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('first_name', {
                        required: 'First name is required',
                        minLength: { value: 2, message: 'First name must be at least 2 characters' }
                      })}
                      type="text"
                      placeholder="Dr. John"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.first_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.first_name && (
                    <p className="mt-2 text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('last_name', {
                        required: 'Last name is required',
                        minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                      })}
                      type="text"
                      placeholder="Smith"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.last_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.last_name && (
                    <p className="mt-2 text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    placeholder="john.smith@university.edu"
                    style={{ opacity: 0.7 }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Gender *
                </label>
                <div className="flex space-x-6">
                  <div className="flex items-center">
                    <input
                      {...register('gender', {
                        required: 'Gender is required'
                      })}
                      type="radio"
                      value="male"
                      id="male"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor="male" className="ml-2 text-sm text-gray-700">
                      Male
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      {...register('gender', {
                        required: 'Gender is required'
                      })}
                      type="radio"
                      value="female"
                      id="female"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <label htmlFor="female" className="ml-2 text-sm text-gray-700">
                      Female
                    </label>
                  </div>
                </div>
                {errors.gender && (
                  <p className="mt-2 text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>
            </div>

            {/* Profile Photo Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Profile Photo
              </h3>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200 shadow-lg">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-100 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex justify-center space-x-3">
                    <div className="flex justify-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowWebcam(true)}
                        className="inline-flex items-center px-6 py-3 border-2 border-purple-500 text-purple-700 font-medium rounded-lg hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <Video className="h-5 w-5 mr-2" />
                        {selectedImage ? 'Retake Photo' : 'Capture Photo'}
                      </button>
                    </div>
                  </div>
                  {/* Removed validation message since webcam is enforced, but handled in validation */}
                  {/* File input removed */}

                  {selectedImage && !uploadedImageUrl && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handlePreUpload}
                        disabled={isPreUploading}
                        className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPreUploading ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 mr-2" />
                            Upload Photo Now
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {uploadedImageUrl && (
                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Photo uploaded successfully
                    </div>
                  )}

                  <p className="mt-2 text-sm text-gray-500">
                    JPG, PNG, GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Lecturer Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Lecturer Information
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="lecturer_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Lecturer Type *
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      {...register('lecturer_type', {
                        required: 'Lecturer type is required'
                      })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.lecturer_type ? 'border-red-300' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Select Lecturer Type</option>
                      <option value="senior">Senior Lecturer</option>
                      <option value="assistant">Assistant Lecturer</option>
                      <option value="visiting">Visiting Lecturer</option>
                      <option value="temporary">Temporary Lecturer</option>
                      <option value="permanent">Permanent Lecturer (In University)</option>
                    </select>
                  </div>
                  {errors.lecturer_type && (
                    <p className="mt-2 text-sm text-red-600">{errors.lecturer_type.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lecturer_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Lecturer ID *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('lecturer_id', {
                        required: 'Lecturer ID is required',
                        pattern: {
                          value: /^[A-Z]{2,3}[0-9]{3,4}$/,
                          message: 'Invalid lecturer ID format (e.g., CS001, MAT1234)'
                        }
                      })}
                      type="text"
                      placeholder="CS001"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.lecturer_id ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.lecturer_id && (
                    <p className="mt-2 text-sm text-red-600">{errors.lecturer_id.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="nic" className="block text-sm font-medium text-gray-700 mb-2">
                    NIC Number *
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('nic', {
                        required: 'NIC is required',
                        pattern: {
                          value: /^([0-9]{9}[VvXx]|[0-9]{12})$/,
                          message: 'Invalid NIC format (Old: 345677888V or New: 200123456789)'
                        }
                      })}
                      type="text"
                      placeholder="345677888V or 200123456789"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.nic ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.nic && (
                    <p className="mt-2 text-sm text-red-600">{errors.nic.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('phone_number', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^\+94\d{9}$/,
                          message: 'Invalid phone number format (e.g., +94771234567)'
                        }
                      })}
                      type="tel"
                      placeholder="+94771234567"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.phone_number ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.phone_number && (
                    <p className="mt-2 text-sm text-red-600">{errors.phone_number.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    {...register('address', {
                      required: 'Address is required',
                      minLength: { value: 10, message: 'Address must be at least 10 characters' }
                    })}
                    rows={3}
                    placeholder="123 University Road, Colombo 03"
                    style={{ opacity: 0.7 }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none ${errors.address ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                </div>
                {errors.address && (
                  <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  {...register('department', {
                    required: 'Department is required'
                  })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.department ? 'border-red-300' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select Department</option>
                  <option value="AT">Department of Agricultural Technology (AT)</option>
                  <option value="ET">Department of Environmental Technology (ET)</option>
                  <option value="IAT">Department of Instrumentation & Automation Engineering Technology (IAT)</option>
                  <option value="ICT">Department of Information & Communication Technology (ICT)</option>
                </select>
                {errors.department && (
                  <p className="mt-2 text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Security
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                      })}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder="Enter your password"
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.password ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: value => value === password || 'Passwords do not match'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder="Confirm your password"
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || isPreUploading}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Submitting Application...
                  </div>
                ) : (
                  'Submit Lecturer Application'
                )}
              </button>
            </div>
          </form>

          {/* Back to Role Selection */}
          <div className="text-center mt-6">
            <Link
              to="/role-selection"
              className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Role Selection
            </Link>
          </div>
        </div>
      </div>

      {/* Webcam Capture Modal */}
      <WebcamCapture
        isOpen={showWebcam}
        onCapture={handleWebcamCapture}
        onClose={() => setShowWebcam(false)}
        title="Capture Profile Photo with Webcam"
      />
    </div>
  );
};

export default LecturerRegister;
