const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Global error handler middleware
 * Handles all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = {
      statusCode: HTTP_STATUS.CONFLICT,
      message
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Validation failed', { errors })
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token has expired';
    error = {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    error = {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429 || err.status === 429) {
    const message = 'Too many requests. Please try again later.';
    error = {
      statusCode: 429,
      message
    };
  }

  // Default error
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json(
    createResponse(false, message, null, {
      error: process.env.NODE_ENV === 'development' ? {
        stack: err.stack,
        name: err.name
      } : undefined
    })
  );
};

/**
 * Handle 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  res.status(HTTP_STATUS.NOT_FOUND).json(
    createResponse(false, message)
  );
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'ApiError';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server gracefully
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError,
  handleUnhandledRejection,
  handleUncaughtException
};
