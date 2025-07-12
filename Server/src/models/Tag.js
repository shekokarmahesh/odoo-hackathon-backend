const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [2, 'Tag name must be at least 2 characters'],
    maxlength: [25, 'Tag name cannot exceed 25 characters'],
    match: [/^[a-z0-9-]+$/, 'Tag name must contain only lowercase letters, numbers, and hyphens']
  },
  
  description: {
    type: String,
    maxlength: [500, 'Tag description cannot exceed 500 characters'],
    default: ''
  },
  
  color: {
    type: String,
    match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code'],
    default: '#6B7280' // Default gray color
  },
  
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tag creator is required']
  },
  
  isApproved: {
    type: Boolean,
    default: false
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  synonyms: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  relatedTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for questions using this tag
tagSchema.virtual('questions', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'tags'
});

// Pre-save middleware to auto-approve tags created by admins
tagSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const User = mongoose.model('User');
      const creator = await User.findById(this.createdBy);
      if (creator && creator.role === 'admin') {
        this.isApproved = true;
        this.approvedBy = this.createdBy;
      }
    } catch (error) {
      // Continue without auto-approval if user lookup fails
    }
  }
  next();
});

// Instance method to increment usage count
tagSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  return await this.save();
};

// Instance method to decrement usage count
tagSchema.methods.decrementUsage = async function() {
  this.usageCount = Math.max(0, this.usageCount - 1);
  return await this.save();
};

// Static method to find or create tags
tagSchema.statics.findOrCreateTags = async function(tagNames, createdBy) {
  const tags = [];
  
  for (const name of tagNames) {
    const normalizedName = name.toLowerCase().trim();
    let tag = await this.findOne({ name: normalizedName });
    
    if (!tag) {
      tag = await this.create({
        name: normalizedName,
        createdBy: createdBy
      });
    }
    
    tags.push(tag);
  }
  
  return tags;
};

// Static method to get popular tags
tagSchema.statics.getPopularTags = function(limit = 20) {
  return this.find({ isApproved: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .populate('createdBy', 'username profile.firstName profile.lastName');
};

// Index for better performance (name already has unique index)
tagSchema.index({ usageCount: -1 });
tagSchema.index({ isApproved: 1, usageCount: -1 });
tagSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Tag', tagSchema);
