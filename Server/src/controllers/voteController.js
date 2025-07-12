const Vote = require('../models/Vote');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { createResponse, calculateReputationChange } = require('../utils/helpers');
const { HTTP_STATUS, VOTE_TYPES } = require('../utils/constants');
const { voteSchema } = require('../utils/validators');

/**
 * @desc    Cast or update a vote
 * @route   POST /api/votes
 * @access  Private
 */
const castVote = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = voteSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const { target, targetType, voteType } = value;

    // Verify target exists
    let targetModel;
    if (targetType === 'question') {
      targetModel = await Question.findById(target);
    } else if (targetType === 'answer') {
      targetModel = await Answer.findById(target);
    }

    if (!targetModel) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, `${targetType} not found`)
      );
    }

    // Check if user is trying to vote on their own content
    if (targetModel.author.toString() === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Cannot vote on your own content')
      );
    }

    // Cast or update vote
    const voteResult = await Vote.castVote(req.user._id, target, targetType, voteType);
    
    // Update reputation based on vote action
    const targetAuthor = await User.findById(targetModel.author);
    let reputationChange = 0;

    if (voteResult.action === 'created') {
      if (targetType === 'question') {
        reputationChange = calculateReputationChange(voteType === 'upvote' ? 'question_upvote' : 'question_downvote');
      } else {
        reputationChange = calculateReputationChange(voteType === 'upvote' ? 'answer_upvote' : 'answer_downvote');
      }
    } else if (voteResult.action === 'updated') {
      // When vote changes from up to down or vice versa, apply double change
      if (targetType === 'question') {
        const upvoteChange = calculateReputationChange('question_upvote');
        const downvoteChange = calculateReputationChange('question_downvote');
        reputationChange = voteType === 'upvote' ? (upvoteChange - downvoteChange) : (downvoteChange - upvoteChange);
      } else {
        const upvoteChange = calculateReputationChange('answer_upvote');
        const downvoteChange = calculateReputationChange('answer_downvote');
        reputationChange = voteType === 'upvote' ? (upvoteChange - downvoteChange) : (downvoteChange - upvoteChange);
      }
    } else if (voteResult.action === 'removed') {
      // Reverse the reputation change
      if (targetType === 'question') {
        reputationChange = -calculateReputationChange(voteType === 'upvote' ? 'question_upvote' : 'question_downvote');
      } else {
        reputationChange = -calculateReputationChange(voteType === 'upvote' ? 'answer_upvote' : 'answer_downvote');
      }
    }

    // Update target author's reputation
    if (reputationChange !== 0) {
      await targetAuthor.updateReputation(reputationChange);
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(
        true, 
        `Vote ${voteResult.action} successfully`,
        {
          action: voteResult.action,
          vote: voteResult.vote,
          newReputation: targetAuthor.reputation + reputationChange
        }
      )
    );
  } catch (error) {
    console.error('Cast vote error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target ID')
      );
    }
    if (error.message === 'Duplicate vote detected') {
      return res.status(HTTP_STATUS.CONFLICT).json(
        createResponse(false, 'Duplicate vote detected')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to cast vote')
    );
  }
};

/**
 * @desc    Get vote statistics for a target
 * @route   GET /api/votes/:targetType/:targetId/stats
 * @access  Public
 */
const getVoteStats = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    if (!['question', 'answer'].includes(targetType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target type')
      );
    }

    // Verify target exists
    let targetModel;
    if (targetType === 'question') {
      targetModel = await Question.findById(targetId);
    } else {
      targetModel = await Answer.findById(targetId);
    }

    if (!targetModel) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, `${targetType} not found`)
      );
    }

    // Get vote statistics
    const stats = await Vote.getVoteStats(targetId, targetType);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Vote statistics retrieved successfully', stats)
    );
  } catch (error) {
    console.error('Get vote stats error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve vote statistics')
    );
  }
};

/**
 * @desc    Get user's vote on a specific target
 * @route   GET /api/votes/:targetType/:targetId/user
 * @access  Private
 */
const getUserVote = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    if (!['question', 'answer'].includes(targetType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target type')
      );
    }

    // Get user's vote
    const userVote = await Vote.getUserVote(req.user._id, targetId, targetType);

    res.status(HTTP_STATUS.OK).json(
      createResponse(
        true, 
        'User vote retrieved successfully', 
        userVote ? { voteType: userVote.voteType } : null
      )
    );
  } catch (error) {
    console.error('Get user vote error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve user vote')
    );
  }
};

/**
 * @desc    Remove a vote
 * @route   DELETE /api/votes/:targetType/:targetId
 * @access  Private
 */
const removeVote = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    if (!['question', 'answer'].includes(targetType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target type')
      );
    }

    // Find and remove the vote
    const vote = await Vote.findOne({
      voter: req.user._id,
      target: targetId,
      targetType
    });

    if (!vote) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Vote not found')
      );
    }

    await Vote.findByIdAndDelete(vote._id);

    // Update reputation
    let targetModel;
    if (targetType === 'question') {
      targetModel = await Question.findById(targetId);
    } else {
      targetModel = await Answer.findById(targetId);
    }

    if (targetModel) {
      const targetAuthor = await User.findById(targetModel.author);
      let reputationChange = 0;

      if (targetType === 'question') {
        reputationChange = -calculateReputationChange(vote.voteType === 'upvote' ? 'question_upvote' : 'question_downvote');
      } else {
        reputationChange = -calculateReputationChange(vote.voteType === 'upvote' ? 'answer_upvote' : 'answer_downvote');
      }

      await targetAuthor.updateReputation(reputationChange);
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Vote removed successfully')
    );
  } catch (error) {
    console.error('Remove vote error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid target ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to remove vote')
    );
  }
};

module.exports = {
  castVote,
  getVoteStats,
  getUserVote,
  removeVote
};
