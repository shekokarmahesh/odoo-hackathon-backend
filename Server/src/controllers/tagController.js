const Tag = require('../models/Tag');
const { createResponse, getPaginationParams, createPaginationMeta } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');
const { createTagSchema } = require('../utils/validators');

/**
 * @desc    Get all tags with pagination
 * @route   GET /api/tags
 * @access  Public
 */
const getTags = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, sort = 'usage' } = req.query;

    // Build search criteria
    const searchCriteria = { isApproved: true };
    
    if (search) {
      searchCriteria.name = { $regex: search, $options: 'i' };
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sort) {
      case 'name':
        sortCriteria = { name: 1 };
        break;
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      default: // usage
        sortCriteria = { usageCount: -1, name: 1 };
    }

    // Get tags
    const tags = await Tag.find(searchCriteria)
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Tag.countDocuments(searchCriteria);

    // Create pagination metadata
    const meta = createPaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Tags retrieved successfully', tags, meta)
    );
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve tags')
    );
  }
};

/**
 * @desc    Get a single tag by ID
 * @route   GET /api/tags/:id
 * @access  Public
 */
const getTagById = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id)
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('approvedBy', 'username profile.firstName profile.lastName')
      .populate('relatedTags', 'name color description');

    if (!tag) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Tag not found')
      );
    }

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Tag retrieved successfully', tag)
    );
  } catch (error) {
    console.error('Get tag by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid tag ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve tag')
    );
  }
};

/**
 * @desc    Create a new tag
 * @route   POST /api/tags
 * @access  Private
 */
const createTag = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createTagSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const { name, description, color } = value;

    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: name.toLowerCase() });
    if (existingTag) {
      return res.status(HTTP_STATUS.CONFLICT).json(
        createResponse(false, 'Tag already exists')
      );
    }

    // Create tag
    const tag = await Tag.create({
      name: name.toLowerCase(),
      description,
      color: color || '#6B7280',
      createdBy: req.user._id
    });

    // Populate the created tag
    const populatedTag = await Tag.findById(tag._id)
      .populate('createdBy', 'username profile.firstName profile.lastName');

    res.status(HTTP_STATUS.CREATED).json(
      createResponse(true, 'Tag created successfully', populatedTag)
    );
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to create tag')
    );
  }
};

/**
 * @desc    Update a tag
 * @route   PUT /api/tags/:id
 * @access  Private (Admin only)
 */
const updateTag = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Admin access required')
      );
    }

    // Validate request body
    const { error, value } = createTagSchema.validate(req.body);
    if (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, error.details[0].message)
      );
    }

    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Tag not found')
      );
    }

    const { name, description, color } = value;

    // Check if new name conflicts with existing tag (if name is being changed)
    if (name && name.toLowerCase() !== tag.name) {
      const existingTag = await Tag.findOne({ name: name.toLowerCase() });
      if (existingTag) {
        return res.status(HTTP_STATUS.CONFLICT).json(
          createResponse(false, 'Tag name already exists')
        );
      }
    }

    // Update tag
    const updateData = {};
    if (name) updateData.name = name.toLowerCase();
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;

    const updatedTag = await Tag.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('approvedBy', 'username profile.firstName profile.lastName');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Tag updated successfully', updatedTag)
    );
  } catch (error) {
    console.error('Update tag error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid tag ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to update tag')
    );
  }
};

/**
 * @desc    Delete a tag
 * @route   DELETE /api/tags/:id
 * @access  Private (Admin only)
 */
const deleteTag = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Admin access required')
      );
    }

    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Tag not found')
      );
    }

    // Check if tag is being used in questions
    if (tag.usageCount > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Cannot delete tag that is being used in questions')
      );
    }

    await Tag.findByIdAndDelete(req.params.id);

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Tag deleted successfully')
    );
  } catch (error) {
    console.error('Delete tag error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid tag ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to delete tag')
    );
  }
};

/**
 * @desc    Approve a tag
 * @route   PUT /api/tags/:id/approve
 * @access  Private (Admin only)
 */
const approveTag = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        createResponse(false, 'Admin access required')
      );
    }

    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createResponse(false, 'Tag not found')
      );
    }

    if (tag.isApproved) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Tag is already approved')
      );
    }

    // Approve tag
    tag.isApproved = true;
    tag.approvedBy = req.user._id;
    await tag.save();

    const populatedTag = await Tag.findById(tag._id)
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('approvedBy', 'username profile.firstName profile.lastName');

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Tag approved successfully', populatedTag)
    );
  } catch (error) {
    console.error('Approve tag error:', error);
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Invalid tag ID')
      );
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to approve tag')
    );
  }
};

/**
 * @desc    Get popular tags
 * @route   GET /api/tags/popular
 * @access  Public
 */
const getPopularTags = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const tags = await Tag.getPopularTags(parseInt(limit));

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Popular tags retrieved successfully', tags)
    );
  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to retrieve popular tags')
    );
  }
};

/**
 * @desc    Search tags by name
 * @route   GET /api/tags/search
 * @access  Public
 */
const searchTags = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Search query is required')
      );
    }

    const tags = await Tag.find({
      isApproved: true,
      name: { $regex: query.trim(), $options: 'i' }
    })
      .select('name color description usageCount')
      .sort({ usageCount: -1, name: 1 })
      .limit(parseInt(limit))
      .lean();

    res.status(HTTP_STATUS.OK).json(
      createResponse(true, 'Tags search completed', tags)
    );
  } catch (error) {
    console.error('Search tags error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, 'Failed to search tags')
    );
  }
};

module.exports = {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  approveTag,
  getPopularTags,
  searchTags
};
