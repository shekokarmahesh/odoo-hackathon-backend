# StackIt - Q&A Forum Backend API

A comprehensive Q&A forum backend API built with Node.js, Express, and MongoDB.

## Team Members
- **Mohit Saini** - mohit.saini@kgpian.iitkgp.ac.in
- **Aditya Anjan** - adi7744@kgpian.iitkgp.ac.in  
- **Mahesh Shekokar** - shekokarmahesh@kgpian.iitkgp.ac.in

## 🚀 Features

- **User Authentication & Authorization** (JWT)
- **Question & Answer Management**
- **Voting System** (Upvote/Downvote)
- **Tagging System**
- **Comment System**
- **Real-time Notifications** (Socket.IO)
- **Search & Filtering**
- **Reputation System**
- **Image Upload** (Cloudinary)
- **Email Notifications**
- **Rate Limiting**
- **Input Validation**
- **Error Handling**

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Validation**: Joi
- **Security**: Helmet, bcryptjs, express-rate-limit

## 📁 Project Structure

```
Server/
├── src/
│   ├── config/          # Database & configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── socket/          # Socket.IO handlers
│   └── app.js           # Express app configuration
├── tests/               # Test files
├── .env                 # Environment variables
├── .env.example         # Environment variables template
├── server.js            # Application entry point
└── package.json         # Dependencies and scripts
```

## 🔧 Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd Server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Update the following variables in `.env`:
- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure secret for JWT tokens
- `EMAIL_USERNAME` & `EMAIL_PASSWORD` - For email notifications
- `CLOUDINARY_*` - For image uploads (optional)

### 4. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Question Endpoints

#### Get All Questions
```http
GET /api/questions?page=1&limit=10&sort=newest&search=javascript&tags=tag1,tag2
```

#### Get Single Question
```http
GET /api/questions/:id
```

#### Create Question
```http
POST /api/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "How to implement JWT authentication?",
  "description": "I need help implementing JWT authentication in Node.js...",
  "tags": ["60d5ecb1fc13ae1b2c000001", "60d5ecb1fc13ae1b2c000002"]
}
```

### Answer Endpoints

#### Get Answers for Question
```http
GET /api/questions/:questionId/answers?page=1&limit=10&sort=votes
```

#### Create Answer
```http
POST /api/questions/:questionId/answers
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Here's how you can implement JWT authentication..."
}
```

### Vote Endpoints

#### Vote on Question/Answer
```http
POST /api/votes
Authorization: Bearer <token>
Content-Type: application/json

{
  "target": "60d5ecb1fc13ae1b2c000001",
  "targetType": "question",
  "voteType": "upvote"
}
```

## 🔒 Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 🚦 Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## 🎯 Key Implementation Features

✅ **Database Design (35%)**
- Proper relationships between collections
- Indexing for performance
- Real-time sync with Socket.IO
- Data integrity with validation

✅ **Coding Standards (40%)**
- Input validation on all endpoints
- Dynamic configuration (no hardcoded values)
- Modular, reusable code structure
- Error handling and fallbacks
- Performance optimization (caching, pagination)

✅ **API Design (15%)**
- RESTful API design
- Proper HTTP status codes
- Consistent response format
- Search and filter endpoints

✅ **Additional Features (10%)**
- Real-time notifications
- Image upload support
- Email integration
- Comprehensive documentation

## 🌐 Available Endpoints

**Server running at:** `http://localhost:5000`

- **Authentication**: `http://localhost:5000/api/auth`
- **Questions**: `http://localhost:5000/api/questions`
- **Answers**: `http://localhost:5000/api/answers`
- **Users**: `http://localhost:5000/api/users`
- **Tags**: `http://localhost:5000/api/tags`
- **Votes**: `http://localhost:5000/api/votes`
- **Comments**: `http://localhost:5000/api/comments`
- **Notifications**: `http://localhost:5000/api/notifications`