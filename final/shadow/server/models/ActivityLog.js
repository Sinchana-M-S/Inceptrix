const mongoose = require('mongoose');

/**
 * Activity Log Schema
 * Captures daily caregiving activities with NLP processing
 * Privacy-first design with coarse geo-location
 */
const ActivityLogSchema = new mongoose.Schema({
  // === Core References ===
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === Raw Input ===
  rawText: {
    type: String,
    required: [true, 'Activity description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  inputMethod: {
    type: String,
    enum: ['text', 'voice', 'quick-select'],
    default: 'text'
  },
  language: {
    type: String,
    default: 'en',
    description: 'Input language code'
  },

  // === NLP Parsed Data ===
  parsedActivity: {
    keywords: [String],
    entities: [{
      type: { type: String },
      value: String,
      confidence: Number
    }],
    sentiment: {
      score: Number,
      label: String
    },
    processingConfidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },

  // === Activity Classification ===
  activityType: {
    type: String,
    enum: ['eldercare', 'childcare', 'specialNeeds', 'housework', 'community', 'healthcare', 'other'],
    required: true
  },
  activitySubtype: {
    type: String,
    trim: true
  },

  // === Time & Effort Estimation ===
  estimatedHours: {
    type: Number,
    required: true,
    min: 0.5,
    max: 18,
    description: 'AI-estimated hours of work'
  },
  reportedHours: {
    type: Number,
    min: 0,
    max: 24,
    description: 'User-reported hours (optional)'
  },
  careMultiplier: {
    type: Number,
    default: 1.0,
    min: 0.5,
    max: 2.0,
    description: 'Multiplier based on activity type and intensity'
  },

  // === Economic Value ===
  economicValue: {
    hourlyRate: Number,
    totalValue: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    benchmarkSource: String
  },

  // === Location (Privacy-Safe) ===
  geoLocation: {
    district: String,
    state: String,
    regionType: {
      type: String,
      enum: ['urban', 'semiUrban', 'rural']
    },
    // Coarse coordinates only (district level)
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // === Verification Status ===
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'disputed'],
    default: 'pending'
  },
  verifiedBy: [{
    verifierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    confidence: Number
  }],

  // === Fraud Detection ===
  anomalyFlags: [{
    type: {
      type: String,
      enum: ['duplicate', 'impossibleHours', 'patternMismatch', 'locationInconsistency', 'textSimilarity']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    details: String,
    detectedAt: Date
  }],
  anomalyScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },

  // === Offline Support ===
  isOffline: {
    type: Boolean,
    default: false
  },
  offlineId: {
    type: String,
    description: 'Local ID for offline-first sync'
  },
  syncedAt: Date,

  // === Timestamps ===
  activityDate: {
    type: Date,
    required: true,
    description: 'Date when activity was performed'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    description: 'When activity was logged'
  }
}, {
  timestamps: true
});

// Index for efficient queries
ActivityLogSchema.index({ caregiverId: 1, activityDate: -1 });
ActivityLogSchema.index({ activityType: 1, activityDate: -1 });
ActivityLogSchema.index({ verificationStatus: 1 });

// Calculate economic value before saving
ActivityLogSchema.pre('save', function(next) {
  if (this.isModified('estimatedHours') || this.isModified('careMultiplier')) {
    const baseRates = {
      urban: 80,
      semiUrban: 60,
      rural: 45
    };
    
    const careTypeRates = {
      eldercare: 1.3,
      childcare: 1.2,
      specialNeeds: 1.5,
      housework: 1.0,
      community: 1.1,
      healthcare: 1.25,
      other: 1.0
    };
    
    const regionType = this.geoLocation?.regionType || 'rural';
    const baseRate = baseRates[regionType];
    const typeMultiplier = careTypeRates[this.activityType] || 1.0;
    
    this.economicValue = {
      hourlyRate: Math.round(baseRate * typeMultiplier),
      totalValue: Math.round(this.estimatedHours * baseRate * typeMultiplier * this.careMultiplier),
      currency: 'INR',
      benchmarkSource: 'regional_wage_benchmark_2024'
    };
  }
  next();
});

// Static method to get monthly summary
ActivityLogSchema.statics.getMonthlySummary = async function(caregiverId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const summary = await this.aggregate([
    {
      $match: {
        caregiverId: new mongoose.Types.ObjectId(caregiverId),
        activityDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$activityType',
        totalHours: { $sum: '$estimatedHours' },
        totalValue: { $sum: '$economicValue.totalValue' },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$parsedActivity.processingConfidence' }
      }
    }
  ]);
  
  return summary;
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
