# Render Deployment Guide for StackIt Q&A Forum Backend

## 🚀 Deploy to Render - Complete Guide

This guide will help you deploy your Node.js/Express StackIt backend to Render with MongoDB Atlas.

### Prerequisites
- [Render Account](https://render.com) (free tier available)
- [MongoDB Atlas Account](https://www.mongodb.com/atlas) (free tier available)
- GitHub repository with your code

---

## 📋 Step 1: Prepare Your Repository

### 1.1 Environment Variables Setup
Create a `.env.example` file to document required environment variables:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=your_mongodb_atlas_connection_string

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRE=7d

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000
```

### 1.2 Update package.json Scripts
Ensure your package.json has the correct start script:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seedDatabase.js",
    "verify": "node verifyData.js",
    "analyze": "node analyzeSchema.js"
  }
}
```

---

## 📋 Step 2: MongoDB Atlas Setup

### 2.1 Create MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up/Login to your account
3. Create a new project: "StackIt-QA-Forum"
4. Build a new cluster (select FREE M0 tier)
5. Choose your preferred cloud provider and region
6. Create cluster (takes 1-3 minutes)

### 2.2 Configure Database Access
1. **Database Access** → **Add New Database User**
   - Username: `stackit-admin`
   - Password: Generate secure password
   - Database User Privileges: **Read and write to any database**
   - Save credentials securely

### 2.3 Configure Network Access
1. **Network Access** → **Add IP Address**
2. **Allow Access from Anywhere**: `0.0.0.0/0`
   - This allows Render to connect from any IP
   - For production, you can whitelist specific IPs later

### 2.4 Get Connection String
1. **Clusters** → **Connect** → **Connect your application**
2. Choose **Node.js** and version **4.1 or later**
3. Copy connection string:
   ```
   mongodb+srv://stackit-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your database user password
5. Add database name: `/stackit-qa-forum` before the `?`
   ```
   mongodb+srv://stackit-admin:yourpassword@cluster0.xxxxx.mongodb.net/stackit-qa-forum?retryWrites=true&w=majority
   ```

---

## 📋 Step 3: Render Deployment

### 3.1 Create New Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository:
   - Repository: `shekokarmahesh/odoo-hackathon-backend`
   - Branch: `main`

### 3.2 Configure Service Settings
```
Name: stackit-qa-forum-backend
Environment: Node
Region: Oregon (US West) or closest to you
Branch: main
Build Command: npm install
Start Command: npm start
```

### 3.3 Configure Environment Variables
Add these environment variables in Render:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | `5000` | Render will override this |
| `NODE_ENV` | `production` | Important for optimization |
| `MONGO_URI` | `mongodb+srv://...` | Your Atlas connection string |
| `JWT_SECRET` | `your-super-secret-jwt-key-minimum-32-characters-long` | Generate strong secret |
| `JWT_EXPIRE` | `7d` | Token expiration |
| `EMAIL_HOST` | `smtp.gmail.com` | Gmail SMTP |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_USER` | `your-email@gmail.com` | Your Gmail |
| `EMAIL_PASSWORD` | `your-app-password` | Gmail app password |
| `CLOUDINARY_CLOUD_NAME` | `your-cloud-name` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | `your-api-key` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | `your-api-secret` | From Cloudinary dashboard |
| `ALLOWED_ORIGINS` | `https://your-frontend.onrender.com` | Your frontend URL |

### 3.4 Deploy
1. Click **Create Web Service**
2. Render will automatically:
   - Clone your repository
   - Install dependencies with `npm install`
   - Start your server with `npm start`
   - Provide you with a URL like: `https://stackit-qa-forum-backend.onrender.com`

---

## 📋 Step 4: Email Configuration (Gmail)

### 4.1 Enable 2-Factor Authentication
1. Go to Google Account settings
2. Enable 2-Factor Authentication if not already enabled

### 4.2 Generate App Password
1. Google Account → Security → 2-Step Verification
2. **App passwords** → **Select app**: Other
3. Name: "StackIt QA Forum"
4. Copy the generated 16-character password
5. Use this password for `EMAIL_PASSWORD` environment variable

---

## 📋 Step 5: Cloudinary Setup

### 5.1 Create Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for free account
3. Go to Dashboard

### 5.2 Get API Credentials
From your Cloudinary Dashboard, copy:
- **Cloud Name**
- **API Key** 
- **API Secret**

---

## 📋 Step 6: Test Deployment

### 6.1 Health Check
Test if your backend is running:
```bash
curl https://stackit-qa-forum-backend.onrender.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "StackIt API is running smoothly!",
  "data": {
    "server": "healthy",
    "database": "connected",
    "timestamp": "2025-07-12T10:30:00.000Z"
  }
}
```

### 6.2 Test API Endpoints
```bash
# Get all questions
curl https://stackit-qa-forum-backend.onrender.com/api/questions

# Get all tags
curl https://stackit-qa-forum-backend.onrender.com/api/tags

# Register a test user
curl -X POST https://stackit-qa-forum-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 📋 Step 7: Seed Production Database

### 7.1 Connect to MongoDB Atlas
Use MongoDB Compass or Atlas Data Explorer to verify connection.

### 7.2 Seed Data (Optional)
You can seed your production database by temporarily adding a seed endpoint:

1. **Temporarily modify your routes** (remove after seeding):
```javascript
// Add to server.js for one-time seeding
app.get('/api/admin/seed', async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(403).json({ message: 'Not allowed in production' });
  }
  
  try {
    const { seedDatabase } = require('./seedDatabase');
    await seedDatabase();
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed', error: error.message });
  }
});
```

2. **Call the endpoint once**:
```bash
curl https://stackit-qa-forum-backend.onrender.com/api/admin/seed
```

3. **Remove the endpoint** after seeding for security.

---

## 📋 Step 8: Production Optimizations

### 8.1 Environment-Specific Settings
Your code already handles this well with:
```javascript
// Proper CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
};

// Production security headers
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
  app.use(compression());
}
```

### 8.2 Database Connection Optimization
Your connection handling is already optimized:
```javascript
// Connection with proper options
mongoose.connect(process.env.MONGO_URI, {
  // Built-in optimization options
});
```

---

## 🎯 Deployment Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with proper permissions
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string copied and tested
- [ ] Gmail app password generated
- [ ] Cloudinary account created and API keys obtained
- [ ] Render web service created
- [ ] All environment variables configured in Render
- [ ] Repository connected and deployed
- [ ] Health check endpoint responds correctly
- [ ] API endpoints working as expected
- [ ] Email functionality tested
- [ ] File upload (Cloudinary) tested
- [ ] Frontend can connect to backend
- [ ] CORS properly configured for frontend domain

---

## 🔧 Troubleshooting

### Common Issues:

1. **MongoDB Connection Fails**
   - Verify connection string format
   - Check database user permissions
   - Ensure IP address 0.0.0.0/0 is whitelisted

2. **Environment Variables Not Working**
   - Verify all required variables are set in Render
   - Check for typos in variable names
   - Restart the service after adding variables

3. **Email Not Sending**
   - Verify Gmail app password (not regular password)
   - Check 2FA is enabled on Google account
   - Ensure EMAIL_HOST and EMAIL_PORT are correct

4. **CORS Errors**
   - Add your frontend URL to ALLOWED_ORIGINS
   - Format: `https://your-frontend.onrender.com`
   - No trailing slashes

5. **Build Fails**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs in Render dashboard

---

## 🚀 Your Deployed URLs

After successful deployment:
- **Backend API**: `https://stackit-qa-forum-backend.onrender.com`
- **API Documentation**: `https://stackit-qa-forum-backend.onrender.com/api`
- **Health Check**: `https://stackit-qa-forum-backend.onrender.com/api/health`

## 🎉 Congratulations!

Your StackIt Q&A Forum backend is now live on Render with:
- ✅ MongoDB Atlas database
- ✅ JWT authentication
- ✅ Email notifications
- ✅ File uploads via Cloudinary
- ✅ Real-time Socket.IO
- ✅ Full REST API with 67 endpoints
- ✅ Production-ready security
- ✅ Automatic HTTPS

Your backend is ready to serve your Q&A forum frontend!
