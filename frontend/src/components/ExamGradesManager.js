import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { classesAPI, gradesAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import { Save, X, Search, AlertCircle, Send, CheckCircle } from 'lucide-react';

const ExamGradesManager = ({ classId, classCode, onClose }) => {
    const [examType, setExamType] = useState('Mid-term');
    const [marks, setMarks] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    // Fetch enrolled students
    const { data: studentsData, isLoading: studentsLoading } = useQuery(
        ['enrolled-students', classId],
        async () => {
            const response = await classesAPI.getEnrolledStudents(classId);
            return response.data;
        },
        { enabled: !!classId }
    );

    // Fetch existing exam grades
    const { data: gradesData, isLoading: gradesLoading } = useQuery(
        ['exam-grades', classCode, examType], // Add examType to key to force fresh fetch/cache separation
        async () => {
            const response = await gradesAPI.getExamGrades({ class_code: classCode, exam_type: examType });
            return response.data;
        },
        {
            enabled: !!classCode,
            refetchOnWindowFocus: false
        }
    );

    const students = studentsData?.data?.students || [];
    const existingGrades = gradesData?.grades || [];

    // Determine current status based on fetched grades
    const currentStatus = existingGrades.length > 0 ? (existingGrades[0].status || 'draft') : 'draft';

    // Sync marks state when data arrives
    useEffect(() => {
        if (gradesData?.grades) {
            const fetchedGrades = gradesData.grades;
            const newMarks = {};
            fetchedGrades.forEach(record => {
                const val = examType === 'Mid-term' ? record.mid_exam_marks : record.final_exam_marks;
                // Only include if value exists, convert to appropriate format
                if (val !== null && val !== undefined) {
                    newMarks[record.student_id] = val;
                }
            });

            setMarks(prevMarks => {
                // strict comparison to avoid loops
                // JSON stringify is stable enough for simple key-value objects here
                if (JSON.stringify(prevMarks) === JSON.stringify(newMarks)) {
                    return prevMarks;
                }
                return newMarks;
            });
        } else {
            // Only clear if strictly needed to avoid flash
            // setMarks({}); 
        }
    }, [gradesData, examType]);

    const updateMutation = useMutation(
        (data) => gradesAPI.bulkUpdateExamGrades(data),
        {
            onSuccess: (response, variables) => {
                const data = response.data;
                if (data.errors && data.errors.length > 0) {
                    toast.error(`Saved with some errors: ${data.errors[0].error}`);
                    console.error('Save errors:', data.errors);
                } else {
                    const statusMsg = variables.status === 'pending' ? 'submitted for approval' : 'saved as draft';
                    toast.success(`Successfully ${statusMsg} ${examType} grades`);
                }

                queryClient.invalidateQueries(['exam-grades', classCode]);
                if (variables.status === 'pending') {
                    onClose();
                }
            },
            onError: (error) => {
                toast.error(error.response?.data?.error || 'Failed to update grades');
            }
        }
    );

    const handleSave = (status) => {
        const gradesToSave = Object.entries(marks).map(([studentId, mark]) => ({
            student_id: parseInt(studentId),
            marks_obtained: mark === '' ? null : parseFloat(mark)
        })).filter(g => !isNaN(g.marks_obtained) || g.marks_obtained === null);

        if (gradesToSave.length === 0) {
            toast('No marks to save');
            return;
        }

        updateMutation.mutate({
            class_code: classCode,
            exam_type: examType,
            grades: gradesToSave,
            status: status
        });
    };

    const handleMarkChange = (studentId, value) => {
        // allow empty string or numbers
        if (value === '' || (!isNaN(value) && parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
            setMarks(prev => ({
                ...prev,
                [studentId]: value
            }));
        }
    };

    const filteredStudents = students.filter(student =>
        student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.index_no && student.index_no.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (studentsLoading || gradesLoading) return <LoadingSpinner />;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Manage Exam Grades</h2>
                        <p className="text-gray-500">Enter marks for {classCode}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">

                    {/* Exam Type Toggle */}
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setExamType('Mid-term')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${examType === 'Mid-term' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Mid-term
                        </button>
                        <button
                            onClick={() => setExamType('Final')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${examType === 'Final' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Final
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="pl-9 input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                        Student Name
                                    </th>
                                    <th scope="col" className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell">
                                        Index No
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        {examType} Marks (Max 100)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="py-6 text-center text-gray-500">
                                            No students found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 flex items-center gap-3">
                                                <img
                                                    src={student.profile_image_url || `https://ui-avatars.com/api/?name=${student.first_name}+${student.last_name}`}
                                                    alt=""
                                                    className="h-8 w-8 rounded-full"
                                                />
                                                {student.first_name} {student.last_name}
                                            </td>
                                            <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                                                {student.index_no || 'N/A'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    disabled={currentStatus === 'pending' || currentStatus === 'approved'}
                                                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border disabled:bg-gray-100 disabled:text-gray-500"
                                                    placeholder={currentStatus === 'pending' ? 'Pending' : currentStatus === 'approved' ? 'Approved' : '-'}
                                                    value={marks[student.id] ?? ''}
                                                    onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-end gap-3 rounded-b-xl">
                    {currentStatus === 'pending' && (
                        <div className="flex-1 flex items-center text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg text-sm">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Grades are pending approval. You cannot edit them now.
                        </div>
                    )}
                    {currentStatus === 'approved' && (
                        <div className="flex-1 flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-lg text-sm">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Grades have been approved and published.
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        <button
                            onClick={onClose}
                            className="btn btn-secondary w-full sm:w-auto"
                        >
                            Close
                        </button>
                        {currentStatus !== 'pending' && currentStatus !== 'approved' && (
                            <>
                                <button
                                    onClick={() => handleSave('draft')}
                                    disabled={updateMutation.isLoading}
                                    className="btn btn-secondary flex items-center justify-center w-full sm:w-auto"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Draft
                                </button>
                                <button
                                    onClick={() => handleSave('pending')}
                                    disabled={updateMutation.isLoading}
                                    className="btn btn-primary flex items-center justify-center bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                >
                                    {updateMutation.isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                    Submit for Approval
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamGradesManager;
