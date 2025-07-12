const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const User = require('../models/User');
const { escapeRegex } = require('../utils/helpers');

class SearchService {
  constructor() {
    this.searchTimeout = 5000; // 5 seconds timeout for search operations
  }

  /**
   * Search questions with various criteria
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} Promise resolving to search results
   */
  async searchQuestions(searchParams) {
    const {
      query = '',
      tags = [],
      author = '',
      status = 'active',
      hasAcceptedAnswer = null,
      minVotes = null,
      maxVotes = null,
      dateFrom = null,
      dateTo = null,
      sortBy = 'relevance',
      page = 1,
      limit = 10
    } = searchParams;

    try {
      const skip = (page - 1) * limit;
      const searchCriteria = this.buildQuestionSearchCriteria({
        query,
        tags,
        author,
        status,
        hasAcceptedAnswer,
        minVotes,
        maxVotes,
        dateFrom,
        dateTo
      });

      const sortCriteria = this.buildSortCriteria(sortBy, query);

      // Execute search
      const [questions, totalCount] = await Promise.all([
        Question.find(searchCriteria)
          .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
          .populate('tags', 'name color description')
          .populate('acceptedAnswer', '_id')
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean(),
        Question.countDocuments(searchCriteria)
      ]);

      // Add search highlights if text search was performed
      const enhancedQuestions = query ? 
        this.addSearchHighlights(questions, query) : 
        questions;

      return {
        questions: enhancedQuestions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        searchInfo: {
          query,
          tags,
          author,
          sortBy,
          totalResults: totalCount
        }
      };
    } catch (error) {
      console.error('Question search error:', error);
      throw new Error('Search operation failed');
    }
  }

  /**
   * Search answers for a specific question
   * @param {string} questionId - Question ID
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} Promise resolving to search results
   */
  async searchAnswers(questionId, searchParams) {
    const {
      query = '',
      sortBy = 'votes',
      page = 1,
      limit = 10
    } = searchParams;

    try {
      const skip = (page - 1) * limit;
      const searchCriteria = {
        question: questionId,
        isDeleted: false
      };

      // Add text search if query provided
      if (query) {
        searchCriteria.content = {
          $regex: escapeRegex(query),
          $options: 'i'
        };
      }

      const sortCriteria = this.buildAnswerSortCriteria(sortBy);

      const [answers, totalCount] = await Promise.all([
        Answer.find(searchCriteria)
          .populate('author', 'username profile.firstName profile.lastName profile.avatar reputation')
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean(),
        Answer.countDocuments(searchCriteria)
      ]);

      const enhancedAnswers = query ? 
        this.addSearchHighlights(answers, query, 'content') : 
        answers;

      return {
        answers: enhancedAnswers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Answer search error:', error);
      throw new Error('Answer search operation failed');
    }
  }

  /**
   * Search tags
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} Promise resolving to search results
   */
  async searchTags(searchParams) {
    const {
      query = '',
      sortBy = 'usage',
      page = 1,
      limit = 20,
      approvedOnly = true
    } = searchParams;

    try {
      const skip = (page - 1) * limit;
      const searchCriteria = {};

      if (approvedOnly) {
        searchCriteria.isApproved = true;
      }

      if (query) {
        searchCriteria.$or = [
          { name: { $regex: escapeRegex(query), $options: 'i' } },
          { description: { $regex: escapeRegex(query), $options: 'i' } },
          { synonyms: { $in: [new RegExp(escapeRegex(query), 'i')] } }
        ];
      }

      const sortCriteria = this.buildTagSortCriteria(sortBy);

      const [tags, totalCount] = await Promise.all([
        Tag.find(searchCriteria)
          .populate('createdBy', 'username')
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean(),
        Tag.countDocuments(searchCriteria)
      ]);

      return {
        tags,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Tag search error:', error);
      throw new Error('Tag search operation failed');
    }
  }

  /**
   * Search users
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} Promise resolving to search results
   */
  async searchUsers(searchParams) {
    const {
      query = '',
      sortBy = 'reputation',
      page = 1,
      limit = 20
    } = searchParams;

    try {
      const skip = (page - 1) * limit;
      const searchCriteria = { isActive: true };

      if (query) {
        searchCriteria.$or = [
          { username: { $regex: escapeRegex(query), $options: 'i' } },
          { 'profile.firstName': { $regex: escapeRegex(query), $options: 'i' } },
          { 'profile.lastName': { $regex: escapeRegex(query), $options: 'i' } },
          { 'profile.bio': { $regex: escapeRegex(query), $options: 'i' } }
        ];
      }

      const sortCriteria = this.buildUserSortCriteria(sortBy);

      const [users, totalCount] = await Promise.all([
        User.find(searchCriteria)
          .select('username profile reputation createdAt lastLogin')
          .sort(sortCriteria)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(searchCriteria)
      ]);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('User search error:', error);
      throw new Error('User search operation failed');
    }
  }

  /**
   * Global search across all content types
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} Promise resolving to combined search results
   */
  async globalSearch(searchParams) {
    const {
      query = '',
      types = ['questions', 'answers', 'tags', 'users'],
      limit = 5
    } = searchParams;

    try {
      const searchPromises = [];

      if (types.includes('questions')) {
        searchPromises.push(
          this.searchQuestions({ query, limit, sortBy: 'relevance' })
            .then(result => ({ type: 'questions', ...result }))
        );
      }

      if (types.includes('tags')) {
        searchPromises.push(
          this.searchTags({ query, limit, sortBy: 'usage' })
            .then(result => ({ type: 'tags', ...result }))
        );
      }

      if (types.includes('users')) {
        searchPromises.push(
          this.searchUsers({ query, limit, sortBy: 'reputation' })
            .then(result => ({ type: 'users', ...result }))
        );
      }

      const results = await Promise.all(searchPromises);

      return {
        query,
        results: results.reduce((acc, result) => {
          acc[result.type] = result;
          return acc;
        }, {}),
        totalResults: results.reduce((total, result) => {
          return total + (result.pagination?.totalCount || 0);
        }, 0)
      };
    } catch (error) {
      console.error('Global search error:', error);
      throw new Error('Global search operation failed');
    }
  }

  /**
   * Get search suggestions
   * @param {string} query - Search query
   * @param {string} type - Suggestion type ('questions', 'tags', 'users')
   * @returns {Promise} Promise resolving to suggestions
   */
  async getSearchSuggestions(query, type = 'questions') {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const escapedQuery = escapeRegex(query);
      let suggestions = [];

      switch (type) {
        case 'questions':
          suggestions = await Question.find({
            title: { $regex: escapedQuery, $options: 'i' },
            status: 'active'
          })
            .select('title')
            .limit(5)
            .lean();
          break;

        case 'tags':
          suggestions = await Tag.find({
            $or: [
              { name: { $regex: escapedQuery, $options: 'i' } },
              { synonyms: { $in: [new RegExp(escapedQuery, 'i')] } }
            ],
            isApproved: true
          })
            .select('name description usageCount')
            .sort({ usageCount: -1 })
            .limit(10)
            .lean();
          break;

        case 'users':
          suggestions = await User.find({
            $or: [
              { username: { $regex: escapedQuery, $options: 'i' } },
              { 'profile.firstName': { $regex: escapedQuery, $options: 'i' } },
              { 'profile.lastName': { $regex: escapedQuery, $options: 'i' } }
            ],
            isActive: true
          })
            .select('username profile.firstName profile.lastName profile.avatar')
            .limit(5)
            .lean();
          break;
      }

      return suggestions;
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * Build question search criteria
   */
  buildQuestionSearchCriteria(params) {
    const {
      query,
      tags,
      author,
      status,
      hasAcceptedAnswer,
      minVotes,
      maxVotes,
      dateFrom,
      dateTo
    } = params;

    const criteria = {};

    // Text search
    if (query) {
      criteria.$text = { $search: query };
    }

    // Status filter
    if (status) {
      criteria.status = status;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      criteria.tags = { $in: tags };
    }

    // Author filter
    if (author) {
      criteria.author = author;
    }

    // Accepted answer filter
    if (hasAcceptedAnswer !== null) {
      if (hasAcceptedAnswer) {
        criteria.acceptedAnswer = { $ne: null };
      } else {
        criteria.acceptedAnswer = null;
      }
    }

    // Vote score filter
    if (minVotes !== null || maxVotes !== null) {
      criteria.voteScore = {};
      if (minVotes !== null) criteria.voteScore.$gte = minVotes;
      if (maxVotes !== null) criteria.voteScore.$lte = maxVotes;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      criteria.createdAt = {};
      if (dateFrom) criteria.createdAt.$gte = new Date(dateFrom);
      if (dateTo) criteria.createdAt.$lte = new Date(dateTo);
    }

    return criteria;
  }

  /**
   * Build sort criteria for questions
   */
  buildSortCriteria(sortBy, hasTextSearch = false) {
    switch (sortBy) {
      case 'newest':
        return { createdAt: -1 };
      case 'oldest':
        return { createdAt: 1 };
      case 'votes':
        return { voteScore: -1, createdAt: -1 };
      case 'views':
        return { views: -1, createdAt: -1 };
      case 'activity':
        return { lastActivity: -1 };
      case 'relevance':
      default:
        if (hasTextSearch) {
          return { score: { $meta: 'textScore' }, voteScore: -1 };
        }
        return { createdAt: -1 };
    }
  }

  /**
   * Build sort criteria for answers
   */
  buildAnswerSortCriteria(sortBy) {
    switch (sortBy) {
      case 'newest':
        return { createdAt: -1 };
      case 'oldest':
        return { createdAt: 1 };
      case 'votes':
      default:
        return { isAccepted: -1, voteScore: -1, createdAt: -1 };
    }
  }

  /**
   * Build sort criteria for tags
   */
  buildTagSortCriteria(sortBy) {
    switch (sortBy) {
      case 'name':
        return { name: 1 };
      case 'newest':
        return { createdAt: -1 };
      case 'usage':
      default:
        return { usageCount: -1, name: 1 };
    }
  }

  /**
   * Build sort criteria for users
   */
  buildUserSortCriteria(sortBy) {
    switch (sortBy) {
      case 'name':
        return { username: 1 };
      case 'newest':
        return { createdAt: -1 };
      case 'activity':
        return { lastLogin: -1 };
      case 'reputation':
      default:
        return { reputation: -1, username: 1 };
    }
  }

  /**
   * Add search highlights to results
   */
  addSearchHighlights(items, query, field = 'title') {
    const escapedQuery = escapeRegex(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    return items.map(item => {
      if (item[field]) {
        item.highlighted = item[field].replace(regex, '<mark>$1</mark>');
      }
      return item;
    });
  }
}

module.exports = new SearchService();
