import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm();

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });

      if (result.success) {
        toast.success('Password changed successfully!');
        reset();
        onClose();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (error) {
      const errorMessage = 'An error occurred while changing password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Lock className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
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
          {/* Error Message */}
          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                {...register('currentPassword', {
                  required: 'Current password is required'
                })}
                type={showCurrentPassword ? 'text' : 'password'}
                className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                type={showNewPassword ? 'text' : 'password'}
                className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.newPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your new password',
                  validate: value => value === newPassword || 'Passwords do not match'
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password Match Indicator */}
          {newPassword && confirmPassword && (
            <div className="flex items-center">
              {newPassword === confirmPassword ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-700">Passwords match</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">Passwords do not match</span>
                </>
              )}
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
              disabled={isLoading || newPassword !== confirmPassword}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
