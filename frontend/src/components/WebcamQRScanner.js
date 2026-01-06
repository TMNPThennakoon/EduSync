import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle, AlertCircle, Video, VideoOff, Users, UserCheck, UserMinus } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { attendanceSessionAPI } from '../services/api';

const WebcamQRScanner = ({ isOpen, onScan, onClose, classId, date }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQRCode, setManualQRCode] = useState('');
  const [stats, setStats] = useState(null);

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Fetch session stats
  const fetchStats = async () => {
    if (!classId) return;
    try {
      const response = await attendanceSessionAPI.getActive(classId);
      if (response.data.success) {
        // We need detailed stats (total enrolled vs marked)
        // The getActive endpoint returns session and markedCount.
        // We might need to fetch full stats if getActive doesn't return enrolled count.
        // Let's call getStats if we have a session ID
        if (response.data.session?.id) {
          const statsResponse = await attendanceSessionAPI.getStats(response.data.session.id);
          if (statsResponse.data.success) {
            setStats(statsResponse.data.stats);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
    }
  };

  // Function to create QR scanner with robust error handling
  const createQRScanner = async (videoElement) => {
    const scannerOptions = {
      highlightScanRegion: true,
      highlightCodeOutline: true,
      preferredCamera: 'environment',
      maxScansPerSecond: 5,
    };

    try {
      // First try with default worker
      return new QrScanner(videoElement, (result) => {
        handleQRResult(result.data);
      }, scannerOptions);
    } catch (workerError) {
      console.warn('QR Scanner worker failed, trying without worker:', workerError);

      // Try without worker
      try {
        return new QrScanner(videoElement, (result) => {
          handleQRResult(result.data);
        }, {
          ...scannerOptions,
          worker: null
        });
      } catch (fallbackError) {
        console.error('QR Scanner fallback also failed:', fallbackError);
        throw new Error('QR Scanner initialization failed. Please refresh the page and try again.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      startScanning();
      fetchStats(); // Fetch stats when opening
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, classId]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setError('No camera found. Please ensure your device has a camera.');
        setIsScanning(false);
        return;
      }

      // Get camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment' // Use back camera if available
        }
      });

      setHasPermission(true);

      // Create QR scanner with robust error handling
      if (videoRef.current) {
        qrScannerRef.current = await createQRScanner(videoRef.current);
        await qrScannerRef.current.start();
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.message && err.message.includes('worker')) {
        setError('QR Scanner initialization failed. Please refresh the page and try again.');
      } else {
        setError('Failed to access camera. Please check permissions and try again.');
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

  const handleQRResult = async (qrData) => {
    try {
      setSuccess(true);
      await onScan(qrData);

      // Update stats after successful scan
      fetchStats();

      // Stop scanning after successful scan
      stopScanning();

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError('Failed to process QR code. Please try again.');
      setSuccess(false);
    }
  };

  const handleClose = () => {
    stopScanning();
    setError(null);
    setSuccess(false);
    onClose();
  };

  const retryScanning = () => {
    setError(null);
    setSuccess(false);
    setShowManualInput(false);
    startScanning();
  };

  const handleManualSubmit = async () => {
    if (!manualQRCode.trim()) {
      setError('Please enter a QR code or student ID');
      return;
    }

    try {
      await handleQRResult(manualQRCode.trim());
    } catch (error) {
      setError('Failed to process QR code. Please try again.');
    }
  };

  const showManualInputForm = () => {
    setShowManualInput(true);
    setError(null);
    stopScanning();
  };

  // Calculate remaining students
  const getRemainingCount = () => {
    if (!stats) return 0;
    return Math.max(0, (stats.totalEnrolled || 0) - (stats.totalMarked || 0));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Scan Student QR Code
              </h3>
              {stats && (
                <div className="flex space-x-4 mt-2 text-sm">
                  <span className="flex items-center text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                    <Users className="h-4 w-4 mr-1" />
                    Total: {stats.totalEnrolled || 0}
                  </span>
                  <span className="flex items-center text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                    <UserCheck className="h-4 w-4 mr-1" />
                    Present: {stats.totalMarked || 0}
                  </span>
                  <span className="flex items-center text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                    <UserMinus className="h-4 w-4 mr-1" />
                    Remaining: {getRemainingCount()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!hasPermission && !isScanning && !showManualInput && (
              <div className="text-center py-8">
                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Camera Access Required
                </h4>
                <p className="text-gray-600 mb-4">
                  Please allow camera access to scan QR codes
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={startScanning}
                    className="btn btn-primary"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </button>
                  <button
                    onClick={showManualInputForm}
                    className="btn btn-secondary"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            )}

            {isScanning && !error && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Position QR Code in Camera View
                  </h4>
                  <p className="text-gray-600">
                    Hold the student's QR code steady in front of the camera
                  </p>
                </div>

                {/* Video Container */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    playsInline
                    muted
                  />

                  {/* Scanning Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white border-dashed rounded-lg w-48 h-48 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Camera className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Scan QR Code Here</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-3">
                  <button
                    onClick={stopScanning}
                    className="btn btn-secondary"
                  >
                    <VideoOff className="h-4 w-4 mr-2" />
                    Stop Camera
                  </button>
                </div>
              </div>
            )}

            {error && !showManualInput && (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Camera Error
                </h4>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={retryScanning}
                    className="btn btn-primary"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                  <button
                    onClick={showManualInputForm}
                    className="btn btn-secondary"
                  >
                    Enter Manually
                  </button>
                  <button
                    onClick={handleClose}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showManualInput && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Manual QR Code Entry
                  </h4>
                  <p className="text-gray-600">
                    Enter the student's QR code data or student ID manually
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Data or Student ID
                    </label>
                    <input
                      type="text"
                      value={manualQRCode}
                      onChange={(e) => setManualQRCode(e.target.value)}
                      placeholder="Enter QR code data or student ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleManualSubmit}
                      className="btn btn-primary"
                      disabled={!manualQRCode.trim()}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit
                    </button>
                    <button
                      onClick={retryScanning}
                      className="btn btn-secondary"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </button>
                    <button
                      onClick={handleClose}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  QR Code Scanned Successfully!
                </h4>
                <p className="text-gray-600">
                  Attendance has been recorded
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamQRScanner;
