import axios from 'axios';

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = async (base64Image) => {
    if (!base64Image) {
        throw new Error('No image data provided');
    }

    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', UPLOAD_PRESET);

    console.log('Cloudinary Config:', {
        cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
        preset: UPLOAD_PRESET,
        url: CLOUDINARY_URL
    });

    try {
        const response = await axios.post(CLOUDINARY_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Return standard Cloudinary response data (secure_url is what we usually need)
        return response.data;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};
