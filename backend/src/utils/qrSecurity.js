const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.QR_SECRET_KEY || 'EduSync_2026_Secure_Key';

/**
 * Encrypt QR code data with timestamp for time-sensitive validation
 * @param {Object} studentData - Student data object
 * @returns {string} Encrypted QR code string
 */
const encryptQR = (studentData) => {
  try {
    const qrPayload = {
      studentId: studentData.studentId || studentData.id,
      firstName: studentData.firstName || studentData.first_name,
      lastName: studentData.lastName || studentData.last_name,
      email: studentData.email,
      timestamp: Date.now(), // Current timestamp for expiry check
      type: 'attendance'
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(qrPayload),
      SECRET_KEY
    ).toString();

    return encrypted;
  } catch (error) {
    throw new Error(`Failed to encrypt QR code: ${error.message}`);
  }
};

/**
 * Decrypt QR code data and validate expiry (15 seconds)
 * @param {string} encryptedData - Encrypted QR code string
 * @returns {Object} Decrypted data or error object
 */
const decryptQR = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      return { error: "Invalid QR: Decryption failed" };
    }

    const decrypted = JSON.parse(decryptedString);

    // Validate required fields
    if (!decrypted.studentId || !decrypted.timestamp) {
      return { error: "Invalid QR: Missing required fields" };
    }

    // Expiry Check: Reject if QR is older than 35 seconds to prevent proxy attendance
    const now = Date.now();
    const age = now - decrypted.timestamp;

    if (age > 35000) {
      return { error: "QR Expired: Code is older than 35 seconds" };
    }

    return decrypted;
  } catch (e) {
    return { error: "Invalid QR: " + (e.message || "Decryption error") };
  }
};

/**
 * Check if encrypted QR data is valid without decrypting (lightweight validation)
 * @param {string} encryptedData - Encrypted QR code string
 * @returns {boolean} True if format looks valid
 */
const isValidEncryptedFormat = (encryptedData) => {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return false;
  }
  // Encrypted data should be base64-like string
  return encryptedData.length > 10 && /^[A-Za-z0-9+/=]+$/.test(encryptedData);
};

module.exports = {
  encryptQR,
  decryptQR,
  isValidEncryptedFormat,
  SECRET_KEY
};

