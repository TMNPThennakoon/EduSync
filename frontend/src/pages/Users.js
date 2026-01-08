import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'react-query';
import {
  Plus,
  Search,
  Filter,
  Users as UsersIcon,
  Mail,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { usersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import UserDetailsModal from '../components/UserDetailsModal';
import ImagePreviewModal from '../components/ImagePreviewModal';
import toast from 'react-hot-toast';
import { useModal } from '../components/AnimatedModal';

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userImages, setUserImages] = useState({});
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewUserName, setPreviewUserName] = useState('');

  // Beautiful animated modal
  const { showModal, ModalComponent } = useModal();

  const { data, isLoading, refetch } = useQuery(
    ['users', { search: searchTerm, role: selectedRole, department: selectedDepartment, year: selectedYear }],
    () => usersAPI.getAll({
      role: selectedRole || undefined,
      department: selectedDepartment || undefined,
      academic_year: selectedYear || undefined,
      search: searchTerm || undefined,
      page: 1,
      limit: 20
    }),
    {
      staleTime: 0, // Always fetch fresh data
      cacheTime: 0, // Don't cache
    }
  );

  const users = data?.data?.users || [];
  const filteredUsers = users; // Filtering is now done on backend

  // Fetch user profile images
  const fetchUserImages = useCallback(async (userIds) => {
    const imagePromises = userIds.map(async (id) => {
      try {
        const response = await usersAPI.getImage(id);
        const imageUrl = response.data.imageUrl;

        if (imageUrl && typeof imageUrl === 'string') {
          // Validate if it's a relative path or full URL
          const fullImageUrl = imageUrl.startsWith('/')
            ? `http://localhost:5001${imageUrl}`
            : imageUrl.startsWith('http')
              ? imageUrl
              : null; // Invalid URL (e.g. "200" or raw data), return null to show Initials

          return { id, imageUrl: fullImageUrl };
        } else {
          return { id, imageUrl: null };
        }
      } catch (error) {
        return { id, imageUrl: null };
      }
    });

    const results = await Promise.all(imagePromises);
    const imageMap = {};
    results.forEach(({ id, imageUrl }) => {
      if (imageUrl) {
        imageMap[id] = imageUrl;
      }
    });

    setUserImages(imageMap);
  }, []);

  // Fetch images when users data changes
  useEffect(() => {
    if (users.length > 0) {
      const userIds = users.map(user => user.id);
      fetchUserImages(userIds);
    }
  }, [users, fetchUserImages]);

  const handleImageClick = (imageUrl, userName) => {
    setPreviewImageUrl(imageUrl);
    setPreviewUserName(userName);
    setShowImagePreview(true);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const handleDelete = async (userId, userName) => {
    showModal({
      title: 'Delete User?',
      message: `Are you sure you want to delete "${userName}"? This will permanently remove the user and all their associated data. This action cannot be undone.`,
      type: 'error',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await usersAPI.delete(userId);
          toast.success('User deleted successfully');
          refetch();
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Failed to delete user';
          toast.error(errorMessage);

          if (error.response?.status === 401) {
            console.error('Authorization error during user deletion');
          }
        }
      }
    });
  };

  const handleAddSuccess = () => {
    refetch();
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    refetch();
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

  const UserCard = ({ user }) => (
    <div className="card hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {userImages[user.id] ? (
            <div
              className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary-200 cursor-pointer hover:border-primary-400 hover:shadow-lg transition-all duration-200"
              onClick={() => handleImageClick(userImages[user.id], `${user.first_name} ${user.last_name}`)}
              title="Click to view full-size image"
            >
              <img
                src={userImages[user.id]}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-primary-600">
                {user.first_name[0]}{user.last_name[0]}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {user.first_name} {user.last_name}
            </h3>
            <p className="text-sm text-gray-600 flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              {user.email}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`badge ${getRoleColor(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <span className="text-xs text-gray-500">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewDetails(user)}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEdit(user)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
          </button>
          {user.role !== 'admin' ? (
            <button
              onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <span className="p-2 text-gray-300 cursor-not-allowed" title="Admin users cannot be deleted">
              <Trash2 className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, index..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="lecturer">Lecturer</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div>
            <label className="label">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input"
            >
              <option value="">All Depts</option>
              <option value="ICT">ICT</option>
              <option value="ET">ET</option>
              <option value="BST">BST</option>
            </select>
          </div>

          <div>
            <label className="label">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          <div className="md:col-span-5 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRole('');
                setSelectedDepartment('');
                setSelectedYear('');
              }}
              className="btn btn-secondary"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedRole
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding a new user.'
            }
          </p>
          <div className="mt-6">
            <button className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={handleEditSuccess}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={showUserDetailsModal}
        onClose={() => setShowUserDetailsModal(false)}
        user={selectedUser}
        userImage={selectedUser ? userImages[selectedUser.id] : null}
        onImageClick={handleImageClick}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={previewImageUrl}
        studentName={previewUserName}
        altText={`${previewUserName} profile image`}
      />

      {/* Animated Modal */}
      {ModalComponent}
    </div>
  );
};

export default Users;
