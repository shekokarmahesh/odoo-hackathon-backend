const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { createResponse, generateToken, sanitizeUser, generateRandomString } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');
const emailService = require('../services/emailService');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    return res.status(HTTP_STATUS.CONFLICT).json(
      createResponse(false, `User with this ${field} already exists`)
    );
  }

  // Create user
  const userData = {
    username,
    email,
    password,
    profile: {}
  };

  if (firstName) userData.profile.firstName = firstName;
  if (lastName) userData.profile.lastName = lastName;

  const user = await User.create(userData);

  // Generate email verification token
  const verificationToken = generateRandomString();
  user.emailVerificationToken = verificationToken;
  await user.save();

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(email, username, verificationToken);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't fail registration if email fails
  }

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(HTTP_STATUS.CREATED).json(
    createResponse(true, 'User registered successfully', {
      token,
      user: sanitizeUser(user)
    })
  );
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and include password for comparison
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createResponse(false, 'Invalid email or password')
    );
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(
      createResponse(false, 'Invalid email or password')
    );
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Login successful', {
      token,
      user: sanitizeUser(user)
    })
  );
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('questionCount')
    .populate('answerCount');

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'User profile retrieved successfully', {
      user: sanitizeUser(user)
    })
  );
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, bio, location } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createResponse(false, 'User not found')
    );
  }

  // Update profile fields
  if (firstName !== undefined) user.profile.firstName = firstName;
  if (lastName !== undefined) user.profile.lastName = lastName;
  if (bio !== undefined) user.profile.bio = bio;
  if (location !== undefined) user.profile.location = location;

  await user.save();

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Profile updated successfully', {
      user: sanitizeUser(user)
    })
  );
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createResponse(false, 'User not found')
    );
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Current password is incorrect')
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Password changed successfully')
  );
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists or not
    return res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'If the email exists, a password reset link has been sent')
    );
  }

  // Generate reset token
  const resetToken = generateRandomString();
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // Send password reset email
  try {
    await emailService.sendPasswordResetEmail(email, user.username, resetToken);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to send password reset email')
    );
  }

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Password reset email sent successfully')
  );
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Invalid or expired reset token')
    );
  }

  // Update password and clear reset token
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Password reset successfully')
  );
});

/**
 * @desc    Verify email
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({ emailVerificationToken: token })
    .select('+emailVerificationToken');

  if (!user) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Invalid verification token')
    );
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Email verified successfully')
  );
});

/**
 * @desc    Resend email verification
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createResponse(false, 'User not found')
    );
  }

  if (user.isEmailVerified) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'Email is already verified')
    );
  }

  // Generate new verification token
  const verificationToken = generateRandomString();
  user.emailVerificationToken = verificationToken;
  await user.save();

  // Send verification email
  try {
    await emailService.sendWelcomeEmail(user.email, user.username, verificationToken);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to send verification email')
    );
  }

  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Verification email sent successfully')
  );
});

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  // This endpoint is here for completeness and can be used for logging purposes
  
  res.status(HTTP_STATUS.OK).json(
    createResponse(true, 'Logout successful')
  );
});

module.exports = {
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
};
