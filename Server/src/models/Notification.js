const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification recipient is required']
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null for system notifications
  },
  
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: [true, 'Notification type is required']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Notification message cannot exceed 500 characters']
  },
  
  data: {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      default: null
    },
    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      default: null
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    url: {
      type: String,
      default: null
    }
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ isDeleted: 1 });

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  return await this.save();
};

// Instance method to soft delete
notificationSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  return await this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const {
    recipient,
    sender,
    type,
    message,
    questionId,
    answerId,
    commentId,
    url
  } = data;
  
  // Don't send notification to self
  if (recipient.toString() === sender?.toString()) {
    return null;
  }
  
  // Check if similar notification already exists recently (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existingNotification = await this.findOne({
    recipient,
    sender,
    type,
    'data.questionId': questionId,
    'data.answerId': answerId,
    'data.commentId': commentId,
    createdAt: { $gte: oneHourAgo },
    isDeleted: false
  });
  
  if (existingNotification) {
    // Update existing notification instead of creating duplicate
    existingNotification.message = message;
    existingNotification.isRead = false;
    existingNotification.data.url = url;
    existingNotification.createdAt = new Date();
    return await existingNotification.save();
  }
  
  // Create new notification
  return await this.create({
    recipient,
    sender,
    type,
    message,
    data: {
      questionId,
      answerId,
      commentId,
      url
    }
  });
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query
  const query = { 
    recipient: userId, 
    isDeleted: false 
  };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  return this.find(query)
    .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
    .populate('data.questionId', 'title')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true
    }
  );
};

// Static method to delete old notifications (cleanup)
notificationSchema.statics.deleteOldNotifications = function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

// Static method for notification templates
notificationSchema.statics.getNotificationMessage = function(type, senderName, data = {}) {
  const templates = {
    [NOTIFICATION_TYPES.NEW_ANSWER]: `${senderName} answered your question "${data.questionTitle}"`,
    [NOTIFICATION_TYPES.COMMENT_ON_ANSWER]: `${senderName} commented on your answer`,
    [NOTIFICATION_TYPES.COMMENT_ON_QUESTION]: `${senderName} commented on your question "${data.questionTitle}"`,
    [NOTIFICATION_TYPES.MENTION]: `${senderName} mentioned you in a ${data.mentionType}`,
    [NOTIFICATION_TYPES.ANSWER_ACCEPTED]: `${senderName} accepted your answer`,
    [NOTIFICATION_TYPES.QUESTION_CLOSED]: `Your question "${data.questionTitle}" was closed by ${senderName}`
  };
  
  return templates[type] || 'You have a new notification';
};

module.exports = mongoose.model('Notification', notificationSchema);
