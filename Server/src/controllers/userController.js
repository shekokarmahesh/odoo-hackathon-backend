const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { createResponse, getPaginationParams, createPaginationMeta, sanitizeUser } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');
const { updateProfileSchema } = require('../utils/validators');

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('questionCount')
      .populate('answerCount');

    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'User not found')
      );
    }

    const sanitizedUser = sanitizeUser(user);
    
    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'User profile retrieved successfully', sanitizedUser)
    );
  } catch (error) {
    console.error('Get user profile error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid user ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve user profile')
    );
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const { firstName, lastName, bio, location } = value;

    // Update user profile
    const updateData = {};
    if (firstName !== undefined) updateData['profile.firstName'] = firstName;
    if (lastName !== undefined) updateData['profile.lastName'] = lastName;
    if (bio !== undefined) updateData['profile.bio'] = bio;
    if (location !== undefined) updateData['profile.location'] = location;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    const sanitizedUser = sanitizeUser(updatedUser);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Profile updated successfully', sanitizedUser)
    );
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to update profile')
    );
  }
};

/**
 * @desc    Get user's questions
 * @route   GET /api/users/:id/questions
 * @access  Public
 */
const getUserQuestions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { sort = 'newest' } = req.query;

    // Verify user exists
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'User not found')
      );
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sort) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'votes':
        sortCriteria = { voteScore: -1, createdAt: -1 };
        break;
      case 'views':
        sortCriteria = { views: -1, createdAt: -1 };
        break;
      default: // newest
        sortCriteria = { createdAt: -1 };
    }

    // Get user's questions
    const questions = await Question.find({ 
      author: req.params.id,
      status: { $ne: 'deleted' }
    })
      .populate('tags', 'name color description')
      .populate('acceptedAnswer', '_id')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Question.countDocuments({ 
      author: req.params.id,
      status: { $ne: 'deleted' }
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'User questions retrieved successfully', questions, meta)
    );
  } catch (error) {
    console.error('Get user questions error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid user ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve user questions')
    );
  }
};

/**
 * @desc    Get user's answers
 * @route   GET /api/users/:id/answers
 * @access  Public
 */
const getUserAnswers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { sort = 'newest' } = req.query;

    // Verify user exists
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'User not found')
      );
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sort) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'votes':
        sortCriteria = { voteScore: -1, createdAt: -1 };
        break;
      default: // newest
        sortCriteria = { createdAt: -1 };
    }

    // Get user's answers
    const answers = await Answer.find({ 
      author: req.params.id,
      isDeleted: false
    })
      .populate('question', 'title _id')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Answer.countDocuments({ 
      author: req.params.id,
      isDeleted: false
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'User answers retrieved successfully', answers, meta)
    );
  } catch (error) {
    console.error('Get user answers error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid user ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve user answers')
    );
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('questionCount')
      .populate('answerCount');

    const sanitizedUser = sanitizeUser(user);
    
    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Current user retrieved successfully', sanitizedUser)
    );
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve current user')
    );
  }
};

/**
 * @desc    Get top users by reputation
 * @route   GET /api/users/top
 * @access  Public
 */
const getTopUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get top users by reputation
    const users = await User.find({ isActive: true })
      .select('username profile.firstName profile.lastName profile.avatar reputation createdAt')
      .sort({ reputation: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await User.countDocuments({ isActive: true });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Top users retrieved successfully', users, meta)
    );
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve top users')
    );
  }
};

/**
 * @desc    Search users by username or name
 * @route   GET /api/users/search
 * @access  Public
 */
const searchUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { q: query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Search query is required')
      );
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    // Search users by username, firstName, or lastName
    const users = await User.find({
      isActive: true,
      $or: [
        { username: searchRegex },
        { 'profile.firstName': searchRegex },
        { 'profile.lastName': searchRegex }
      ]
    })
      .select('username profile.firstName profile.lastName profile.avatar reputation createdAt')
      .sort({ reputation: -1, username: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await User.countDocuments({
      isActive: true,
      $or: [
        { username: searchRegex },
        { 'profile.firstName': searchRegex },
        { 'profile.lastName': searchRegex }
      ]
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'User search completed', users, meta)
    );
  } catch (error) {
    console.error('Search users error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to search users')
    );
  }
};

/**
 * @desc    Get user activity (questions, answers, votes)
 * @route   GET /api/users/:id/activity
 * @access  Public
 */
const getUserActivity = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // Verify user exists
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'User not found')
      );
    }

    // Get recent questions
    const recentQuestions = await Question.find({
      author: req.params.id,
      status: { $ne: 'deleted' }
    })
      .select('title createdAt voteScore answersCount')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get recent answers
    const recentAnswers = await Answer.find({
      author: req.params.id,
      isDeleted: false
    })
      .populate('question', 'title _id')
      .select('content createdAt voteScore isAccepted question')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Combine and sort activity
    const activity = [
      ...recentQuestions.map(q => ({ ...q, type: 'question' })),
      ...recentAnswers.map(a => ({ ...a, type: 'answer' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(skip, skip + limit);

    const total = recentQuestions.length + recentAnswers.length;
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'User activity retrieved successfully', activity, meta)
    );
  } catch (error) {
    console.error('Get user activity error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid user ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve user activity')
    );
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  getUserQuestions,
  getUserAnswers,
  getCurrentUser,
  getTopUsers,
  searchUsers,
  getUserActivity
};
