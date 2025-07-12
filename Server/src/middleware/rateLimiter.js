const rateLimit = require('express-rate-limit');
const { createResponse } = require('../utils/helpers');

/**
 * General rate limiter for all requests
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: createResponse(false, 'Too many requests from this IP, please try again later.'),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.user && req.user.role === 'admin';
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 authentication attempts per window
  message: createResponse(false, 'Too many authentication attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Rate limiter for question creation
 */
const questionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 questions per hour
  message: createResponse(false, 'Too many questions created, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for admin users
    return req.user && req.user.role === 'admin';
  }
});

/**
 * Rate limiter for answer creation
 */
const answerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 answers per hour
  message: createResponse(false, 'Too many answers submitted, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.user && req.user.role === 'admin';
  }
});

/**
 * Rate limiter for comments
 */
const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // 15 comments per 10 minutes
  message: createResponse(false, 'Too many comments posted, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.user && req.user.role === 'admin';
  }
});

/**
 * Rate limiter for voting
 */
const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 votes per minute
  message: createResponse(false, 'Too many votes cast, please slow down.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.user && req.user.role === 'admin';
  }
});

/**
 * Rate limiter for search requests
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  message: createResponse(false, 'Too many search requests, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for password reset requests
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: createResponse(false, 'Too many password reset attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for email verification requests
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 email verification requests per 10 minutes
  message: createResponse(false, 'Too many email verification requests, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for file uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 file uploads per hour
  message: createResponse(false, 'Too many file uploads, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.user && req.user.role === 'admin';
  }
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limit middleware
 */
const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: createResponse(false, 'Too many requests, please try again later.'),
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({ ...defaultOptions, ...options });
};

module.exports = {
  generalLimiter,
  authLimiter,
  questionLimiter,
  answerLimiter,
  commentLimiter,
  voteLimiter,
  searchLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  uploadLimiter,
  createCustomLimiter
};
