// Cloudinary Configuration
// Use environment variables for sensitive data
export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
};

export const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`;
