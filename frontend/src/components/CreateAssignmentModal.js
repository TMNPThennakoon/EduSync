import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { X, BookOpen, Upload, FileText } from 'lucide-react';
import { assignmentsAPI, classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CreateAssignmentModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Quiz Generation State
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const watchDepartment = watch('department');
  const watchAssignmentType = watch('assignment_type');

  // Set user's department as default and fetch classes
  useEffect(() => {
    if (user?.department && isOpen) {
      setValue('department', user.department);
      // Trigger fetch via watchDepartment effect or manual call if needed, 
      // but watchDepartment effect handles it if setValue triggers change.
      // However, initial render might need explicit call if watch doesn't fire immediately on mount with default.
    }
  }, [user?.department, isOpen, setValue]);

  // Fetch classes when department changes or modal opens
  useEffect(() => {
    if (watchDepartment && isOpen) {
      fetchClasses(watchDepartment);
    } else if (!watchDepartment) {
      setClasses([]);
    }
  }, [watchDepartment, isOpen]);

  const fetchClasses = async (department) => {
    try {
      const params = { department };
      // Filter by lecturer_id if user is a lecturer and not an admin
      if (user?.role === 'lecturer') {
        params.lecturer_id = user.id;
      }

      const response = await classesAPI.getAll(params);
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      setClasses([]);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!topic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await assignmentsAPI.generateQuiz({ topic, count: questionCount });
      setGeneratedQuiz(response.data);
      toast.success('Quiz generated! Please review below.');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to generate quiz. Try again.';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-rar-compressed'];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Only images, PDFs, documents, and archives are allowed');
        return;
      }

      setSelectedFile(file);
      setFilePreview(file.name);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      let attachmentParams = {};

      if (selectedFile) {
        const { supabase } = await import('../utils/supabase');
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `assignment-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `assignments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        attachmentParams = {
          attachment_url: publicUrl,
          attachment_filename: selectedFile.name,
          attachment_size: selectedFile.size
        };
      }

      const payload = {
        class_id: data.class_id,
        title: data.title,
        description: data.description,
        max_score: data.max_score,
        due_date: data.due_date,
        assignment_type: data.assignment_type,
        department: data.department || user?.department, // Ensure department is sent even if disabled input is omitted
        quiz_data: generatedQuiz, // Include generated quiz data
        ...attachmentParams
      };

      await assignmentsAPI.create(payload);
      toast.success('Assignment created successfully!');
      reset();
      setClasses([]);
      setSelectedFile(null);
      setFilePreview(null);
      setGeneratedQuiz(null); // Reset quiz
      setTopic('');
      setShowQuizGenerator(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Create assignment error:', error);
      toast.error(error.message || error.response?.data?.error || 'Failed to create assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setClasses([]);
    setGeneratedQuiz(null);
    setTopic('');
    setShowQuizGenerator(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Create New Assignment</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignment Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Title *
              </label>
              <input
                {...register('title', {
                  required: 'Assignment title is required',
                  minLength: {
                    value: 3,
                    message: 'Title must be at least 3 characters'
                  }
                })}
                type="text"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="e.g., Digital Circuit Design Assignment"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Department *
              </label>
              <select
                {...register('department', {
                  required: 'Department is required'
                })}
                disabled={true}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-gray-100 cursor-not-allowed ${errors.department ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <option value={user?.department || ''}>
                  {user?.department === 'AT' && 'Department of Agricultural Technology (AT)'}
                  {user?.department === 'ET' && 'Department of Environmental Technology (ET)'}
                  {user?.department === 'IAT' && 'Department of Instrumentation & Automation Engineering Technology (IAT)'}
                  {user?.department === 'ICT' && 'Department of Information & Communication Technology (ICT)'}
                </option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Assignment will be created for your department: <span className="font-semibold">{user?.department}</span>
              </p>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                {...register('class_id', {
                  required: 'Class is required'
                })}
                disabled={!watchDepartment || classes.length === 0}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.class_id ? 'border-red-300' : 'border-gray-300'
                  } ${!watchDepartment || classes.length === 0 ? 'bg-gray-100' : ''}`}
              >
                <option value="">
                  {!watchDepartment
                    ? 'Select department first'
                    : classes.length === 0
                      ? 'No classes found for this department'
                      : 'Select Class'
                  }
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.subject}
                  </option>
                ))}
              </select>
              {errors.class_id && (
                <p className="mt-1 text-sm text-red-600">{errors.class_id.message}</p>
              )}
            </div>

            {/* Assignment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Type *
              </label>
              <select
                {...register('assignment_type', {
                  required: 'Assignment type is required'
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.assignment_type ? 'border-red-300' : 'border-gray-300'
                  }`}
              >
                <option value="">Select Type</option>
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
                <option value="homework">Homework</option>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
                <option value="lab">Lab Work</option>
              </select>
              {errors.assignment_type && (
                <p className="mt-1 text-sm text-red-600">{errors.assignment_type.message}</p>
              )}
            </div>

            {/* Max Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Score *
              </label>
              <input
                {...register('max_score', {
                  required: 'Maximum score is required',
                  min: {
                    value: 1,
                    message: 'Score must be at least 1'
                  },
                  max: {
                    value: 100,
                    message: 'Score must be at most 100'
                  }
                })}
                type="number"
                min="0"
                max="100"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.max_score ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="100"
              />
              {errors.max_score && (
                <p className="mt-1 text-sm text-red-600">{errors.max_score.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                {...register('due_date', {
                  required: 'Due date is required',
                  validate: (value) => {
                    const selectedDate = new Date(value);
                    const now = new Date();
                    return selectedDate > now || 'Due date must be in the future';
                  }
                })}
                type="datetime-local"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.due_date ? 'border-red-300' : 'border-gray-300'
                  }`}
              />
              {errors.due_date && (
                <p className="mt-1 text-sm text-red-600">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* AI Quiz Generator Section */}
          {watchAssignmentType === 'quiz' && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-purple-900 flex items-center">
                  <span className="mr-2">✨</span> AI Quiz Generator
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuizGenerator(!showQuizGenerator)}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  {showQuizGenerator ? 'Hide Generator' : 'Show Generator'}
                </button>
              </div>

              {showQuizGenerator && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-1">Popup Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. History of Sri Lanka, Thermodynamics, Java Basics"
                      className="w-full border-purple-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-32">
                      <label className="block text-sm font-medium text-purple-900 mb-1">Questions</label>
                      <input
                        type="number"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(e.target.value)}
                        min="1" max="20"
                        className="w-full border-purple-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQuiz}
                      disabled={isGenerating || !topic}
                      className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Questions'}
                    </button>
                  </div>

                  {generatedQuiz && generatedQuiz.questions && (
                    <div className="mt-4 bg-white p-4 rounded border border-gray-200 max-h-60 overflow-y-auto">
                      <h4 className="font-medium text-gray-800 mb-2">Preview ({generatedQuiz.questions.length} Questions)</h4>
                      {generatedQuiz.questions.map((q, idx) => (
                        <div key={idx} className="mb-3 pb-3 border-b last:border-0 border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{idx + 1}. {q.question}</p>
                          <div className="pl-4 mt-1 text-xs text-gray-600 grid grid-cols-2 gap-1">
                            {q.options.map((opt, i) => (
                              <span key={i} className={opt === q.correct_answer ? "text-green-600 font-bold" : ""}>
                                - {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-green-600 font-medium mt-2">✅ Quiz data attached to assignment.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Description *
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
                minLength: {
                  value: 10,
                  message: 'Description must be at least 10 characters'
                }
              })}
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Describe the assignment requirements, instructions, and submission guidelines..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment File (Optional)
            </label>
            <div className="space-y-3">
              {!filePreview ? (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="attachment"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Images, PDFs, documents, archives (MAX. 10MB)
                      </p>
                    </div>
                    <input
                      id="attachment"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{filePreview}</p>
                      <p className="text-xs text-blue-600">
                        {(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

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
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssignmentModal;
