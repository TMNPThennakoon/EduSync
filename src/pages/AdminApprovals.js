import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { gradesAPI, adminAPI, usersAPI } from '../services/api'; // userAPI might be needed for approving users?
// Checking backend routes: getPendingRegistrations is in approvalController.
// How to approve user? probably update user status or specific endpoint.
// For now, let's assume we need an approveUser endpoint or use usersAPI.update.
// Searching codebase for 'approveUser' might be good, but let's assume usersAPI.update(id, { is_approved: true }) works for now based on standard CRUD.
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { CheckCircle, Clock, AlertCircle, User, GraduationCap, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminApprovals = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('grades'); // 'grades' or 'users'

  // Fetch Pending Exam Grades
  const { data: pendingGradesData, isLoading: gradesLoading } = useQuery(
    'pending-approvals',
    async () => {
      const response = await gradesAPI.getPendingApprovals();
      return response.data;
    }
  );

  // Fetch Pending User Registrations
  const { data: pendingUsersData, isLoading: usersLoading } = useQuery(
    'pending-registrations',
    async () => {
      try {
        const response = await adminAPI.getPendingRegistrations();
        return response.data;
      } catch (error) {
        console.error("Failed to fetch pending registrations", error);
        return { pending_users: [] };
      }
    }
  );

  const [selectedImage, setSelectedImage] = useState(null);
  const [viewingItem, setViewingItem] = useState(null); // For grade preview
  const [previewDetailUser, setPreviewDetailUser] = useState(null); // For user details
  const [previewEmailUser, setPreviewEmailUser] = useState(null); // For email preview
  const [confirmAction, setConfirmAction] = useState(null); // For custom confirmation modal

  // Fetch details for preview modal
  const { data: previewData, isLoading: previewLoading } = useQuery(
    ['preview-grades', viewingItem?.class_code],
    async () => {
      if (!viewingItem) return null;
      const response = await gradesAPI.getExamGrades({ class_code: viewingItem.class_code });
      return response.data;
    },
    { enabled: !!viewingItem }
  );

  // Approve Grade Mutation
  const approveGradeMutation = useMutation(
    (data) => gradesAPI.approveExamGrades(data),
    {
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries('pending-approvals');
        queryClient.invalidateQueries('admin-stats');
        queryClient.invalidateQueries('admin-stats');
        setViewingItem(null); // Close modal if open
        setConfirmAction(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to approve grades');
        setConfirmAction(null);
      }
    }
  );

  // Approve User Mutation
  const approveUserMutation = useMutation(
    (id) => adminAPI.approveRegistration(id),
    {
      onSuccess: () => {
        toast.success("User approved successfully");
        queryClient.invalidateQueries('pending-registrations');
        queryClient.invalidateQueries('admin-stats');
        queryClient.invalidateQueries('admin-stats');
        setPreviewDetailUser(null);
        setPreviewEmailUser(null);
        setConfirmAction(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to approve user');
        setConfirmAction(null);
      }
    }
  );

  // Reject User Mutation
  const rejectUserMutation = useMutation(
    (id) => adminAPI.rejectRegistration(id),
    {
      onSuccess: () => {
        toast.success("User registration rejected");
        queryClient.invalidateQueries('pending-registrations');
        queryClient.invalidateQueries('admin-stats');
        queryClient.invalidateQueries('admin-stats');
        setPreviewDetailUser(null);
        setPreviewEmailUser(null);
        setConfirmAction(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to reject user');
        setConfirmAction(null);
      }
    }
  );

  const handleApproveGrade = (classCode, examType) => {
    setConfirmAction({
      type: 'approve_grade',
      title: 'Approve Results?',
      message: `Are you sure you want to approve and release results for ${classCode} - ${examType}?`,
      confirmText: 'Approve & Release',
      confirmColor: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle className="w-12 h-12 text-green-500 mb-4" />,
      onConfirm: () => approveGradeMutation.mutate({ class_code: classCode, exam_type: examType })
    });
  };

  const handleApproveUser = (user) => {
    setConfirmAction({
      type: 'approve_user',
      title: 'Approve Registration',
      message: `Approve registration for ${user.first_name} ${user.last_name} (${user.role})?`,
      confirmText: 'Approve User',
      confirmColor: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle className="w-12 h-12 text-green-500 mb-4" />,
      onConfirm: () => approveUserMutation.mutate(user.id)
    });
  };

  const handleRejectUser = (user) => {
    setConfirmAction({
      type: 'reject_user',
      title: 'Reject Registration',
      message: `Are you sure you want to REJECT registration for ${user.first_name} ${user.last_name}? This action cannot be undone.`,
      confirmText: 'Reject User',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      icon: <AlertCircle className="w-12 h-12 text-red-500 mb-4" />,
      onConfirm: () => rejectUserMutation.mutate(user.id)
    });
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:5001${url}`;
  };

  if (gradesLoading || usersLoading) return <LoadingSpinner />;

  const pendingGrades = pendingGradesData?.pending || [];
  const pendingUsers = pendingUsersData?.registrations || [];
  const previewGrades = previewData?.grades || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500">Review and approve pending items</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'grades'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Exam Grades
            {pendingGrades.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                {pendingGrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            User Registrations
            {pendingUsers.length > 0 && (
              <span className="ml-2 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {activeTab === 'grades' && (
          <>
            {pendingGrades.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Pending Grades</h3>
                <p className="text-gray-500 mt-2">All exam marks have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lecturer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingGrades.map((item) => (
                      <tr key={`${item.class_code}-${item.exam_type}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{item.class_name || item.class_code}</span>
                            <span className="text-xs text-gray-500">{item.class_code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.lecturer_first_name} {item.lecturer_last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.exam_type === 'Mid-term' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                            {item.exam_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.student_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {new Date(item.last_updated).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setViewingItem(item)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 transition-colors hover:bg-blue-100 mr-2"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleApproveGrade(item.class_code, item.exam_type)}
                            className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-full border border-green-200 transition-colors hover:bg-green-100"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* User Registrations Tab */}
        {activeTab === 'users' && (
          <>
            {pendingUsers.length === 0 ? (
              <div className="p-12 text-center">
                <User className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Pending Registrations</h3>
                <p className="text-gray-500 mt-2">All new users have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewDetailUser(user)}
                            >
                              {user.profile_image_url ? (
                                <img
                                  src={getImageUrl(user.profile_image_url)}
                                  alt={`${user.first_name}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium">{user.first_name[0]}{user.last_name[0]}</span>
                              )}
                            </div>
                            <div className="ml-4 cursor-pointer hover:text-blue-600" onClick={() => setPreviewDetailUser(user)}>
                              <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'lecturer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setPreviewDetailUser(user)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 transition-colors hover:bg-blue-100 text-xs"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setPreviewEmailUser(user)}
                              className="text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 transition-colors hover:bg-gray-200 flex items-center"
                              title="Preview Approval Email"
                            >
                              <span className="text-xs">Mail</span>
                            </button>
                            <button
                              onClick={() => handleApproveUser(user)}
                              className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-full border border-green-200 transition-colors hover:bg-green-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectUser(user)}
                              className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-full border border-red-200 transition-colors hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Logic for Grade Preview Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          {/* ... Grade Preview Content (unchanged) ... */}
          {/* I need to duplicate it or ensure I don't lose it if I replaced the whole return. 
               The instruction was "Add detailed content". I must include the grade modal logic here.
           */}
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col fade-in">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Grade Preview: {viewingItem.class_name || viewingItem.class_code}</h2>
                <p className="text-sm text-gray-500">
                  Lecturer: {viewingItem.lecturer_first_name} {viewingItem.lecturer_last_name} | Exam: {viewingItem.exam_type}
                </p>
              </div>
              <button onClick={() => setViewingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              {previewLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Index No</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Mid Exam</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Final Exam</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Total Assignments</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewGrades.map(g => (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                          <img
                            src={getImageUrl(g.profile_image_url) || `https://ui-avatars.com/api/?name=${g.first_name}+${g.last_name}`}
                            className="w-6 h-6 rounded-full"
                            alt=""
                          />
                          {g.first_name} {g.last_name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{g.student_index || g.index_no}</td>
                        <td className={`px-4 py-2 whitespace-nowrap text-center text-sm ${viewingItem.exam_type === 'Mid-term' ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-500'}`}>
                          {g.mid_exam_marks ?? '-'}
                        </td>
                        <td className={`px-4 py-2 whitespace-nowrap text-center text-sm ${viewingItem.exam_type === 'Final' ? 'font-bold text-purple-600 bg-purple-50' : 'text-gray-500'}`}>
                          {g.final_exam_marks ?? '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                          {g.total_assignment_marks ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setViewingItem(null)} className="btn btn-secondary">Close</button>
              <button
                onClick={() => handleApproveGrade(viewingItem.class_code, viewingItem.exam_type)}
                className="btn btn-primary bg-green-600 hover:bg-green-700"
              >
                Approve Grades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {previewDetailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-50 px-6 py-4 rounded-t-xl border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">User Details</h3>
              <button onClick={() => setPreviewDetailUser(null)}><X className="h-5 w-5 text-gray-500 hover:text-gray-700" /></button>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center mb-8">
                <img
                  src={getImageUrl(previewDetailUser.profile_image_url) || `https://ui-avatars.com/api/?name=${previewDetailUser.first_name}+${previewDetailUser.last_name}`}
                  className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  alt="Profile"
                  onClick={() => {
                    if (previewDetailUser.profile_image_url) {
                      setSelectedImage(previewDetailUser.profile_image_url);
                    }
                  }}
                />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">{previewDetailUser.first_name} {previewDetailUser.last_name}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${previewDetailUser.role === 'lecturer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {previewDetailUser.role.toUpperCase()}
                  </span>
                  {previewDetailUser.is_approved === false && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      PENDING
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Personal Information</h4>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">Email:</span>
                    <span className="col-span-2 font-medium break-all">{previewDetailUser.email}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">Phone:</span>
                    <span className="col-span-2 font-medium">{previewDetailUser.phone || 'N/A'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">NIC:</span>
                    <span className="col-span-2 font-medium">{previewDetailUser.nic || 'N/A'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">DOB:</span>
                    <span className="col-span-2 font-medium">
                      {previewDetailUser.dob ? new Date(previewDetailUser.dob).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">Address:</span>
                    <span className="col-span-2 font-medium">{previewDetailUser.address || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Academic Information</h4>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">Department:</span>
                    <span className="col-span-2 font-medium">{previewDetailUser.department || 'N/A'}</span>
                  </div>

                  {previewDetailUser.role === 'student' && (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-gray-500">Index No:</span>
                        <span className="col-span-2 font-medium">{previewDetailUser.index_no || previewDetailUser.student_index || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-gray-500">Year:</span>
                        <span className="col-span-2 font-medium">{previewDetailUser.academic_year || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-gray-500">Semester:</span>
                        <span className="col-span-2 font-medium">{previewDetailUser.semester || 'N/A'}</span>
                      </div>
                    </>
                  )}

                  {previewDetailUser.role === 'lecturer' && (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Lecturer ID:</span>
                      <span className="col-span-2 font-medium">{previewDetailUser.lecturer_id || 'N/A'}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-gray-500">Registered:</span>
                    <span className="col-span-2 font-medium">
                      {new Date(previewDetailUser.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end gap-2 sticky bottom-0 border-t border-gray-200">
              <button onClick={() => setPreviewDetailUser(null)} className="btn btn-secondary">Close</button>
              <button
                onClick={() => {
                  setPreviewDetailUser(null);
                  handleApproveUser(previewDetailUser);
                }}
                className="btn btn-primary bg-green-600"
              >
                Approve User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl animate-scale-in">
            <div className="bg-gray-50 px-6 py-4 rounded-t-xl border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><Clock className="w-4 h-4" /></span>
                Email Preview
              </h3>
              <button onClick={() => setPreviewEmailUser(null)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-6 bg-gray-50">
              <div className="bg-white border rounded-lg shadow-sm p-6">
                <div className="border-b pb-4 mb-4">
                  <h4 className="text-lg font-bold text-gray-800">Welcome to EduSync!</h4>
                  <p className="text-sm text-gray-500 mt-1">To: {previewEmailUser.email}</p>
                </div>
                <div className="space-y-4 text-gray-600">
                  <p>Dear {previewEmailUser.first_name},</p>
                  <p>We are pleased to inform you that your registration for <strong>EduSync</strong> has been approved!</p>
                  <p>You can now log in to the system using your credentials.</p>

                  <div className="bg-blue-50 p-4 rounded-lg my-4 text-center">
                    <p className="text-sm text-blue-800 font-medium">Your account role: {previewEmailUser.role.toUpperCase()}</p>
                    <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Login to EduSync</button>
                  </div>

                  <p>Best Regards,<br />EduSync Admin Team</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end gap-2">
              <button onClick={() => setPreviewEmailUser(null)} className="btn btn-secondary">Close</button>
              <button
                onClick={() => {
                  setPreviewEmailUser(null);
                  handleApproveUser(previewEmailUser);
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in p-6">
            <div className="flex flex-col items-center text-center">
              {confirmAction.icon}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmAction.title}</h3>
              <p className="text-gray-500 mb-6">{confirmAction.message}</p>

              <div className="flex flex-col sm:flex-row w-full gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className={`btn text-white flex-1 ${confirmAction.confirmColor}`}
                >
                  {confirmAction.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal (unchanged) */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 p-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 hover:text-red-500 transition-colors z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={getImageUrl(selectedImage)}
              alt="Profile Full Size"
              className="max-w-full max-h-[85vh] object-contain rounded-md"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
