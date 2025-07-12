const express = require('express');
const router = express.Router();

// Import middleware
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const { answerLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const { createAnswerSchema, updateAnswerSchema } = require('../utils/validators');

// Import answer controller
const answerController = require('../controllers/answerController');

// Endpoints
router.get('/question/:questionId',
  validateObjectId('questionId'),
  validatePagination,
  answerController.getAnswersByQuestion
);

router.get('/:id',
  validateObjectId(),
  answerController.getAnswerById
);

router.post('/question/:questionId',
  validateObjectId('questionId'),
  auth,
  answerLimiter,
  validate(createAnswerSchema),
  answerController.createAnswer
);

router.put('/:id',
  validateObjectId(),
  auth,
  validate(updateAnswerSchema),
  answerController.updateAnswer
);

router.delete('/:id',
  validateObjectId(),
  auth,
  answerController.deleteAnswer
);

router.put('/:id/accept',
  validateObjectId(),
  auth,
  answerController.acceptAnswer
);

router.put('/:id/unaccept',
  validateObjectId(),
  auth,
  answerController.unacceptAnswer
);

module.exports = router;
