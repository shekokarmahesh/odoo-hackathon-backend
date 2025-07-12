const multer = require('multer');
const path = require('path');
const { ApiError } = require('./errorHandler');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Memory storage for temporary file handling
 * Files will be processed and uploaded to Cloudinary
 */
const storage = multer.memoryStorage();

/**
 * File filter function
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // Allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedImageTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.', HTTP_STATUS.BAD_REQUEST), false);
  }
};

/**
 * Basic upload configuration
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Maximum 1 file per request
  }
});

/**
 * Avatar upload configuration
 */
const avatarUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size for avatars
    files: 1
  }
});

/**
 * Multiple image upload configuration
 */
const multipleImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Maximum 5 files per request
  }
});

/**
 * Handle multer errors
 * @param {Function} uploadMiddleware - Multer middleware function
 * @returns {Function} Express middleware function
 */
const handleUploadErrors = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          switch (error.code) {
            case 'LIMIT_FILE_SIZE':
              return next(new ApiError('File too large. Maximum size is 5MB.', HTTP_STATUS.BAD_REQUEST));
            case 'LIMIT_FILE_COUNT':
              return next(new ApiError('Too many files. Maximum 5 files allowed.', HTTP_STATUS.BAD_REQUEST));
            case 'LIMIT_UNEXPECTED_FILE':
              return next(new ApiError('Unexpected file field.', HTTP_STATUS.BAD_REQUEST));
            case 'LIMIT_PART_COUNT':
              return next(new ApiError('Too many form fields.', HTTP_STATUS.BAD_REQUEST));
            case 'LIMIT_FIELD_KEY':
              return next(new ApiError('Field name too long.', HTTP_STATUS.BAD_REQUEST));
            case 'LIMIT_FIELD_VALUE':
              return next(new ApiError('Field value too long.', HTTP_STATUS.BAD_REQUEST));
            case 'LIMIT_FIELD_COUNT':
              return next(new ApiError('Too many fields.', HTTP_STATUS.BAD_REQUEST));
            default:
              return next(new ApiError('File upload error.', HTTP_STATUS.BAD_REQUEST));
          }
        }
        return next(error);
      }
      next();
    });
  };
};

/**
 * Validate uploaded file
 * @param {string} fieldName - Name of the file field
 * @param {boolean} required - Whether file is required
 * @returns {Function} Express middleware function
 */
const validateFile = (fieldName = 'file', required = true) => {
  return (req, res, next) => {
    const file = req.file || req.files?.[fieldName]?.[0];
    
    if (required && !file) {
      return next(new ApiError('File is required.', HTTP_STATUS.BAD_REQUEST));
    }
    
    if (file) {
      // Additional file validation
      if (file.size === 0) {
        return next(new ApiError('Empty file is not allowed.', HTTP_STATUS.BAD_REQUEST));
      }
      
      // Check if file has valid image signature (magic numbers)
      const validSignatures = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'image/gif': [0x47, 0x49, 0x46],
        'image/webp': [0x52, 0x49, 0x46, 0x46]
      };
      
      const signature = validSignatures[file.mimetype];
      if (signature && file.buffer) {
        const fileSignature = Array.from(file.buffer.slice(0, signature.length));
        const isValid = signature.every((byte, index) => byte === fileSignature[index]);
        
        if (!isValid) {
          return next(new ApiError('Invalid file format or corrupted file.', HTTP_STATUS.BAD_REQUEST));
        }
      }
    }
    
    next();
  };
};

/**
 * Single image upload middleware
 */
const uploadSingleImage = (fieldName = 'image') => {
  return [
    handleUploadErrors(upload.single(fieldName)),
    validateFile(fieldName, false)
  ];
};

/**
 * Avatar upload middleware
 */
const uploadAvatar = [
  handleUploadErrors(avatarUpload.single('avatar')),
  validateFile('avatar', false)
];

/**
 * Multiple images upload middleware
 */
const uploadMultipleImages = (fieldName = 'images', maxCount = 5) => {
  return [
    handleUploadErrors(multipleImageUpload.array(fieldName, maxCount)),
    (req, res, next) => {
      if (req.files && req.files.length > 0) {
        // Validate each file
        for (const file of req.files) {
          if (file.size === 0) {
            return next(new ApiError('Empty files are not allowed.', HTTP_STATUS.BAD_REQUEST));
          }
        }
      }
      next();
    }
  ];
};

module.exports = {
  upload,
  avatarUpload,
  multipleImageUpload,
  handleUploadErrors,
  validateFile,
  uploadSingleImage,
  uploadAvatar,
  uploadMultipleImages
};
