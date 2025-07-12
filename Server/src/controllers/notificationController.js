const Notification = require('../models/Notification');
const { createResponse, getPaginationParams, createPaginationMeta } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { type, isRead } = req.query;

    // Build filter criteria
    const filterCriteria = { recipient: req.user._id };
    
    if (type) {
      filterCriteria.type = type;
    }
    
    if (isRead !== undefined) {
      filterCriteria.isRead = isRead === 'true';
    }

    // Get notifications
    const notifications = await Notification.find(filterCriteria)
      .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Notification.countDocuments(filterCriteria);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);
    meta.unreadCount = unreadCount;

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notifications retrieved successfully', notifications, meta)
    );
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve notifications')
    );
  }
};

/**
 * @desc    Get a single notification by ID
 * @route   GET /api/notifications/:id
 * @access  Private
 */
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    })
      .populate('sender', 'username profile.firstName profile.lastName profile.avatar');

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Notification not found')
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notification retrieved successfully', notification)
    );
  } catch (error) {
    console.error('Get notification by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid notification ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve notification')
    );
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Notification not found')
      );
    }

    if (notification.isRead) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Notification is already read')
      );
    }

    // Mark as read
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username profile.firstName profile.lastName profile.avatar');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notification marked as read', populatedNotification)
    );
  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid notification ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to mark notification as read')
    );
  }
};

/**
 * @desc    Mark notification as unread
 * @route   PUT /api/notifications/:id/unread
 * @access  Private
 */
const markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Notification not found')
      );
    }

    if (!notification.isRead) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Notification is already unread')
      );
    }

    // Mark as unread
    notification.isRead = false;
    notification.readAt = null;
    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username profile.firstName profile.lastName profile.avatar');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notification marked as unread', populatedNotification)
    );
  } catch (error) {
    console.error('Mark notification as unread error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid notification ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to mark notification as unread')
    );
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { 
        recipient: req.user._id,
        isRead: false
      },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, `${result.modifiedCount} notifications marked as read`)
    );
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to mark all notifications as read')
    );
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Notification not found')
      );
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notification deleted successfully')
    );
  } catch (error) {
    console.error('Delete notification error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid notification ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to delete notification')
    );
  }
};

/**
 * @desc    Delete all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
const deleteAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user._id
    });

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, `${result.deletedCount} notifications deleted`)
    );
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to delete all notifications')
    );
  }
};

/**
 * @desc    Get unread notifications count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Unread count retrieved successfully', { count })
    );
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve unread count')
    );
  }
};

/**
 * @desc    Get notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
const getPreferences = async (req, res) => {
  try {
    // Get user's notification preferences from user model
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('preferences.notifications');

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'User not found')
      );
    }

    const preferences = user.preferences?.notifications || {
      email: true,
      push: true,
      types: {
        comment: true,
        answer: true,
        vote: true,
        mention: true,
        badge: true
      }
    };

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notification preferences retrieved successfully', preferences)
    );
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve notification preferences')
    );
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
const updatePreferences = async (req, res) => {
  try {
    const { email, push, types } = req.body;

    const User = require('../models/User');
    
    const updateData = {};
    if (email !== undefined) updateData['preferences.notifications.email'] = email;
    if (push !== undefined) updateData['preferences.notifications.push'] = push;
    if (types) {
      Object.keys(types).forEach(key => {
        updateData[`preferences.notifications.types.${key}`] = types[key];
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('preferences.notifications');

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'User not found')
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Notification preferences updated successfully', user.preferences.notifications)
    );
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to update notification preferences')
    );
  }
};

/**
 * @desc    Get notifications by type
 * @route   GET /api/notifications/type/:type
 * @access  Private
 */
const getNotificationsByType = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { type } = req.params;

    // Validate notification type
    const validTypes = ['comment', 'answer', 'vote', 'mention', 'badge', 'follow'];
    if (!validTypes.includes(type)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid notification type')
      );
    }

    // Get notifications
    const notifications = await Notification.find({
      recipient: req.user._id,
      type
    })
      .populate('sender', 'username profile.firstName profile.lastName profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Notification.countDocuments({
      recipient: req.user._id,
      type
    });

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, `${type} notifications retrieved successfully`, notifications, meta)
    );
  } catch (error) {
    console.error('Get notifications by type error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve notifications by type')
    );
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  getNotificationsByType
};
