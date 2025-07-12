const Comment = require('../models/Comment');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { createResponse, getPaginationParams, createPaginationMeta } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');
const { createCommentSchema, updateCommentSchema } = require('../utils/validators');
const notificationService = require('../services/notificationService');

/**
 * @desc    Get comments for a question or answer
 * @route   GET /api/comments?postType=question&postId=...
 * @access  Public
 */
const getComments = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { postType, postId } = req.query;

    if (!postType || !postId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Post type and post ID are required')
      );
    }

    if (!['question', 'answer'].includes(postType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Post type must be question or answer')
      );
    }

    // Verify the post exists
    const Model = postType === 'question' ? Question : Answer;
    const post = await Model.findById(postId);
    if (!post) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, `${postType} not found`)
      );
    }

    // Get comments
    const comments = await Comment.find({ 
      postType, 
      postId,
      isDeleted: false
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Comment.countDocuments({ 
      postType, 
      postId,
      isDeleted: false
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Comments retrieved successfully', comments, meta)
    );
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve comments')
    );
  }
};

/**
 * @desc    Get a single comment by ID
 * @route   GET /api/comments/:id
 * @access  Public
 */
const getCommentById = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation');

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Comment not found')
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Comment retrieved successfully', comment)
    );
  } catch (error) {
    console.error('Get comment by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid comment ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve comment')
    );
  }
};

/**
 * @desc    Create a new comment
 * @route   POST /api/comments
 * @access  Private
 */
const createComment = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createCommentSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const { content, postType, postId, parentCommentId } = value;

    // Verify the post exists
    const Model = postType === 'question' ? Question : Answer;
    const post = await Model.findById(postId).populate('author', 'username');
    if (!post) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, `${postType} not found`)
      );
    }

    // If it's a reply, verify the parent comment exists
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({
        _id: parentCommentId,
        postType,
        postId,
        isDeleted: false
      });
      if (!parentComment) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, 'Parent comment not found')
        );
      }
    }

    // Create comment
    const comment = await Comment.create({
      content,
      author: req.user._id,
      postType,
      postId,
      parentCommentId
    });

    // Update comment count on the post
    await Model.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 }
    });

    // Update reply count on parent comment if it's a reply
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $inc: { repliesCount: 1 }
      });
    }

    // Populate the created comment
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation');

    // Send notification to post author (if not commenting on own post)
    if (post.author._id.toString() !== req.user._id.toString()) {
      const notificationMessage = parentCommentId
        ? `${req.user.username} replied to a comment on your ${postType}`
        : `${req.user.username} commented on your ${postType}`;

      await notificationService.createNotification({
        recipient: post.author._id,
        type: 'comment',
        message: notificationMessage,
        relatedId: comment._id,
        sender: req.user._id
      });
    }

    // Send notification to parent comment author (if replying to someone else's comment)
    if (parentComment && parentComment.author.toString() !== req.user._id.toString()) {
      await notificationService.createNotification({
        recipient: parentComment.author,
        type: 'comment_reply',
        message: `${req.user.username} replied to your comment`,
        relatedId: comment._id,
        sender: req.user._id
      });
    }

    res.status(HTTP_STATUS.CREATED).json(
      createResponse(true, 'Comment created successfully', populatedComment)
    );
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to create comment')
    );
  }
};

/**
 * @desc    Update a comment
 * @route   PUT /api/comments/:id
 * @access  Private
 */
const updateComment = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateCommentSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Comment not found')
      );
    }

    // Check if user is the author or an admin
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Not authorized to update this comment')
      );
    }

    const { content } = value;

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    // Populate the updated comment
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Comment updated successfully', populatedComment)
    );
  } catch (error) {
    console.error('Update comment error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid comment ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to update comment')
    );
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Comment not found')
      );
    }

    // Check if user is the author or an admin
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Not authorized to delete this comment')
      );
    }

    // Soft delete the comment
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await comment.save();

    // Update comment count on the post
    const Model = comment.postType === 'question' ? Question : Answer;
    await Model.findByIdAndUpdate(comment.postId, {
      $inc: { commentsCount: -1 }
    });

    // Update reply count on parent comment if it's a reply
    if (comment.parentCommentId) {
      await Comment.findByIdAndUpdate(comment.parentCommentId, {
        $inc: { repliesCount: -1 }
      });
    }

    // Delete all replies to this comment
    const repliesDeleted = await Comment.updateMany(
      { 
        parentCommentId: comment._id,
        isDeleted: false
      },
      { 
        isDeleted: true,
        deletedAt: new Date()
      }
    );

    // Update comment count for deleted replies
    if (repliesDeleted.modifiedCount > 0) {
      await Model.findByIdAndUpdate(comment.postId, {
        $inc: { commentsCount: -repliesDeleted.modifiedCount }
      });
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Comment deleted successfully')
    );
  } catch (error) {
    console.error('Delete comment error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid comment ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to delete comment')
    );
  }
};

/**
 * @desc    Get comment replies
 * @route   GET /api/comments/:id/replies
 * @access  Public
 */
const getCommentReplies = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const parentComment = await Comment.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!parentComment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Comment not found')
      );
    }

    // Get replies
    const replies = await Comment.find({ 
      parentCommentId: req.params.id,
      isDeleted: false
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Comment.countDocuments({ 
      parentCommentId: req.params.id,
      isDeleted: false
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Comment replies retrieved successfully', replies, meta)
    );
  } catch (error) {
    console.error('Get comment replies error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid comment ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve comment replies')
    );
  }
};

/**
 * @desc    Get comments by user
 * @route   GET /api/comments/user/:userId
 * @access  Public
 */
const getCommentsByUser = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // Get comments
    const comments = await Comment.find({ 
      author: req.params.userId,
      isDeleted: false
    })
      .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
      .populate('postId', 'title') // Populate post title
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Comment.countDocuments({ 
      author: req.params.userId,
      isDeleted: false
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'User comments retrieved successfully', comments, meta)
    );
  } catch (error) {
    console.error('Get comments by user error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid user ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve user comments')
    );
  }
};

module.exports = {
  getComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
  getCommentReplies,
  getCommentsByUser
};
