const express = require('express');
const router = express.Router();

// Import middleware
const { auth, optionalAuth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');

// Import validation schemas
const { createTagSchema } = require('../utils/validators');

// Import tag controller
const tagController = require('../controllers/tagController');

// Endpoints
router.get('/',
  validatePagination,
  tagController.getTags
);

router.get('/popular',
  tagController.getPopularTags
);

router.get('/search',
  tagController.searchTags
);

router.get('/:id',
  validateObjectId(),
  tagController.getTagById
);

router.post('/',
  auth,
  validate(createTagSchema),
  tagController.createTag
);

router.put('/:id',
  validateObjectId(),
  auth,
  tagController.updateTag
);

router.delete('/:id',
  validateObjectId(),
  auth,
  tagController.deleteTag
);

router.put('/:id/approve',
  validateObjectId(),
  auth,
  tagController.approveTag
);

module.exports = router;
