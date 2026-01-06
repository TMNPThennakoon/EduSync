import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, User, Mail, GraduationCap, Hash, Calendar, MapPin, CreditCard, Phone, ArrowLeft, Camera, Upload, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import WebcamCapture from '../components/WebcamCapture';
import { uploadToCloudinary } from '../utils/cloudinary';

const StudentRegister = () => {
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
      // Set role to student
      data.role = 'student';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Student Registration
          </h1>
          <p className="text-gray-600">
            Join as a university student
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      placeholder="Nayana"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.first_name ? 'border-red-300' : 'border-gray-300'
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
                      placeholder="Pabasara"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.last_name ? 'border-red-300' : 'border-gray-300'
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
                    placeholder="2022t0xxxx@stu.cmb.ac.lk"
                    style={{ opacity: 0.7 }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Profile Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo (Webcam Only) *
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowWebcam(true)}
                          className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          {selectedImage ? 'Retake Photo' : 'Capture Photo'}
                        </button>
                      </div>

                      {selectedImage && !uploadedImageUrl && (
                        <button
                          type="button"
                          onClick={handlePreUpload}
                          disabled={isPreUploading}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPreUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Photo Now
                            </>
                          )}
                        </button>
                      )}

                      {uploadedImageUrl && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Photo uploaded successfully
                        </div>
                      )}
                    </div>
                    {/* Error message if image not captured/uploaded when submitting? (Handled in onSubmit but good to hint) */}
                    {!selectedImage && (
                      <p className="text-xs text-red-500 mt-1">
                        * You must capture a photo using the webcam.
                      </p>
                    )}
                  </div>
                </div>
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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

            {/* University Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                University Information
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year *
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      {...register('academic_year', {
                        required: 'Academic year is required'
                      })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.academic_year ? 'border-red-300' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Select Academic Year</option>
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                    </select>
                  </div>
                  {errors.academic_year && (
                    <p className="mt-2 text-sm text-red-600">{errors.academic_year.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                    Semester *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      {...register('semester', {
                        required: 'Semester is required'
                      })}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.semester ? 'border-red-300' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Select Semester</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                    </select>
                  </div>
                  {errors.semester && (
                    <p className="mt-2 text-sm text-red-600">{errors.semester.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    {...register('department', {
                      required: 'Department is required'
                    })}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.department ? 'border-red-300' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select Department</option>
                    <option value="AT">Department of Agricultural Technology (AT)</option>
                    <option value="ET">Department of Environmental Technology (ET)</option>
                    <option value="IAT">Department of Instrumentation & Automation Engineering Technology (IAT)</option>
                    <option value="ICT">Department of Information & Communication Technology (ICT)</option>
                  </select>
                </div>
                {errors.department && (
                  <p className="mt-2 text-sm text-red-600">{errors.department.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="student_index" className="block text-sm font-medium text-gray-700 mb-2">
                    Student Index *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('student_index', {
                        required: 'Student index is required',
                        pattern: {
                          value: /^[0-9]{4}[Tt][0-9]{5}$/,
                          message: 'Invalid student index format (e.g., 2022T01359)'
                        }
                      })}
                      type="text"
                      placeholder="2022T01359"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.student_index ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.student_index && (
                    <p className="mt-2 text-sm text-red-600">{errors.student_index.message}</p>
                  )}
                </div>

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
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.nic ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.nic && (
                    <p className="mt-2 text-sm text-red-600">{errors.nic.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      {...register('date_of_birth', {
                        required: 'Date of birth is required'
                      })}
                      type="date"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.date_of_birth ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.date_of_birth && (
                    <p className="mt-2 text-sm text-red-600">{errors.date_of_birth.message}</p>
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
                          value: /^[0-9+\-\s()]+$/,
                          message: 'Invalid phone number format'
                        },
                        minLength: { value: 10, message: 'Phone number must be at least 10 characters' }
                      })}
                      type="tel"
                      placeholder="+94 77 123 4567"
                      style={{ opacity: 0.7 }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.phone_number ? 'border-red-300' : 'border-gray-300'
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
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${errors.address ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                </div>
                {errors.address && (
                  <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>
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
                      placeholder="Enter your password"
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.password ? 'border-red-300' : 'border-gray-300'
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
                      placeholder="Confirm your password"
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
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
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Creating Account...
                  </div>
                ) : (
                  'Create Student Account'
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

export default StudentRegister;
