const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Text search indexes
    await mongoose.connection.collection('questions').createIndex({
      title: 'text',
      description: 'text'
    });
    
    // Performance indexes
    await mongoose.connection.collection('votes').createIndex({
      voter: 1,
      target: 1,
      targetType: 1
    }, { unique: true });
    
    await mongoose.connection.collection('notifications').createIndex({
      recipient: 1,
      createdAt: -1
    });
    
    await mongoose.connection.collection('questions').createIndex({
      author: 1,
      createdAt: -1
    });

    await mongoose.connection.collection('questions').createIndex({
      tags: 1,
      createdAt: -1
    });

    await mongoose.connection.collection('answers').createIndex({
      question: 1,
      createdAt: -1
    });

    await mongoose.connection.collection('users').createIndex({
      email: 1
    }, { unique: true });

    await mongoose.connection.collection('users').createIndex({
      username: 1
    }, { unique: true });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = connectDB;
