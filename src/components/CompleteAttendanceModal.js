import React from 'react';
import { X, AlertTriangle, CheckCircle, Users } from 'lucide-react';

const CompleteAttendanceModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading = false,
  presentCount = 0,
  totalStudents = 0
}) => {
  if (!isOpen) return null;

  const absentCount = totalStudents - presentCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Complete Attendance
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Warning Icon and Message */}
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Are you sure you want to complete attendance?
                </h4>
                <p className="text-sm text-gray-600">
                  This will mark all students who haven't scanned their QR code as absent.
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Present</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <Users className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">Will be Absent</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Total Students: {totalStudents}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Yes, Complete Attendance'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteAttendanceModal;
