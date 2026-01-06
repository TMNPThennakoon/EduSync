import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, User, Mail, GraduationCap, Hash, Calendar, MapPin, CreditCard, Phone, ArrowLeft, Camera, Upload, Video, CheckCircle, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import WebcamCapture from '../components/WebcamCapture';
import { uploadToCloudinary } from '../utils/cloudinary';

const Register = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { submitRegistration, sendOtp, verifyOtp } = useAuth();

  // State
  const role = searchParams.get('role');
  const googleData = location.state?.googleData;
  const [step, setStep] = useState(1); // 1: Auth (Email/OTP), 2: Details
  const [emailVerified, setEmailVerified] = useState(!!googleData);
  const [email, setEmail] = useState(googleData?.email || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(googleData?.profile_image_url || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(googleData?.profile_image_url || null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [isPreUploading, setIsPreUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      first_name: googleData?.first_name || '',
      last_name: googleData?.last_name || '',
    }
  });

  const password = watch('password');

  // Redirect if no role
  useEffect(() => {
    if (!role || (role !== 'student' && role !== 'lecturer')) {
      navigate('/role-selection');
    }
  }, [role, navigate]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Step Skip Logic
  useEffect(() => {
    if (googleData) {
      setStep(2); // Skip to details
    }
  }, [googleData]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingOtp(true);
    const result = await sendOtp(email);
    setIsSendingOtp(false);

    if (result.success) {
      setOtpSent(true);
      setOtpTimer(60); // 60 seconds cooldown
      toast.success('OTP sent to your email!');
    } else {
      toast.error(result.error);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsVerifyingOtp(true);
    const result = await verifyOtp(email, otp);
    setIsVerifyingOtp(false);

    if (result.success) {
      setEmailVerified(true);
      setStep(2);
      toast.success('Email verified successfully!');
    } else {
      toast.error(result.error);
    }
  };

  const handleWebcamCapture = (file) => {
    setSelectedImage(file);
    setUploadedImageUrl(null); // Reset uploaded URL to force upload of new image
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    setShowWebcam(false);
    toast.success('Photo captured! Please upload it now.');
  };

  const handlePreUpload = async () => {
    if (!selectedImage) return;

    setIsPreUploading(true);
    try {
      const response = await uploadToCloudinary(selectedImage);
      if (response.secure_url) {
        setUploadedImageUrl(response.secure_url);
        toast.success('Photo uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setIsPreUploading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      if (!uploadedImageUrl) {
        toast.error('Please capture and upload a profile photo');
        return;
      }

      const registrationData = {
        ...data,
        email, // Use state email (verified)
        role,
        profile_image_url: uploadedImageUrl,
        is_google_user: !!googleData
      };

      const result = await submitRegistration(registrationData);

      if (result.success) {
        toast.success('Registration submitted! Please wait for admin approval.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${role === 'lecturer' ? 'from-purple-50 via-white to-blue-50' : 'from-blue-50 via-white to-purple-50'}`}>
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${role === 'lecturer' ? 'from-purple-500 to-purple-600' : 'from-blue-500 to-blue-600'} rounded-full mb-4`}>
            {role === 'lecturer' ? <UserCheck className="w-8 h-8 text-white" /> : <GraduationCap className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 capitalize">
            {role} Registration
          </h1>
          <p className="text-gray-600">
            {step === 1 ? 'Verify your email to continue' : 'Complete your profile details'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Email Verification */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={otpSent}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your university email"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={otpSent || isSendingOtp || !email}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-[120px]"
                  >
                    {isSendingOtp ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                      placeholder="000000"
                      maxLength={6}
                    />
                    <div className="flex justify-between items-center text-sm">
                      <span className={otpTimer > 0 ? "text-gray-500" : "text-red-500"}>
                        {otpTimer > 0 ? `Resend code in 0:${otpTimer.toString().padStart(2, '0')}` : "Code expired?"}
                      </span>
                      {otpTimer === 0 && (
                        <button
                          onClick={handleSendOtp}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || otp.length !== 6}
                      className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-md"
                    >
                      {isVerifyingOtp ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'Verify & Continue'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details Form */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              {/* Basic Info */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input {...register('first_name', { required: 'Required', minLength: 2 })} className="w-full px-4 py-3 border rounded-lg" placeholder="John" />
                    {errors.first_name && <p className="text-red-500 text-sm mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input {...register('last_name', { required: 'Required', minLength: 2 })} className="w-full px-4 py-3 border rounded-lg" placeholder="Doe" />
                    {errors.last_name && <p className="text-red-500 text-sm mt-1">Required</p>}
                  </div>
                </div>

                {/* Email Read-only */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address (Verified)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="email" value={email} disabled className="w-full pl-10 pr-10 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo (Webcam Only) *</label>
                  <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-4"><Camera className="h-10 w-10 text-gray-400" /></div>
                    )}
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setShowWebcam(true)} className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                        <Video className="w-4 h-4 mr-2" /> {selectedImage ? 'Retake' : 'Capture'}
                      </button>
                      {selectedImage && !uploadedImageUrl && (
                        <button type="button" onClick={handlePreUpload} disabled={isPreUploading} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {isPreUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
                        </button>
                      )}
                    </div>
                    {uploadedImageUrl && <p className="text-green-600 text-sm mt-2 font-medium">✓ Photo uploaded</p>}
                  </div>
                </div>

                {/* Gender */}
                <div className="flex gap-6">
                  <label className="flex items-center"><input type="radio" value="male" {...register('gender', { required: true })} className="mr-2" /> Male</label>
                  <label className="flex items-center"><input type="radio" value="female" {...register('gender', { required: true })} className="mr-2" /> Female</label>
                </div>
                {errors.gender && <p className="text-red-500 text-sm">Gender is required</p>}
              </div>

              {/* Role Specific Fields */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{role === 'student' ? 'University' : 'Academic'} Information</h3>

                {role === 'student' ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Academic Year</label>
                        <select {...register('academic_year', { required: true })} className="w-full px-4 py-3 border rounded-lg">
                          <option value="">Select Year</option>
                          {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Semester</label>
                        <select {...register('semester', { required: true })} className="w-full px-4 py-3 border rounded-lg">
                          <option value="">Select Semester</option>
                          <option value="1">Semester 1</option>
                          <option value="2">Semester 2</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Student Index</label>
                      <input {...register('student_index', { required: true, pattern: /^[0-9]{4}[Tt][0-9]{5}$/ })} className="w-full px-4 py-3 border rounded-lg" placeholder="2022T01359" />
                      {errors.student_index && <p className="text-red-500 text-sm">Format: 2022T01359</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Lecturer Type</label>
                        <select {...register('lecturer_type', { required: true })} className="w-full px-4 py-3 border rounded-lg">
                          <option value="">Select Type</option>
                          <option value="senior">Senior Lecturer</option>
                          <option value="assistant">Assistant Lecturer</option>
                          <option value="visiting">Visiting Lecturer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Lecturer ID</label>
                        <input {...register('lecturer_id', { required: true, pattern: /^[A-Z]{2,3}[0-9]{3,4}$/ })} className="w-full px-4 py-3 border rounded-lg" placeholder="CS001" />
                        {errors.lecturer_id && <p className="text-red-500 text-sm">Format: CS001</p>}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select {...register('department', { required: true })} className="w-full px-4 py-3 border rounded-lg">
                    <option value="">Select Department</option>
                    <option value="AT">Department of Agricultural Technology (AT)</option>
                    <option value="ET">Department of Environmental Technology (ET)</option>
                    <option value="IAT">Department of Instrumentation & Automation Engineering Technology (IAT)</option>
                    <option value="ICT">Department of Information & Communication Technology (ICT)</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">NIC Number</label>
                    <input {...register('nic', { required: true, pattern: /^([0-9]{9}[VvXx]|[0-9]{12})$/ })} className="w-full px-4 py-3 border rounded-lg" placeholder="NIC Number" />
                    {errors.nic && <p className="text-red-500 text-sm">Invalid NIC format</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <input {...register('phone_number', { required: true, minLength: 10 })} className="w-full px-4 py-3 border rounded-lg" placeholder="+9477..." />
                  </div>
                </div>

                {role === 'student' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Date of Birth</label>
                    <input type="date" {...register('date_of_birth', { required: true })} className="w-full px-4 py-3 border rounded-lg" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <textarea {...register('address', { required: true, minLength: 10 })} rows={3} className="w-full px-4 py-3 border rounded-lg" placeholder="Full Address"></textarea>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Security</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { required: true, minLength: 6 })}
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9">
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                    {errors.password && <p className="text-red-500 text-sm">Min 6 chars</p>}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', {
                        required: true,
                        validate: v => v === password || 'Passwords mismatch'
                      })}
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-9">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                    {errors.confirmPassword && <p className="text-red-500 text-sm">Passwords mismatch</p>}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !uploadedImageUrl}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : 'Create Account'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/role-selection')} className="text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center mx-auto">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Role Selection
            </button>
          </div>
        </div>
      </div>

      <WebcamCapture
        isOpen={showWebcam}
        onCapture={handleWebcamCapture}
        onClose={() => setShowWebcam(false)}
        title="Capture Profile Photo"
      />
    </div>
  );
};

export default Register;
