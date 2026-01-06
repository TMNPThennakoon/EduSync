import React, { useState, useEffect } from 'react';
import { X, Camera, CheckCircle, AlertCircle, Copy } from 'lucide-react';

const QRScanner = ({ isOpen, onScan, onClose, classId, date }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [manualQRCode, setManualQRCode] = useState('');

  // Sample QR codes for testing
  const sampleQRCodes = {
    student1: JSON.stringify({
      studentId: 6,
      firstName: 'John',
      lastName: 'Doe',
      email: 'student1@classroom.com',
      type: 'attendance',
      generatedAt: new Date().toISOString(),
      version: '1.0'
    }),
    student2: JSON.stringify({
      studentId: 7,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'student2@classroom.com',
      type: 'attendance',
      generatedAt: new Date().toISOString(),
      version: '1.0'
    }),
    student3: JSON.stringify({
      studentId: 8,
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'student3@classroom.com',
      type: 'attendance',
      generatedAt: new Date().toISOString(),
      version: '1.0'
    })
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setManualQRCode('');
    }
  }, [isOpen]);

  const handleManualSubmit = async () => {
    if (!manualQRCode.trim()) {
      setError('Please enter a QR code');
      return;
    }

    try {
      await onScan(manualQRCode);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setError('Failed to process QR code. Please try again.');
    }
  };

  const handleSampleQR = (qrData) => {
    setManualQRCode(qrData);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setManualQRCode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Scan Student QR Code
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!success && (
              <div className="space-y-4">
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Enter the QR code data manually or use a sample for testing
                  </p>
                </div>

                {/* Sample QR Codes for Testing */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Sample QR Codes (for testing):</h4>
                  <div className="space-y-2">
                    {Object.entries(sampleQRCodes).map(([key, qrData]) => (
                      <div key={key} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm text-gray-600">
                          {key === 'student1' && 'John Doe (ID: 6)'}
                          {key === 'student2' && 'Jane Smith (ID: 7)'}
                          {key === 'student3' && 'Mike Johnson (ID: 8)'}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSampleQR(qrData)}
                            className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
                          >
                            Use
                          </button>
                          <button
                            onClick={() => copyToClipboard(qrData)}
                            className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manual QR Code Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QR Code Data
                  </label>
                  <textarea
                    value={manualQRCode}
                    onChange={(e) => setManualQRCode(e.target.value)}
                    placeholder="Paste QR code data here or use a sample above..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleManualSubmit}
                    className="flex-1 btn btn-primary"
                    disabled={!manualQRCode.trim()}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Process QR Code
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

            {success && (
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-green-600 font-medium mb-2">
                  QR Code Processed Successfully!
                </p>
                <p className="text-sm text-gray-600">
                  Attendance has been recorded
                </p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <p className="text-red-600 font-medium mb-2">
                  Error
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Class and Date Info */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <p><strong>Class ID:</strong> {classId || 'Not selected'}</p>
                <p><strong>Date:</strong> {date || 'Not selected'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
