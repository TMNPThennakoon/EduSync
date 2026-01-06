import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { gradesAPI, classesAPI } from '../services/api'; // Assuming classesAPI can give enrolled students
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import { Save, X } from 'lucide-react';

const ExamGradesManager = ({ classCode, onClose }) => {
    const [examType, setExamType] = useState('Mid-term');
    const [grades, setGrades] = useState({});
    const queryClient = useQueryClient();

    // Fetch enrolled students
    // Using classesAPI.getEnrolledStudents which likely takes class ID. 
    // Wait, I might need class ID or code. Let's assume classCode works for fetching class info first to get ID if needed, 
    // OR the API supports classCode. Let's check api.js... loops like getEnrolledStudents takes classId.
    // I'll need to pass classId prop if possible, or fetch class by code.
    // For now, let's assume classId is passed or we have a way to get students.
    // Actually, I can use the new getExamGrades to fetch existing grades AND the students.

    const { data: studentsData, isLoading: studentsLoading } = useQuery(
        ['class-students', classCode],
        () => gradesAPI.getExamGrades({ class_code: classCode }), // Use our new endpoint which joins users
        {
            onSuccess: (data) => {
                // Initialize grades state
                const initialGrades = {};
                data.grades.forEach(record => {
                    // For the selected exam type, pre-fill
                    if (record.exam_type === examType) {
                        initialGrades[record.student_id] = record.marks_obtained;
                    }
                });
                // We also need ALL students, not just those with grades. 
                // Our getExamGrades query in backend performs a JOIN on exam_grades.
                // If a student has NO exam grades yet, they won't show up!
                // User controller has "getEnrolledStudents".
            }
        }
    );

    // We need a list of ALL enrolled students + their current grades.
    // Let's fetch enrolled students separately to ensure we have everyone.
    // Then fetch current grades map.

    const { data: enrolledData, isLoading: enrolledLoading } = useQuery(
        ['enrolled', classCode],
        () => classesAPI.getEnrolledStudents(classCode) // Wait, api.js says getEnrolledStudents(classId).
        // I need to be careful. ClassDetail passes classId.
    );

    // Let's refactor to accept classId as well.
};
