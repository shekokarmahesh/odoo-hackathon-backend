// API Response status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// User roles
const USER_ROLES = {
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin'
};

// Question status
const QUESTION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  DELETED: 'deleted'
};

// Vote types
const VOTE_TYPES = {
  UPVOTE: 'upvote',
  DOWNVOTE: 'downvote'
};

// Notification types
const NOTIFICATION_TYPES = {
  NEW_ANSWER: 'new_answer',
  COMMENT_ON_ANSWER: 'comment_on_answer',
  COMMENT_ON_QUESTION: 'comment_on_question',
  MENTION: 'mention',
  ANSWER_ACCEPTED: 'answer_accepted',
  QUESTION_CLOSED: 'question_closed'
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Validation limits
const VALIDATION_LIMITS = {
  USERNAME: {
    MIN: 3,
    MAX: 30
  },
  QUESTION_TITLE: {
    MIN: 10,
    MAX: 150
  },
  COMMENT: {
    MIN: 1,
    MAX: 600
  },
  BIO: {
    MAX: 500
  },
  TAG_NAME: {
    MIN: 2,
    MAX: 25
  },
  TAGS_PER_QUESTION: {
    MIN: 1,
    MAX: 5
  }
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  QUESTION_STATUS,
  VOTE_TYPES,
  NOTIFICATION_TYPES,
  PAGINATION,
  VALIDATION_LIMITS
};
