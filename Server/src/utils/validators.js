const Joi = require('joi');
const { VALIDATION_LIMITS, USER_ROLES } = require('./constants');

// User validation schemas
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(VALIDATION_LIMITS.USERNAME.MIN)
    .max(VALIDATION_LIMITS.USERNAME.MAX)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': `Username must be at least ${VALIDATION_LIMITS.USERNAME.MIN} characters`,
      'string.max': `Username must not exceed ${VALIDATION_LIMITS.USERNAME.MAX} characters`
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long'
    }),
  
  firstName: Joi.string()
    .min(1)
    .max(50)
    .optional(),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .optional()
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),
  
  password: Joi.string()
    .required()
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .min(1)
    .max(50)
    .optional(),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .optional(),
  
  bio: Joi.string()
    .max(VALIDATION_LIMITS.BIO.MAX)
    .optional()
    .allow(''),
  
  location: Joi.string()
    .max(100)
    .optional()
    .allow('')
});

// Question validation schemas
const createQuestionSchema = Joi.object({
  title: Joi.string()
    .min(VALIDATION_LIMITS.QUESTION_TITLE.MIN)
    .max(VALIDATION_LIMITS.QUESTION_TITLE.MAX)
    .required()
    .messages({
      'string.min': `Question title must be at least ${VALIDATION_LIMITS.QUESTION_TITLE.MIN} characters`,
      'string.max': `Question title must not exceed ${VALIDATION_LIMITS.QUESTION_TITLE.MAX} characters`
    }),
  
  description: Joi.string()
    .min(20)
    .required()
    .messages({
      'string.min': 'Question description must be at least 20 characters'
    }),
  
  tags: Joi.array()
    .items(Joi.string().min(2).max(25)) // Accept tag names instead of ObjectIds
    .min(VALIDATION_LIMITS.TAGS_PER_QUESTION.MIN)
    .max(VALIDATION_LIMITS.TAGS_PER_QUESTION.MAX)
    .required()
    .messages({
      'array.min': `Question must have at least ${VALIDATION_LIMITS.TAGS_PER_QUESTION.MIN} tag`,
      'array.max': `Question cannot have more than ${VALIDATION_LIMITS.TAGS_PER_QUESTION.MAX} tags`
    })
});

const updateQuestionSchema = Joi.object({
  title: Joi.string()
    .min(VALIDATION_LIMITS.QUESTION_TITLE.MIN)
    .max(VALIDATION_LIMITS.QUESTION_TITLE.MAX)
    .optional(),
  
  description: Joi.string()
    .min(20)
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string().length(24))
    .min(VALIDATION_LIMITS.TAGS_PER_QUESTION.MIN)
    .max(VALIDATION_LIMITS.TAGS_PER_QUESTION.MAX)
    .optional()
});

// Answer validation schemas
const createAnswerSchema = Joi.object({
  content: Joi.string()
    .min(30)
    .required()
    .messages({
      'string.min': 'Answer must be at least 30 characters long'
    })
});

const updateAnswerSchema = Joi.object({
  content: Joi.string()
    .min(30)
    .required(),
  
  reason: Joi.string()
    .max(200)
    .optional()
});

// Comment validation schemas
const createCommentSchema = Joi.object({
  content: Joi.string()
    .min(VALIDATION_LIMITS.COMMENT.MIN)
    .max(VALIDATION_LIMITS.COMMENT.MAX)
    .required()
    .messages({
      'string.min': `Comment must be at least ${VALIDATION_LIMITS.COMMENT.MIN} character`,
      'string.max': `Comment must not exceed ${VALIDATION_LIMITS.COMMENT.MAX} characters`
    }),
  
  postType: Joi.string()
    .valid('question', 'answer')
    .required(),
  
  postId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid post ID'
    }),
  
  parentCommentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid parent comment ID'
    })
});

const updateCommentSchema = Joi.object({
  content: Joi.string()
    .min(VALIDATION_LIMITS.COMMENT.MIN)
    .max(VALIDATION_LIMITS.COMMENT.MAX)
    .required()
    .messages({
      'string.min': `Comment must be at least ${VALIDATION_LIMITS.COMMENT.MIN} character`,
      'string.max': `Comment must not exceed ${VALIDATION_LIMITS.COMMENT.MAX} characters`
    })
});

// Tag validation schemas
const createTagSchema = Joi.object({
  name: Joi.string()
    .min(VALIDATION_LIMITS.TAG_NAME.MIN)
    .max(VALIDATION_LIMITS.TAG_NAME.MAX)
    .pattern(/^[a-z0-9-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Tag name must contain only lowercase letters, numbers, and hyphens',
      'string.min': `Tag name must be at least ${VALIDATION_LIMITS.TAG_NAME.MIN} characters`,
      'string.max': `Tag name must not exceed ${VALIDATION_LIMITS.TAG_NAME.MAX} characters`
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code'
    })
});

// Vote validation schema
const voteSchema = Joi.object({
  voteType: Joi.string()
    .valid('upvote', 'downvote')
    .required()
});

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional(),
  
  sort: Joi.string()
    .valid('newest', 'oldest', 'votes', 'views', 'activity')
    .optional(),
  
  search: Joi.string()
    .max(100)
    .optional()
});

// Password reset validation schemas
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required(),
  
  password: Joi.string()
    .min(6)
    .required()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createQuestionSchema,
  updateQuestionSchema,
  createAnswerSchema,
  updateAnswerSchema,
  createCommentSchema,
  updateCommentSchema,
  createTagSchema,
  voteSchema,
  paginationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
