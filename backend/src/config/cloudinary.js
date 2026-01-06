const cloudinary = require('cloudinary');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Log configuration status (without exposing secrets)
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️  Cloudinary credentials not found in environment variables.');
  console.warn('   Image upload functionality may not work properly.');
  console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.');
} else {
  console.log('✅ Cloudinary configured successfully');
  console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Not set');
  console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'Not set');
  
  // Test Cloudinary connection (using admin API to verify credentials)
  // Note: This test may fail if admin API is not enabled, but uploads will still work
  try {
    cloudinary.api.ping((error, result) => {
      if (error) {
        // Ping might fail even with valid credentials, so we just log a warning
        console.warn('⚠️  Cloudinary ping test failed (this is usually OK)');
        console.warn('   Uploads will still work if credentials are correct.');
      } else {
        console.log('✅ Cloudinary connection test successful');
      }
    });
  } catch (testError) {
    // Connection test is optional - uploads will work regardless
    console.warn('⚠️  Could not test Cloudinary connection (uploads will still work)');
  }
}

module.exports = cloudinary;

