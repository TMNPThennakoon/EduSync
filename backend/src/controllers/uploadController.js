const cloudinary = require('../config/cloudinary');
const { logUserAction, logError } = require('../utils/logger');

const uploadTempImage = async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('File:', req.file ? `Yes, size: ${req.file.size}, type: ${req.file.mimetype}` : 'No');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded. Please select an image file.' });
    }

    // Check if Cloudinary is configured
    const cloudName = cloudinary.config().cloud_name;
    const apiKey = cloudinary.config().api_key;
    const apiSecret = cloudinary.config().api_secret;

    console.log('Cloudinary config check:', {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary not configured properly');
      return res.status(500).json({ 
        error: 'Image upload service is not configured. Please contact administrator.',
        details: process.env.NODE_ENV === 'development' ? 'Missing Cloudinary credentials' : undefined
      });
    }

    // For large files, use stream; for smaller files, use direct upload
    const fileSizeMB = req.file.buffer.length / (1024 * 1024);
    console.log('File size:', fileSizeMB.toFixed(2), 'MB');
    
    // Use upload_stream for better handling of large files
    return new Promise((resolve, reject) => {
      console.log('Starting Cloudinary upload stream...');
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'classroom-attendance/temp_profiles',
          public_id: `temp_profile_${Date.now()}`,
          overwrite: true,
          invalidate: true
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            console.error('Error details:', {
              message: error.message,
              http_code: error.http_code,
              name: error.name
            });
            
            logError(error, { 
              action: 'upload_temp_image', 
              userId: req.user?.id || 'anonymous',
              errorMessage: error.message,
              errorCode: error.http_code
            });
            
            if (!res.headersSent) {
              res.status(500).json({ 
                error: 'Failed to upload image to cloud storage',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Please verify your Cloudinary credentials'
              });
            }
            reject(error);
            return;
          }

          if (!result) {
            console.error('No result from Cloudinary upload');
            if (!res.headersSent) {
              res.status(500).json({ 
                error: 'Upload completed but no result received',
                details: 'Please try again'
              });
            }
            reject(new Error('No result from Cloudinary'));
            return;
          }

          console.log('Upload successful:', result.secure_url);

          try {
            logUserAction('temp_image_uploaded', req.user?.id || 'anonymous', {
              cloudinaryUrl: result.secure_url,
              publicId: result.public_id
            });
          } catch (logErr) {
            console.error('Error logging upload action:', logErr);
          }

          if (!res.headersSent) {
            res.json({
              message: 'Temporary image uploaded successfully',
              imageUrl: result.secure_url,
              publicId: result.public_id
            });
          }
          resolve(result);
        }
      );

      // Handle stream errors
      uploadStream.on('error', (streamError) => {
        console.error('Upload stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to upload image',
            details: process.env.NODE_ENV === 'development' ? streamError.message : undefined
          });
        }
        reject(streamError);
      });

      // Write buffer to stream
      console.log('Writing buffer to stream...');
      uploadStream.end(req.file.buffer);
      console.log('Buffer written, waiting for Cloudinary response...');
    });
  } catch (error) {
    console.error('Temp upload error:', error);
    console.error('Error stack:', error.stack);
    logError(error, { action: 'upload_temp_image', userId: req.user?.id || 'anonymous' });
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = {
  uploadTempImage,
};




