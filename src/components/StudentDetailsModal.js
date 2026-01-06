import React from 'react';
import { X, Mail, Hash, Calendar, MapPin, Phone, GraduationCap, User } from 'lucide-react';

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Student Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Section */}
          <div className="flex items-center space-x-6 mb-6 pb-6 border-b border-gray-200">
            <div className="relative">
              <img
                src={student.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.first_name + ' ' + student.last_name)}&background=2563eb&color=fff&size=128`}
                alt={`${student.first_name} ${student.last_name}`}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.first_name + ' ' + student.last_name)}&background=2563eb&color=fff&size=128`;
                }}
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {student.first_name} {student.last_name}
              </h3>
              <p className="text-gray-600 mt-1">{student.email}</p>
              {student.index_no && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mt-2">
                  <Hash className="h-3 w-3 mr-1" />
                  {student.index_no}
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-primary-600" />
                Personal Information
              </h4>
              <div className="space-y-3">
                {student.email && (
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{student.email}</p>
                    </div>
                  </div>
                )}
                {student.index_no && (
                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Index Number</p>
                      <p className="text-gray-900">{student.index_no}</p>
                    </div>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-gray-900">{student.phone}</p>
                    </div>
                  </div>
                )}
                {student.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-gray-900">{student.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-primary-600" />
                Academic Information
              </h4>
              <div className="space-y-3">
                {student.department && (
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 rounded-full bg-primary-500 mt-0.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <p className="text-gray-900">{student.department}</p>
                    </div>
                  </div>
                )}
                {student.academic_year && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Academic Year</p>
                      <p className="text-gray-900">{student.academic_year}</p>
                    </div>
                  </div>
                )}
                {student.semester && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Semester</p>
                      <p className="text-gray-900">{student.semester}</p>
                    </div>
                  </div>
                )}
                {student.enrolled_date && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Enrolled Date</p>
                      <p className="text-gray-900">
                        {new Date(student.enrolled_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsModal;



