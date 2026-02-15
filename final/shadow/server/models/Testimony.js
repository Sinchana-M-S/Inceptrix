const mongoose = require('mongoose');

/**
 * Testimony Schema
 * Community validation of caregiver activities
 * Includes anti-collusion and fraud detection
 */
const TestimonySchema = new mongoose.Schema({
  // === Core References ===
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  verifierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // === Activity Reference (optional - can be general testimony) ===
  activityLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityLog'
  },

  // === Structured Rating ===
  structuredRating: {
    reliability: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      description: 'How reliable is the caregiver?'
    },
    consistency: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      description: 'How consistent are their activities?'
    },
    quality: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      description: 'Quality of care provided'
    },
    communityImpact: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      description: 'Impact on community/family'
    }
  },

  // === Free Text Testimony ===
  freeText: {
    type: String,
    maxlength: [1000, 'Testimony cannot exceed 1000 characters'],
    description: 'Unstructured testimony'
  },
  language: {
    type: String,
    default: 'en'
  },

  // === Verification Metadata ===
  verifierTrustLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    description: 'Trust level based on verifier role'
  },
  relationshipToCaregiver: {
    type: String,
    enum: ['neighbor', 'family', 'colleague', 'beneficiary', 'supervisor', 'community_member', 'other'],
    required: true
  },
  knownDuration: {
    type: Number,
    min: 0,
    description: 'Months known the caregiver'
  },

  // === AI Validation ===
  validationConfidence: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    description: 'AI confidence in testimony authenticity'
  },
  sentimentAnalysis: {
    score: Number,
    label: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    }
  },
  authenticityScore: {
    type: Number,
    default: 1,
    min: 0,
    max: 1,
    description: 'Likelihood of genuine testimony'
  },

  // === Anti-Collusion Detection ===
  antiCollusionFlags: [{
    type: {
      type: String,
      enum: ['repeated_verifier', 'network_cluster', 'timing_pattern', 'text_similarity', 'reciprocal_verification']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    details: String,
    relatedTestimonies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Testimony'
    }],
    detectedAt: Date
  }],
  collusionRisk: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },

  // === Weighted Score Contribution ===
  weightedScore: {
    type: Number,
    description: 'Final weighted contribution to VCS'
  },

  // === Status ===
  status: {
    type: String,
    enum: ['submitted', 'verified', 'flagged', 'rejected'],
    default: 'submitted'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,

  // === Timestamps ===
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
TestimonySchema.index({ caregiverId: 1, timestamp: -1 });
TestimonySchema.index({ verifierId: 1, timestamp: -1 });
TestimonySchema.index({ status: 1 });

// Calculate weighted score before saving
TestimonySchema.pre('save', function(next) {
  // Calculate average structured rating
  const ratings = this.structuredRating;
  const avgRating = (ratings.reliability + ratings.consistency + ratings.quality + ratings.communityImpact) / 4;
  
  // Normalize to 0-1
  const normalizedRating = (avgRating - 1) / 4;
  
  // Apply verifier trust and validation confidence
  this.weightedScore = normalizedRating * this.verifierTrustLevel * this.validationConfidence * (1 - this.collusionRisk);
  
  next();
});

// Static method to get caregiver's community validation summary
TestimonySchema.statics.getValidationSummary = async function(caregiverId) {
  const summary = await this.aggregate([
    {
      $match: {
        caregiverId: new mongoose.Types.ObjectId(caregiverId),
        status: { $in: ['submitted', 'verified'] }
      }
    },
    {
      $group: {
        _id: null,
        totalTestimonies: { $sum: 1 },
        avgReliability: { $avg: '$structuredRating.reliability' },
        avgConsistency: { $avg: '$structuredRating.consistency' },
        avgQuality: { $avg: '$structuredRating.quality' },
        avgCommunityImpact: { $avg: '$structuredRating.communityImpact' },
        avgWeightedScore: { $avg: '$weightedScore' },
        avgValidationConfidence: { $avg: '$validationConfidence' },
        avgCollusionRisk: { $avg: '$collusionRisk' },
        uniqueVerifiers: { $addToSet: '$verifierId' }
      }
    },
    {
      $project: {
        totalTestimonies: 1,
        uniqueVerifierCount: { $size: '$uniqueVerifiers' },
        avgReliability: { $round: ['$avgReliability', 2] },
        avgConsistency: { $round: ['$avgConsistency', 2] },
        avgQuality: { $round: ['$avgQuality', 2] },
        avgCommunityImpact: { $round: ['$avgCommunityImpact', 2] },
        avgWeightedScore: { $round: ['$avgWeightedScore', 3] },
        avgValidationConfidence: { $round: ['$avgValidationConfidence', 3] },
        avgCollusionRisk: { $round: ['$avgCollusionRisk', 3] }
      }
    }
  ]);
  
  return summary[0] || {
    totalTestimonies: 0,
    uniqueVerifierCount: 0,
    avgReliability: 0,
    avgConsistency: 0,
    avgQuality: 0,
    avgCommunityImpact: 0,
    avgWeightedScore: 0,
    avgValidationConfidence: 0,
    avgCollusionRisk: 0
  };
};

module.exports = mongoose.model('Testimony', TestimonySchema);
