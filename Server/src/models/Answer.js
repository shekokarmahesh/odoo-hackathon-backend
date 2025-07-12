const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Question reference is required']
  },
  
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Answer author is required']
  },
  
  content: {
    type: String,
    required: [true, 'Answer content is required'],
    minlength: [30, 'Answer must be at least 30 characters long']
  },
  
  isAccepted: {
    type: Boolean,
    default: false
  },
  
  voteScore: {
    type: Number,
    default: 0
  },
  
  commentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  editHistory: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      maxlength: [200, 'Edit reason cannot exceed 200 characters']
    },
    previousContent: {
      type: String,
      required: true
    }
  }],
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comments
answerSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parent',
  match: { parentType: 'answer' }
});

// Virtual for votes
answerSchema.virtual('votes', {
  ref: 'Vote',
  localField: '_id',
  foreignField: 'target',
  match: { targetType: 'answer' }
});

// Virtual to check if answer was edited
answerSchema.virtual('isEdited').get(function() {
  return this.editHistory && this.editHistory.length > 0;
});

// Virtual for last edit date
answerSchema.virtual('lastEditedAt').get(function() {
  if (this.editHistory && this.editHistory.length > 0) {
    return this.editHistory[this.editHistory.length - 1].editedAt;
  }
  return null;
});

// Pre-save middleware to update question's lastActivity and answerCount
answerSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      const Question = mongoose.model('Question');
      await Question.findByIdAndUpdate(
        this.question,
        { 
          lastActivity: new Date(),
          $inc: { answerCount: 1 }
        }
      );
    } catch (error) {
      console.error('Error updating question on answer save:', error);
    }
  }
  next();
});

// Post-save middleware to update question's accepted answer
answerSchema.post('save', async function(doc) {
  if (doc.isAccepted) {
    try {
      const Question = mongoose.model('Question');
      await Question.findByIdAndUpdate(
        doc.question,
        { 
          acceptedAnswer: doc._id,
          lastActivity: new Date()
        }
      );
      
      // Unmark other answers as accepted
      await mongoose.model('Answer').updateMany(
        { 
          question: doc.question, 
          _id: { $ne: doc._id } 
        },
        { isAccepted: false }
      );
    } catch (error) {
      console.error('Error updating question on answer acceptance:', error);
    }
  }
});

// Instance method to update comment count
answerSchema.methods.updateCommentCount = async function() {
  const Comment = mongoose.model('Comment');
  this.commentCount = await Comment.countDocuments({ 
    parent: this._id, 
    parentType: 'answer',
    isDeleted: false 
  });
  return await this.save({ validateBeforeSave: false });
};

// Instance method to edit answer
answerSchema.methods.editContent = async function(newContent, editedBy, reason) {
  // Add to edit history
  this.editHistory.push({
    editedBy,
    editedAt: new Date(),
    reason: reason || 'Content updated',
    previousContent: this.content
  });
  
  // Update content
  this.content = newContent;
  
  // Update question's last activity
  const Question = mongoose.model('Question');
  await Question.findByIdAndUpdate(
    this.question,
    { lastActivity: new Date() }
  );
  
  return await this.save();
};

// Instance method to soft delete answer
answerSchema.methods.softDelete = async function(deletedBy) {
  this.isDeleted = true;
  this.deletedBy = deletedBy;
  this.deletedAt = new Date();
  
  // Update question's answer count and last activity
  const Question = mongoose.model('Question');
  const question = await Question.findById(this.question);
  if (question) {
    await question.updateAnswerCount();
  }
  
  return await this.save();
};

// Instance method to restore deleted answer
answerSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedBy = null;
  this.deletedAt = null;
  
  // Update question's answer count and last activity
  const Question = mongoose.model('Question');
  const question = await Question.findById(this.question);
  if (question) {
    await question.updateAnswerCount();
  }
  
  return await this.save();
};

// Static method to find answers for a question
answerSchema.statics.findByQuestion = function(questionId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = 'votes',
    includeDeleted = false
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query
  const query = { question: questionId };
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  // Build sort criteria
  let sortCriteria = {};
  switch (sort) {
    case 'newest':
      sortCriteria = { createdAt: -1 };
      break;
    case 'oldest':
      sortCriteria = { createdAt: 1 };
      break;
    case 'votes':
      sortCriteria = { isAccepted: -1, voteScore: -1, createdAt: -1 };
      break;
    default:
      sortCriteria = { isAccepted: -1, voteScore: -1, createdAt: -1 };
  }
  
  return this.find(query)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
    .populate('editHistory.editedBy', 'username')
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit);
};

// Index for better performance
answerSchema.index({ question: 1, createdAt: -1 });
answerSchema.index({ author: 1, createdAt: -1 });
answerSchema.index({ question: 1, isAccepted: -1, voteScore: -1 });
answerSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Answer', answerSchema);
