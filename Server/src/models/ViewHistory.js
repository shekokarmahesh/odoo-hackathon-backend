const mongoose = require('mongoose');

const viewHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for anonymous views
  },
  
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Question reference is required']
  },
  
  ipAddress: {
    type: String,
    required: [true, 'IP address is required']
  },
  
  userAgent: {
    type: String,
    default: ''
  },
  
  sessionId: {
    type: String,
    default: null
  },
  
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // We're using viewedAt instead
});

// Index for better performance and analytics
viewHistorySchema.index({ question: 1, viewedAt: -1 });
viewHistorySchema.index({ user: 1, viewedAt: -1 });
viewHistorySchema.index({ ipAddress: 1, question: 1, viewedAt: -1 });
viewHistorySchema.index({ viewedAt: -1 }); // For cleanup

// Static method to record a view
viewHistorySchema.statics.recordView = async function(data) {
  const { questionId, userId, ipAddress, userAgent, sessionId } = data;
  
  // Check if this user/IP has viewed this question recently (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  let query = {
    question: questionId,
    viewedAt: { $gte: oneHourAgo }
  };
  
  if (userId) {
    query.user = userId;
  } else {
    query.ipAddress = ipAddress;
    query.user = null;
  }
  
  const recentView = await this.findOne(query);
  
  if (!recentView) {
    // Record new view
    await this.create({
      user: userId || null,
      question: questionId,
      ipAddress,
      userAgent: userAgent || '',
      sessionId: sessionId || null,
      viewedAt: new Date()
    });
    
    // Increment question view count
    const Question = mongoose.model('Question');
    await Question.findByIdAndUpdate(
      questionId,
      { $inc: { views: 1 } }
    );
    
    return true; // New view recorded
  }
  
  return false; // View already recorded recently
};

// Static method to get view analytics
viewHistorySchema.statics.getViewAnalytics = async function(questionId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const analytics = await this.aggregate([
    {
      $match: {
        question: new mongoose.Types.ObjectId(questionId),
        viewedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$viewedAt' },
          month: { $month: '$viewedAt' },
          day: { $dayOfMonth: '$viewedAt' }
        },
        totalViews: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueIPs: { $addToSet: '$ipAddress' }
      }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        totalViews: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueIPCount: { $size: '$uniqueIPs' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
  
  return analytics;
};

// Static method to get top viewed questions
viewHistorySchema.statics.getTopViewedQuestions = async function(options = {}) {
  const {
    days = 7,
    limit = 10,
    excludeQuestionIds = []
  } = options;
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const matchStage = {
    viewedAt: { $gte: startDate }
  };
  
  if (excludeQuestionIds.length > 0) {
    matchStage.question = { 
      $nin: excludeQuestionIds.map(id => new mongoose.Types.ObjectId(id))
    };
  }
  
  const topQuestions = await this.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: '$question',
        viewCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueIPs: { $addToSet: '$ipAddress' }
      }
    },
    {
      $project: {
        questionId: '$_id',
        viewCount: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueIPCount: { $size: '$uniqueIPs' }
      }
    },
    {
      $sort: { viewCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'questions',
        localField: 'questionId',
        foreignField: '_id',
        as: 'question'
      }
    },
    {
      $unwind: '$question'
    },
    {
      $lookup: {
        from: 'users',
        localField: 'question.author',
        foreignField: '_id',
        as: 'author'
      }
    },
    {
      $unwind: '$author'
    }
  ]);
  
  return topQuestions;
};

// Static method to clean old view history
viewHistorySchema.statics.cleanOldViews = function(days = 90) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    viewedAt: { $lt: cutoffDate }
  });
};

// Static method to get user's view history
viewHistorySchema.statics.getUserViewHistory = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20
  } = options;
  
  const skip = (page - 1) * limit;
  
  return this.find({ user: userId })
    .populate({
      path: 'question',
      select: 'title author tags createdAt',
      populate: [
        {
          path: 'author',
          select: 'username profile.firstName profile.lastName'
        },
        {
          path: 'tags',
          select: 'name color'
        }
      ]
    })
    .sort({ viewedAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('ViewHistory', viewHistorySchema);
