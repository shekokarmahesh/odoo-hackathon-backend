require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const { handleUnhandledRejection, handleUncaughtException } = require('./src/middleware/errorHandler');
const http = require('http');

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Get port from environment variables
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const { initializeSocket } = require('./src/socket/socketHandlers');
initializeSocket(server);

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected successfully');

    // Start server
    server.listen(PORT, () => {
      console.log('🚀 Server is running on:', `http://localhost:${PORT}`);
      console.log('📚 API Documentation:', `http://localhost:${PORT}/api`);
      console.log('🏥 Health Check:', `http://localhost:${PORT}/health`);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📋 Available API Endpoints:');
        console.log('   Authentication: http://localhost:' + PORT + '/api/auth');
        console.log('   Questions:      http://localhost:' + PORT + '/api/questions');
        console.log('   Answers:        http://localhost:' + PORT + '/api/answers');
        console.log('   Users:          http://localhost:' + PORT + '/api/users');
        console.log('   Tags:           http://localhost:' + PORT + '/api/tags');
        console.log('   Votes:          http://localhost:' + PORT + '/api/votes');
        console.log('   Comments:       http://localhost:' + PORT + '/api/comments');
        console.log('   Notifications:  http://localhost:' + PORT + '/api/notifications');
      }
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Close database connection
        require('mongoose').connection.close(() => {
          console.log('✅ Database connection closed');
          console.log('👋 Server shutdown complete');
          process.exit(0);
        });
      });

      // Force close server after 30 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = server;
