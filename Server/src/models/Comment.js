const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Comment parent is required']
  },
  
  parentType: {
    type: String,
    enum: ['question', 'answer'],
    required: [true, 'Parent type is required']
  },
  
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment author is required']
  },
  
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    minlength: [1, 'Comment must be at least 1 character'],
    maxlength: [600, 'Comment cannot exceed 600 characters'],
    trim: true
  },
  
  voteScore: {
    type: Number,
    default: 0
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  editHistory: [{
    editedAt: {
      type: Date,
      default: Date.now
    },
    previousContent: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to check if comment was edited
commentSchema.virtual('isEdited').get(function() {
  return this.editHistory && this.editHistory.length > 0;
});

// Virtual for last edit date
commentSchema.virtual('lastEditedAt').get(function() {
  if (this.editHistory && this.editHistory.length > 0) {
    return this.editHistory[this.editHistory.length - 1].editedAt;
  }
  return null;
});

// Pre-save middleware to update parent's comment count and last activity
commentSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    try {
      if (this.parentType === 'question') {
        const Question = mongoose.model('Question');
        await Question.findByIdAndUpdate(
          this.parent,
          { lastActivity: new Date() }
        );
      } else if (this.parentType === 'answer') {
        const Answer = mongoose.model('Answer');
        const answer = await Answer.findById(this.parent);
        if (answer) {
          await answer.updateCommentCount();
          
          // Also update the question's last activity
          const Question = mongoose.model('Question');
          await Question.findByIdAndUpdate(
            answer.question,
            { lastActivity: new Date() }
          );
        }
      }
    } catch (error) {
      console.error('Error updating parent on comment save:', error);
    }
  }
  next();
});

// Instance method to edit comment
commentSchema.methods.editContent = async function(newContent) {
  // Add to edit history
  this.editHistory.push({
    editedAt: new Date(),
    previousContent: this.content
  });
  
  // Update content
  this.content = newContent;
  
  // Update parent's last activity
  if (this.parentType === 'question') {
    const Question = mongoose.model('Question');
    await Question.findByIdAndUpdate(
      this.parent,
      { lastActivity: new Date() }
    );
  } else if (this.parentType === 'answer') {
    const Answer = mongoose.model('Answer');
    const answer = await Answer.findById(this.parent);
    if (answer) {
      const Question = mongoose.model('Question');
      await Question.findByIdAndUpdate(
        answer.question,
        { lastActivity: new Date() }
      );
    }
  }
  
  return await this.save();
};

// Instance method to soft delete comment
commentSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  
  // Update parent's comment count
  if (this.parentType === 'answer') {
    const Answer = mongoose.model('Answer');
    const answer = await Answer.findById(this.parent);
    if (answer) {
      await answer.updateCommentCount();
    }
  }
  
  return await this.save();
};

// Instance method to restore deleted comment
commentSchema.methods.restore = async function() {
  this.isDeleted = false;
  
  // Update parent's comment count
  if (this.parentType === 'answer') {
    const Answer = mongoose.model('Answer');
    const answer = await Answer.findById(this.parent);
    if (answer) {
      await answer.updateCommentCount();
    }
  }
  
  return await this.save();
};

// Static method to find comments for a parent
commentSchema.statics.findByParent = function(parentId, parentType, options = {}) {
  const {
    page = 1,
    limit = 20,
    includeDeleted = false
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query
  const query = { 
    parent: parentId, 
    parentType: parentType 
  };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  return this.find(query)
    .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
    .sort({ createdAt: 1 }) // Comments are typically shown in chronological order
    .skip(skip)
    .limit(limit);
};

// Static method to get comment count for a parent
commentSchema.statics.getCommentCount = function(parentId, parentType, includeDeleted = false) {
  const query = { 
    parent: parentId, 
    parentType: parentType 
  };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  return this.countDocuments(query);
};

// Index for better performance
commentSchema.index({ parent: 1, parentType: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Comment', commentSchema);
