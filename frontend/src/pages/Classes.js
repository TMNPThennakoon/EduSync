import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Users,
  BookOpen,
  Calendar,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
  List,
  Grid
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { classesAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateClassModal from '../components/CreateClassModal';
import toast from 'react-hot-toast';
import { useModal } from '../components/AnimatedModal';

const Classes = () => {
  const { isLecturer, isAdmin, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Beautiful animated modal
  const { showModal, ModalComponent } = useModal();

  const { data, isLoading, refetch } = useQuery(
    ['classes', { search: searchTerm, academic_year: selectedYear, semester: selectedSemester, userId: user?.id, lecturer_id: (isLecturer && !isAdmin) ? user?.id : undefined }],
    async () => {
      const response = await classesAPI.getAll({
        academic_year: selectedYear || undefined,
        semester: selectedSemester || undefined,
        lecturer_id: (isLecturer && !isAdmin) ? user?.id : undefined,
        page: 1,
        limit: 20
      });
      // Axios automatically extracts response.data, so response is already the JSON body
      // Backend returns: { data: { classes: [...], pagination: {...} } }
      return response.data;
    },
    {
      enabled: !!user?.id,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      onSuccess: (response) => {
        console.log('✅ Raw response:', response);
        console.log('✅ Response type:', typeof response);
        console.log('✅ Response keys:', Object.keys(response || {}));

        // Axios wraps the response, so we need response.data
        const data = response?.data || response;
        console.log('✅ Extracted data:', data);
        console.log('✅ Data keys:', Object.keys(data || {}));
        console.log('✅ Data.data:', data?.data);
        console.log('✅ Data.data keys:', data ? Object.keys(data) : 'no data');
        console.log('✅ Classes:', data?.classes);
        console.log('✅ Classes count:', data?.classes?.length);

        console.log('✅ Full response structure:', JSON.stringify(response, null, 2));
      },
      onError: (error) => {
        console.error('❌ Error fetching classes:', error);
        console.error('❌ Error response:', error.response);
      }
    }
  );

  // After the query function extracts response.data, data = { classes: [...], pagination: {...} }
  const classes = data?.classes || [];

  // Group classes by lecturer
  const [expandedLecturers, setExpandedLecturers] = useState({});
  const [viewMode, setViewMode] = useState('lecturer'); // 'grid' or 'lecturer'

  const toggleLecturer = (lecturerId) => {
    setExpandedLecturers(prev => ({
      ...prev,
      [lecturerId]: !prev[lecturerId]
    }));
  };

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const classesByLecturer = filteredClasses.reduce((acc, cls) => {
    const lecturerId = cls.lecturer_id;
    const lecturerName = `${cls.lecturer_first_name || ''} ${cls.lecturer_last_name || ''}`.trim() || 'Unknown Lecturer';

    if (!acc[lecturerId]) {
      acc[lecturerId] = {
        name: lecturerName,
        classes: []
      };
    }
    acc[lecturerId].classes.push(cls);
    return acc;
  }, {});

  const handleDelete = async (classId, className) => {
    showModal({
      title: 'Delete Class?',
      message: `Are you sure you want to delete "${className}"? This will remove all associated data including assignments, attendance records, and grades. This action cannot be undone.`,
      type: 'error',
      confirmText: 'Delete Class',
      cancelText: 'Cancel',
      confirmColor: 'red',
      onConfirm: async () => {
        try {
          await classesAPI.delete(classId);
          toast.success('Class deleted successfully');
          refetch();
        } catch (error) {
          toast.error('Failed to delete class');
        }
      }
    });
  };

  // Format academic year and semester for display
  const formatAcademicInfo = (academicYear, semester) => {
    const yearMap = {
      '1st Year': '1st Year Students',
      '2nd Year': '2nd Year Students',
      '3rd Year': '3rd Year Students',
      '4th Year': '4th Year Students'
    };

    const semesterMap = {
      '1': '1st Semester',
      '2': '2nd Semester'
    };

    const formattedYear = yearMap[academicYear] || academicYear;
    const formattedSemester = semesterMap[semester] || semester;

    return `${formattedYear} - ${formattedSemester}`;
  };

  const ClassCard = ({ cls }) => (
    <div className="card hover:shadow-md transition-shadow group">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <BookOpen className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {cls.name}
            </h3>
            <p className="text-sm text-gray-600 font-medium">{cls.subject}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/classes/${cls.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {isLecturer && (
            <>
              <button
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit class"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(cls.id, cls.name)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete class"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description Section */}
      {cls.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {cls.description}
          </p>
        </div>
      )}

      {/* Info Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span className="font-medium">{parseInt(cls.student_count) || 0} students</span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{formatAcademicInfo(cls.academic_year, cls.semester)}</span>
          </div>
        </div>

        {/* Department and Lecturer Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
            <span className="text-xs text-gray-500 font-medium">Department: {cls.department}</span>
          </div>
          {cls.lecturer_first_name && (
            <span className="text-xs text-gray-500">
              by {cls.lecturer_first_name} {cls.lecturer_last_name}
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
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600">Manage your classes and students</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {!isLecturer && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('lecturer')}
                className={`p-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors ${viewMode === 'lecturer' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">By Lecturer</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">All Classes</span>
              </button>
            </div>
          )}
          {isLecturer && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Class
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="label">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input"
            >
              <option value="">All Years</option>
              <option value="1st Year">1st Year Students</option>
              <option value="2nd Year">2nd Year Students</option>
              <option value="3rd Year">3rd Year Students</option>
              <option value="4th Year">4th Year Students</option>
            </select>
          </div>

          <div>
            <label className="label">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="input"
            >
              <option value="">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedYear('');
                setSelectedSemester('');
              }}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center font-medium"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Classes */}
      <div>
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedYear || selectedSemester
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating a new class.'
              }
            </p>
            {isLecturer && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </button>
              </div>
            )}
          </div>
        ) : (viewMode === 'lecturer' && !isLecturer) ? (
          <div className="space-y-4">
            {Object.entries(classesByLecturer).map(([lecturerId, { name, classes }]) => (
              <div key={lecturerId} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleLecturer(lecturerId)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-full">
                      <Users className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                      <p className="text-sm text-gray-500">{classes.length} Classes</p>
                    </div>
                  </div>
                  {expandedLecturers[lecturerId] ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {expandedLecturers[lecturerId] && (
                  <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-4">
                      {classes.map(cls => (
                        <ClassCard key={cls.id} cls={cls} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredClasses.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      {/* Animated Modal */}
      {ModalComponent}
    </div>
  );
};

export default Classes;
