import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { FileText, Link as LinkIcon, Download, ExternalLink, BookOpen } from 'lucide-react';
import { lectureMaterialsAPI, classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const StudentLectureMaterials = () => {
  const { user } = useAuth();
  const [allMaterials, setAllMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch student's enrolled classes
  const { data: classesData } = useQuery(
    ['student-classes', user?.id],
    () => classesAPI.getStudentClasses(user?.id),
    { enabled: !!user?.id }
  );

  const enrolledClasses = classesData?.data?.classes || [];

  // Fetch lecture materials for all enrolled classes
  useEffect(() => {
    const fetchAllMaterials = async () => {
      if (enrolledClasses.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const materialsPromises = enrolledClasses.map(async (cls) => {
          try {
            const response = await lectureMaterialsAPI.getAll(cls.id);
            const materials = response?.data?.materials || [];
            return materials.map(material => ({
              ...material,
              classId: cls.id,
              className: cls.name || cls.subject
            }));
          } catch (error) {
            console.error(`Error fetching materials for class ${cls.id}:`, error);
            return [];
          }
        });

        const materialsArrays = await Promise.all(materialsPromises);
        setAllMaterials(materialsArrays.flat());
      } catch (error) {
        console.error('Error fetching lecture materials:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllMaterials();
  }, [enrolledClasses]);

  if (enrolledClasses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-600" />
          Lecture Materials
        </h3>
        <div className="text-center py-8">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No classes enrolled</h3>
          <p className="mt-1 text-sm text-gray-500">Enroll in classes to view lecture materials.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <FileText className="h-5 w-5 mr-2 text-primary-600" />
        Lecture Materials
      </h3>

      {isLoading ? (
        <LoadingSpinner size="sm" />
      ) : allMaterials.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No materials available</h3>
          <p className="mt-1 text-sm text-gray-500">Your lecturers haven't uploaded any materials yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allMaterials.map((material) => (
            <div
              key={material.id}
              className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start space-x-3 flex-1">
                {material.type === 'link' ? (
                  <LinkIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{material.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{material.className}</p>
                  {material.type === 'link' && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center mt-1"
                    >
                      {material.url}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                  {material.type === 'file' && (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center mt-1"
                    >
                      {material.file_name || 'Download File'}
                      <Download className="h-3 w-3 ml-1" />
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(material.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentLectureMaterials;

