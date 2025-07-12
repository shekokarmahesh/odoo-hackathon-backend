const jwt = require('jsonwebtoken');
const { PAGINATION } = require('./constants');

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

/**
 * Create standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {*} data - Response data
 * @param {*} meta - Additional metadata (pagination, etc.)
 * @returns {object} Standardized response object
 */
const createResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Get pagination parameters from query
 * @param {object} query - Request query object
 * @returns {object} Pagination parameters
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Create pagination metadata
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev
    }
  };
};

/**
 * Sanitize user object for response (remove sensitive data)
 * @param {object} user - User object
 * @returns {object} Sanitized user object
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.emailVerificationToken;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  
  return userObj;
};

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Calculate reputation change based on action
 * @param {string} action - Action type
 * @returns {number} Reputation change
 */
const calculateReputationChange = (action) => {
  const reputationMap = {
    'question_upvote': 5,
    'question_downvote': -2,
    'answer_upvote': 10,
    'answer_downvote': -2,
    'answer_accepted': 15,
    'accept_answer': 2
  };

  return reputationMap[action] || 0;
};

/**
 * Format date for consistent output
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Escape special characters for regex
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  generateToken,
  createResponse,
  getPaginationParams,
  createPaginationMeta,
  sanitizeUser,
  generateRandomString,
  calculateReputationChange,
  formatDate,
  escapeRegex
};
