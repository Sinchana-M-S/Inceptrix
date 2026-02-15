/**
 * VCS Configuration - Fully Configurable Scoring System
 * 
 * This configuration defines all weights, thresholds, and parameters
 * for the Validated Contribution Score calculation.
 * 
 * DESIGN PRINCIPLE: No hardcoded values in the scoring engine.
 * All parameters are adjustable per deployment/region.
 */

const VCS_CONFIG = {
  // ============================================
  // FEATURE WEIGHTS (All features normalized to 0-100, then weighted)
  // Total weights should sum to approximately 1.0
  // ============================================
  weights: {
    // --- Identity & Stability (15% total) ---
    ageGroup: {
      weight: 0.03,
      type: 'categorical',
      values: {
        '18-25': 60,
        '26-35': 80,
        '36-45': 90,
        '46-55': 85,
        '56-65': 75,
        '65+': 70
      },
      description: 'Age-based stability indicator'
    },
    regionType: {
      weight: 0.03,
      type: 'categorical',
      values: {
        urban: 80,
        semiUrban: 70,
        rural: 60
      },
      description: 'Geographic region type'
    },
    simTenure: {
      weight: 0.04,
      type: 'continuous',
      normalize: 'months',
      maxValue: 60,
      description: 'Months with same SIM card'
    },
    locationStability: {
      weight: 0.03,
      type: 'percentage',
      description: 'Location consistency score (0-1)'
    },
    landVerified: {
      weight: 0.02,
      type: 'boolean',
      trueValue: 100,
      falseValue: 40,
      description: 'Land/property ownership verified'
    },

    // --- Behavioral Finance (23% total) ---
    smsCount: {
      weight: 0.03,
      type: 'continuous',
      normalize: 'count',
      maxValue: 500,
      description: 'Monthly SMS activity'
    },
    rechargeFrequency: {
      weight: 0.04,
      type: 'continuous',
      normalize: 'frequency',
      maxValue: 8,
      description: 'Monthly recharge frequency'
    },
    utilityPaymentRatio: {
      weight: 0.05,
      type: 'percentage',
      description: 'Utility payment success rate (0-1)'
    },
    paymentStreaks: {
      weight: 0.05,
      type: 'continuous',
      normalize: 'count',
      maxValue: 12,
      description: 'Consecutive on-time payment months'
    },
    behaviorConsistency: {
      weight: 0.06,
      type: 'percentage',
      description: 'Overall behavioral consistency score (0-1)'
    },

    // --- Economic Proxies (17% total) ---
    incomeSignal: {
      weight: 0.07,
      type: 'percentage',
      description: 'Estimated income stability indicator (0-1)'
    },
    coopScore: {
      weight: 0.05,
      type: 'percentage',
      description: 'Cooperative/SHG participation score (0-1)'
    },
    expenseShockRecovery: {
      weight: 0.05,
      type: 'percentage',
      description: 'Recovery rate from expense shocks (0-1)'
    },

    // --- Social Trust (19% total) ---
    communityValidationCount: {
      weight: 0.06,
      type: 'continuous',
      normalize: 'count',
      maxValue: 15,
      description: 'Number of community validations received'
    },
    verifierTrustScore: {
      weight: 0.08,
      type: 'percentage',
      description: 'Weighted trust score from verifiers (0-1)'
    },
    socialConsistency: {
      weight: 0.05,
      type: 'percentage',
      description: 'Consistency in social network patterns (0-1)'
    },

    // --- Care / Informal Labor (26% total) - UNIQUE TO THIS SYSTEM ---
    careHours: {
      weight: 0.10,
      type: 'continuous',
      normalize: 'hours',
      maxValue: 250,
      description: 'Monthly verified care hours'
    },
    careTypeValue: {
      weight: 0.06,
      type: 'calculated',
      description: 'Weighted average of care type multipliers'
    },
    validationConfidence: {
      weight: 0.05,
      type: 'percentage',
      description: 'AI confidence in activity validation (0-1)'
    },
    careContinuity: {
      weight: 0.05,
      type: 'percentage',
      description: 'Consistency of care activities over time (0-1)'
    }
  },

  // ============================================
  // PENALTY FACTORS (Deductions from base score)
  // Only applied when threshold is exceeded
  // ============================================
  penalties: {
    behaviorEntropy: {
      weight: 0.15,
      threshold: 0.7,
      maxPenalty: 100,
      description: 'High randomness in behavioral patterns'
    },
    anomalyScore: {
      weight: 0.20,
      threshold: 0.5,
      maxPenalty: 150,
      description: 'Detected anomalies in activity logs'
    },
    fraudProbability: {
      weight: 0.25,
      threshold: 0.3,
      maxPenalty: 200,
      description: 'Probability of fraudulent activity'
    },
    collusionRisk: {
      weight: 0.15,
      threshold: 0.4,
      maxPenalty: 120,
      description: 'Risk of collusion with verifiers'
    },
    inconsistencyPenalty: {
      weight: 0.10,
      threshold: 0.6,
      maxPenalty: 80,
      description: 'Inconsistencies between logs and testimonies'
    }
  },

  // ============================================
  // SCORE BANDS - Credit eligibility tiers
  // ============================================
  bands: {
    noIdentity: {
      min: 0,
      max: 299,
      label: 'No usable credit identity',
      color: '#ef4444',
      loanEligibility: false,
      maxLoanMultiplier: 0
    },
    emerging: {
      min: 300,
      max: 499,
      label: 'Emerging contributor',
      color: '#f97316',
      loanEligibility: true,
      maxLoanMultiplier: 0.5,
      suggestedInterestBand: 'high'
    },
    eligible: {
      min: 500,
      max: 699,
      label: 'Credit-eligible',
      color: '#eab308',
      loanEligibility: true,
      maxLoanMultiplier: 1.0,
      suggestedInterestBand: 'medium'
    },
    lowRisk: {
      min: 700,
      max: 849,
      label: 'Low-risk',
      color: '#22c55e',
      loanEligibility: true,
      maxLoanMultiplier: 1.5,
      suggestedInterestBand: 'low'
    },
    prime: {
      min: 850,
      max: 1000,
      label: 'Prime alternative borrower',
      color: '#10b981',
      loanEligibility: true,
      maxLoanMultiplier: 2.0,
      suggestedInterestBand: 'preferred'
    }
  },

  // ============================================
  // CARE ACTIVITY MULTIPLIERS
  // Reflects economic value and effort intensity
  // ============================================
  careMultipliers: {
    eldercare: {
      multiplier: 1.3,
      description: 'Full-time elder care',
      avgHourlyValue: 80 // INR
    },
    childcare: {
      multiplier: 1.2,
      description: 'Childcare activities',
      avgHourlyValue: 70
    },
    specialNeeds: {
      multiplier: 1.5,
      description: 'Special needs care',
      avgHourlyValue: 100
    },
    housework: {
      multiplier: 1.0,
      description: 'Domestic housework',
      avgHourlyValue: 50
    },
    community: {
      multiplier: 1.1,
      description: 'Community support work',
      avgHourlyValue: 60
    },
    healthcare: {
      multiplier: 1.25,
      description: 'Basic healthcare assistance',
      avgHourlyValue: 75
    }
  },

  // ============================================
  // VERIFIER TRUST LEVELS
  // Weight applied to community validations
  // ============================================
  verifierTrust: {
    ngo: {
      trust: 1.0,
      label: 'NGO Worker',
      description: 'Verified NGO staff member'
    },
    government: {
      trust: 0.95,
      label: 'Government Official',
      description: 'Local government representative'
    },
    teacher: {
      trust: 0.9,
      label: 'Teacher',
      description: 'School or college teacher'
    },
    healthworker: {
      trust: 0.9,
      label: 'Health Worker',
      description: 'ASHA/ANM or health professional'
    },
    communityLeader: {
      trust: 0.8,
      label: 'Community Leader',
      description: 'Recognized community leader'
    },
    shgMember: {
      trust: 0.75,
      label: 'SHG Member',
      description: 'Self-help group member'
    },
    neighbor: {
      trust: 0.7,
      label: 'Neighbor',
      description: 'Verified neighbor'
    },
    peer: {
      trust: 0.6,
      label: 'Peer Caregiver',
      description: 'Fellow caregiver'
    }
  },

  // ============================================
  // REGIONAL WAGE BENCHMARKS (INR per hour)
  // Used for economic value calculation
  // ============================================
  regionalBenchmarks: {
    urban: {
      minWage: 60,
      avgWage: 80,
      careWage: 100
    },
    semiUrban: {
      minWage: 45,
      avgWage: 60,
      careWage: 75
    },
    rural: {
      minWage: 35,
      avgWage: 45,
      careWage: 55
    }
  },

  // ============================================
  // LOAN CALCULATION PARAMETERS
  // ============================================
  loanParams: {
    baseLoanAmount: 10000, // INR
    interestBands: {
      preferred: { min: 8, max: 12 },
      low: { min: 12, max: 16 },
      medium: { min: 16, max: 20 },
      high: { min: 20, max: 24 }
    },
    maxLoanCap: 100000 // INR
  },

  // ============================================
  // ANTI-FRAUD THRESHOLDS
  // ============================================
  fraudDetection: {
    duplicateLogThreshold: 0.85, // Similarity threshold for duplicate detection
    impossibleHoursPerDay: 18,
    minDaysBetweenVerifications: 3,
    maxVerificationsPerVerifier: 10, // Per month
    collusionNetworkSize: 3 // Minimum size to flag
  },

  // ============================================
  // EXPLAINABILITY TEMPLATES
  // ============================================
  explanationTemplates: {
    high: 'This score reflects ~{hours} hrs/month of verified {careType} equivalent to ₹{value} in local market value. Strong community validation from {verifierCount} verifiers.',
    medium: 'This score reflects ~{hours} hrs/month of {careType} with moderate verification. {improvementTip}',
    low: 'Limited activity data available. {improvementTip}',
    penalty: 'Score reduced by {penalty} points due to {reason}.'
  }
};

module.exports = VCS_CONFIG;
