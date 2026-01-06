import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Upload, Link as LinkIcon, FileText, X, Plus, ExternalLink, Download, Eye, EyeOff, Folder } from 'lucide-react';
import toast from 'react-hot-toast';
import { lectureMaterialsAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

const LectureMaterialsSection = ({ classId, readOnly = false }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [materialType, setMaterialType] = useState('link'); // 'link' or 'file'
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [section, setSection] = useState('Assignments & Past papers');
  const [customSection, setCustomSection] = useState('');
  const [is_hidden, setIsHidden] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ status: 'checking', message: 'Checking connection...' });

  // Test Supabase Connection on Mount
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.storage.from('materials').list();
        if (error) {
          console.error('Connection Test Failed:', error);
          setConnectionStatus({ status: 'error', message: error.message });
        } else {
          setConnectionStatus({ status: 'success', message: `Connected! Found ${data.length} files.` });
        }
      } catch (err) {
        setConnectionStatus({ status: 'error', message: err.message });
      }
    };
    testConnection();
  }, []);

  // Fetch lecture materials
  const { data: materialsData, isLoading: materialsLoading } = useQuery(
    ['lecture-materials', classId],
    () => lectureMaterialsAPI.getAll(classId),
    { enabled: !!classId }
  );

  const materials = materialsData?.data?.data?.materials || materialsData?.data?.materials || [];

  // Group materials by section
  const materialsBySection = materials.reduce((acc, material) => {
    const sectionName = material.section || 'General Resources';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(material);
    return acc;
  }, {});

  // Get unique existing sections for suggestions
  const existingSections = Object.keys(materialsBySection).sort();
  // Ensure default sections exist in suggestions
  const defaultSections = ['Assignments & Past papers', 'Lecture Slides', 'Tutorials', 'Reference Materials'];
  const allSections = [...new Set([...defaultSections, ...existingSections])];

  const handleAddLink = async () => {
    if (!linkUrl || !linkTitle) {
      toast.error('Please provide both title and URL');
      return;
    }

    const finalSection = section === 'Other' ? customSection : section;
    if (!finalSection) {
      toast.error('Please specify a section');
      return;
    }

    setIsUploading(true);
    try {
      await lectureMaterialsAPI.upload(classId, {
        title: linkTitle,
        type: 'link',
        url: linkUrl,
        is_hidden,
        section: finalSection
      });

      toast.success('Link added successfully');
      resetForm();
      queryClient.invalidateQueries(['lecture-materials', classId]);
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error(error.response?.data?.error || 'Failed to add link');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    const finalSection = section === 'Other' ? customSection : section;
    if (!finalSection) {
      toast.error('Please specify a section');
      return;
    }

    setIsUploading(true);
    try {

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${classId}/${fileName}`;

      // Step 1: Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`Supabase Upload Failed: ${uploadError.message}`);
      }

      // Step 2: Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      // Step 3: Save to Backend
      await lectureMaterialsAPI.upload(classId, {
        title: selectedFile.name,
        type: 'file',
        fileUrl: publicUrl,
        is_hidden,
        section: finalSection
      });

      toast.success('File uploaded successfully');
      resetForm();
      queryClient.invalidateQueries(['lecture-materials', classId]);
    } catch (error) {
      console.error('Handled Upload Error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setLinkUrl('');
    setLinkTitle('');
    setShowAddModal(false);
    setIsHidden(false);
    setSelectedFile(null);
    setSection('Assignments & Past papers');
    setCustomSection('');
  };

  const handleDelete = async (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await lectureMaterialsAPI.delete(materialId);
        toast.success('Material deleted successfully');
        queryClient.invalidateQueries(['lecture-materials', classId]);
      } catch (error) {
        toast.error('Failed to delete material');
      }
    }
  };

  const handleToggleVisibility = async (id, currentStatus) => {
    try {
      await lectureMaterialsAPI.toggleVisibility(id);
      toast.success(`Material is now ${!currentStatus ? 'hidden' : 'visible'}`);
      queryClient.invalidateQueries(['lecture-materials', classId]);
    } catch (error) {
      toast.error('Failed to toggle visibility');
    }
  };

  return (
    <div className="space-y-4">
      {/* Debug Status Panel - Visible only to Admins */}
      {user?.role === 'admin' && (
        <div className={`p-3 rounded-lg text-sm mb-4 ${connectionStatus.status === 'success' ? 'bg-green-100 text-green-800' :
          connectionStatus.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
          }`}>
          <strong>Supabase Status: </strong> {connectionStatus.message}
        </div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-600" />
            Lecture Materials
          </h2>
          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </button>
          )}
        </div>

        {/* Materials List Grouped by Section */}
        {materialsLoading ? (
          <LoadingSpinner size="sm" />
        ) : Object.keys(materialsBySection).length === 0 ? (
          <div className="text-center py-8">
            <Folder className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No materials yet</h3>
            {readOnly ? (
              <p className="mt-1 text-sm text-gray-500">There are no materials for this class yet.</p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Add lecture notes, links, or files for your students.</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(materialsBySection).sort().map(([sectionName, sectionMaterials]) => (
              <div key={sectionName} className="space-y-3">
                <h3 className="text-lg font-medium text-blue-600 border-b pb-2 mb-3">
                  {sectionName}
                </h3>
                <div className="pl-2 space-y-2">
                  {sectionMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group ${material.is_hidden ? 'opacity-75 bg-gray-50' : ''
                        }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {material.type === 'link' ? (
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <LinkIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-red-100 rounded-lg">
                            <FileText className="h-4 w-4 text-red-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            {material.type === 'link' ? (
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                              >
                                {material.title}
                              </a>
                            ) : (
                              <a
                                href={material.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                              >
                                {material.title}
                              </a>
                            )}
                            {material.is_hidden && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Hidden
                              </span>
                            )}
                          </div>
                          {material.type === 'link' && material.url && (
                            <span className="text-xs text-gray-500 truncate block mt-0.5">{material.url}</span>
                          )}
                        </div>
                      </div>

                      {!readOnly && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleVisibility(material.id, material.is_hidden)}
                            className={`p-1.5 rounded transition-colors ${material.is_hidden ? 'text-yellow-600 hover:bg-yellow-50' : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100'
                              }`}
                            title={material.is_hidden ? "Show to students" : "Hide from students"}
                          >
                            {material.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Material Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Add Material</h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setMaterialType('link')}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${materialType === 'link'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex flex-col items-center">
                        <LinkIcon className="h-6 w-6 mb-2" />
                        <span className="font-medium">Link / URL</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setMaterialType('file')}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${materialType === 'file'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 mb-2" />
                        <span className="font-medium">File Upload</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section / Category</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {allSections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="Other">Other (Create New)</option>
                  </select>
                  {section === 'Other' && (
                    <input
                      type="text"
                      value={customSection}
                      onChange={(e) => setCustomSection(e.target.value)}
                      placeholder="Enter new section name"
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  )}
                </div>

                {/* Link Form */}
                {materialType === 'link' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        placeholder="e.g., Lecture Notes Week 1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL *</label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com/notes"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </>
                )}

                {/* File Form */}
                {materialType === 'file' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              onChange={(e) => setSelectedFile(e.target.files[0])}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, ZIP up to 10MB</p>
                        {selectedFile && (
                          <p className="text-sm font-medium text-green-600 mt-2">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Visibility Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hide-chk"
                    checked={is_hidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hide-chk" className="text-sm font-medium text-gray-700">
                    Hide from students
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={materialType === 'link' ? handleAddLink : handleAddFile}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isUploading ? (
                      <>
                        <LoadingSpinner size="sm" color="white" className="mr-2" />
                        Uploading...
                      </>
                    ) : (
                      'Add Material'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureMaterialsSection;
