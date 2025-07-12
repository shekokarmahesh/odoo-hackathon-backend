const Question = require('../models/Question');
const Tag = require('../models/Tag');
const ViewHistory = require('../models/ViewHistory');
const { createResponse, getPaginationParams, createPaginationMeta } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');
const { createQuestionSchema, updateQuestionSchema } = require('../utils/validators');
const notificationService = require('../services/notificationService');
const searchService = require('../services/searchService');

/**
 * @desc    Get all questions with filters
 * @route   GET /api/questions
 * @access  Public
 */
const getQuestions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, tags, sort = 'newest', status = 'open' } = req.query;

    // Build filter criteria
    const filterCriteria = { status: { $ne: 'deleted' } };
    
    if (status !== 'all') {
      filterCriteria.status = status;
    }

    if (search) {
      filterCriteria.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',');
      filterCriteria.tags = { $in: tagArray };
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
      case 'activity':
        sortCriteria = { lastActivity: -1 };
        break;
      case 'unanswered':
        filterCriteria.answersCount = 0;
        sortCriteria = { createdAt: -1 };
        break;
      default: // newest
        sortCriteria = { createdAt: -1 };
    }

    // Get questions
    const questions = await Question.find(filterCriteria)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description')
      .populate('acceptedAnswer', '_id')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Question.countDocuments(filterCriteria);

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Questions retrieved successfully', questions, meta)
    );
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve questions')
    );
  }
};

/**
 * @desc    Get a single question by ID
 * @route   GET /api/questions/:id
 * @access  Public
 */
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description')
      .populate('acceptedAnswer')
      .populate({
        path: 'answers',
        populate: {
          path: 'author',
          select: 'username profile.firstName profile.lastName profile.avatar reputation'
        }
      });

    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    // Record view if user is provided or track by IP
    const viewData = {
      questionId: question._id,
      userId: req.user?._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    };

    try {
      await ViewHistory.recordView(viewData);
    } catch (viewError) {
      console.error('Error recording view:', viewError);
      // Don't fail the request if view recording fails
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Question retrieved successfully', question)
    );
  } catch (error) {
    console.error('Get question by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve question')
    );
  }
};

/**
 * @desc    Create a new question
 * @route   POST /api/questions
 * @access  Private
 */
const createQuestion = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createQuestionSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const { title, description, tags } = value;

    // Verify all tags exist
    const existingTags = await Tag.find({ _id: { $in: tags } });
    if (existingTags.length !== tags.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'One or more tags do not exist')
      );
    }

    // Create question
    const question = await Question.create({
      title,
      description,
      tags,
      author: req.user._id
    });

    // Update tag usage counts
    await Tag.updateMany(
      { _id: { $in: tags } },
      { $inc: { usageCount: 1 } }
    );

    // Populate the created question
    const populatedQuestion = await Question.findById(question._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description');

    res.status(HTTP_STATUS.CREATED).json(
      createResponse(true, 'Question created successfully', populatedQuestion)
    );
  } catch (error) {
    console.error('Create question error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to create question')
    );
  }
};

/**
 * @desc    Update a question
 * @route   PUT /api/questions/:id
 * @access  Private
 */
const updateQuestion = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateQuestionSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const question = await Question.findById(req.params.id);
    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    // Check if user is the author or an admin
    if (question.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Not authorized to update this question')
      );
    }

    const { title, description, tags } = value;

    // If tags are being updated, verify they exist and update counts
    if (tags) {
      const existingTags = await Tag.find({ _id: { $in: tags } });
      if (existingTags.length !== tags.length) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, 'One or more tags do not exist')
        );
      }

      // Decrease count for old tags
      await Tag.updateMany(
        { _id: { $in: question.tags } },
        { $inc: { usageCount: -1 } }
      );

      // Increase count for new tags
      await Tag.updateMany(
        { _id: { $in: tags } },
        { $inc: { usageCount: 1 } }
      );
    }

    // Update question
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;
    updateData.isEdited = true;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Question updated successfully', updatedQuestion)
    );
  } catch (error) {
    console.error('Update question error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to update question')
    );
  }
};

/**
 * @desc    Delete a question
 * @route   DELETE /api/questions/:id
 * @access  Private
 */
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    // Check if user is the author or an admin
    if (question.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Not authorized to delete this question')
      );
    }

    // Soft delete the question
    question.status = 'deleted';
    question.deletedAt = new Date();
    await question.save();

    // Decrease tag usage counts
    await Tag.updateMany(
      { _id: { $in: question.tags } },
      { $inc: { usageCount: -1 } }
    );

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Question deleted successfully')
    );
  } catch (error) {
    console.error('Delete question error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to delete question')
    );
  }
};

/**
 * @desc    Search questions
 * @route   GET /api/questions/search
 * @access  Public
 */
const searchQuestions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { q: query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Search query is required')
      );
    }

    const results = await searchService.searchQuestions(query, { page, limit });

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Search completed successfully', results.data, results.meta)
    );
  } catch (error) {
    console.error('Search questions error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to search questions')
    );
  }
};

/**
 * @desc    Get trending questions
 * @route   GET /api/questions/trending
 * @access  Public
 */
const getTrendingQuestions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get questions with high activity in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const questions = await Question.find({
      status: 'open',
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description')
      .sort({ views: -1, voteScore: -1, answersCount: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Question.countDocuments({
      status: 'open',
      createdAt: { $gte: sevenDaysAgo }
    });

    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Trending questions retrieved successfully', questions, meta)
    );
  } catch (error) {
    console.error('Get trending questions error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve trending questions')
    );
  }
};

/**
 * @desc    Get unanswered questions
 * @route   GET /api/questions/unanswered
 * @access  Public
 */
const getUnansweredQuestions = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const questions = await Question.find({
      status: 'open',
      answersCount: 0
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Question.countDocuments({
      status: 'open',
      answersCount: 0
    });

    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Unanswered questions retrieved successfully', questions, meta)
    );
  } catch (error) {
    console.error('Get unanswered questions error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve unanswered questions')
    );
  }
};

/**
 * @desc    Close a question
 * @route   PUT /api/questions/:id/close
 * @access  Private (Admin only)
 */
const closeQuestion = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Admin access required')
      );
    }

    const question = await Question.findById(req.params.id);
    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    if (question.status === 'closed') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Question is already closed')
      );
    }

    question.status = 'closed';
    question.closedAt = new Date();
    question.closedBy = req.user._id;
    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description')
      .populate('closedBy', 'username');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Question closed successfully', populatedQuestion)
    );
  } catch (error) {
    console.error('Close question error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to close question')
    );
  }
};

/**
 * @desc    Reopen a question
 * @route   PUT /api/questions/:id/reopen
 * @access  Private (Admin only)
 */
const reopenQuestion = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Admin access required')
      );
    }

    const question = await Question.findById(req.params.id);
    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    if (question.status === 'open') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Question is already open')
      );
    }

    question.status = 'open';
    question.closedAt = null;
    question.closedBy = null;
    await question.save();

    const populatedQuestion = await Question.findById(question._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('tags', 'name color description');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Question reopened successfully', populatedQuestion)
    );
  } catch (error) {
    console.error('Reopen question error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to reopen question')
    );
  }
};

module.exports = {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  searchQuestions,
  getTrendingQuestions,
  getUnansweredQuestions,
  closeQuestion,
  reopenQuestion
};
