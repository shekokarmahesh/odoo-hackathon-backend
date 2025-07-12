const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./src/models/User');
const Question = require('./src/models/Question');
const Answer = require('./src/models/Answer');
const Tag = require('./src/models/Tag');
const Vote = require('./src/models/Vote');
const Comment = require('./src/models/Comment');
const Notification = require('./src/models/Notification');
const ViewHistory = require('./src/models/ViewHistory');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected for verification');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Verify data function
const verifyData = async () => {
  try {
    console.log('🔍 Verifying seeded data...\n');

    // Check Users
    const users = await User.find().select('username email role reputation');
    console.log('👥 USERS:');
    users.forEach(user => {
      console.log(`   ${user.username} (${user.email}) - ${user.role} - ${user.reputation} reputation`);
    });

    // Check Tags
    const tags = await Tag.find().select('name usageCount');
    console.log('\n🏷️ TAGS:');
    tags.forEach(tag => {
      console.log(`   ${tag.name} - used ${tag.usageCount} times`);
    });

    // Check Questions with authors and tags
    const questions = await Question.find()
      .populate('author', 'username')
      .populate('tags', 'name')
      .select('title author tags voteScore views answerCount status');
    console.log('\n❓ QUESTIONS:');
    questions.forEach(question => {
      console.log(`   "${question.title}"`);
      console.log(`      By: ${question.author.username} | Tags: ${question.tags.map(t => t.name).join(', ')}`);
      console.log(`      Score: ${question.voteScore} | Views: ${question.views} | Answers: ${question.answerCount} | Status: ${question.status}`);
    });

    // Check Answers with authors
    const answers = await Answer.find()
      .populate('author', 'username')
      .populate('question', 'title')
      .select('author question voteScore isAccepted');
    console.log('\n💬 ANSWERS:');
    answers.forEach(answer => {
      console.log(`   Answer by ${answer.author.username} on "${answer.question.title}"`);
      console.log(`      Score: ${answer.voteScore} | Accepted: ${answer.isAccepted ? 'Yes' : 'No'}`);
    });

    // Check Votes
    const votes = await Vote.find()
      .populate('voter', 'username')
      .select('voter targetType voteType');
    console.log('\n👍 VOTES:');
    const votesByType = votes.reduce((acc, vote) => {
      const key = `${vote.targetType}_${vote.voteType}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    Object.entries(votesByType).forEach(([type, count]) => {
      console.log(`   ${type.replace('_', ' ')}: ${count}`);
    });

    // Check Comments
    const comments = await Comment.find()
      .populate('author', 'username')
      .select('author parentType content');
    console.log('\n💬 COMMENTS:');
    comments.forEach(comment => {
      console.log(`   ${comment.author.username} commented on ${comment.parentType}: "${comment.content.substring(0, 50)}..."`);
    });

    // Check Notifications
    const notifications = await Notification.find()
      .populate('recipient', 'username')
      .populate('sender', 'username')
      .select('recipient sender type message isRead');
    console.log('\n🔔 NOTIFICATIONS:');
    notifications.forEach(notification => {
      console.log(`   To: ${notification.recipient.username} | From: ${notification.sender.username}`);
      console.log(`      Type: ${notification.type} | Read: ${notification.isRead ? 'Yes' : 'No'}`);
      console.log(`      Message: "${notification.message}"`);
    });

    // Check View History
    const viewCount = await ViewHistory.countDocuments();
    const userViews = await ViewHistory.countDocuments({ user: { $ne: null } });
    const anonymousViews = viewCount - userViews;
    console.log('\n👀 VIEW HISTORY:');
    console.log(`   Total views: ${viewCount}`);
    console.log(`   User views: ${userViews}`);
    console.log(`   Anonymous views: ${anonymousViews}`);

    console.log('\n✅ Data verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the verification
connectDB().then(() => {
  verifyData();
});

module.exports = { verifyData };
