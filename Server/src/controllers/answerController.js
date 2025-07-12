const Answer = require('../models/Answer');
const Question = require('../models/Question');
const { createResponse, getPaginationParams, createPaginationMeta } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');
const { createAnswerSchema, updateAnswerSchema } = require('../utils/validators');
const notificationService = require('../services/notificationService');

/**
 * @desc    Get answers for a question
 * @route   GET /api/answers/question/:questionId
 * @access  Public
 */
const getAnswersByQuestion = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { sort = 'votes' } = req.query;

    // Verify question exists
    const question = await Question.findById(req.params.questionId);
    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sort) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'active':
        sortCriteria = { lastActivity: -1 };
        break;
      default: // votes
        // Accepted answer first, then by vote score
        sortCriteria = { isAccepted: -1, voteScore: -1, createdAt: 1 };
    }

    // Get answers
    const answers = await Answer.find({
      question: req.params.questionId,
      isDeleted: false
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Answer.countDocuments({
      question: req.params.questionId,
      isDeleted: false
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Answers retrieved successfully', answers, meta)
    );
  } catch (error) {
    console.error('Get answers by question error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve answers')
    );
  }
};

/**
 * @desc    Get a single answer by ID
 * @route   GET /api/answers/:id
 * @access  Public
 */
const getAnswerById = async (req, res) => {
  try {
    const answer = await Answer.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('question', 'title _id');

    if (!answer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Answer not found')
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Answer retrieved successfully', answer)
    );
  } catch (error) {
    console.error('Get answer by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid answer ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve answer')
    );
  }
};

/**
 * @desc    Create a new answer
 * @route   POST /api/answers/question/:questionId
 * @access  Private
 */
const createAnswer = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createAnswerSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    // Verify question exists and is open
    const question = await Question.findById(req.params.questionId).populate('author', 'username');
    if (!question || question.status === 'deleted') {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Question not found')
      );
    }

    if (question.status === 'closed') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Cannot answer a closed question')
      );
    }

    // Check if user is trying to answer their own question
    if (question.author._id.toString() === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'You cannot answer your own question')
      );
    }

    const { content } = value;

    // Create answer
    const answer = await Answer.create({
      content,
      author: req.user._id,
      question: req.params.questionId
    });

    // Update question's answer count and last activity
    await Question.findByIdAndUpdate(req.params.questionId, {
      $inc: { answersCount: 1 },
      lastActivity: new Date()
    });

    // Populate the created answer
    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('question', 'title _id');

    // Send notification to question author
    if (question.author._id.toString() !== req.user._id.toString()) {
      await notificationService.createNotification({
        recipient: question.author._id,
        type: 'answer',
        message: `${req.user.username} answered your question "${question.title}"`,
        relatedId: answer._id,
        sender: req.user._id
      });
    }

    res.status(HTTP_STATUS.CREATED).json(
      createResponse(true, 'Answer created successfully', populatedAnswer)
    );
  } catch (error) {
    console.error('Create answer error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid question ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to create answer')
    );
  }
};

/**
 * @desc    Update an answer
 * @route   PUT /api/answers/:id
 * @access  Private
 */
const updateAnswer = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateAnswerSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const answer = await Answer.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!answer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Answer not found')
      );
    }

    // Check if user is the author or an admin
    if (answer.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Not authorized to update this answer')
      );
    }

    const { content } = value;

    // Update answer
    answer.content = content;
    answer.isEdited = true;
    answer.lastActivity = new Date();
    await answer.save();

    // Update question's last activity
    await Question.findByIdAndUpdate(answer.question, {
      lastActivity: new Date()
    });

    // Populate the updated answer
    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('question', 'title _id');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Answer updated successfully', populatedAnswer)
    );
  } catch (error) {
    console.error('Update answer error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid answer ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to update answer')
    );
  }
};

/**
 * @desc    Delete an answer
 * @route   DELETE /api/answers/:id
 * @access  Private
 */
const deleteAnswer = async (req, res) => {
  try {
    const answer = await Answer.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!answer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Answer not found')
      );
    }

    // Check if user is the author or an admin
    if (answer.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Not authorized to delete this answer')
      );
    }

    // Soft delete the answer
    answer.isDeleted = true;
    answer.deletedAt = new Date();
    await answer.save();

    // Update question's answer count
    await Question.findByIdAndUpdate(answer.question, {
      $inc: { answersCount: -1 },
      lastActivity: new Date()
    });

    // If this was the accepted answer, unaccept it
    if (answer.isAccepted) {
      await Question.findByIdAndUpdate(answer.question, {
        acceptedAnswer: null
      });
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Answer deleted successfully')
    );
  } catch (error) {
    console.error('Delete answer error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid answer ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to delete answer')
    );
  }
};

/**
 * @desc    Accept an answer
 * @route   PUT /api/answers/:id/accept
 * @access  Private
 */
const acceptAnswer = async (req, res) => {
  try {
    const answer = await Answer.findOne({
      _id: req.params.id,
      isDeleted: false
    }).populate('question');

    if (!answer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Answer not found')
      );
    }

    // Check if user is the question author
    if (answer.question.author.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Only the question author can accept answers')
      );
    }

    if (answer.isAccepted) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Answer is already accepted')
      );
    }

    // Unaccept any previously accepted answer for this question
    await Answer.updateMany(
      { question: answer.question._id },
      { isAccepted: false }
    );

    // Accept this answer
    answer.isAccepted = true;
    answer.acceptedAt = new Date();
    await answer.save();

    // Update question with accepted answer
    await Question.findByIdAndUpdate(answer.question._id, {
      acceptedAnswer: answer._id,
      lastActivity: new Date()
    });

    // Send notification to answer author
    if (answer.author.toString() !== req.user._id.toString()) {
      await notificationService.createNotification({
        recipient: answer.author,
        type: 'answer_accepted',
        message: `Your answer was accepted for the question "${answer.question.title}"`,
        relatedId: answer._id,
        sender: req.user._id
      });
    }

    // Populate the accepted answer
    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('question', 'title _id');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Answer accepted successfully', populatedAnswer)
    );
  } catch (error) {
    console.error('Accept answer error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid answer ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to accept answer')
    );
  }
};

/**
 * @desc    Unaccept an answer
 * @route   PUT /api/answers/:id/unaccept
 * @access  Private
 */
const unacceptAnswer = async (req, res) => {
  try {
    const answer = await Answer.findOne({
      _id: req.params.id,
      isDeleted: false
    }).populate('question');

    if (!answer) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Answer not found')
      );
    }

    // Check if user is the question author
    if (answer.question.author.toString() !== req.user._id.toString()) {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Only the question author can unaccept answers')
      );
    }

    if (!answer.isAccepted) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Answer is not accepted')
      );
    }

    // Unaccept the answer
    answer.isAccepted = false;
    answer.acceptedAt = null;
    await answer.save();

    // Update question to remove accepted answer
    await Question.findByIdAndUpdate(answer.question._id, {
      acceptedAnswer: null,
      lastActivity: new Date()
    });

    // Populate the unaccepted answer
    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('question', 'title _id');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Answer unaccepted successfully', populatedAnswer)
    );
  } catch (error) {
    console.error('Unaccept answer error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid answer ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to unaccept answer')
    );
  }
};

module.exports = {
  getAnswersByQuestion,
  getAnswerById,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  acceptAnswer,
  unacceptAnswer
};
