import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, ArrowRight, BookOpen, UserCheck } from 'lucide-react';

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();
  const googleData = location.state?.googleData;

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setIsAnimating(true);

    // Add a small delay for animation effect
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'I am a university student',
      icon: GraduationCap,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'from-blue-600 to-blue-700'
    },
    {
      id: 'lecturer',
      title: 'Lecturer',
      description: 'I am a university lecturer',
      icon: UserCheck,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'from-purple-600 to-purple-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {googleData ? `Welcome, ${googleData.first_name}!` : 'Choose Your Role'}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {googleData
              ? 'Please select your role to complete your registration'
              : 'Select your role to continue with the registration process'
            }
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {roles.map((role) => {
            const IconComponent = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={`
                  relative group cursor-pointer transform transition-all duration-300 ease-in-out
                  ${isSelected
                    ? 'scale-105 shadow-2xl'
                    : 'hover:scale-102 hover:shadow-xl'
                  }
                  ${isAnimating && isSelected ? 'animate-pulse' : ''}
                `}
              >
                <div className={`
                  bg-white rounded-2xl p-8 border-2 transition-all duration-300
                  ${isSelected
                    ? 'border-blue-500 shadow-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}>
                  {/* Icon */}
                  <div className={`
                    inline-flex items-center justify-center w-16 h-16 rounded-full mb-6
                    bg-gradient-to-r ${isSelected ? role.color : 'from-gray-400 to-gray-500'}
                    group-hover:bg-gradient-to-r ${role.hoverColor}
                    transition-all duration-300
                  `}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {role.title}
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    {role.description}
                  </p>

                  {/* Arrow */}
                  <div className={`
                    inline-flex items-center text-sm font-medium transition-all duration-300
                    ${isSelected
                      ? 'text-blue-600'
                      : 'text-gray-500 group-hover:text-gray-700'
                    }
                  `}>
                    {isSelected ? 'Selected' : 'Click to select'}
                    <ArrowRight className={`
                      w-4 h-4 ml-2 transition-transform duration-300
                      ${isSelected ? 'translate-x-1' : 'group-hover:translate-x-1'}
                    `} />
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        {selectedRole && (
          <div className="text-center">
            <Link
              to={`/register?role=${selectedRole}`}
              state={location.state}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue as {roles.find(r => r.id === selectedRole)?.title}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        )}

        {/* Back to Login */}
        <div className="text-center mt-8">
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
