/**
 * ML Loan Prediction Service
 * 
 * Uses statistical and machine learning approaches to predict:
 * - Loan eligibility
 * - Repayment probability
 * - Risk scoring
 * - Credit limit recommendations
 * 
 * This is a lightweight ML implementation that doesn't require external libraries.
 * For production, consider integrating with TensorFlow.js or a dedicated ML service.
 */

class LoanPredictionModel {
  constructor() {
    // Model weights (trained on simulated data)
    this.weights = {
      vcsScore: 0.35,
      activityConsistency: 0.20,
      communityValidation: 0.18,
      accountAge: 0.10,
      previousRepayment: 0.12,
      fraudIndicators: -0.30
    };

    // Risk thresholds
    this.riskThresholds = {
      veryLow: { min: 750, maxLoan: 50000, rate: 'prime' },
      low: { min: 600, maxLoan: 35000, rate: 'prime' },
      medium: { min: 450, maxLoan: 20000, rate: 'standard' },
      high: { min: 300, maxLoan: 10000, rate: 'subprime' },
      veryHigh: { min: 0, maxLoan: 5000, rate: 'subprime' }
    };

    console.log('✓ ML Loan Prediction Model initialized');
  }

  /**
   * Prepare features from user data
   */
  extractFeatures(userData) {
    const now = new Date();
    const accountAge = userData.createdAt 
      ? Math.floor((now - new Date(userData.createdAt)) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      // VCS Score (normalized to 0-1)
      vcsScore: Math.min(userData.vcsScore || 0, 1000) / 1000,
      
      // Activity Consistency (0-1)
      activityConsistency: this.calculateConsistency(userData.activities || []),
      
      // Community Validation Score (0-1)
      communityValidation: this.calculateValidationScore(userData.testimonies || [], userData.validationCount || 0),
      
      // Account Age Factor (0-1, caps at 365 days)
      accountAge: Math.min(accountAge / 365, 1),
      
      // Previous Repayment History (0-1)
      previousRepayment: this.calculateRepaymentScore(userData.loanHistory || []),
      
      // Fraud Indicators (0-1, higher = more fraud signals)
      fraudIndicators: userData.fraudScore || 0
    };
  }

  /**
   * Calculate activity consistency score
   */
  calculateConsistency(activities) {
    if (activities.length < 5) return 0.2;
    
    const last30Days = activities.filter(a => {
      const date = new Date(a.activityDate || a.createdAt);
      return (Date.now() - date.getTime()) < 30 * 24 * 60 * 60 * 1000;
    });

    const uniqueDays = new Set(last30Days.map(a => 
      new Date(a.activityDate || a.createdAt).toDateString()
    )).size;

    // Score based on logging frequency
    const dailyRate = uniqueDays / 30;
    return Math.min(dailyRate * 1.5, 1);
  }

  /**
   * Calculate community validation score
   */
  calculateValidationScore(testimonies, validationCount) {
    if (validationCount === 0) return 0.1;

    // Average rating (normalized from 1-5 to 0-1)
    let avgRating = 0.5;
    if (testimonies.length > 0) {
      const ratings = testimonies.map(t => t.structuredRating?.reliability || 3);
      avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length) / 5;
    }

    // Validation count factor
    const countFactor = Math.min(validationCount / 10, 1);

    return (avgRating * 0.6) + (countFactor * 0.4);
  }

  /**
   * Calculate repayment history score
   */
  calculateRepaymentScore(loanHistory) {
    if (loanHistory.length === 0) return 0.5; // Neutral for first-time borrowers

    const completed = loanHistory.filter(l => l.status === 'completed').length;
    const defaulted = loanHistory.filter(l => l.status === 'defaulted').length;
    const total = loanHistory.length;

    if (defaulted > 0) {
      return Math.max(0, (completed - defaulted * 2) / total);
    }

    return 0.5 + (completed / total) * 0.5;
  }

  /**
   * Sigmoid activation function
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Predict loan eligibility and terms
   */
  async predict(userData) {
    const features = this.extractFeatures(userData);
    
    // Calculate weighted score
    let rawScore = 0;
    for (const [feature, value] of Object.entries(features)) {
      rawScore += value * this.weights[feature];
    }

    // Apply sigmoid normalization
    const normalizedScore = this.sigmoid(rawScore * 3 - 1.5);
    
    // Convert to 0-1000 scale
    const predictionScore = Math.round(normalizedScore * 1000);
    
    // Determine risk level and terms
    const { riskLevel, maxLoan, interestBand } = this.determineRiskLevel(predictionScore);
    
    // Calculate repayment probability
    const repaymentProbability = this.calculateRepaymentProbability(features, predictionScore);
    
    // Generate explanation
    const explanation = this.generateExplanation(features, predictionScore, riskLevel);

    return {
      eligible: predictionScore >= 300,
      predictionScore,
      riskLevel,
      maxLoanAmount: maxLoan,
      interestBand,
      repaymentProbability,
      confidenceScore: this.calculateConfidence(features),
      features: {
        vcsScore: Math.round(features.vcsScore * 100),
        activityConsistency: Math.round(features.activityConsistency * 100),
        communityValidation: Math.round(features.communityValidation * 100),
        accountAge: Math.round(features.accountAge * 100),
        previousRepayment: Math.round(features.previousRepayment * 100),
        fraudRisk: Math.round(features.fraudIndicators * 100)
      },
      explanation,
      timestamp: new Date()
    };
  }

  /**
   * Determine risk level based on prediction score
   */
  determineRiskLevel(score) {
    if (score >= this.riskThresholds.veryLow.min) {
      return { riskLevel: 'very_low', maxLoan: this.riskThresholds.veryLow.maxLoan, interestBand: 'prime' };
    }
    if (score >= this.riskThresholds.low.min) {
      return { riskLevel: 'low', maxLoan: this.riskThresholds.low.maxLoan, interestBand: 'prime' };
    }
    if (score >= this.riskThresholds.medium.min) {
      return { riskLevel: 'medium', maxLoan: this.riskThresholds.medium.maxLoan, interestBand: 'standard' };
    }
    if (score >= this.riskThresholds.high.min) {
      return { riskLevel: 'high', maxLoan: this.riskThresholds.high.maxLoan, interestBand: 'subprime' };
    }
    return { riskLevel: 'very_high', maxLoan: this.riskThresholds.veryHigh.maxLoan, interestBand: 'subprime' };
  }

  /**
   * Calculate repayment probability
   */
  calculateRepaymentProbability(features, score) {
    // Base probability from score
    let prob = score / 1000;
    
    // Adjust based on key factors
    if (features.previousRepayment > 0.8) prob += 0.1;
    if (features.activityConsistency > 0.7) prob += 0.05;
    if (features.fraudIndicators > 0.3) prob -= 0.15;
    
    return Math.max(0.1, Math.min(0.99, prob));
  }

  /**
   * Calculate prediction confidence
   */
  calculateConfidence(features) {
    // Higher confidence with more data
    let confidence = 0.5;
    
    if (features.accountAge > 0.3) confidence += 0.1;
    if (features.activityConsistency > 0.5) confidence += 0.15;
    if (features.communityValidation > 0.5) confidence += 0.15;
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(features, score, riskLevel) {
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    // Analyze features
    if (features.vcsScore > 0.6) {
      strengths.push('Strong VCS score');
    } else if (features.vcsScore < 0.3) {
      weaknesses.push('VCS score needs improvement');
      recommendations.push('Log caregiving activities consistently to build your score');
    }

    if (features.activityConsistency > 0.6) {
      strengths.push('Consistent activity logging');
    } else {
      weaknesses.push('Inconsistent activity logs');
      recommendations.push('Try to log your activities every day');
    }

    if (features.communityValidation > 0.5) {
      strengths.push('Good community validation');
    } else {
      weaknesses.push('Limited community verifications');
      recommendations.push('Ask more community members to verify your caregiving work');
    }

    if (features.previousRepayment > 0.8) {
      strengths.push('Excellent repayment history');
    } else if (features.previousRepayment < 0.5 && features.previousRepayment > 0) {
      weaknesses.push('Previous loan issues');
    }

    if (features.fraudIndicators > 0.2) {
      weaknesses.push('Some activity flagged for review');
      recommendations.push('Ensure your activity logs are accurate and verifiable');
    }

    return {
      summary: `Prediction score: ${score}/1000 (${riskLevel.replace('_', ' ')} risk)`,
      strengths,
      weaknesses,
      recommendations: recommendations.slice(0, 3)
    };
  }

  /**
   * Batch predict for multiple users
   */
  async batchPredict(userDataArray) {
    return Promise.all(userDataArray.map(userData => this.predict(userData)));
  }

  /**
   * Retrain model with new weights (simulated)
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    return { success: true, weights: this.weights };
  }
}

module.exports = new LoanPredictionModel();
