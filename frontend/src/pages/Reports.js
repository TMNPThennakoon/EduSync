import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI, classesAPI } from '../services/api';
import { FileText, Download, TrendingUp, Users, Calendar, Award, CheckSquare } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

const Reports = () => {
    const { user, isLecturer, isAdmin } = useAuth();
    const [selectedSemester, setSelectedSemester] = useState('1');
    const [selectedClass, setSelectedClass] = useState('');

    // Fetch Logic
    const { data: studentReport, isLoading: isLoadingStudent } = useQuery(
        ['studentReport', user?.id, selectedSemester],
        () => reportAPI.getStudentReport(user?.id, { semester: selectedSemester }),
        { enabled: !!user && !isLecturer && !isAdmin }
    );

    const { data: classesData } = useQuery('classes', classesAPI.getAll, {
        enabled: isLecturer || isAdmin
    });

    const { data: lecturerReport, isLoading: isLoadingLecturer } = useQuery(
        ['lecturerReport', selectedClass],
        () => reportAPI.getLecturerReport({ class_code: selectedClass }),
        { enabled: (isLecturer || isAdmin) && !!selectedClass }
    );

    const { data: adminReport, isLoading: isLoadingAdmin } = useQuery(
        'adminReport',
        reportAPI.getAdminReport,
        { enabled: isAdmin }
    );

    // PDF Generators
    const generateStudentPDF = () => {
        if (!studentReport?.data) return;
        const { student, grades, attendance, gpa } = studentReport.data;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 116, 240); // Primary Blue
        doc.text('EduSync', 14, 20);
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text('Student Semester Transcript', 14, 30);

        // Student Info
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Name: ${student.name}`, 14, 45);
        doc.text(`Index No: ${student.index_no}`, 14, 50);
        doc.text(`Department: ${student.department}`, 14, 55);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 45);

        // Grades Table
        autoTable(doc, {
            startY: 65,
            head: [['Subject', 'Class Code', 'Marks', 'Grade']],
            body: grades.map(g => [
                g.class_name,
                g.class_code,
                `${g.marks_obtained}/${g.max_score}`,
                // Simple grading logic for demo
                g.marks_obtained >= 75 ? 'A' : g.marks_obtained >= 65 ? 'B' : g.marks_obtained >= 50 ? 'C' : 'F'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [40, 116, 240] }
        });

        // Attendance Section
        const finalY = (doc.lastAutoTable?.finalY || 65) + 15;
        doc.setFontSize(12);
        doc.text('Attendance Summary', 14, finalY);
        doc.setFontSize(10);
        doc.text(`Total Days: ${attendance?.total_days || 0}`, 14, finalY + 8);
        doc.text(`Present Days: ${attendance?.present_days || 0}`, 14, finalY + 13);
        doc.text(`Percentage: ${attendance?.percentage || 0}%`, 14, finalY + 18);

        doc.save(`Transcript_${student.index_no}.pdf`);
    };

    const generateClassMeritPDF = () => {
        if (!lecturerReport?.data) return;
        const { class_info, students, assignments } = lecturerReport.data;
        const doc = new jsPDF(); // Landscape maybe better?

        doc.setFontSize(22);
        doc.setTextColor(40, 116, 240);
        doc.text('EduSync', 14, 20);
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`Class Merit List - ${class_info.class_name}`, 14, 30);

        const head = [['Index No', 'Name', ...assignments]];
        const body = students.map(s => [
            s.index,
            s.name,
            ...assignments.map(a => s.scores[a] || '-')
        ]);

        autoTable(doc, {
            startY: 40,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [40, 116, 240] }
        });

        doc.save(`MeritList_${class_info.class_code}.pdf`);
    };

    const generateClassCSV = () => {
        if (!lecturerReport?.data) return;
        const { students, assignments } = lecturerReport.data;

        const data = students.map(s => {
            const row = {
                'Index No': s.index,
                'Name': s.name
            };
            assignments.forEach(a => {
                row[a] = s.scores[a] || 0;
            });
            return row;
        });

        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'class_merit_list.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoadingStudent || isLoadingAdmin) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>

            {/* STUDENT VIEW */}
            {!isLecturer && !isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card p-6">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <FileText className="text-blue-600 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Semester Transcript</h3>
                                <p className="text-sm text-gray-500">Download your academic performance report.</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Semester</label>
                            <select
                                value={selectedSemester}
                                onChange={(e) => setSelectedSemester(e.target.value)}
                                className="input"
                            >
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
                            </select>
                        </div>
                        <button onClick={generateStudentPDF} className="btn btn-primary w-full">
                            <Download className="h-4 w-4 mr-2" /> Download PDF
                        </button>
                    </div>

                    <div className="card p-6">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="bg-green-100 p-3 rounded-full">
                                <CheckSquare className="text-green-600 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Attendance Summary</h3>
                                <p className="text-sm text-gray-500">View your attendance statistics.</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Total Attendance</span>
                                <span className="font-bold text-gray-900">{studentReport?.data?.attendance?.percentage || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-green-600 h-2.5 rounded-full"
                                    style={{ width: `${studentReport?.data?.attendance?.percentage || 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LECTURER VIEW */}
            {(isLecturer || isAdmin) && (
                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold mb-4">Class Reports</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Select a Class</option>
                                    {classesData?.data?.classes?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedClass && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={generateClassMeritPDF} disabled={isLoadingLecturer} className="btn btn-primary flex justify-center items-center">
                                    {isLoadingLecturer ? <LoadingSpinner size="sm" /> : <><FileText className="mr-2 h-4 w-4" /> Download Merit List (PDF)</>}
                                </button>
                                <button onClick={generateClassCSV} disabled={isLoadingLecturer} className="btn btn-secondary flex justify-center items-center">
                                    <Download className="mr-2 h-4 w-4" /> Download Raw Data (CSV)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ADMIN OVERVIEW */}
            {isAdmin && adminReport?.data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card p-6 flex items-center">
                        <div className="bg-purple-100 p-3 rounded-full mr-4">
                            <Users className="text-purple-600 h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Total Users</p>
                            <h3 className="text-2xl font-bold">{adminReport.data.users.reduce((acc, curr) => acc + parseInt(curr.count), 0)}</h3>
                        </div>
                    </div>
                    <div className="card p-6 flex items-center">
                        <div className="bg-yellow-100 p-3 rounded-full mr-4">
                            <Calendar className="text-yellow-600 h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Active Classes</p>
                            <h3 className="text-2xl font-bold">{adminReport.data.classes || 0}</h3>
                        </div>
                    </div>
                    <div className="card p-6 flex items-center">
                        <div className="bg-blue-100 p-3 rounded-full mr-4">
                            <Award className="text-blue-600 h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Today's Attendance</p>
                            <h3 className="text-2xl font-bold">{adminReport.data.attendance_today?.present_count || 0}</h3>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Reports;
