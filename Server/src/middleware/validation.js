const Joi = require('joi');
const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert values to correct types
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Validation failed', {
          errors: errorMessages
        })
      );
    }

    // Replace the request property with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} paramName - Parameter name to validate
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, `Invalid ${paramName} format`)
      );
    }
    
    next();
  };
};

/**
 * Validate multiple ObjectIds in params
 * @param {string[]} paramNames - Array of parameter names to validate
 * @returns {Function} Express middleware function
 */
const validateObjectIds = (paramNames = ['id']) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      
      if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, `Invalid ${paramName} format`)
        );
      }
    }
    
    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  if (page < 1) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Page number must be greater than 0')
    );
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Limit must be between 1 and 100')
    );
  }
  
  req.pagination = { page, limit };
  next();
};

/**
 * Validate sort parameters
 * @param {string[]} allowedSortFields - Array of allowed sort fields
 * @returns {Function} Express middleware function
 */
const validateSort = (allowedSortFields = ['createdAt', 'updatedAt']) => {
  return (req, res, next) => {
    const sort = req.query.sort;
    
    if (sort && !allowedSortFields.includes(sort)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, `Invalid sort field. Allowed: ${allowedSortFields.join(', ')}`)
      );
    }
    
    next();
  };
};

/**
 * Validate search query
 */
const validateSearch = (req, res, next) => {
  const search = req.query.search;
  
  if (search) {
    // Basic validation for search query
    if (typeof search !== 'string' || search.length > 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Search query must be a string with maximum 100 characters')
      );
    }
    
    // Remove potentially dangerous characters
    req.query.search = search.trim().replace(/[<>]/g, '');
  }
  
  next();
};

/**
 * Sanitize HTML content to prevent XSS
 * @param {string[]} fields - Array of field names to sanitize
 * @returns {Function} Express middleware function
 */
const sanitizeHtml = (fields = ['content', 'description']) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field]) {
        // Basic HTML sanitization - in production, use a proper library like DOMPurify
        req.body[field] = req.body[field]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+="[^"]*"/gi, '')
          .replace(/on\w+='[^']*'/gi, '');
      }
    }
    
    next();
  };
};

/**
 * Rate limiting validation for specific actions
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware function
 */
const validateActionLimit = (maxAttempts = 5, windowMs = 60000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }
    
    const userAttempts = attempts.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(time => now - time < windowMs);
    attempts.set(key, validAttempts);
    
    if (validAttempts.length >= maxAttempts) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS || 429).json(
        createResponse(false, 'Too many attempts. Please try again later.')
      );
    }
    
    // Add current attempt
    validAttempts.push(now);
    next();
  };
};

module.exports = {
  validate,
  validateObjectId,
  validateObjectIds,
  validatePagination,
  validateSort,
  validateSearch,
  sanitizeHtml,
  validateActionLimit
};
