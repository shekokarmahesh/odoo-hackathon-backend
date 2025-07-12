const mongoose = require('mongoose');
const { QUESTION_STATUS } = require('../utils/constants');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    minlength: [10, 'Question title must be at least 10 characters'],
    maxlength: [150, 'Question title cannot exceed 150 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Question description is required'],
    minlength: [20, 'Question description must be at least 20 characters']
  },
  
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Question author is required']
  },
  
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    required: true
  }],
  
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    default: null
  },
  
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  
  voteScore: {
    type: Number,
    default: 0
  },
  
  answerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  status: {
    type: String,
    enum: Object.values(QUESTION_STATUS),
    default: QUESTION_STATUS.ACTIVE
  },
  
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  closedReason: {
    type: String,
    maxlength: [200, 'Closed reason cannot exceed 200 characters'],
    default: null
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validation for tags array
questionSchema.path('tags').validate(function(tags) {
  return tags && tags.length >= 1 && tags.length <= 5;
}, 'Question must have between 1 and 5 tags');

// Virtual for answers
questionSchema.virtual('answers', {
  ref: 'Answer',
  localField: '_id',
  foreignField: 'question'
});

// Virtual for comments
questionSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parent',
  match: { parentType: 'question' }
});

// Virtual for votes
questionSchema.virtual('votes', {
  ref: 'Vote',
  localField: '_id',
  foreignField: 'target',
  match: { targetType: 'question' }
});

// Pre-save middleware to update lastActivity
questionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Instance method to increment view count
questionSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save({ validateBeforeSave: false });
};

// Instance method to update answer count
questionSchema.methods.updateAnswerCount = async function() {
  const Answer = mongoose.model('Answer');
  this.answerCount = await Answer.countDocuments({ 
    question: this._id, 
    isDeleted: false 
  });
  this.lastActivity = new Date();
  return await this.save({ validateBeforeSave: false });
};

// Instance method to accept an answer
questionSchema.methods.acceptAnswer = async function(answerId, userId) {
  // Verify the user is the question author
  if (this.author.toString() !== userId.toString()) {
    throw new Error('Only the question author can accept an answer');
  }
  
  const Answer = mongoose.model('Answer');
  
  // Unmark previous accepted answer if exists
  if (this.acceptedAnswer) {
    await Answer.findByIdAndUpdate(this.acceptedAnswer, { isAccepted: false });
  }
  
  // Mark new answer as accepted
  await Answer.findByIdAndUpdate(answerId, { isAccepted: true });
  
  this.acceptedAnswer = answerId;
  this.lastActivity = new Date();
  return await this.save();
};

// Instance method to close question
questionSchema.methods.closeQuestion = async function(userId, reason) {
  this.status = QUESTION_STATUS.CLOSED;
  this.closedBy = userId;
  this.closedReason = reason;
  this.lastActivity = new Date();
  return await this.save();
};

// Static method for search
questionSchema.statics.searchQuestions = function(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = 'newest',
    tags = [],
    status = QUESTION_STATUS.ACTIVE
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build search criteria
  const searchCriteria = { status };
  
  if (query) {
    searchCriteria.$text = { $search: query };
  }
  
  if (tags.length > 0) {
    searchCriteria.tags = { $in: tags };
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
    default: // newest
      sortCriteria = { createdAt: -1 };
  }
  
  return this.find(searchCriteria)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
    .populate('tags', 'name color description')
    .populate('acceptedAnswer', '_id')
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit);
};

// Index for better performance
questionSchema.index({ title: 'text', description: 'text' });
questionSchema.index({ author: 1, createdAt: -1 });
questionSchema.index({ tags: 1, createdAt: -1 });
questionSchema.index({ status: 1, createdAt: -1 });
questionSchema.index({ voteScore: -1, createdAt: -1 });
questionSchema.index({ views: -1, createdAt: -1 });
questionSchema.index({ lastActivity: -1 });
questionSchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
