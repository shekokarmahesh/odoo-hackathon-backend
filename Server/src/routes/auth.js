const express = require('express');
const router = express.Router();

// Import middleware
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { authLimiter, passwordResetLimiter, emailVerificationLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../utils/validators');

// Import controller
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendEmailVerification,
  logout
} = require('../controllers/authController');

// Public routes
router.post('/register', 
  authLimiter,
  validate(registerSchema),
  register
);

router.post('/login',
  authLimiter,
  validate(loginSchema),
  login
);

router.post('/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);

router.post('/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  resetPassword
);

router.post('/verify-email',
  emailVerificationLimiter,
  verifyEmail
);

// Protected routes
router.use(auth); // All routes below require authentication

router.get('/me', getMe);

router.put('/profile',
  validate(updateProfileSchema),
  updateProfile
);

router.put('/change-password',
  changePassword
);

router.post('/resend-verification',
  emailVerificationLimiter,
  resendEmailVerification
);

router.post('/logout', logout);

module.exports = router;
