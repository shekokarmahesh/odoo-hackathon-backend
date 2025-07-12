const express = require('express');
const router = express.Router();

// Import middleware
const { auth } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

// Import notification controller
const notificationController = require('../controllers/notificationController');

// Endpoints
router.get('/',
  auth,
  validatePagination,
  notificationController.getNotifications
);

router.get('/unread-count',
  auth,
  notificationController.getUnreadCount
);

router.get('/preferences',
  auth,
  notificationController.getPreferences
);

router.put('/preferences',
  auth,
  notificationController.updatePreferences
);

router.get('/type/:type',
  auth,
  validatePagination,
  notificationController.getNotificationsByType
);

router.get('/:id',
  validateObjectId(),
  auth,
  notificationController.getNotificationById
);

router.put('/:id/read',
  validateObjectId(),
  auth,
  notificationController.markAsRead
);

router.put('/:id/unread',
  validateObjectId(),
  auth,
  notificationController.markAsUnread
);

router.put('/read-all',
  auth,
  notificationController.markAllAsRead
);

router.delete('/:id',
  validateObjectId(),
  auth,
  notificationController.deleteNotification
);

router.delete('/',
  auth,
  notificationController.deleteAllNotifications
);

module.exports = router;
