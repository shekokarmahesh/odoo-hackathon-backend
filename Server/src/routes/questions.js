const express = require('express');
const router = express.Router();

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const { questionLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const { createQuestionSchema, updateQuestionSchema } = require('../utils/validators');

// Import question controller
const questionController = require('../controllers/questionController');

// Endpoints
router.get('/',
  optionalAuth,
  validatePagination,
  questionController.getQuestions
);

router.get('/search',
  optionalAuth,
  validatePagination,
  questionController.searchQuestions
);

router.get('/trending',
  optionalAuth,
  validatePagination,
  questionController.getTrendingQuestions
);

router.get('/unanswered',
  optionalAuth,
  validatePagination,
  questionController.getUnansweredQuestions
);

router.get('/:id',
  validateObjectId(),
  optionalAuth,
  questionController.getQuestionById
);

router.post('/',
  auth,
  questionLimiter,
  validate(createQuestionSchema),
  questionController.createQuestion
);

router.put('/:id',
  validateObjectId(),
  auth,
  validate(updateQuestionSchema),
  questionController.updateQuestion
);

router.delete('/:id',
  validateObjectId(),
  auth,
  questionController.deleteQuestion
);

router.put('/:id/close',
  validateObjectId(),
  auth,
  questionController.closeQuestion
);

router.put('/:id/reopen',
  validateObjectId(),
  auth,
  questionController.reopenQuestion
);

module.exports = router;
