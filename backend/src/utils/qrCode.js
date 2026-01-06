const QRCode = require('qrcode');
const { encryptQR } = require('./qrSecurity');

/**
 * Generate QR code data for a student (now encrypted for security)
 * @param {Object} student - Student object with id, first_name, last_name, email
 * @returns {Object} QR code data object (encrypted)
 */
const generateStudentQRData = (student) => {
  const studentData = {
    studentId: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    email: student.email
  };
  
  // Encrypt the QR data with timestamp
  const encryptedData = encryptQR(studentData);
  
  return {
    encrypted: encryptedData,
    version: '2.0' // Version 2.0 indicates encrypted QR codes
  };
};

/**
 * Generate QR code as base64 image (with encrypted data)
 * @param {Object} student - Student object
 * @returns {Promise<string>} Base64 encoded QR code image
 */
const generateQRCodeImage = async (student) => {
  try {
    const qrData = generateStudentQRData(student);
    // The encrypted data is now stored in qrData.encrypted
    // We encode just the encrypted string (not the whole JSON)
    const qrString = qrData.encrypted;
    
    const qrCodeImage = await QRCode.toDataURL(qrString, {
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300,
      errorCorrectionLevel: 'M'
    });
    
    return qrCodeImage;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

/**
 * Generate QR code as SVG (with encrypted data)
 * @param {Object} student - Student object
 * @returns {Promise<string>} SVG QR code
 */
const generateQRCodeSVG = async (student) => {
  try {
    const qrData = generateStudentQRData(student);
    // Use the encrypted string directly
    const qrString = qrData.encrypted;
    
    const qrCodeSVG = await QRCode.toString(qrString, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300,
      errorCorrectionLevel: 'M'
    });
    
    return qrCodeSVG;
  } catch (error) {
    throw new Error(`Failed to generate QR code SVG: ${error.message}`);
  }
};

/**
 * Parse QR code data from scanned string (supports both old and new encrypted format)
 * @param {string} qrString - Scanned QR code string (encrypted or old format)
 * @returns {Object} Parsed QR code data
 */
const parseQRCodeData = (qrString) => {
  const { decryptQR, isValidEncryptedFormat } = require('./qrSecurity');
  
  try {
    // Try to parse as JSON first (old format)
    try {
      const qrData = JSON.parse(qrString);
      
      // If it's old format (has studentId directly)
      if (qrData.studentId && qrData.firstName && qrData.lastName) {
        return qrData;
      }
      
      // If it's new format with encrypted field
      if (qrData.encrypted) {
        const decrypted = decryptQR(qrData.encrypted);
        if (decrypted.error) {
          throw new Error(decrypted.error);
        }
        return decrypted;
      }
    } catch (jsonError) {
      // Not JSON, try as encrypted string directly
      if (isValidEncryptedFormat(qrString)) {
        const decrypted = decryptQR(qrString);
        if (decrypted.error) {
          throw new Error(decrypted.error);
        }
        return decrypted;
      }
      throw new Error('Invalid QR code format');
    }
    
    throw new Error('Invalid QR code format');
  } catch (error) {
    throw new Error(`Invalid QR code data: ${error.message}`);
  }
};

/**
 * Generate a unique QR code ID for tracking
 * @returns {Promise<string>} Unique QR code ID
 */
const generateQRCodeId = async () => {
  const { v4: uuidv4 } = await import('uuid');
  return uuidv4();
};

module.exports = {
  generateStudentQRData,
  generateQRCodeImage,
  generateQRCodeSVG,
  parseQRCodeData,
  generateQRCodeId
};
