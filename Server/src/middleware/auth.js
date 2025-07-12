const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS, USER_ROLES } = require('../utils/constants');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createResponse(false, 'Access denied. No token provided.')
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createResponse(false, 'Invalid token or user deactivated.')
      );
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createResponse(false, 'Invalid token.')
    );
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but continue as guest
      console.log('Optional auth failed, continuing as guest:', error.message);
    }
  }
  
  next();
};

/**
 * Admin authentication middleware
 * Requires user to be authenticated and have admin role
 */
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === USER_ROLES.ADMIN) {
    next();
  } else {
    res.status(HTTP_STATUS.FORBIDDEN).json(
      createResponse(false, 'Access denied. Admin privileges required.')
    );
  }
};

/**
 * Check if user is the owner of a resource or admin
 */
const ownerOrAdmin = (resourceUserField = 'author') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createResponse(false, 'Authentication required.')
      );
    }

    const resourceUserId = req.resource?.[resourceUserField] || req.params.userId;
    
    if (req.user.role === USER_ROLES.ADMIN || 
        req.user._id.toString() === resourceUserId?.toString()) {
      next();
    } else {
      res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Access denied. You can only modify your own resources.')
      );
    }
  };
};

/**
 * Check if user can vote (not on their own content)
 */
const canVote = (req, res, next) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createResponse(false, 'Authentication required to vote.')
    );
  }

  // Check if trying to vote on own content
  if (req.resource && req.resource.author.toString() === req.user._id.toString()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'You cannot vote on your own content.')
    );
  }

  next();
};

module.exports = {
  auth,
  optionalAuth,
  adminAuth,
  ownerOrAdmin,
  canVote
};
