const Notification = require('../models/Notification');
const emailService = require('./emailService');
const { NOTIFICATION_TYPES } = require('../utils/constants');

class NotificationService {
  constructor() {
    this.emailNotificationEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false';
  }

  /**
   * Create and send notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise} Promise resolving to created notification
   */
  async createNotification(notificationData) {
    const {
      recipient,
      sender,
      type,
      questionId,
      answerId,
      commentId,
      customMessage
    } = notificationData;

    try {
      // Get sender information for message generation
      const User = require('../models/User');
      const senderUser = await User.findById(sender).select('username profile');
      const recipientUser = await User.findById(recipient).select('username email profile');

      if (!recipientUser) {
        throw new Error('Recipient user not found');
      }

      // Generate notification message
      const message = customMessage || this.generateNotificationMessage(type, senderUser, notificationData);

      // Generate URL based on content type
      const url = this.generateNotificationUrl(type, { questionId, answerId, commentId });

      // Create notification in database
      const notification = await Notification.createNotification({
        recipient,
        sender,
        type,
        message,
        questionId,
        answerId,
        commentId,
        url
      });

      // Send email notification if enabled and user hasn't opted out
      if (this.emailNotificationEnabled && notification) {
        await this.sendEmailNotification(recipientUser, senderUser, type, {
          ...notificationData,
          message,
          url
        });
      }

      // Send real-time notification via Socket.IO
      this.sendRealTimeNotification(recipient, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Generate notification message based on type
   * @param {string} type - Notification type
   * @param {Object} sender - Sender user object
   * @param {Object} data - Additional data
   * @returns {string} Generated message
   */
  generateNotificationMessage(type, sender, data) {
    const senderName = sender?.profile?.fullName || sender?.username || 'Someone';

    switch (type) {
      case NOTIFICATION_TYPES.NEW_ANSWER:
        return `${senderName} answered your question`;
      case NOTIFICATION_TYPES.COMMENT_ON_ANSWER:
        return `${senderName} commented on your answer`;
      case NOTIFICATION_TYPES.COMMENT_ON_QUESTION:
        return `${senderName} commented on your question`;
      case NOTIFICATION_TYPES.MENTION:
        return `${senderName} mentioned you`;
      case NOTIFICATION_TYPES.ANSWER_ACCEPTED:
        return `${senderName} accepted your answer`;
      case NOTIFICATION_TYPES.QUESTION_CLOSED:
        return `Your question was closed by ${senderName}`;
      default:
        return `You have a new notification from ${senderName}`;
    }
  }

  /**
   * Generate notification URL
   * @param {string} type - Notification type
   * @param {Object} data - Data containing IDs
   * @returns {string} Generated URL
   */
  generateNotificationUrl(type, data) {
    const { questionId, answerId, commentId } = data;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (questionId) {
      let url = `${baseUrl}/questions/${questionId}`;
      
      if (answerId) {
        url += `#answer-${answerId}`;
      } else if (commentId) {
        url += `#comment-${commentId}`;
      }
      
      return url;
    }

    return baseUrl;
  }

  /**
   * Send email notification
   * @param {Object} recipient - Recipient user object
   * @param {Object} sender - Sender user object
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  async sendEmailNotification(recipient, sender, type, data) {
    try {
      // Check if recipient wants email notifications for this type
      // (This could be extended with user preferences)
      
      const senderName = sender?.profile?.fullName || sender?.username || 'Someone';
      
      await emailService.sendNotificationEmail(
        recipient.email,
        recipient.username,
        type,
        {
          senderName,
          ...data
        }
      );
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't throw error - email failure shouldn't break notification creation
    }
  }

  /**
   * Send real-time notification via Socket.IO
   * @param {string} recipientId - Recipient user ID
   * @param {Object} notification - Notification object
   */
  sendRealTimeNotification(recipientId, notification) {
    try {
      // Get Socket.IO instance
      const { getIO } = require('../socket/socketHandlers');
      const io = getIO();
      
      if (io) {
        // Send to specific user if they're connected
        io.to(`user_${recipientId}`).emit('notification', {
          id: notification._id,
          type: notification.type,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
          isRead: false
        });
      }
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
    }
  }

  /**
   * Notify when new answer is posted
   * @param {Object} answer - Answer object
   * @param {Object} question - Question object
   */
  async notifyNewAnswer(answer, question) {
    // Don't notify if answerer is the question author
    if (answer.author.toString() === question.author.toString()) {
      return;
    }

    return await this.createNotification({
      recipient: question.author,
      sender: answer.author,
      type: NOTIFICATION_TYPES.NEW_ANSWER,
      questionId: question._id,
      answerId: answer._id,
      questionTitle: question.title
    });
  }

  /**
   * Notify when comment is posted
   * @param {Object} comment - Comment object
   * @param {Object} parent - Parent object (question or answer)
   * @param {string} parentType - 'question' or 'answer'
   */
  async notifyNewComment(comment, parent, parentType) {
    // Don't notify if commenter is the content author
    if (comment.author.toString() === parent.author.toString()) {
      return;
    }

    const notificationType = parentType === 'question' ? 
      NOTIFICATION_TYPES.COMMENT_ON_QUESTION : 
      NOTIFICATION_TYPES.COMMENT_ON_ANSWER;

    return await this.createNotification({
      recipient: parent.author,
      sender: comment.author,
      type: notificationType,
      questionId: parentType === 'question' ? parent._id : parent.question,
      answerId: parentType === 'answer' ? parent._id : null,
      commentId: comment._id
    });
  }

  /**
   * Notify when answer is accepted
   * @param {Object} answer - Answer object
   * @param {Object} question - Question object
   */
  async notifyAnswerAccepted(answer, question) {
    // Don't notify if question author accepted their own answer
    if (answer.author.toString() === question.author.toString()) {
      return;
    }

    return await this.createNotification({
      recipient: answer.author,
      sender: question.author,
      type: NOTIFICATION_TYPES.ANSWER_ACCEPTED,
      questionId: question._id,
      answerId: answer._id,
      questionTitle: question.title
    });
  }

  /**
   * Notify when question is closed
   * @param {Object} question - Question object
   * @param {string} closedBy - User ID who closed the question
   * @param {string} reason - Close reason
   */
  async notifyQuestionClosed(question, closedBy, reason) {
    // Don't notify if question author closed their own question
    if (question.author.toString() === closedBy.toString()) {
      return;
    }

    return await this.createNotification({
      recipient: question.author,
      sender: closedBy,
      type: NOTIFICATION_TYPES.QUESTION_CLOSED,
      questionId: question._id,
      questionTitle: question.title,
      customMessage: `Your question was closed. Reason: ${reason}`
    });
  }

  /**
   * Notify users mentioned in content
   * @param {string} content - Content text
   * @param {string} authorId - Author of the content
   * @param {Object} context - Context data (questionId, answerId, etc.)
   */
  async notifyMentions(content, authorId, context) {
    // Extract mentions from content (e.g., @username)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    if (mentions.length === 0) {
      return;
    }

    try {
      const User = require('../models/User');
      const mentionedUsers = await User.find({
        username: { $in: mentions },
        _id: { $ne: authorId } // Don't notify self-mentions
      }).select('_id username');

      const notificationPromises = mentionedUsers.map(user => 
        this.createNotification({
          recipient: user._id,
          sender: authorId,
          type: NOTIFICATION_TYPES.MENTION,
          ...context
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error notifying mentions:', error);
    }
  }

  /**
   * Get user's notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise} Promise resolving to notifications
   */
  async getUserNotifications(userId, options = {}) {
    return await Notification.getUserNotifications(userId, options);
  }

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   * @returns {Promise} Promise resolving to count
   */
  async getUnreadCount(userId) {
    return await Notification.getUnreadCount(userId);
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise} Promise resolving to updated notification
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   * @returns {Promise} Promise resolving to update result
   */
  async markAllAsRead(userId) {
    return await Notification.markAllAsRead(userId);
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise} Promise resolving to deleted notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.softDelete();
  }

  /**
   * Clean up old notifications (background task)
   * @param {number} days - Days to keep notifications
   */
  async cleanupOldNotifications(days = 30) {
    try {
      const result = await Notification.deleteOldNotifications(days);
      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
