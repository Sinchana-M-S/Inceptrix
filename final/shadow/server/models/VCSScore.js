const mongoose = require('mongoose');

/**
 * VCS Score Schema
 * Stores calculated Validated Contribution Scores with full explainability
 */
const VCSScoreSchema = new mongoose.Schema({
  // === Core Reference ===
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // === Final Score ===
  totalVCS: {
    type: Number,
    required: true,
    min: 0,
    max: 1000
  },

  // === Component Breakdown ===
  breakdown: {
    // Identity & Stability
    identityStability: {
      score: Number,
      details: {
        ageGroup: { raw: mongoose.Schema.Types.Mixed, normalized: Number, weighted: Number },
        regionType: { raw: String, normalized: Number, weighted: Number },
        simTenure: { raw: Number, normalized: Number, weighted: Number },
        locationStability: { raw: Number, normalized: Number, weighted: Number },
        landVerified: { raw: Boolean, normalized: Number, weighted: Number }
      }
    },
    
    // Behavioral Finance
    behavioralFinance: {
      score: Number,
      details: {
        smsCount: { raw: Number, normalized: Number, weighted: Number },
        rechargeFrequency: { raw: Number, normalized: Number, weighted: Number },
        utilityPaymentRatio: { raw: Number, normalized: Number, weighted: Number },
        paymentStreaks: { raw: Number, normalized: Number, weighted: Number },
        behaviorConsistency: { raw: Number, normalized: Number, weighted: Number }
      }
    },
    
    // Economic Proxies
    economicProxies: {
      score: Number,
      details: {
        incomeSignal: { raw: Number, normalized: Number, weighted: Number },
        coopScore: { raw: Number, normalized: Number, weighted: Number },
        expenseShockRecovery: { raw: Number, normalized: Number, weighted: Number }
      }
    },
    
    // Social Trust
    socialTrust: {
      score: Number,
      details: {
        communityValidationCount: { raw: Number, normalized: Number, weighted: Number },
        verifierTrustScore: { raw: Number, normalized: Number, weighted: Number },
        socialConsistency: { raw: Number, normalized: Number, weighted: Number }
      }
    },
    
    // Care / Informal Labor
    careLabor: {
      score: Number,
      details: {
        careHours: { raw: Number, normalized: Number, weighted: Number },
        careTypeValue: { raw: Number, normalized: Number, weighted: Number },
        validationConfidence: { raw: Number, normalized: Number, weighted: Number },
        careContinuity: { raw: Number, normalized: Number, weighted: Number }
      }
    },
    
    // Penalties Applied
    penalties: {
      totalPenalty: Number,
      details: {
        behaviorEntropy: { value: Number, penalty: Number },
        anomalyScore: { value: Number, penalty: Number },
        fraudProbability: { value: Number, penalty: Number },
        collusionRisk: { value: Number, penalty: Number },
        inconsistencyPenalty: { value: Number, penalty: Number }
      }
    }
  },

  // === Risk & Credit ===
  riskBand: {
    type: String,
    enum: ['noIdentity', 'emerging', 'eligible', 'lowRisk', 'prime'],
    required: true
  },
  riskBandLabel: String,
  riskBandColor: String,

  // === Economic Value ===
  economicValue: {
    monthlyHours: Number,
    monthlyValue: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    careBreakdown: [{
      type: String,
      hours: Number,
      value: Number
    }]
  },

  // === Loan Eligibility ===
  loanEligibility: {
    eligible: Boolean,
    maxLoanAmount: Number,
    suggestedInterestBand: String,
    confidenceInterval: {
      lower: Number,
      upper: Number
    }
  },

  // === Explainability ===
  humanExplanation: {
    type: String,
    required: true,
    description: 'Plain-language explanation of the score'
  },
  improvementTips: [{
    category: String,
    tip: String,
    potentialGain: Number
  }],

  // === Audit Trail ===
  configVersion: {
    type: String,
    description: 'Version of VCS config used'
  },
  inputSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Snapshot of input data used for calculation'
  },

  // === Score History (Last 30 days) ===
  scoreHistory: [{
    date: Date,
    score: Number,
    riskBand: String
  }],

  // === Timestamps ===
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    description: 'Score validity expiration'
  }
}, {
  timestamps: true
});

// Index for efficient queries
VCSScoreSchema.index({ caregiverId: 1, calculatedAt: -1 });
VCSScoreSchema.index({ riskBand: 1 });
VCSScoreSchema.index({ 'loanEligibility.eligible': 1 });

// Get latest score for a caregiver
VCSScoreSchema.statics.getLatestScore = async function(caregiverId) {
  return await this.findOne({ caregiverId })
    .sort({ calculatedAt: -1 })
    .limit(1);
};

// Get score trend for a caregiver
VCSScoreSchema.statics.getScoreTrend = async function(caregiverId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    caregiverId,
    calculatedAt: { $gte: startDate }
  })
  .sort({ calculatedAt: 1 })
  .select('totalVCS riskBand calculatedAt');
};

module.exports = mongoose.model('VCSScore', VCSScoreSchema);
