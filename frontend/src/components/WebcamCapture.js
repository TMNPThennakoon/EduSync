import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, CheckCircle, AlertCircle, Video, VideoOff, RotateCcw } from 'lucide-react';

const WebcamCapture = ({ isOpen, onCapture, onClose, title = 'Capture Profile Photo' }) => {
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCapturing(true);

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else {
        setError('Failed to access camera. Please check permissions and try again.');
      }
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setHasPermission(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        // Create preview URL
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({ file, preview: imageUrl });
      }
    }, 'image/jpeg', 0.95);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (!hasPermission) {
      startCamera();
    }
  };

  const acceptPhoto = () => {
    if (capturedImage && capturedImage.file) {
      onCapture(capturedImage.file);
      stopCamera();
      onClose();
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    stopCamera();
    setError(null);
    setCapturedImage(null);
    onClose();
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
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Camera Error</h4>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex justify-center space-x-3">
                  <button onClick={startCamera} className="btn btn-primary">
                    <Camera className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                  <button onClick={handleClose} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!error && !capturedImage && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Position yourself in the camera view
                  </h4>
                  <p className="text-gray-600">
                    Make sure your face is clearly visible and well-lit
                  </p>
                </div>

                {/* Video Container */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-96 object-cover"
                    playsInline
                    muted
                    autoPlay
                  />

                  {/* Capture Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-white border-dashed rounded-full w-64 h-64 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm font-medium">Position face here</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex justify-center space-x-3">
                  <button
                    onClick={switchCamera}
                    className="btn btn-secondary"
                    title="Switch camera"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Switch Camera
                  </button>
                  <button onClick={capturePhoto} className="btn btn-primary">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </button>
                  <button onClick={handleClose} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Review your photo
                  </h4>
                  <p className="text-gray-600">
                    Make sure you're happy with this photo before continuing
                  </p>
                </div>

                {/* Captured Image Preview */}
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <img
                    src={capturedImage.preview}
                    alt="Captured profile photo"
                    className="w-full h-96 object-cover"
                  />
                </div>

                <div className="flex justify-center space-x-3">
                  <button onClick={retakePhoto} className="btn btn-secondary">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </button>
                  <button onClick={acceptPhoto} className="btn btn-primary">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Use This Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;


