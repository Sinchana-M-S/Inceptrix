const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User Schema
 * Supports multiple roles: caregiver, verifier, lender, admin
 * Contains identity, stability, and behavioral finance fields
 */
const UserSchema = new mongoose.Schema({
  // === Basic Identity ===
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['caregiver', 'verifier', 'lender', 'admin'],
    default: 'caregiver'
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // === Identity & Stability Features ===
  ageGroup: {
    type: String,
    enum: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
    default: '26-35'
  },
  region: {
    type: String,
    required: true,
    trim: true
  },
  regionType: {
    type: String,
    enum: ['urban', 'semiUrban', 'rural'],
    default: 'rural'
  },
  simTenure: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Months with same SIM card'
  },
  locationStability: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    description: 'Location consistency score'
  },
  landVerified: {
    type: Boolean,
    default: false
  },

  // === Behavioral Finance Features ===
  smsCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Monthly SMS activity count'
  },
  rechargeFrequency: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Monthly recharge frequency'
  },
  utilityPaymentRatio: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
    description: 'Utility payment success rate'
  },
  paymentStreaks: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Consecutive on-time payment months'
  },
  behaviorConsistency: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    description: 'Overall behavioral consistency'
  },

  // === Economic Proxy Features ===
  incomeSignal: {
    type: Number,
    default: 0.3,
    min: 0,
    max: 1,
    description: 'Estimated income stability indicator'
  },
  coopScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
    description: 'Cooperative/SHG participation score'
  },
  expenseShockRecovery: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    description: 'Recovery rate from expense shocks'
  },

  // === Verifier-specific fields ===
  verifierMetadata: {
    organization: String,
    verifierType: {
      type: String,
      enum: ['ngo', 'government', 'teacher', 'healthworker', 'communityLeader', 'shgMember', 'neighbor', 'peer']
    },
    trustLevel: {
      type: Number,
      min: 0,
      max: 1
    },
    totalVerifications: {
      type: Number,
      default: 0
    },
    verificationAccuracy: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    }
  },

  // === Lender-specific fields ===
  lenderMetadata: {
    institution: String,
    licenseNumber: String,
    maxLoanCapacity: Number,
    activeLoanCount: {
      type: Number,
      default: 0
    }
  },

  // === Privacy & Consent ===
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentDate: Date,
  dataRetentionOptOut: {
    type: Boolean,
    default: false
  },

  // === Timestamps ===
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match entered password to hashed password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get verifier trust level based on type
UserSchema.methods.getVerifierTrust = function() {
  if (this.role !== 'verifier') return 0;
  
  const trustLevels = {
    ngo: 1.0,
    government: 0.95,
    teacher: 0.9,
    healthworker: 0.9,
    communityLeader: 0.8,
    shgMember: 0.75,
    neighbor: 0.7,
    peer: 0.6
  };
  
  return trustLevels[this.verifierMetadata?.verifierType] || 0.6;
};

module.exports = mongoose.model('User', UserSchema);
