const express = require('express');
const router = express.Router();

// Import middleware
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const { voteLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const { voteSchema } = require('../utils/validators');

// Import vote controller
const voteController = require('../controllers/voteController');

// Endpoints
router.post('/question/:id',
  validateObjectId(),
  auth,
  voteLimiter,
  validate(voteSchema),
  voteController.voteOnQuestion
);

router.post('/answer/:id',
  validateObjectId(),
  auth,
  voteLimiter,
  validate(voteSchema),
  voteController.voteOnAnswer
);

router.get('/question/:id',
  validateObjectId(),
  voteController.getQuestionVotes
);

router.get('/answer/:id',
  validateObjectId(),
  voteController.getAnswerVotes
);

router.get('/user/:userId',
  validateObjectId('userId'),
  validatePagination,
  voteController.getUserVotes
);

router.delete('/question/:id',
  validateObjectId(),
  auth,
  voteController.removeQuestionVote
);

router.delete('/answer/:id',
  validateObjectId(),
  auth,
  voteController.removeAnswerVote
);

module.exports = router;
