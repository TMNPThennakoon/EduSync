import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle, AlertCircle, Video, VideoOff, Users, Clock, Play, Square, Sparkles, UserCheck, AlertTriangle, Edit2 } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { attendanceAPI, attendanceSessionAPI, classesAPI } from '../services/api';
import { playSuccessBeep, playErrorAlert } from '../utils/audio';
import toast from 'react-hot-toast';

const AttendanceScanner = ({ isOpen, onClose, activeClass }) => {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [scannedList, setScannedList] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionStats, setSessionStats] = useState({ totalEnrolled: 0, markedCount: 0 });
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState('present');

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const statsIntervalRef = useRef(null);

  // Fetch enrolled students count
  useEffect(() => {
    if (activeClass && isOpen) {
      fetchEnrolledCount();
    }
  }, [activeClass, isOpen]);

  // Fetch active session and start polling for stats
  useEffect(() => {
    if (activeClass && isOpen) {
      checkActiveSession();
      // Poll for stats every 2 seconds
      statsIntervalRef.current = setInterval(() => {
        if (currentSession?.id) {
          updateSessionStats();
        }
      }, 2000);
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [activeClass, isOpen, currentSession?.id]);

  const fetchEnrolledCount = async () => {
    try {
      const response = await classesAPI.getEnrolledStudents(activeClass);
      const students = response.data?.students || response.data?.data?.students || [];
      setSessionStats(prev => ({ ...prev, totalEnrolled: students.length }));
    } catch (error) {
      console.error('Error fetching enrolled count:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      setIsLoadingSession(true);
      const response = await attendanceSessionAPI.getActive(activeClass);

      if (response.data.success && response.data.session) {
        setCurrentSession(response.data.session);
        setSessionStats(prev => ({
          ...prev,
          markedCount: response.data.markedCount || 0
        }));
      } else {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setCurrentSession(null);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const startSession = async () => {
    try {
      setIsLoadingSession(true);
      const response = await attendanceSessionAPI.start(activeClass);

      if (response.data.success) {
        setCurrentSession(response.data.session);
        toast.success('🎉 Attendance session started successfully!');
        checkActiveSession();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start session');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const endSession = async () => {
    if (!currentSession) return;

    const confirmed = window.confirm('Are you sure you want to complete this attendance session?');
    if (!confirmed) return;

    try {
      setIsEndingSession(true);
      const response = await attendanceSessionAPI.end({ session_id: currentSession.id });

      if (response.data.success) {
        toast.success('✅ Attendance session completed successfully!');
        setCurrentSession(null);
        setScannedList([]);
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to end session');
    } finally {
      setIsEndingSession(false);
    }
  };

  const updateSessionStats = async () => {
    if (!currentSession?.id) return;

    try {
      const response = await attendanceSessionAPI.getStats(currentSession.id);
      if (response.data.success) {
        setSessionStats({
          totalEnrolled: response.data.stats.totalEnrolled,
          markedCount: response.data.stats.totalMarked
        });
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const createQRScanner = async (videoElement) => {
    const scannerOptions = {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      preferredCamera: 'environment',
      maxScansPerSecond: 5,
    };

    try {
      return new QrScanner(videoElement, (result) => {
        handleScan(result.data);
      }, scannerOptions);
    } catch (workerError) {
      console.warn('QR Scanner worker failed, trying without worker:', workerError);
      try {
        return new QrScanner(videoElement, (result) => {
          handleScan(result.data);
        }, {
          ...scannerOptions,
          worker: null
        });
      } catch (fallbackError) {
        console.error('QR Scanner fallback also failed:', fallbackError);
        throw new Error('QR Scanner initialization failed');
      }
    }
  };

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setError('No camera found. Please ensure your device has a camera.');
        setIsScanning(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      setHasPermission(true);

      if (videoRef.current) {
        qrScannerRef.current = await createQRScanner(videoRef.current);
        await qrScannerRef.current.start();
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found.');
      } else {
        setError('Failed to access camera.');
      }
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScan = async (qrData) => {
    if (!currentSession) {
      toast.error('⚠️ Please start an attendance session first');
      return;
    }

    try {
      const response = await attendanceAPI.markSmart({
        qrData,
        classCode: activeClass,
        sessionId: currentSession.id
      });

      if (response.data.success) {
        playSuccessBeep();
        toast.success(`✅ Marked: ${response.data.student.first_name} ${response.data.student.last_name}`);

        setScannedList(prev => [response.data.student, ...prev]);

        setSessionStats(prev => ({
          ...prev,
          markedCount: response.data.markedCount
        }));
      }
    } catch (error) {
      playErrorAlert();
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Attendance failed';
      toast.error(errorMsg);

      if (error.response?.status === 500) {
        stopScanning();
      }
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStudent) return;

    try {
      const attendanceId = editingStudent.attendance_id;

      if (!attendanceId) {
        toast.error('Attendance record not found. Please mark attendance first.');
        return;
      }

      await attendanceAPI.updateStatus({
        attendance_id: attendanceId,
        status: editStatus,
        note: editNote
      });

      toast.success('✅ Status updated successfully!');

      setScannedList(prev => prev.map(student =>
        student.id === editingStudent.id
          ? { ...student, status: editStatus, attendance_id: attendanceId }
          : student
      ));

      setEditingStudent(null);
      setEditNote('');
      updateSessionStats();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleClose = () => {
    stopScanning();
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    setError(null);
    setScannedList([]);
    setEditingStudent(null);
    onClose();
  };

  const progressPercentage = sessionStats.totalEnrolled > 0
    ? (sessionStats.markedCount / sessionStats.totalEnrolled) * 100
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Enhanced Backdrop with blur */}
        <div
          className="fixed inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleClose}
        />

        {/* Main Modal Container */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100">
          {/* Beautiful Gradient Header */}
          <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                animation: 'slide 20s linear infinite'
              }}></div>
            </div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold flex items-center space-x-2">
                    <span>Smart Attendance Scanner</span>
                    {currentSession && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/30 backdrop-blur-sm border border-white/30">
                        <span className="w-2 h-2 bg-green-300 rounded-full mr-1.5 animate-pulse"></span>
                        Active
                      </span>
                    )}
                  </h3>
                  {currentSession && (
                    <p className="text-sm text-white/90 mt-1 flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Started: {new Date(currentSession.start_time).toLocaleTimeString()}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Enhanced Stats Bar with Progress */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Total Enrolled</p>
                      <p className="text-2xl font-bold text-gray-900">{sessionStats.totalEnrolled}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-green-100 rounded-lg">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Marked Present</p>
                      <p className="text-2xl font-bold text-green-600">{sessionStats.markedCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Remaining</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {sessionStats.totalEnrolled - sessionStats.markedCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center space-x-3">
                {!currentSession ? (
                  <button
                    onClick={startSession}
                    disabled={isLoadingSession}
                    className="relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Play className="h-5 w-5" />
                    <span>Start Session</span>
                    {isLoadingSession && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-xl">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={endSession}
                    disabled={isEndingSession}
                    className="relative px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Square className="h-5 w-5" />
                    <span>Complete Attendance</span>
                    {isEndingSession && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-xl">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {currentSession && sessionStats.totalEnrolled > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Attendance Progress</span>
                  <span className="text-sm font-bold text-gray-900">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 ease-out relative"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scanner Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Camera className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">QR Code Scanner</h4>
                </div>

                {!currentSession && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800 font-medium">
                        Please start an attendance session to begin scanning QR codes
                      </p>
                    </div>
                  </div>
                )}

                {currentSession && !hasPermission && !isScanning && (
                  <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 text-center">
                    <div className="inline-flex p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
                      <Camera className="h-12 w-12 text-indigo-600" />
                    </div>
                    <h5 className="text-lg font-semibold text-gray-900 mb-2">Ready to Scan</h5>
                    <p className="text-sm text-gray-600 mb-6">Click the button below to activate your camera</p>
                    <button
                      onClick={startScanning}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 mx-auto"
                      disabled={!currentSession}
                    >
                      <Camera className="h-5 w-5" />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}

                {isScanning && (
                  <>
                    <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-white">
                      <video
                        ref={videoRef}
                        className="w-full h-80 object-cover"
                        playsInline
                        muted
                      />
                      {/* Animated Scanning Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          {/* Corner brackets */}
                          <div className="absolute -top-2 -left-2 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg animate-pulse"></div>
                          <div className="absolute -top-2 -right-2 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg animate-pulse"></div>
                          <div className="absolute -bottom-2 -left-2 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg animate-pulse"></div>
                          <div className="absolute -bottom-2 -right-2 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg animate-pulse"></div>

                          {/* Center area */}
                          <div className="w-56 h-56 border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-sm">
                            <div className="text-white text-center">
                              <Camera className="h-10 w-10 mx-auto mb-2 animate-bounce" />
                              <p className="text-sm font-medium">Position QR Code Here</p>
                            </div>
                          </div>

                          {/* Scanning line animation */}
                          <div className="absolute inset-0 overflow-hidden rounded-lg">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={stopScanning}
                      className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <VideoOff className="h-5 w-5" />
                      <span>Stop Camera</span>
                    </button>
                  </>
                )}
              </div>

              {/* Scanned Students List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Scanned Students</h4>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                    {scannedList.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {scannedList.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
                      <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                        <Users className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No students scanned yet</p>
                      <p className="text-sm text-gray-500 mt-2">Scan QR codes to mark attendance</p>
                    </div>
                  ) : (
                    scannedList.map((student, index) => (
                      <div
                        key={student.id || index}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer group"
                        onClick={() => {
                          setEditingStudent(student);
                          setEditStatus(student.status || 'present');
                          setEditNote('');
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          {/* Profile Image with Ring */}
                          <div className="relative">
                            <img
                              src={student.profile_image_url || '/default-avatar.png'}
                              alt={`${student.first_name} ${student.last_name}`}
                              className="w-14 h-14 rounded-full object-cover border-3 border-gradient-to-r from-indigo-400 to-purple-400 ring-2 ring-offset-2 ring-indigo-200 group-hover:ring-indigo-400 transition-all duration-200"
                              onError={(e) => {
                                e.target.src = '/default-avatar.png';
                              }}
                            />
                            {student.status === 'present' && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center space-x-1">
                              <span>Index:</span>
                              <span className="font-medium">{student.index_no || 'N/A'}</span>
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1 ${student.status === 'present' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                            student.status === 'late' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' :
                              student.status === 'excused' ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white' :
                                'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                            }`}>
                            <span>{student.status?.toUpperCase() || 'PRESENT'}</span>
                            <Edit2 className="h-3 w-3 opacity-75" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Edit Modal */}
          {editingStudent && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 animate-slideUp border border-gray-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Edit2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Update Attendance Status</h4>
                </div>

                {/* Student Info Preview */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6 border border-indigo-100">
                  <div className="flex items-center space-x-3">
                    <img
                      src={editingStudent.profile_image_url || '/default-avatar.png'}
                      alt={`${editingStudent.first_name} ${editingStudent.last_name}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white"
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {editingStudent.first_name} {editingStudent.last_name}
                      </p>
                      <p className="text-sm text-gray-600">Index: {editingStudent.index_no}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white font-medium"
                    >
                      <option value="present">✅ Present</option>
                      <option value="late">⏰ Late</option>
                      <option value="excused">📝 Excused</option>
                      <option value="absent">❌ Absent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Note (Optional)
                    </label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none"
                      rows="3"
                      placeholder="Add a note (e.g., Medical leave, Late arrival reason)..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setEditingStudent(null)}
                      className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStatus}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(400%);
          }
        }
        
        .animate-scan {
          animation: scan 2s linear infinite;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AttendanceScanner;
