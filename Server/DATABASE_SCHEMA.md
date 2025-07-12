# StackIt Q&A Forum - Database Schema Documentation

## Database Architecture Overview

The StackIt Q&A Forum uses MongoDB with Mongoose ODM and consists of **8 core models** with well-defined relationships. The database follows a **document-oriented approach** with references between collections for optimal performance and data integrity.

---

## 📊 Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          StackIt Q&A Forum Database Schema                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
    │      User       │           │    Question     │           │      Tag        │
    │  (users)        │           │  (questions)    │           │   (tags)        │
    ├─────────────────┤           ├─────────────────┤           ├─────────────────┤
    │ _id: ObjectId   │◄─────────►│ _id: ObjectId   │◄─────────►│ _id: ObjectId   │
    │ username: String│           │ title: String   │           │ name: String    │
    │ email: String   │           │ description: Str│           │ description: Str│
    │ password: String│           │ author: ObjectId│           │ color: String   │
    │ role: String    │           │ tags: [ObjectId]│           │ usageCount: Num │
    │ profile: Object │           │ acceptedAnswer: │           │ createdBy: ObjId│
    │ reputation: Num │           │    ObjectId     │           │ isApproved: Bool│
    │ isActive: Bool  │           │ views: Number   │           │ approvedBy: ObjId│
    │ isEmailVerified │           │ voteScore: Num  │           │ synonyms: [Str] │
    │ lastLogin: Date │           │ answerCount: Num│           │ relatedTags: [] │
    │ timestamps      │           │ status: String  │           │ timestamps      │
    └─────────────────┘           │ closedBy: ObjId │           └─────────────────┘
            │                     │ closedReason:Str│                     ▲
            │                     │ isPinned: Bool  │                     │
            │                     │ lastActivity:Dt │                     │
            │                     │ timestamps      │                     │
            │                     └─────────────────┘                     │
            │                             │                               │
            │                             │                               │
            ▼                             ▼                               │
    ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
    │     Answer      │           │    Comment      │           │      Vote       │
    │   (answers)     │           │  (comments)     │           │   (votes)       │
    ├─────────────────┤           ├─────────────────┤           ├─────────────────┤
    │ _id: ObjectId   │           │ _id: ObjectId   │           │ _id: ObjectId   │
    │ question: ObjId │───────────┤ parent: ObjectId│           │ voter: ObjectId │
    │ author: ObjectId│           │ parentType: Str │           │ target: ObjectId│
    │ content: String │           │ author: ObjectId│           │ targetType: Str │
    │ isAccepted: Bool│           │ content: String │           │ voteType: String│
    │ voteScore: Num  │           │ voteScore: Num  │           │ timestamps      │
    │ commentCount:Num│           │ isDeleted: Bool │           └─────────────────┘
    │ editHistory: [] │           │ editHistory: [] │                     ▲
    │ isDeleted: Bool │           │ timestamps      │                     │
    │ deletedBy: ObjId│           └─────────────────┘                     │
    │ deletedAt: Date │                     ▲                             │
    │ timestamps      │                     │                             │
    └─────────────────┘                     │                             │
            │                               │                             │
            │                               │                             │
            ▼                               │                             │
    ┌─────────────────┐                     │                             │
    │  Notification   │                     │                             │
    │ (notifications) │                     │                             │
    ├─────────────────┤                     │                             │
    │ _id: ObjectId   │                     │                             │
    │ recipient: ObjId│─────────────────────┼─────────────────────────────┘
    │ sender: ObjectId│                     │
    │ type: String    │                     │
    │ message: String │                     │
    │ data: Object    │                     │
    │  ├questionId    │                     │
    │  ├answerId      │                     │
    │  ├commentId     │─────────────────────┘
    │  └url           │
    │ isRead: Boolean │
    │ isDeleted: Bool │
    │ timestamps      │
    └─────────────────┘
            │
            │
            ▼
    ┌─────────────────┐
    │  ViewHistory    │
    │ (viewhistories) │
    ├─────────────────┤
    │ _id: ObjectId   │
    │ user: ObjectId  │ (nullable for anonymous)
    │ question: ObjId │──────────┐
    │ ipAddress: Str  │          │
    │ userAgent: Str  │          │
    │ sessionId: Str  │          │
    │ viewedAt: Date  │          │
    └─────────────────┘          │
                                 │
                                 ▼
                    [Back to Question model]
```

---

## 🔗 Detailed Relationships

### **1. User Model (Central Hub)**
- **Questions**: One-to-Many (User can create multiple questions)
- **Answers**: One-to-Many (User can create multiple answers)
- **Comments**: One-to-Many (User can create multiple comments)
- **Votes**: One-to-Many (User can cast multiple votes)
- **Tags**: One-to-Many (User can create multiple tags)
- **Notifications**: One-to-Many (User can receive/send multiple notifications)
- **ViewHistory**: One-to-Many (User can view multiple questions)

### **2. Question Model (Content Core)**
- **Author**: Many-to-One (User)
- **Tags**: Many-to-Many (Question ↔ Tags)
- **Answers**: One-to-Many (Question → Answers)
- **Comments**: One-to-Many (Question → Comments)
- **Votes**: One-to-Many (Question → Votes)
- **ViewHistory**: One-to-Many (Question → Views)
- **AcceptedAnswer**: One-to-One (Question → Answer)

### **3. Answer Model**
- **Question**: Many-to-One (Answer → Question)
- **Author**: Many-to-One (Answer → User)
- **Comments**: One-to-Many (Answer → Comments)
- **Votes**: One-to-Many (Answer → Votes)

### **4. Tag Model**
- **Questions**: Many-to-Many (Tag ↔ Questions)
- **CreatedBy**: Many-to-One (Tag → User)
- **ApprovedBy**: Many-to-One (Tag → User)
- **RelatedTags**: Many-to-Many (Tag ↔ Tags)

### **5. Vote Model**
- **Voter**: Many-to-One (Vote → User)
- **Target**: Polymorphic (Vote → Question/Answer)

### **6. Comment Model**
- **Author**: Many-to-One (Comment → User)
- **Parent**: Polymorphic (Comment → Question/Answer)

### **7. Notification Model**
- **Recipient**: Many-to-One (Notification → User)
- **Sender**: Many-to-One (Notification → User)
- **Related Objects**: References to Question, Answer, Comment

### **8. ViewHistory Model**
- **User**: Many-to-One (ViewHistory → User) [Nullable]
- **Question**: Many-to-One (ViewHistory → Question)

---

## 📋 Model Specifications

### **User Model**
```javascript
{
  _id: ObjectId,
  username: String (unique, 3-30 chars, alphanumeric),
  email: String (unique, validated),
  password: String (hashed, min 6 chars),
  role: String (user|admin|guest),
  profile: {
    firstName: String (max 50 chars),
    lastName: String (max 50 chars),
    avatar: String (URL),
    bio: String (max 500 chars),
    location: String (max 100 chars),
    website: String (URL),
    github: String (username),
    linkedin: String (URL),
    twitter: String (username)
  },
  reputation: Number (default: 0),
  badges: [String],
  preferences: {
    emailNotifications: Boolean,
    theme: String,
    language: String
  },
  isEmailVerified: Boolean,
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### **Question Model**
```javascript
{
  _id: ObjectId,
  title: String (10-150 chars),
  description: String (min 20 chars),
  author: ObjectId (ref: User),
  tags: [ObjectId] (ref: Tag, 1-5 tags),
  acceptedAnswer: ObjectId (ref: Answer),
  views: Number (default: 0),
  voteScore: Number (default: 0),
  answerCount: Number (default: 0),
  status: String (active|closed|deleted),
  closedBy: ObjectId (ref: User),
  closedReason: String (max 200 chars),
  isPinned: Boolean,
  lastActivity: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **Answer Model**
```javascript
{
  _id: ObjectId,
  question: ObjectId (ref: Question),
  author: ObjectId (ref: User),
  content: String (min 30 chars),
  isAccepted: Boolean,
  voteScore: Number (default: 0),
  commentCount: Number (default: 0),
  editHistory: [{
    editedBy: ObjectId (ref: User),
    editedAt: Date,
    reason: String (max 200 chars),
    previousContent: String
  }],
  isDeleted: Boolean,
  deletedBy: ObjectId (ref: User),
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **Tag Model**
```javascript
{
  _id: ObjectId,
  name: String (unique, 2-25 chars, lowercase),
  description: String (max 500 chars),
  color: String (hex color),
  usageCount: Number (default: 0),
  createdBy: ObjectId (ref: User),
  isApproved: Boolean,
  approvedBy: ObjectId (ref: User),
  synonyms: [String],
  relatedTags: [ObjectId] (ref: Tag),
  createdAt: Date,
  updatedAt: Date
}
```

### **Vote Model**
```javascript
{
  _id: ObjectId,
  voter: ObjectId (ref: User),
  target: ObjectId (ref: Question|Answer),
  targetType: String (question|answer),
  voteType: String (upvote|downvote),
  createdAt: Date,
  updatedAt: Date
}
```

### **Comment Model**
```javascript
{
  _id: ObjectId,
  parent: ObjectId (ref: Question|Answer),
  parentType: String (question|answer),
  author: ObjectId (ref: User),
  content: String (1-600 chars),
  voteScore: Number (default: 0),
  isDeleted: Boolean,
  editHistory: [{
    editedAt: Date,
    previousContent: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### **Notification Model**
```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref: User),
  sender: ObjectId (ref: User),
  type: String (new_answer|comment_on_answer|comment_on_question|mention|answer_accepted|question_closed),
  message: String (max 500 chars),
  data: {
    questionId: ObjectId (ref: Question),
    answerId: ObjectId (ref: Answer),
    commentId: ObjectId (ref: Comment),
    url: String
  },
  isRead: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### **ViewHistory Model**
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User, nullable),
  question: ObjectId (ref: Question),
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  viewedAt: Date
}
```

---

## 🔍 Database Indexes

### **Performance Indexes**
```javascript
// User indexes
userSchema.index({ reputation: -1 });
userSchema.index({ createdAt: -1 });

// Question indexes
questionSchema.index({ title: 'text', description: 'text' });
questionSchema.index({ author: 1, createdAt: -1 });
questionSchema.index({ tags: 1, createdAt: -1 });
questionSchema.index({ status: 1, createdAt: -1 });
questionSchema.index({ voteScore: -1, createdAt: -1 });
questionSchema.index({ views: -1, createdAt: -1 });
questionSchema.index({ lastActivity: -1 });
questionSchema.index({ isPinned: -1, createdAt: -1 });

// Answer indexes
answerSchema.index({ question: 1, createdAt: -1 });
answerSchema.index({ author: 1, createdAt: -1 });
answerSchema.index({ question: 1, isAccepted: -1, voteScore: -1 });
answerSchema.index({ isDeleted: 1 });

// Tag indexes
tagSchema.index({ usageCount: -1 });
tagSchema.index({ isApproved: 1, usageCount: -1 });
tagSchema.index({ createdBy: 1 });

// Vote indexes
voteSchema.index({ voter: 1, target: 1, targetType: 1 }, { unique: true });
voteSchema.index({ target: 1, targetType: 1 });
voteSchema.index({ voter: 1, createdAt: -1 });

// Comment indexes
commentSchema.index({ parent: 1, parentType: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ isDeleted: 1 });

// Notification indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ isDeleted: 1 });

// ViewHistory indexes
viewHistorySchema.index({ question: 1, viewedAt: -1 });
viewHistorySchema.index({ user: 1, viewedAt: -1 });
viewHistorySchema.index({ ipAddress: 1, question: 1, viewedAt: -1 });
viewHistorySchema.index({ viewedAt: -1 });
```

---

## ⚡ Key Features & Constraints

### **Data Integrity**
- **Unique Constraints**: User.username, User.email, Tag.name
- **Reference Integrity**: All ObjectId references are validated
- **Cascade Operations**: Soft deletes with proper cleanup
- **Vote Uniqueness**: One vote per user per target

### **Validation Rules**
- **Username**: 3-30 characters, alphanumeric only
- **Email**: Valid email format, lowercase
- **Password**: Minimum 6 characters, bcrypt hashed
- **Question Title**: 10-150 characters
- **Question Description**: Minimum 20 characters
- **Answer Content**: Minimum 30 characters
- **Tags**: 1-5 tags per question, 2-25 characters each

### **Business Logic**
- **Reputation System**: Points for upvotes, accepted answers
- **Tag Management**: Admin approval required for new tags
- **Question Status**: Active, closed, or deleted states
- **Answer Acceptance**: Only question author can accept
- **Vote Prevention**: Users cannot vote on their own content

### **Performance Optimizations**
- **Text Search**: Full-text search on question title/description
- **Pagination**: Efficient skip/limit with proper indexing
- **View Tracking**: Rate-limited to prevent spam (1 hour cooldown)
- **Soft Deletes**: Maintain data integrity while hiding content

---

## 📈 Usage Statistics (Current Seed Data)

- **👥 Users**: 5 (1 admin, 4 regular users)
- **🏷️ Tags**: 10 programming tags
- **❓ Questions**: 5 with varied topics
- **💬 Answers**: 3 with code examples
- **👍 Votes**: 10 distributed across content
- **💬 Comments**: 4 community interactions
- **🔔 Notifications**: 3 real-time updates
- **👀 Views**: 7 tracking records

This schema provides a solid foundation for a scalable Q&A platform with excellent performance characteristics and data integrity!
