/**
 * Risk Prediction Engine
 * 
 * Combines multiple signals to predict overall risk:
 * - VCS Score trends
 * - Activity consistency
 * - Community validation
 * - Fraud indicators
 * - Economic stability proxies
 * 
 * Provides risk forecasting and early warning signals.
 */

const loanPredictionModel = require('./loanPredictionModel');
const statisticalFraudDetector = require('./statisticalFraudDetector');

class RiskPredictionEngine {
  constructor() {
    // Risk factors and their weights
    this.riskFactors = {
      vcsDecline: 0.25,           // VCS score declining trend
      activityDropoff: 0.20,      // Reduced activity logging
      validationConcerns: 0.15,   // Negative validations
      fraudSignals: 0.30,         // Fraud detection flags
      accountAge: 0.10            // New accounts are riskier
    };

    // Alert thresholds
    this.alertThresholds = {
      vcsDeclineRate: 50,         // Points drop per month
      activityGapDays: 14,        // Days without activity
      minValidationRating: 2.5    // Minimum avg rating
    };

    console.log('✓ Risk Prediction Engine initialized');
  }

  /**
   * Calculate comprehensive risk assessment for a user
   */
  async assessRisk(userData) {
    const assessment = {
      overallRiskScore: 0,
      riskLevel: 'low',
      factors: {},
      alerts: [],
      predictions: {},
      recommendations: [],
      generatedAt: new Date()
    };

    // 1. Calculate VCS Trend Risk
    const vcsTrendRisk = this.analyzeVCSTrend(userData.vcsHistory || []);
    assessment.factors.vcsTrend = vcsTrendRisk;
    assessment.overallRiskScore += vcsTrendRisk.score * this.riskFactors.vcsDecline;

    // 2. Calculate Activity Consistency Risk
    const activityRisk = this.analyzeActivityConsistency(userData.activities || []);
    assessment.factors.activityConsistency = activityRisk;
    assessment.overallRiskScore += activityRisk.score * this.riskFactors.activityDropoff;

    // 3. Analyze Community Validation Concerns
    const validationRisk = this.analyzeValidations(userData.testimonies || []);
    assessment.factors.communityValidation = validationRisk;
    assessment.overallRiskScore += validationRisk.score * this.riskFactors.validationConcerns;

    // 4. Aggregate Fraud Signals
    const fraudRisk = await this.aggregateFraudSignals(userData.activities || []);
    assessment.factors.fraudSignals = fraudRisk;
    assessment.overallRiskScore += fraudRisk.score * this.riskFactors.fraudSignals;

    // 5. Account Age Factor
    const ageRisk = this.calculateAccountAgeRisk(userData.createdAt);
    assessment.factors.accountAge = ageRisk;
    assessment.overallRiskScore += ageRisk.score * this.riskFactors.accountAge;

    // Normalize overall risk score
    assessment.overallRiskScore = Math.min(Math.max(assessment.overallRiskScore, 0), 1);

    // Determine risk level
    assessment.riskLevel = this.categorizeRisk(assessment.overallRiskScore);

    // Generate alerts
    assessment.alerts = this.generateAlerts(assessment.factors);

    // Generate predictions
    assessment.predictions = await this.generatePredictions(userData, assessment);

    // Generate recommendations
    assessment.recommendations = this.generateRecommendations(assessment);

    return assessment;
  }

  /**
   * Analyze VCS score trend
   */
  analyzeVCSTrend(vcsHistory) {
    const result = {
      score: 0,
      trend: 'stable',
      details: {}
    };

    if (vcsHistory.length < 2) {
      return result;
    }

    // Calculate 30-day trend
    const recentHistory = vcsHistory.slice(-30);
    const oldScore = recentHistory[0]?.totalVCS || 0;
    const newScore = recentHistory[recentHistory.length - 1]?.totalVCS || 0;
    const change = newScore - oldScore;

    result.details = {
      currentScore: newScore,
      previousScore: oldScore,
      change,
      changePercent: oldScore > 0 ? Math.round((change / oldScore) * 100) : 0
    };

    if (change < -this.alertThresholds.vcsDeclineRate) {
      result.trend = 'declining';
      result.score = Math.min(Math.abs(change) / 100, 1);
    } else if (change > 50) {
      result.trend = 'improving';
      result.score = 0;
    } else {
      result.trend = 'stable';
      result.score = 0.1;
    }

    return result;
  }

  /**
   * Analyze activity consistency
   */
  analyzeActivityConsistency(activities) {
    const result = {
      score: 0,
      status: 'active',
      details: {}
    };

    if (activities.length === 0) {
      return { score: 0.8, status: 'no_activity', details: { daysSinceLastActivity: null } };
    }

    // Find most recent activity
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(b.activityDate) - new Date(a.activityDate)
    );
    const lastActivity = new Date(sortedActivities[0].activityDate);
    const daysSinceLastActivity = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));

    result.details = {
      daysSinceLastActivity,
      totalActivities: activities.length,
      last30DaysCount: activities.filter(a => 
        (Date.now() - new Date(a.activityDate).getTime()) < 30 * 24 * 60 * 60 * 1000
      ).length
    };

    // Calculate consistency score
    if (daysSinceLastActivity > this.alertThresholds.activityGapDays) {
      result.status = 'inactive';
      result.score = Math.min(daysSinceLastActivity / 30, 1);
    } else if (result.details.last30DaysCount < 5) {
      result.status = 'low_activity';
      result.score = 0.4;
    } else {
      result.status = 'active';
      result.score = 0.1;
    }

    return result;
  }

  /**
   * Analyze community validations
   */
  analyzeValidations(testimonies) {
    const result = {
      score: 0,
      status: 'good',
      details: {}
    };

    if (testimonies.length === 0) {
      return { score: 0.3, status: 'no_validations', details: { count: 0, avgRating: null } };
    }

    // Calculate average rating
    const ratings = testimonies
      .filter(t => t.structuredRating?.reliability)
      .map(t => t.structuredRating.reliability);
    
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 3;

    result.details = {
      count: testimonies.length,
      avgRating: Math.round(avgRating * 10) / 10,
      negativeCount: ratings.filter(r => r <= 2).length
    };

    if (avgRating < this.alertThresholds.minValidationRating) {
      result.status = 'concerning';
      result.score = (this.alertThresholds.minValidationRating - avgRating) / 2.5;
    } else if (result.details.negativeCount > 0) {
      result.status = 'mixed';
      result.score = 0.3;
    } else {
      result.status = 'good';
      result.score = 0.1;
    }

    return result;
  }

  /**
   * Aggregate fraud signals from historical activities
   */
  async aggregateFraudSignals(activities) {
    const result = {
      score: 0,
      status: 'clean',
      details: { flaggedCount: 0, totalAnalyzed: activities.length }
    };

    if (activities.length < 5) {
      return result;
    }

    // Sample and analyze activities (for performance)
    const sampleSize = Math.min(activities.length, 50);
    const sample = activities.slice(-sampleSize);
    
    let flaggedCount = 0;
    let totalFraudScore = 0;

    for (let i = 5; i < sample.length; i++) {
      const historical = sample.slice(0, i);
      const fraudResult = await statisticalFraudDetector.detectFraud(sample[i], historical, {});
      
      if (fraudResult.fraudScore > 0.3) {
        flaggedCount++;
        totalFraudScore += fraudResult.fraudScore;
      }
    }

    const fraudRate = flaggedCount / sampleSize;
    result.details.flaggedCount = flaggedCount;
    result.score = Math.min(fraudRate * 2, 1);
    
    if (fraudRate > 0.2) {
      result.status = 'high_fraud_signals';
    } else if (fraudRate > 0.1) {
      result.status = 'moderate_fraud_signals';
    }

    return result;
  }

  /**
   * Calculate account age risk factor
   */
  calculateAccountAgeRisk(createdAt) {
    const result = {
      score: 0,
      status: 'established',
      details: {}
    };

    if (!createdAt) {
      return { score: 0.5, status: 'unknown', details: { accountAgeDays: null } };
    }

    const accountAgeDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    result.details.accountAgeDays = accountAgeDays;

    if (accountAgeDays < 7) {
      result.status = 'very_new';
      result.score = 0.8;
    } else if (accountAgeDays < 30) {
      result.status = 'new';
      result.score = 0.5;
    } else if (accountAgeDays < 90) {
      result.status = 'developing';
      result.score = 0.2;
    } else {
      result.status = 'established';
      result.score = 0.05;
    }

    return result;
  }

  /**
   * Categorize overall risk level
   */
  categorizeRisk(riskScore) {
    if (riskScore >= 0.7) return 'critical';
    if (riskScore >= 0.5) return 'high';
    if (riskScore >= 0.3) return 'medium';
    if (riskScore >= 0.1) return 'low';
    return 'minimal';
  }

  /**
   * Generate alerts based on risk factors
   */
  generateAlerts(factors) {
    const alerts = [];

    if (factors.vcsTrend?.trend === 'declining') {
      alerts.push({
        type: 'vcs_decline',
        severity: factors.vcsTrend.score > 0.5 ? 'high' : 'medium',
        message: `VCS score has dropped by ${factors.vcsTrend.details.change} points`
      });
    }

    if (factors.activityConsistency?.status === 'inactive') {
      alerts.push({
        type: 'activity_gap',
        severity: 'medium',
        message: `No activity logged for ${factors.activityConsistency.details.daysSinceLastActivity} days`
      });
    }

    if (factors.communityValidation?.status === 'concerning') {
      alerts.push({
        type: 'low_rating',
        severity: 'high',
        message: `Average community rating is ${factors.communityValidation.details.avgRating}/5`
      });
    }

    if (factors.fraudSignals?.status === 'high_fraud_signals') {
      alerts.push({
        type: 'fraud_concern',
        severity: 'critical',
        message: `${factors.fraudSignals.details.flaggedCount} activities flagged for suspicious patterns`
      });
    }

    return alerts;
  }

  /**
   * Generate forward-looking predictions
   */
  async generatePredictions(userData, assessment) {
    const predictions = {
      vcsIn30Days: null,
      loanApprovalLikelihood: null,
      defaultRisk: null
    };

    // Predict VCS in 30 days based on current trend
    const currentVCS = userData.vcsScore || 0;
    const trendFactor = assessment.factors.vcsTrend?.trend === 'declining' ? -0.1 : 
                       assessment.factors.vcsTrend?.trend === 'improving' ? 0.1 : 0;
    predictions.vcsIn30Days = Math.max(0, Math.min(1000, currentVCS + (currentVCS * trendFactor)));

    // Predict loan approval likelihood
    const loanPrediction = await loanPredictionModel.predict({
      vcsScore: currentVCS,
      activities: userData.activities,
      testimonies: userData.testimonies,
      createdAt: userData.createdAt,
      loanHistory: userData.loanHistory || [],
      validationCount: userData.testimonies?.length || 0,
      fraudScore: assessment.factors.fraudSignals?.score || 0
    });
    predictions.loanApprovalLikelihood = loanPrediction.repaymentProbability;
    predictions.predictedMaxLoan = loanPrediction.maxLoanAmount;

    // Predict default risk
    predictions.defaultRisk = Math.max(0, 1 - predictions.loanApprovalLikelihood);

    return predictions;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(assessment) {
    const recommendations = [];

    if (assessment.factors.activityConsistency?.status !== 'active') {
      recommendations.push({
        priority: 'high',
        area: 'activity',
        action: 'Log your caregiving activities more regularly',
        impact: 'Could improve VCS by 50-100 points'
      });
    }

    if (assessment.factors.communityValidation?.details?.count < 3) {
      recommendations.push({
        priority: 'high',
        area: 'validation',
        action: 'Ask community members to verify your caregiving work',
        impact: 'Each validation can add 10-20 points to VCS'
      });
    }

    if (assessment.factors.vcsTrend?.trend === 'declining') {
      recommendations.push({
        priority: 'medium',
        area: 'score',
        action: 'Focus on consistent daily activity logging to reverse declining trend',
        impact: 'Regular logging helps maintain score stability'
      });
    }

    if (assessment.factors.fraudSignals?.score > 0.2) {
      recommendations.push({
        priority: 'high',
        area: 'accuracy',
        action: 'Ensure activity logs are accurate and varied',
        impact: 'Reducing fraud flags can significantly improve loan eligibility'
      });
    }

    return recommendations.slice(0, 3);
  }
}

module.exports = new RiskPredictionEngine();
