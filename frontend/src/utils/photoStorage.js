/**
 * Photo Storage Utility
 * Manages photo caching in localStorage for better performance
 */

const PHOTO_STORAGE_KEY = 'classroom_photos';
const PHOTO_EXPIRY_DAYS = 7; // Photos expire after 7 days

/**
 * Get all stored photos from localStorage
 */
export const getStoredPhotos = () => {
  try {
    const stored = localStorage.getItem(PHOTO_STORAGE_KEY);
    if (!stored) return {};
    
    const photos = JSON.parse(stored);
    const now = Date.now();
    const filteredPhotos = {};
    
    // Remove expired photos
    Object.keys(photos).forEach(key => {
      if (photos[key].expiry > now) {
        filteredPhotos[key] = photos[key];
      }
    });
    
    // Update localStorage with filtered photos
    if (Object.keys(filteredPhotos).length !== Object.keys(photos).length) {
      localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(filteredPhotos));
    }
    
    return filteredPhotos;
  } catch (error) {
    console.error('Error reading photos from localStorage:', error);
    return {};
  }
};

/**
 * Store a photo in localStorage
 */
export const storePhoto = (userId, imageUrl, imageData = null) => {
  try {
    const photos = getStoredPhotos();
    const expiry = Date.now() + (PHOTO_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    photos[userId] = {
      url: imageUrl,
      data: imageData, // Base64 data if available
      timestamp: Date.now(),
      expiry: expiry
    };
    
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
    return true;
  } catch (error) {
    console.error('Error storing photo in localStorage:', error);
    return false;
  }
};

/**
 * Get a specific photo from localStorage
 */
export const getStoredPhoto = (userId) => {
  try {
    const photos = getStoredPhotos();
    const photo = photos[userId];
    
    if (!photo) return null;
    
    // Check if photo is expired
    if (photo.expiry < Date.now()) {
      removeStoredPhoto(userId);
      return null;
    }
    
    return photo;
  } catch (error) {
    console.error('Error getting photo from localStorage:', error);
    return null;
  }
};

/**
 * Remove a specific photo from localStorage
 */
export const removeStoredPhoto = (userId) => {
  try {
    const photos = getStoredPhotos();
    delete photos[userId];
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(photos));
    return true;
  } catch (error) {
    console.error('Error removing photo from localStorage:', error);
    return false;
  }
};

/**
 * Clear all stored photos
 */
export const clearAllPhotos = () => {
  try {
    localStorage.removeItem(PHOTO_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing photos from localStorage:', error);
    return false;
  }
};

/**
 * Convert image URL to base64 for storage
 */
export const convertImageToBase64 = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      try {
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Get photo with fallback to API if not in localStorage
 */
export const getPhotoWithFallback = async (userId, apiCall) => {
  try {
    // First check localStorage
    const storedPhoto = getStoredPhoto(userId);
    if (storedPhoto) {
      return storedPhoto.url;
    }
    
    // If not in localStorage, fetch from API
    if (apiCall) {
      const response = await apiCall();
      const imageUrl = response.data.imageUrl;
      
      if (imageUrl) {
        const fullImageUrl = imageUrl.startsWith('/') 
          ? `http://localhost:5001${imageUrl}` 
          : imageUrl;
        
        // Store in localStorage for future use
        storePhoto(userId, fullImageUrl);
        
        return fullImageUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting photo with fallback:', error);
    return null;
  }
};

/**
 * Preload and cache multiple photos
 */
export const preloadPhotos = async (photoUrls) => {
  const promises = photoUrls.map(async (url) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise((resolve) => {
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    } catch (error) {
      console.error('Error preloading photo:', error);
      return null;
    }
  });
  
  return Promise.all(promises);
};

/**
 * Get storage statistics
 */
export const getStorageStats = () => {
  try {
    const photos = getStoredPhotos();
    const totalPhotos = Object.keys(photos).length;
    const totalSize = JSON.stringify(photos).length;
    
    return {
      totalPhotos,
      totalSizeKB: Math.round(totalSize / 1024),
      expiryDays: PHOTO_EXPIRY_DAYS
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { totalPhotos: 0, totalSizeKB: 0, expiryDays: PHOTO_EXPIRY_DAYS };
  }
};





