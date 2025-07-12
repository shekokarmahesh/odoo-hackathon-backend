const express = require('express');
const router = express.Router();

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');

// Import validation schemas
const { updateProfileSchema } = require('../utils/validators');

// Import user controller
const userController = require('../controllers/userController');

// Endpoints
router.get('/',
  validatePagination,
  userController.getTopUsers
);

router.get('/me',
  auth,
  userController.getCurrentUser
);

router.get('/search',
  validatePagination,
  userController.searchUsers
);

router.get('/:id',
  validateObjectId(),
  optionalAuth,
  userController.getUserProfile
);

router.put('/profile',
  auth,
  validate(updateProfileSchema),
  userController.updateProfile
);

router.get('/:id/questions',
  validateObjectId(),
  validatePagination,
  userController.getUserQuestions
);

router.get('/:id/answers',
  validateObjectId(),
  validatePagination,
  userController.getUserAnswers
);

router.get('/:id/activity',
  validateObjectId(),
  validatePagination,
  userController.getUserActivity
);

module.exports = router;
