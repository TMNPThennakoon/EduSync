import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  Hash, 
  CreditCard, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

const StudentInfoCard = ({ user }) => {
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

  // Function to get status icon and color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'pending':
        return { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
      default:
        return { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const statusInfo = getStatusInfo(user?.approval_status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4">
            <span className="text-2xl font-bold text-blue-600">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-blue-100 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-6 py-3 border-b">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor}`}>
          <StatusIcon className={`h-4 w-4 mr-2 ${statusInfo.color}`} />
          <span className={statusInfo.color}>
            Account {user?.approval_status ? user.approval_status.charAt(0).toUpperCase() + user.approval_status.slice(1) : 'Unknown'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Personal Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gender</p>
                  <p className="text-sm text-gray-600 capitalize">{user?.gender || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Date of Birth</p>
                  <p className="text-sm text-gray-600">
                    {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone Number</p>
                  <p className="text-sm text-gray-600">{user?.phone_number || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Address</p>
                  <p className="text-sm text-gray-600">{user?.address || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
              Academic Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <GraduationCap className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Department</p>
                  <p className="text-sm text-gray-600">
                    {user?.department ? getDepartmentName(user.department) : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Academic Year</p>
                  <p className="text-sm text-gray-600">
                    {user?.academic_year ? `Year ${user.academic_year}` : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Semester</p>
                  <p className="text-sm text-gray-600">
                    {user?.semester ? `Semester ${user.semester}` : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Hash className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Student Index</p>
                  <p className="text-sm text-gray-600">{user?.student_index || 'Not specified'}</p>
                </div>
              </div>

              {user?.role === 'lecturer' && user?.lecturer_id && (
                <div className="flex items-center">
                  <Hash className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Lecturer ID</p>
                    <p className="text-sm text-gray-600">{user.lecturer_id}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">NIC Number</p>
                  <p className="text-sm text-gray-600">{user?.nic || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Account Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Member Since</p>
                <p className="text-sm text-gray-600">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Last Updated</p>
                <p className="text-sm text-gray-600">
                  {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfoCard;
