const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
    console.log('✅ MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Dummy data
const userData = [
  {
    username: 'johndoe',
    email: 'john.doe@example.com',
    password: 'password123',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Full-stack developer with 5 years of experience in JavaScript and Python.',
      location: 'San Francisco, CA'
    },
    reputation: 1250,
    role: 'user',
    isActive: true,
    isEmailVerified: true
  },
  {
    username: 'janesmith',
    email: 'jane.smith@example.com',
    password: 'password123',
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      bio: 'Frontend developer specializing in React and Vue.js. Love creating beautiful UIs.',
      location: 'New York, NY'
    },
    reputation: 890,
    role: 'user',
    isActive: true,
    isEmailVerified: true
  },
  {
    username: 'mikeadmin',
    email: 'mike.admin@example.com',
    password: 'password123',
    profile: {
      firstName: 'Mike',
      lastName: 'Johnson',
      bio: 'Platform administrator and senior developer. Always here to help!',
      location: 'Austin, TX'
    },
    reputation: 2500,
    role: 'admin',
    isActive: true,
    isEmailVerified: true
  },
  {
    username: 'sarahdev',
    email: 'sarah.dev@example.com',
    password: 'password123',
    profile: {
      firstName: 'Sarah',
      lastName: 'Wilson',
      bio: 'Backend developer passionate about APIs and database design.',
      location: 'Seattle, WA'
    },
    reputation: 1450,
    role: 'user',
    isActive: true,
    isEmailVerified: true
  },
  {
    username: 'alexnewbie',
    email: 'alex.newbie@example.com',
    password: 'password123',
    profile: {
      firstName: 'Alex',
      lastName: 'Chen',
      bio: 'Computer science student learning web development. Excited to be here!',
      location: 'Boston, MA'
    },
    reputation: 150,
    role: 'user',
    isActive: true,
    isEmailVerified: true
  }
];

const tagData = [
  {
    name: 'javascript',
    description: 'Questions about JavaScript programming language',
    color: '#F7DF1E',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'react',
    description: 'Questions about React.js library',
    color: '#61DAFB',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'nodejs',
    description: 'Questions about Node.js runtime environment',
    color: '#339933',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'mongodb',
    description: 'Questions about MongoDB database',
    color: '#47A248',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'express',
    description: 'Questions about Express.js framework',
    color: '#000000',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'css',
    description: 'Questions about Cascading Style Sheets',
    color: '#1572B6',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'html',
    description: 'Questions about HTML markup language',
    color: '#E34F26',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'python',
    description: 'Questions about Python programming language',
    color: '#3776AB',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'api',
    description: 'Questions about API development and integration',
    color: '#FF6B6B',
    isApproved: true,
    usageCount: 0
  },
  {
    name: 'database',
    description: 'General questions about database design and management',
    color: '#4ECDC4',
    isApproved: true,
    usageCount: 0
  }
];

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Question.deleteMany({}),
      Answer.deleteMany({}),
      Tag.deleteMany({}),
      Vote.deleteMany({}),
      Comment.deleteMany({}),
      Notification.deleteMany({}),
      ViewHistory.deleteMany({})
    ]);

    // Create users
    console.log('👥 Creating users...');
    const users = [];
    for (const data of userData) {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const user = await User.create({
        ...data,
        password: hashedPassword
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    // Create tags
    console.log('🏷️ Creating tags...');
    const tags = [];
    for (const data of tagData) {
      const tag = await Tag.create({
        ...data,
        createdBy: users[2]._id, // Admin creates tags
        approvedBy: users[2]._id
      });
      tags.push(tag);
    }
    console.log(`✅ Created ${tags.length} tags`);

    // Create questions
    console.log('❓ Creating questions...');
    const questionData = [
      {
        title: 'How to implement JWT authentication in Node.js?',
        description: `I'm building a REST API with Node.js and Express, and I need to implement JWT authentication. 

What's the best approach to:
1. Generate JWT tokens on login
2. Verify tokens on protected routes
3. Handle token expiration

Any code examples would be greatly appreciated!`,
        author: users[0]._id,
        tags: [tags[0]._id, tags[2]._id, tags[4]._id], // javascript, nodejs, express
        status: 'active'
      },
      {
        title: 'React useState vs useReducer - when to use which?',
        description: `I'm working on a complex React component with multiple state variables and I'm wondering when I should use useState vs useReducer.

Currently I have something like this:
\`\`\`javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState([]);
const [filters, setFilters] = useState({});
\`\`\`

Should I convert this to useReducer? What are the benefits?`,
        author: users[1]._id,
        tags: [tags[0]._id, tags[1]._id], // javascript, react
        status: 'active'
      },
      {
        title: 'MongoDB aggregation pipeline for complex queries',
        description: `I need help with a MongoDB aggregation pipeline. I have a collection of orders and I want to:

1. Group by customer
2. Calculate total spent per customer
3. Filter customers who spent more than $1000
4. Sort by total spent descending

Here's my current attempt but it's not working:
\`\`\`javascript
db.orders.aggregate([
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
])
\`\`\`

What am I missing?`,
        author: users[4]._id,
        tags: [tags[3]._id, tags[9]._id], // mongodb, database
        status: 'active'
      },
      {
        title: 'CSS Grid vs Flexbox - which one to choose?',
        description: `I'm always confused about when to use CSS Grid vs Flexbox. Can someone explain:

- When is Grid better than Flexbox?
- When is Flexbox better than Grid?
- Can they be used together?

I'd love some practical examples of each use case.`,
        author: users[0]._id,
        tags: [tags[5]._id], // css
        status: 'active'
      },
      {
        title: 'Best practices for REST API design',
        description: `I'm designing a REST API for a blog application. What are the current best practices for:

1. URL structure
2. HTTP methods usage
3. Status codes
4. Error handling
5. Versioning

Any recommendations for tools or libraries?`,
        author: users[3]._id,
        tags: [tags[8]._id, tags[2]._id], // api, nodejs
        status: 'active'
      }
    ];

    const questions = [];
    for (const data of questionData) {
      const question = await Question.create(data);
      questions.push(question);
    }
    console.log(`✅ Created ${questions.length} questions`);

    // Update tag usage counts
    await Tag.updateMany(
      { _id: { $in: [tags[0]._id, tags[1]._id, tags[2]._id] } },
      { $inc: { usageCount: 2 } }
    );
    await Tag.updateMany(
      { _id: { $in: [tags[3]._id, tags[4]._id, tags[5]._id, tags[8]._id, tags[9]._id] } },
      { $inc: { usageCount: 1 } }
    );

    // Create answers
    console.log('💬 Creating answers...');
    const answerData = [
      {
        content: `Here's a complete implementation of JWT authentication in Node.js:

\`\`\`javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate token on login
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Middleware to verify token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
\`\`\`

This approach handles token generation, verification, and expiration automatically.`,
        author: users[3]._id,
        question: questions[0]._id
      },
      {
        content: `Great question! Here's when to use each:

**Use useState when:**
- Simple state updates
- Independent state variables
- State doesn't depend on previous state

**Use useReducer when:**
- Complex state logic
- Multiple state variables that depend on each other
- State updates follow predictable patterns

For your example, useReducer would be better:

\`\`\`javascript
const initialState = {
  loading: false,
  error: null,
  data: [],
  filters: {}
};

function dataReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(dataReducer, initialState);
\`\`\`

This gives you better state management and makes testing easier!`,
        author: users[2]._id,
        question: questions[1]._id
      },
      {
        content: `Your aggregation pipeline is on the right track! Here's the complete solution:

\`\`\`javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  {
    $match: {
      totalSpent: { $gt: 1000 }
    }
  },
  {
    $sort: {
      totalSpent: -1
    }
  },
  {
    $lookup: {
      from: "customers",
      localField: "_id",
      foreignField: "_id",
      as: "customerInfo"
    }
  }
])
\`\`\`

The key additions:
1. \`$match\` stage to filter customers
2. \`$sort\` stage to order results
3. Optional \`$lookup\` to get customer details`,
        author: users[1]._id,
        question: questions[2]._id
      }
    ];

    const answers = [];
    for (const data of answerData) {
      const answer = await Answer.create(data);
      answers.push(answer);
    }
    console.log(`✅ Created ${answers.length} answers`);

    // Update questions with answer counts
    await Question.findByIdAndUpdate(questions[0]._id, { answersCount: 1 });
    await Question.findByIdAndUpdate(questions[1]._id, { answersCount: 1 });
    await Question.findByIdAndUpdate(questions[2]._id, { answersCount: 1 });

    // Accept the first answer
    await Answer.findByIdAndUpdate(answers[0]._id, { isAccepted: true });
    await Question.findByIdAndUpdate(questions[0]._id, { acceptedAnswer: answers[0]._id });

    // Create votes
    console.log('👍 Creating votes...');
    const voteData = [
      // Votes on questions
      { voter: users[1]._id, target: questions[0]._id, targetType: 'question', voteType: 'upvote' },
      { voter: users[2]._id, target: questions[0]._id, targetType: 'question', voteType: 'upvote' },
      { voter: users[3]._id, target: questions[1]._id, targetType: 'question', voteType: 'upvote' },
      { voter: users[4]._id, target: questions[1]._id, targetType: 'question', voteType: 'upvote' },
      { voter: users[0]._id, target: questions[2]._id, targetType: 'question', voteType: 'upvote' },
      
      // Votes on answers
      { voter: users[0]._id, target: answers[0]._id, targetType: 'answer', voteType: 'upvote' },
      { voter: users[1]._id, target: answers[0]._id, targetType: 'answer', voteType: 'upvote' },
      { voter: users[4]._id, target: answers[0]._id, targetType: 'answer', voteType: 'upvote' },
      { voter: users[3]._id, target: answers[1]._id, targetType: 'answer', voteType: 'upvote' },
      { voter: users[0]._id, target: answers[2]._id, targetType: 'answer', voteType: 'upvote' }
    ];

    const votes = [];
    for (const data of voteData) {
      const vote = await Vote.create(data);
      votes.push(vote);
    }
    console.log(`✅ Created ${votes.length} votes`);

    // Update vote scores
    await Question.findByIdAndUpdate(questions[0]._id, { voteScore: 2 });
    await Question.findByIdAndUpdate(questions[1]._id, { voteScore: 2 });
    await Question.findByIdAndUpdate(questions[2]._id, { voteScore: 1 });
    await Answer.findByIdAndUpdate(answers[0]._id, { voteScore: 3 });
    await Answer.findByIdAndUpdate(answers[1]._id, { voteScore: 1 });
    await Answer.findByIdAndUpdate(answers[2]._id, { voteScore: 1 });

    // Create comments
    console.log('💬 Creating comments...');
    const commentData = [
      {
        content: 'Great question! I was wondering about this too.',
        author: users[4]._id,
        parentType: 'question',
        parent: questions[0]._id
      },
      {
        content: 'Thanks for the detailed explanation! Very helpful.',
        author: users[0]._id,
        parentType: 'answer',
        parent: answers[0]._id
      },
      {
        content: 'Could you also show how to handle refresh tokens?',
        author: users[1]._id,
        parentType: 'answer',
        parent: answers[0]._id
      },
      {
        content: 'This is exactly what I needed. Thank you!',
        author: users[2]._id,
        parentType: 'answer',
        parent: answers[1]._id
      }
    ];

    const comments = [];
    for (const data of commentData) {
      const comment = await Comment.create(data);
      comments.push(comment);
    }
    console.log(`✅ Created ${comments.length} comments`);

    // Update comment counts
    await Question.findByIdAndUpdate(questions[0]._id, { commentsCount: 1 });
    await Answer.findByIdAndUpdate(answers[0]._id, { commentsCount: 2 });
    await Answer.findByIdAndUpdate(answers[1]._id, { commentsCount: 1 });

    // Create notifications
    console.log('🔔 Creating notifications...');
    const notificationData = [
      {
        recipient: users[0]._id,
        type: 'new_answer',
        message: 'sarahdev answered your question "How to implement JWT authentication in Node.js?"',
        relatedId: answers[0]._id,
        sender: users[3]._id,
        isRead: false
      },
      {
        recipient: users[1]._id,
        type: 'new_answer',
        message: 'mikeadmin answered your question "React useState vs useReducer - when to use which?"',
        relatedId: answers[1]._id,
        sender: users[2]._id,
        isRead: false
      },
      {
        recipient: users[3]._id,
        type: 'mention',
        message: 'Your answer received an upvote!',
        relatedId: answers[0]._id,
        sender: users[0]._id,
        isRead: true
      }
    ];

    const notifications = [];
    for (const data of notificationData) {
      const notification = await Notification.create(data);
      notifications.push(notification);
    }
    console.log(`✅ Created ${notifications.length} notifications`);

    // Create view history
    console.log('👀 Creating view history...');
    const viewData = [
      { user: users[1]._id, question: questions[0]._id, ipAddress: '192.168.1.1' },
      { user: users[2]._id, question: questions[0]._id, ipAddress: '192.168.1.2' },
      { user: users[3]._id, question: questions[1]._id, ipAddress: '192.168.1.3' },
      { user: users[4]._id, question: questions[1]._id, ipAddress: '192.168.1.4' },
      { user: users[0]._id, question: questions[2]._id, ipAddress: '192.168.1.5' },
      { user: null, question: questions[0]._id, ipAddress: '192.168.1.6' }, // Anonymous view
      { user: null, question: questions[1]._id, ipAddress: '192.168.1.7' }  // Anonymous view
    ];

    const views = [];
    for (const data of viewData) {
      const view = await ViewHistory.create(data);
      views.push(view);
    }
    console.log(`✅ Created ${views.length} view records`);

    // Update view counts
    await Question.findByIdAndUpdate(questions[0]._id, { views: 3 });
    await Question.findByIdAndUpdate(questions[1]._id, { views: 3 });
    await Question.findByIdAndUpdate(questions[2]._id, { views: 1 });
    await Question.findByIdAndUpdate(questions[3]._id, { views: 1 });
    await Question.findByIdAndUpdate(questions[4]._id, { views: 1 });

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏷️ Tags: ${tags.length}`);
    console.log(`❓ Questions: ${questions.length}`);
    console.log(`💬 Answers: ${answers.length}`);
    console.log(`👍 Votes: ${votes.length}`);
    console.log(`💬 Comments: ${comments.length}`);
    console.log(`🔔 Notifications: ${notifications.length}`);
    console.log(`👀 View Records: ${views.length}`);

    console.log('\n🔑 Test User Credentials:');
    console.log('Email: john.doe@example.com | Password: password123');
    console.log('Email: jane.smith@example.com | Password: password123');
    console.log('Email: mike.admin@example.com | Password: password123 (Admin)');
    console.log('Email: sarah.dev@example.com | Password: password123');
    console.log('Email: alex.newbie@example.com | Password: password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seeder
connectDB().then(() => {
  seedDatabase();
});

module.exports = { seedDatabase };
