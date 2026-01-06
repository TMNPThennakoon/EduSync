import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Search,
    Filter,
    Users,
    Calendar,
    ChevronLeft,
    Save,
    CheckCircle,
    AlertCircle,
    FileText,
    Download
} from 'lucide-react';
import { classesAPI, assignmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import toast from 'react-hot-toast';
import ExamGradesManager from '../ExamGradesManager';

const LecturerGrades = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showExamModal, setShowExamModal] = useState(false);

    // 1. Fetch Classes (Using getAll for reliability)
    const { data: classesData, isLoading: classesLoading } = useQuery(
        ['lecturer-classes', user?.id],
        async () => {
            const response = await classesAPI.getAll({ lecturer_id: user?.id, limit: 100 });
            return response.data;
        },
        { enabled: !!user?.id }
    );

    // 2. Fetch Assignments for Selected Class
    const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery(
        ['class-assignments', selectedClass],
        async () => {
            const response = await assignmentsAPI.getAll({ class_id: selectedClass, limit: 100 });
            return response.data;
        },
        { enabled: !!selectedClass }
    );

    // 3. Fetch Submissions for Selected Assignment
    const { data: submissionsData, isLoading: submissionsLoading } = useQuery(
        ['assignment-submissions', selectedAssignment?.id],
        async () => {
            const response = await assignmentsAPI.getSubmissions(selectedAssignment?.id);
            return response.data;
        },
        { enabled: !!selectedAssignment }
    );

    // Mutation for Grading
    const gradeMutation = useMutation(
        ({ submissionId, grade, feedback }) => assignmentsAPI.gradeSubmission(submissionId, { grade, feedback }),
        {
            onSuccess: () => {
                toast.success('Grade saved successfully');
                queryClient.invalidateQueries(['assignment-submissions', selectedAssignment?.id]);
            },
            onError: (error) => {
                toast.error(error.response?.data?.error || 'Failed to save grade');
            }
        }
    );

    const handleGradeSubmit = (submissionId, grade, feedback) => {
        gradeMutation.mutate({ submissionId, grade, feedback });
    };

    if (classesLoading) return <LoadingSpinner size="lg" />;

    const classes = classesData?.classes || [];
    const assignments = assignmentsData?.assignments || [];
    const submissions = submissionsData?.submissions || [];

    // Filter submissions
    const filteredSubmissions = submissions.filter(sub =>
        sub.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.student_index.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 1. Class Selection View
    if (!selectedClass) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
                        <p className="text-gray-500">Select a class to manage grades</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div
                            key={cls.id}
                            onClick={() => setSelectedClass(cls.id)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {cls.student_count || 0} Students
                                </span>
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-gray-900">{cls.name}</h3>
                            <p className="text-sm text-gray-500">{cls.subject || cls.class_code}</p>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                                <span>{cls.department}</span>
                                <span>{cls.academic_year} Year</span>
                            </div>
                        </div>
                    ))}
                    {classes.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            No classes found. Please create a class first.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Assignment Selection View
    if (!selectedAssignment) {
        const currentClass = classes.find(c => c.id === selectedClass);
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSelectedClass(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="h-6 w-6 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
                            <p className="text-gray-500">Select an assignment to grade for {currentClass?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowExamModal(true)}
                        className="btn btn-primary flex items-center"
                    >
                        <div className="mr-2">
                            <CheckCircle className="h-4 w-4" />
                        </div>
                        Manage Exam Grades
                    </button>
                </div>

                {/* Modal */}
                {showExamModal && (
                    <ExamGradesManager
                        classId={selectedClass} // Passing class_code as ID which works for this system
                        classCode={selectedClass}
                        onClose={() => setShowExamModal(false)}
                    />
                )}

                {assignmentsLoading ? <LoadingSpinner /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assignments.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">No assignments found for this class.</p>
                            </div>
                        ) : (
                            assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    onClick={() => setSelectedAssignment(assignment)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4">
                                        <FileText className="h-24 w-24 text-gray-50 opacity-50 -mr-8 -mt-8" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {assignment.assignment_type}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 mb-1">{assignment.title}</h3>
                                        <div className="flex items-center text-sm text-gray-500 mb-4">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Graded</span>
                                                <span className="font-medium text-gray-900">{assignment.graded_count || 0} / {assignment.total_students || 0}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(((assignment.graded_count || 0) / (assignment.total_students || 1)) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    }

    // 3. Grading Interface (Unchanged logic, just simplified return for conciseness in this write)
    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setSelectedAssignment(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="h-6 w-6 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{selectedAssignment.title}</h1>
                            <p className="text-gray-500">Max Score: {selectedAssignment.max_score} points</p>
                        </div>
                    </div>
                    {/* ... Search ... */}
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button className="btn btn-secondary">
                            <Download className="h-4 w-4 mr-2" />
                            Export Grades
                        </button>
                    </div>
                </div>
            </div>

            {/* Grading Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow flex flex-col">
                {submissionsLoading ? <div className="p-12"><LoadingSpinner /></div> : (
                    <div className="overflow-y-auto flex-grow">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSubmissions.map((sub) => (
                                    <GradeRow
                                        key={sub.id}
                                        submission={sub}
                                        maxScore={selectedAssignment.max_score}
                                        onSave={handleGradeSubmit}
                                    />
                                ))}
                            </tbody>
                        </table>
                        {filteredSubmissions.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No submissions found matching your search.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component for individual grade row to handle local state
const GradeRow = ({ submission, maxScore, onSave }) => {
    const [score, setScore] = useState(submission.grade || '');
    const [feedback, setFeedback] = useState(submission.feedback || '');
    const [isDirty, setIsDirty] = useState(false);

    // Status Badge Logic
    const getStatusBadge = () => {
        if (submission.grade !== null) return <span className="badge badge-success">Graded</span>;
        if (submission.submitted_at) return <span className="badge badge-info text-blue-700 bg-blue-100">Submitted</span>;
        return <span className="badge badge-warning">Missing</span>;
    };

    const handleSave = () => {
        if (score === '' && feedback === '') return;
        onSave(submission.id, score, feedback);
        setIsDirty(false);
    };

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold mr-3">
                        {submission.first_name[0]}{submission.last_name[0]}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900">{submission.first_name} {submission.last_name}</div>
                        <div className="text-xs text-gray-500">{submission.student_index}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {submission.submission_file_url ? (
                    <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                        <FileText className="h-4 w-4 mr-1" /> View File
                    </a>
                ) : submission.submission_text ? 'Text Submission' : '-'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <input
                        type="number"
                        max={maxScore}
                        min="0"
                        value={score}
                        onChange={(e) => {
                            setScore(e.target.value);
                            setIsDirty(true);
                        }}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
                        placeholder="0"
                    />
                    <span className="ml-2 text-gray-400 text-sm">/ {maxScore}</span>
                </div>
            </td>
            <td className="px-6 py-4">
                <input
                    type="text"
                    value={feedback}
                    onChange={(e) => {
                        setFeedback(e.target.value);
                        setIsDirty(true);
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
                    placeholder="Feedback..."
                />
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {isDirty && (
                    <button
                        onClick={handleSave}
                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-xs flex items-center ml-auto"
                    >
                        <Save className="h-3 w-3 mr-1" /> Save
                    </button>
                )}
            </td>
        </tr>
    );
};

export default LecturerGrades;
