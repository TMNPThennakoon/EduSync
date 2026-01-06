import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import StudentGrades from '../components/grades/StudentGrades';
import LecturerGrades from '../components/grades/LecturerGrades';

const Grades = () => {
  const { isStudent } = useAuth();

  return (
    <div>
      {isStudent ? <StudentGrades /> : <LecturerGrades />}
    </div>
  );
};

export default Grades;
