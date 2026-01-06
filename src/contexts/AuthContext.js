import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.user);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      setUser(user);
      setToken(token);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      setUser(user);
      setToken(token);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const submitRegistration = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return {
        success: true,
        message: 'Registration submitted successfully',
        userId: response.data.user?.id || response.data.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration submission failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Profile update failed'
      };
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Profile refresh failed'
      };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Password change failed'
      };
    }
  };

  const sendOtp = async (email) => {
    try {
      await authAPI.sendOtp(email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Failed to send OTP' };
    }
  };

  const verifyOtp = async (email, code) => {
    try {
      await authAPI.verifyOtp(email, code);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Invalid code' };
    }
  };

  const googleLogin = async (token) => {
    try {
      const response = await authAPI.googleLogin(token);

      if (response.data.isNewUser) {
        return { success: true, isNewUser: true, googleData: response.data.googleData };
      }

      const { user, token: jwtToken } = response.data;
      localStorage.setItem('token', jwtToken);
      setUser(user);
      setToken(jwtToken);
      return { success: true, isNewUser: false };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Google login failed' };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    submitRegistration,
    logout,
    updateProfile,
    refreshProfile,
    changePassword,
    sendOtp,
    verifyOtp,
    googleLogin,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLecturer: user?.role === 'lecturer' || user?.role === 'admin',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
