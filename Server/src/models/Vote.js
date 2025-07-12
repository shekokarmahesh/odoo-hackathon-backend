const mongoose = require('mongoose');
const { VOTE_TYPES } = require('../utils/constants');

const voteSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Voter is required']
  },
  
  target: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Vote target is required']
  },
  
  targetType: {
    type: String,
    enum: ['question', 'answer'],
    required: [true, 'Target type is required']
  },
  
  voteType: {
    type: String,
    enum: Object.values(VOTE_TYPES),
    required: [true, 'Vote type is required']
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate votes
voteSchema.index({ voter: 1, target: 1, targetType: 1 }, { unique: true });

// Index for better performance
voteSchema.index({ target: 1, targetType: 1 });
voteSchema.index({ voter: 1, createdAt: -1 });

// Pre-save middleware to update vote score on target
voteSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      await this.updateTargetVoteScore();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-remove middleware to update vote score when vote is removed
voteSchema.pre('remove', async function(next) {
  try {
    // Reverse the vote impact
    const voteValue = this.voteType === VOTE_TYPES.UPVOTE ? -1 : 1;
    await this.updateTargetVoteScore(voteValue);
  } catch (error) {
    return next(error);
  }
  next();
});

// Instance method to update target vote score
voteSchema.methods.updateTargetVoteScore = async function(customValue = null) {
  const voteValue = customValue !== null ? customValue : 
    (this.voteType === VOTE_TYPES.UPVOTE ? 1 : -1);
  
  if (this.targetType === 'question') {
    const Question = mongoose.model('Question');
    await Question.findByIdAndUpdate(
      this.target,
      { 
        $inc: { voteScore: voteValue },
        lastActivity: new Date()
      }
    );
  } else if (this.targetType === 'answer') {
    const Answer = mongoose.model('Answer');
    await Answer.findByIdAndUpdate(
      this.target,
      { $inc: { voteScore: voteValue } }
    );
    
    // Also update the question's last activity
    const answer = await Answer.findById(this.target);
    if (answer) {
      const Question = mongoose.model('Question');
      await Question.findByIdAndUpdate(
        answer.question,
        { lastActivity: new Date() }
      );
    }
  }
};

// Static method to toggle vote
voteSchema.statics.toggleVote = async function(voterId, targetId, targetType, voteType) {
  try {
    // Check if user already voted on this target
    const existingVote = await this.findOne({
      voter: voterId,
      target: targetId,
      targetType: targetType
    });
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Same vote type - remove the vote
        await existingVote.remove();
        return { action: 'removed', vote: null };
      } else {
        // Different vote type - update the vote
        const oldVoteType = existingVote.voteType;
        existingVote.voteType = voteType;
        
        // Update target score (remove old vote impact and add new vote impact)
        const scoreChange = voteType === VOTE_TYPES.UPVOTE ? 2 : -2;
        await existingVote.updateTargetVoteScore(scoreChange);
        
        await existingVote.save({ validateBeforeSave: false });
        return { action: 'updated', vote: existingVote };
      }
    } else {
      // No existing vote - create new vote
      const newVote = await this.create({
        voter: voterId,
        target: targetId,
        targetType: targetType,
        voteType: voteType
      });
      return { action: 'created', vote: newVote };
    }
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - race condition, try again
      return await this.toggleVote(voterId, targetId, targetType, voteType);
    }
    throw error;
  }
};

// Static method to get user's vote on a target
voteSchema.statics.getUserVote = function(voterId, targetId, targetType) {
  return this.findOne({
    voter: voterId,
    target: targetId,
    targetType: targetType
  });
};

// Static method to get vote summary for a target
voteSchema.statics.getVoteSummary = async function(targetId, targetType) {
  const votes = await this.aggregate([
    {
      $match: {
        target: new mongoose.Types.ObjectId(targetId),
        targetType: targetType
      }
    },
    {
      $group: {
        _id: '$voteType',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const summary = {
    upvotes: 0,
    downvotes: 0,
    total: 0
  };
  
  votes.forEach(vote => {
    if (vote._id === VOTE_TYPES.UPVOTE) {
      summary.upvotes = vote.count;
    } else if (vote._id === VOTE_TYPES.DOWNVOTE) {
      summary.downvotes = vote.count;
    }
  });
  
  summary.total = summary.upvotes - summary.downvotes;
  
  return summary;
};

// Static method to update user reputation based on votes
voteSchema.statics.updateUserReputation = async function(targetId, targetType, voteType) {
  try {
    let authorId;
    
    if (targetType === 'question') {
      const Question = mongoose.model('Question');
      const question = await Question.findById(targetId);
      authorId = question?.author;
    } else if (targetType === 'answer') {
      const Answer = mongoose.model('Answer');
      const answer = await Answer.findById(targetId);
      authorId = answer?.author;
    }
    
    if (authorId) {
      const User = mongoose.model('User');
      const reputationChange = voteType === VOTE_TYPES.UPVOTE ? 
        (targetType === 'question' ? 5 : 10) : 
        -2;
      
      await User.findByIdAndUpdate(
        authorId,
        { $inc: { reputation: reputationChange } }
      );
    }
  } catch (error) {
    console.error('Error updating user reputation:', error);
  }
};

module.exports = mongoose.model('Vote', voteSchema);
