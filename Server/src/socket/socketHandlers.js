const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 */
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.user = user;
        }
      }
      
      // Allow anonymous connections for viewing
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      // Continue without authentication for anonymous users
      next();
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}${socket.userId ? ` (User: ${socket.userId})` : ' (Anonymous)'}`);

    // Join user-specific room for notifications
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
      
      // Update user's last seen
      updateUserLastSeen(socket.userId);
      
      // Notify user about unread notifications count
      sendUnreadNotificationCount(socket.userId);
    }

    // Question-related events
    socket.on('join_question', (questionId) => {
      if (questionId) {
        socket.join(`question_${questionId}`);
        console.log(`Socket ${socket.id} joined question room: ${questionId}`);
      }
    });

    socket.on('leave_question', (questionId) => {
      if (questionId) {
        socket.leave(`question_${questionId}`);
        console.log(`Socket ${socket.id} left question room: ${questionId}`);
      }
    });

    // Real-time typing indicators for comments
    socket.on('typing_comment_start', (data) => {
      const { questionId, parentId, parentType } = data;
      if (socket.userId && questionId) {
        socket.to(`question_${questionId}`).emit('user_typing_comment', {
          userId: socket.userId,
          username: socket.user?.username,
          parentId,
          parentType,
          isTyping: true
        });
      }
    });

    socket.on('typing_comment_stop', (data) => {
      const { questionId, parentId, parentType } = data;
      if (socket.userId && questionId) {
        socket.to(`question_${questionId}`).emit('user_typing_comment', {
          userId: socket.userId,
          username: socket.user?.username,
          parentId,
          parentType,
          isTyping: false
        });
      }
    });

    // Vote updates
    socket.on('vote_update', (data) => {
      const { targetId, targetType, voteScore } = data;
      if (targetId && targetType) {
        io.emit('vote_updated', {
          targetId,
          targetType,
          voteScore,
          timestamp: new Date()
        });
      }
    });

    // Question view tracking
    socket.on('question_viewed', (questionId) => {
      if (questionId) {
        // Broadcast view count update
        socket.to(`question_${questionId}`).emit('question_view_updated', {
          questionId,
          timestamp: new Date()
        });
      }
    });

    // New answer notification
    socket.on('new_answer', (data) => {
      const { questionId, answerId, authorId } = data;
      if (questionId && answerId) {
        socket.to(`question_${questionId}`).emit('answer_added', {
          questionId,
          answerId,
          authorId,
          timestamp: new Date()
        });
      }
    });

    // New comment notification
    socket.on('new_comment', (data) => {
      const { questionId, commentId, parentId, parentType, authorId } = data;
      if (questionId && commentId) {
        socket.to(`question_${questionId}`).emit('comment_added', {
          questionId,
          commentId,
          parentId,
          parentType,
          authorId,
          timestamp: new Date()
        });
      }
    });

    // Answer accepted notification
    socket.on('answer_accepted', (data) => {
      const { questionId, answerId, acceptedBy } = data;
      if (questionId && answerId) {
        io.to(`question_${questionId}`).emit('answer_accepted', {
          questionId,
          answerId,
          acceptedBy,
          timestamp: new Date()
        });
      }
    });

    // User status updates
    socket.on('user_activity', () => {
      if (socket.userId) {
        updateUserLastSeen(socket.userId);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
      
      if (socket.userId) {
        // Update user's last seen
        updateUserLastSeen(socket.userId);
        
        // Notify others about user going offline (for presence indicators)
        socket.broadcast.emit('user_offline', {
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('✅ Socket.IO server initialized');
};

/**
 * Get Socket.IO instance
 * @returns {Server} Socket.IO server instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Send notification to specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', notification);
  }
};

/**
 * Send notification to question room
 * @param {string} questionId - Question ID
 * @param {Object} data - Notification data
 */
const sendNotificationToQuestion = (questionId, data) => {
  if (io) {
    io.to(`question_${questionId}`).emit('question_update', data);
  }
};

/**
 * Broadcast notification to all connected users
 * @param {Object} data - Notification data
 */
const broadcastNotification = (data) => {
  if (io) {
    io.emit('broadcast_notification', data);
  }
};

/**
 * Send unread notification count to user
 * @param {string} userId - User ID
 */
const sendUnreadNotificationCount = async (userId) => {
  try {
    const Notification = require('../models/Notification');
    const count = await Notification.getUnreadCount(userId);
    
    if (io) {
      io.to(`user_${userId}`).emit('unread_count', { count });
    }
  } catch (error) {
    console.error('Error sending unread notification count:', error);
  }
};

/**
 * Update user's last seen timestamp
 * @param {string} userId - User ID
 */
const updateUserLastSeen = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { 
      lastLogin: new Date() 
    });
  } catch (error) {
    console.error('Error updating user last seen:', error);
  }
};

/**
 * Send real-time vote update
 * @param {string} targetId - Target ID (question or answer)
 * @param {string} targetType - Target type ('question' or 'answer')
 * @param {number} voteScore - New vote score
 */
const sendVoteUpdate = (targetId, targetType, voteScore) => {
  if (io) {
    io.emit('vote_updated', {
      targetId,
      targetType,
      voteScore,
      timestamp: new Date()
    });
  }
};

/**
 * Send real-time question stats update
 * @param {string} questionId - Question ID
 * @param {Object} stats - Updated stats
 */
const sendQuestionStatsUpdate = (questionId, stats) => {
  if (io) {
    io.to(`question_${questionId}`).emit('question_stats_updated', {
      questionId,
      stats,
      timestamp: new Date()
    });
  }
};

/**
 * Get connected users count
 * @returns {number} Number of connected users
 */
const getConnectedUsersCount = () => {
  if (io) {
    return io.engine.clientsCount;
  }
  return 0;
};

/**
 * Get users in specific question room
 * @param {string} questionId - Question ID
 * @returns {Promise<Array>} Array of user IDs in the room
 */
const getUsersInQuestionRoom = async (questionId) => {
  if (io) {
    try {
      const sockets = await io.in(`question_${questionId}`).fetchSockets();
      return sockets
        .filter(socket => socket.userId)
        .map(socket => socket.userId);
    } catch (error) {
      console.error('Error getting users in question room:', error);
      return [];
    }
  }
  return [];
};

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user is online
 */
const isUserOnline = async (userId) => {
  if (io) {
    try {
      const sockets = await io.in(`user_${userId}`).fetchSockets();
      return sockets.length > 0;
    } catch (error) {
      console.error('Error checking if user is online:', error);
      return false;
    }
  }
  return false;
};

module.exports = {
  initializeSocket,
  getIO,
  sendNotificationToUser,
  sendNotificationToQuestion,
  broadcastNotification,
  sendUnreadNotificationCount,
  sendVoteUpdate,
  sendQuestionStatsUpdate,
  getConnectedUsersCount,
  getUsersInQuestionRoom,
  isUserOnline
};
