const mongoose = require('mongoose');

/**
 * Regional Benchmark Schema
 * Stores local wage benchmarks for economic value calculation
 */
const RegionalBenchmarkSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
    unique: true
  },
  state: {
    type: String,
    required: true
  },
  regionType: {
    type: String,
    enum: ['urban', 'semiUrban', 'rural'],
    required: true
  },
  
  // Wage benchmarks (INR per hour)
  wageBenchmarks: {
    minWage: {
      type: Number,
      required: true
    },
    avgWage: {
      type: Number,
      required: true
    },
    careWage: {
      type: Number,
      required: true
    }
  },
  
  // Care-specific rates
  careRates: {
    eldercare: Number,
    childcare: Number,
    specialNeeds: Number,
    housework: Number,
    community: Number,
    healthcare: Number
  },
  
  // Cost of living multiplier
  colMultiplier: {
    type: Number,
    default: 1.0
  },
  
  // Effective date
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: Date,
  
  // Source
  source: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RegionalBenchmark', RegionalBenchmarkSchema);
