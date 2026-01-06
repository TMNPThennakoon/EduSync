import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CryptoJS from 'crypto-js';
import {
  QrCode,
  Download,
  Printer,
  RefreshCw,
  User,
  Calendar,
  Mail,
  Loader2,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// Shared secret key - must match backend
const SECRET_KEY = 'EduSync_2026_Secure_Key';

const MyQRCode = ({ isWidget = false }) => {
  const { user } = useAuth();
  const [encryptedData, setEncryptedData] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  // eslint-disable-next-line no-unused-vars
  const [timeLeft, setTimeLeft] = useState(10);

  // Generate Encrypted QR Data
  const generateQRData = () => {
    if (!user) return;

    try {
      const qrPayload = {
        studentId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        timestamp: Date.now(), // Current timestamp for expiry check
        type: 'attendance'
      };

      // Encrypt payload
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(qrPayload),
        SECRET_KEY
      ).toString();

      setEncryptedData(encrypted);
      setLastUpdated(new Date());
      setTimeLeft(10);
      setTimeLeft(30);
    } catch (error) {
      console.error('QR Generation Error:', error);
      toast.error('Failed to generate secure QR code');
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    generateQRData(); // Initial generation

    const intervalId = setInterval(() => {
      generateQRData();
    }, 30000); // 30 seconds

    // Countdown timer for UI
    const timerId = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      toast.error('No QR code available to download');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `student-qr-${user?.first_name}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code downloaded (Note: This code expires in 30s)');
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Dynamically import QRCode component to avoid SSR issues if any, though here we use standard import
  const QRCode = require('qrcode.react').QRCodeCanvas;

  if (!user) {
    return (
      <div className="flex justify-center items-center h-60">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Hide in widget mode */}
      {!isWidget && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Attendance QR</h1>
            <p className="text-gray-600">Dynamic secure code for attendance marking</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0 bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-sm font-medium">
            <RefreshCw className="h-4 w-4 animate-spin-slow" />
            <span>Auto-refreshes every 30s</span>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${!isWidget ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* QR Code Card */}
        <div className={`card flex flex-col items-center justify-center ${isWidget ? 'p-4 border-0 shadow-none' : 'p-8'}`}>
          <div className="relative group">
            <div className={`p-4 bg-white border-4 border-gray-900 rounded-xl shadow-lg ${isWidget ? 'transform scale-90' : ''}`}>
              {encryptedData ? (
                <QRCode
                  value={encryptedData}
                  size={isWidget ? 200 : 256}
                  level={'H'}
                  includeMargin={true}
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="absolute -top-3 -right-3">
              <span className="relative flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-green-500 border-2 border-white items-center justify-center">
                  <Clock className="h-3 w-3 text-white" />
                </span>
              </span>
            </div>

            {/* Timer countdown below QR */}
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Refreshing in {timeLeft}s
              </span>
            </div>
          </div>

          <div className="mt-10 text-center space-y-2">
            {!isWidget && (
              <>
                <h3 className="text-lg font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </h3>
                <p className="text-sm text-gray-500 font-mono">
                  {user.index_no || user.id}
                </p>
              </>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          {!isWidget && (
            <div className="mt-8 flex gap-4 w-full max-w-sm">
              <button
                onClick={handleDownload}
                className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md transform hover:scale-105 transition-all duration-200 flex items-center justify-center py-2.5"
                title="Note: Downloaded codes expire quickly"
              >
                <Download className="h-5 w-5 mr-2" />
                Save
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 btn bg-slate-700 hover:bg-slate-800 text-white border-none shadow-md transform hover:scale-105 transition-all duration-200 flex items-center justify-center py-2.5"
              >
                <Printer className="h-5 w-5 mr-2" />
                Print
              </button>
            </div>
          )}
        </div>

        {/* Info Card - Hide in widget mode */}
        {!isWidget && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Name</p>
                    <p className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <QrCode className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Student ID</p>
                    <p className="text-sm font-medium text-gray-900">{user.id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Department</p>
                    <p className="text-sm font-medium text-gray-900">{user.department || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="flex items-center text-blue-800 font-semibold mb-2">
                <QrCode className="h-4 w-4 mr-2" />
                Security Feature
              </h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                This QR code is <strong>time-sensitive</strong> and <strong>encrypted</strong>.
                It automatically regenerates every 30 seconds to prevent unauthorized attendance marking.
                Screenshots of this code will not work after 35 seconds.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQRCode;

