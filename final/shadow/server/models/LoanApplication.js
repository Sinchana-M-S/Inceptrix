const mongoose = require('mongoose');

/**
 * Loan Application Schema
 * Tracks loan applications using VCS as collateral
 */
const LoanApplicationSchema = new mongoose.Schema({
  // === Core References ===
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vcsScoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VCSScore',
    required: true
  },
  
  // === Loan Details ===
  requestedAmount: {
    type: Number,
    required: true,
    min: 1000
  },
  approvedAmount: Number,
  currency: {
    type: String,
    default: 'INR'
  },
  
  // === VCS at Application Time ===
  vcsAtApplication: {
    score: Number,
    riskBand: String,
    breakdown: mongoose.Schema.Types.Mixed
  },
  
  // === Risk Assessment ===
  riskAssessment: {
    lenderConfidence: Number,
    suggestedAmount: Number,
    suggestedInterest: Number,
    riskFactors: [String],
    mitigatingFactors: [String]
  },
  
  // === Terms ===
  terms: {
    interestRate: Number,
    tenureMonths: Number,
    monthlyPayment: Number,
    totalPayable: Number
  },
  
  // === Status ===
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'disbursed', 'repaying', 'completed', 'defaulted'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  
  // === Repayment Tracking ===
  repaymentHistory: [{
    dueDate: Date,
    paidDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'paid', 'late', 'missed']
    }
  }],
  
  // === Timestamps ===
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  disbursedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Index for efficient queries
LoanApplicationSchema.index({ caregiverId: 1, status: 1 });
LoanApplicationSchema.index({ lenderId: 1, status: 1 });

module.exports = mongoose.model('LoanApplication', LoanApplicationSchema);
