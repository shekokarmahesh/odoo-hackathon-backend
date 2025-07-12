const express = require('express');
const router = express.Router();

// Import middleware
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const { commentLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const { createCommentSchema } = require('../utils/validators');

// Import comment controller
const commentController = require('../controllers/commentController');

// Endpoints
router.get('/',
  validatePagination,
  commentController.getComments
);

router.get('/:id',
  validateObjectId(),
  commentController.getCommentById
);

router.post('/',
  auth,
  commentLimiter,
  validate(createCommentSchema),
  commentController.createComment
);

router.put('/:id',
  validateObjectId(),
  auth,
  commentController.updateComment
);

router.delete('/:id',
  validateObjectId(),
  auth,
  commentController.deleteComment
);

router.get('/:id/replies',
  validateObjectId(),
  validatePagination,
  commentController.getCommentReplies
);

router.get('/user/:userId',
  validateObjectId('userId'),
  validatePagination,
  commentController.getCommentsByUser
);

module.exports = router;
