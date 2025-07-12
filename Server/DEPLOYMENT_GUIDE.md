# StackIt Backend Deployment Guide

## Prerequisites

- Node.js 18.0.0 or higher
- MongoDB database (MongoDB Atlas recommended for cloud deployment)
- Cloudinary account (for image uploads)
- Gmail account with App Password (for email notifications)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Environment Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stackit

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_gmail@gmail.com
EMAIL_PASSWORD=your_16_character_app_password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL
FRONTEND_URL=https://odoo-hackathon-frontend.onrender.com

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=true
```

## Deployment Steps

### 1. Install Dependencies
```bash
npm run build
```

### 2. Start the Server
```bash
npm start
```

### 3. For Production with Process Manager (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "stackit-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Popular Deployment Platforms

### Render.com
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables in Render dashboard

### Railway
1. Connect your GitHub repository
2. Railway will auto-detect Node.js and use npm start
3. Add environment variables in Railway dashboard

### Heroku
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set NODE_ENV=production`
4. Deploy: `git push heroku main`

### DigitalOcean App Platform
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set run command: `npm start`
4. Configure environment variables

### AWS EC2
1. Launch EC2 instance with Node.js
2. Clone repository
3. Install dependencies: `npm run build`
4. Use PM2 for process management
5. Configure nginx as reverse proxy (optional)

## Database Setup

### MongoDB Atlas (Recommended)
1. Create MongoDB Atlas account
2. Create a new cluster
3. Create database user
4. Get connection string
5. Add connection string to MONGO_URI environment variable

## SSL/HTTPS Setup

For production, ensure your deployment platform handles SSL/HTTPS:
- Most cloud platforms (Render, Railway, Heroku) provide automatic SSL
- For custom deployments, use Let's Encrypt with nginx

## Monitoring and Logs

### PM2 Monitoring
```bash
# View logs
pm2 logs stackit-backend

# Monitor performance
pm2 monit

# Restart application
pm2 restart stackit-backend
```

### Health Check Endpoint
The server includes a health check endpoint at `/health` for monitoring.

## Security Considerations

1. Use strong JWT_SECRET (minimum 32 characters)
2. Enable CORS only for your frontend domain
3. Use HTTPS in production
4. Regularly update dependencies
5. Monitor for security vulnerabilities: `npm audit`

## Backup Strategy

1. Regular MongoDB backups (Atlas provides automatic backups)
2. Code backups via Git repository
3. Environment variables backup (store securely)

## Troubleshooting

### Common Issues
1. **Port already in use**: Change PORT in environment variables
2. **Database connection failed**: Check MONGO_URI format and credentials
3. **Email not sending**: Verify Gmail App Password setup
4. **Image uploads failing**: Check Cloudinary credentials

### Logs Location
- PM2 logs: `~/.pm2/logs/`
- Application logs: Check your deployment platform's log viewer

## Performance Optimization

1. Use PM2 cluster mode for multiple CPU cores:
   ```bash
   pm2 start server.js -i max --name "stackit-backend"
   ```

2. Enable gzip compression (already configured in the app)

3. Use CDN for static assets (Cloudinary handles images)

4. Monitor database performance and add indexes as needed

## Support

For deployment issues, check:
1. Application logs
2. Database connectivity
3. Environment variable configuration
4. Network and firewall settings
