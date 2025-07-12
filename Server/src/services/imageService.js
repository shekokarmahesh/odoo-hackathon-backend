const cloudinary = require('../config/cloudinary');
const { ApiError } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../utils/constants');

class ImageService {
  constructor() {
    this.defaultUploadOptions = {
      folder: 'stackit',
      quality: 'auto',
      fetch_format: 'auto',
      flags: 'progressive'
    };
  }

  /**
   * Upload image to Cloudinary
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Upload options
   * @returns {Promise} Promise resolving to upload result
   */
  async uploadImage(buffer, options = {}) {
    try {
      const uploadOptions = {
        ...this.defaultUploadOptions,
        ...options
      };

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new ApiError('Failed to upload image', HTTP_STATUS.INTERNAL_SERVER_ERROR));
            } else {
              resolve({
                public_id: result.public_id,
                url: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes
              });
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ApiError('Failed to upload image', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Upload avatar image
   * @param {Buffer} buffer - Image buffer
   * @param {string} userId - User ID for organizing uploads
   * @returns {Promise} Promise resolving to upload result
   */
  async uploadAvatar(buffer, userId) {
    const options = {
      folder: 'stackit/avatars',
      public_id: `avatar_${userId}_${Date.now()}`,
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ],
      overwrite: true
    };

    return await this.uploadImage(buffer, options);
  }

  /**
   * Upload multiple images
   * @param {Array} files - Array of file objects with buffer property
   * @param {Object} options - Upload options
   * @returns {Promise} Promise resolving to array of upload results
   */
  async uploadMultipleImages(files, options = {}) {
    try {
      const uploadPromises = files.map((file, index) => {
        const fileOptions = {
          ...options,
          public_id: options.public_id ? `${options.public_id}_${index}` : undefined
        };
        return this.uploadImage(file.buffer, fileOptions);
      });

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Multiple images upload error:', error);
      throw new ApiError('Failed to upload images', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Public ID of the image to delete
   * @returns {Promise} Promise resolving to deletion result
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        return { success: true, message: 'Image deleted successfully' };
      } else {
        throw new ApiError('Failed to delete image', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      console.error('Image deletion error:', error);
      throw new ApiError('Failed to delete image', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete multiple images
   * @param {Array} publicIds - Array of public IDs to delete
   * @returns {Promise} Promise resolving to deletion results
   */
  async deleteMultipleImages(publicIds) {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      console.error('Multiple images deletion error:', error);
      throw new ApiError('Failed to delete images', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get image details
   * @param {string} publicId - Public ID of the image
   * @returns {Promise} Promise resolving to image details
   */
  async getImageDetails(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at
      };
    } catch (error) {
      console.error('Get image details error:', error);
      throw new ApiError('Failed to get image details', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate transformed image URL
   * @param {string} publicId - Public ID of the image
   * @param {Object} transformations - Transformation options
   * @returns {string} Transformed image URL
   */
  generateTransformedUrl(publicId, transformations = {}) {
    try {
      return cloudinary.url(publicId, transformations);
    } catch (error) {
      console.error('Generate transformed URL error:', error);
      return null;
    }
  }

  /**
   * Optimize image for web display
   * @param {string} publicId - Public ID of the image
   * @param {Object} options - Optimization options
   * @returns {string} Optimized image URL
   */
  optimizeForWeb(publicId, options = {}) {
    const defaultTransformations = {
      quality: 'auto',
      fetch_format: 'auto',
      flags: 'progressive',
      ...options
    };

    return this.generateTransformedUrl(publicId, defaultTransformations);
  }

  /**
   * Create responsive image URLs
   * @param {string} publicId - Public ID of the image
   * @param {Array} breakpoints - Array of width breakpoints
   * @returns {Object} Object with responsive URLs
   */
  createResponsiveUrls(publicId, breakpoints = [480, 768, 1024, 1440]) {
    const responsiveUrls = {};

    breakpoints.forEach(width => {
      responsiveUrls[`w_${width}`] = this.generateTransformedUrl(publicId, {
        width,
        crop: 'scale',
        quality: 'auto',
        fetch_format: 'auto'
      });
    });

    return responsiveUrls;
  }

  /**
   * Validate image dimensions and file size
   * @param {Object} imageInfo - Image information
   * @param {Object} constraints - Validation constraints
   * @returns {Object} Validation result
   */
  validateImage(imageInfo, constraints = {}) {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      minWidth = 50,
      minHeight = 50,
      maxFileSize = 5 * 1024 * 1024 // 5MB
    } = constraints;

    const errors = [];

    if (imageInfo.width > maxWidth) {
      errors.push(`Image width (${imageInfo.width}px) exceeds maximum allowed (${maxWidth}px)`);
    }

    if (imageInfo.height > maxHeight) {
      errors.push(`Image height (${imageInfo.height}px) exceeds maximum allowed (${maxHeight}px)`);
    }

    if (imageInfo.width < minWidth) {
      errors.push(`Image width (${imageInfo.width}px) is below minimum required (${minWidth}px)`);
    }

    if (imageInfo.height < minHeight) {
      errors.push(`Image height (${imageInfo.height}px) is below minimum required (${minHeight}px)`);
    }

    if (imageInfo.bytes > maxFileSize) {
      errors.push(`File size (${Math.round(imageInfo.bytes / 1024)}KB) exceeds maximum allowed (${Math.round(maxFileSize / 1024)}KB)`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {string|null} Public ID or null if invalid URL
   */
  extractPublicId(url) {
    try {
      // Extract public ID from Cloudinary URL
      const match = url.match(/\/v\d+\/(.+?)\.([a-zA-Z]+)$/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Extract public ID error:', error);
      return null;
    }
  }

  /**
   * Cleanup orphaned images (background task)
   * @param {Array} usedPublicIds - Array of public IDs currently in use
   * @param {string} folder - Cloudinary folder to clean
   */
  async cleanupOrphanedImages(usedPublicIds = [], folder = 'stackit') {
    try {
      // Get all images in folder
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: 500
      });

      const allPublicIds = result.resources.map(resource => resource.public_id);
      const orphanedIds = allPublicIds.filter(id => !usedPublicIds.includes(id));

      if (orphanedIds.length > 0) {
        console.log(`Found ${orphanedIds.length} orphaned images to delete`);
        const deleteResult = await this.deleteMultipleImages(orphanedIds);
        console.log('Cleanup result:', deleteResult);
        return deleteResult;
      }

      console.log('No orphaned images found');
      return { deleted: {} };
    } catch (error) {
      console.error('Cleanup orphaned images error:', error);
      throw error;
    }
  }
}

module.exports = new ImageService();
