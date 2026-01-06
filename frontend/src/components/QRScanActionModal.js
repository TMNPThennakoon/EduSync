import React from 'react';
import { X, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
import ImagePreviewModal from './ImagePreviewModal';
import { useState } from 'react';

const QRScanActionModal = ({
  isOpen,
  onClose,
  studentInfo,
  onSelectAction,
  isLoading = false,
  classes = [],
  selectedClass = '',
  onClassSelect
}) => {
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const handleActionSelect = (status) => {
    onSelectAction(status);
  };

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
              Select Attendance Action
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
            {/* Student Info */}
            {studentInfo && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      if (studentInfo.profileImageUrl) {
                        setShowPreview(true);
                      }
                    }}
                  >
                    {studentInfo.profileImageUrl ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={studentInfo.profileImageUrl.startsWith('/') ? `http://localhost:5001${studentInfo.profileImageUrl}` : studentInfo.profileImageUrl}
                          alt="Student"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-lg">
                      {studentInfo.firstName} {studentInfo.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {studentInfo.email}
                    </p>
                    {studentInfo.studentIndex && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Index: {studentInfo.studentIndex}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Image Preview Modal */}
            {studentInfo && (
              <ImagePreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                imageUrl={studentInfo.profileImageUrl}
                studentName={`${studentInfo.firstName} ${studentInfo.lastName}`}
                altText="Student Profile"
              />
            )}

            {/* Action Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Choose attendance status:
              </h4>

              {/* Class Selection (if not pre-selected) */}
              {(!selectedClass || classes?.length > 0) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject / Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => onClassSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Select Subject</option>
                    {classes?.map((cls) => (
                      <option key={cls.id || cls.class_code} value={cls.id || cls.class_code}>
                        {cls.subject} {cls.name !== cls.subject ? `(${cls.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Present Option */}
              <button
                onClick={() => handleActionSelect('present')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Present</p>
                    <p className="text-sm text-gray-600">Student is on time</p>
                  </div>
                </div>
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
              </button>

              {/* Late Option */}
              <button
                onClick={() => handleActionSelect('late')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-yellow-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Late</p>
                    <p className="text-sm text-gray-600">Student arrived late</p>
                  </div>
                </div>
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
              </button>

              {/* Excused Option */}
              <button
                onClick={() => handleActionSelect('excused')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Excused</p>
                    <p className="text-sm text-gray-600">Student has valid excuse</p>
                  </div>
                </div>
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Processing...</span>
              </div>
            )}

            {/* Cancel Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanActionModal;
