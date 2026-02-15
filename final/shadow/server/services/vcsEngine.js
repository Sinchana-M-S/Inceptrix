/**
 * VCS Scoring Engine
 * 
 * The heart of the Shadow-Labor Ledger system.
 * Calculates Validated Contribution Scores using a configurable, explainable formula.
 * 
 * Formula: VCS = (A + B + C + D + E) × 10 - Penalties
 * Where:
 *   A = Identity & Stability Score
 *   B = Behavioral Finance Score
 *   C = Economic Proxies Score
 *   D = Social Trust Score
 *   E = Care/Informal Labor Score
 * 
 * All components are configurable via vcsConfig.js
 */

const VCS_CONFIG = require('../config/vcsConfig');
const { ActivityLog, Testimony, VCSScore } = require('../models');

class VCSEngine {
  constructor(config = VCS_CONFIG) {
    this.config = config;
    this.version = '1.0.0';
  }

  /**
   * Main entry point - Calculate VCS for a caregiver
   * @param {Object} caregiverData - All caregiver data needed for calculation
   * @returns {Object} - Complete VCS result with breakdown and explanation
   */
  async calculateVCS(caregiverData) {
    // Validate input
    if (!caregiverData || !caregiverData._id) {
      throw new Error('Invalid caregiver data');
    }

    // Get activity and testimony data
    const activityData = await this.getActivityData(caregiverData._id);
    const testimonyData = await this.getTestimonyData(caregiverData._id);

    // Calculate all component scores
    const identityScore = this.calculateIdentityStability(caregiverData);
    const behavioralScore = this.calculateBehavioralFinance(caregiverData);
    const economicScore = this.calculateEconomicProxies(caregiverData);
    const socialScore = this.calculateSocialTrust(caregiverData, testimonyData);
    const careScore = this.calculateCareLabor(caregiverData, activityData);

    // Calculate base score (sum of all components)
    const baseScore = (
      identityScore.total +
      behavioralScore.total +
      economicScore.total +
      socialScore.total +
      careScore.total
    );

    // Scale to 0-1000
    let scaledScore = baseScore * 10;

    // Calculate penalties
    const penalties = this.calculatePenalties(caregiverData, activityData, testimonyData);

    // Apply penalties
    const finalScore = Math.max(0, Math.min(1000, Math.round(scaledScore - penalties.total)));

    // Determine risk band
    const riskBand = this.getRiskBand(finalScore);

    // Calculate loan eligibility
    const loanEligibility = this.calculateLoanEligibility(finalScore, riskBand);

    // Generate human explanation
    const humanExplanation = this.generateExplanation(
      finalScore,
      { identityScore, behavioralScore, economicScore, socialScore, careScore },
      penalties,
      activityData
    );

    // Generate improvement tips
    const improvementTips = this.generateImprovementTips(
      { identityScore, behavioralScore, economicScore, socialScore, careScore }
    );

    // Build complete result
    const result = {
      caregiverId: caregiverData._id,
      totalVCS: finalScore,
      breakdown: {
        identityStability: identityScore,
        behavioralFinance: behavioralScore,
        economicProxies: economicScore,
        socialTrust: socialScore,
        careLabor: careScore,
        penalties: penalties
      },
      riskBand: riskBand.key,
      riskBandLabel: riskBand.label,
      riskBandColor: riskBand.color,
      economicValue: activityData.economicValue,
      loanEligibility,
      humanExplanation,
      improvementTips,
      configVersion: this.version,
      inputSnapshot: this.createInputSnapshot(caregiverData, activityData, testimonyData),
      calculatedAt: new Date()
    };

    return result;
  }

  /**
   * Calculate Identity & Stability component (15% of total)
   */
  calculateIdentityStability(data) {
    const weights = this.config.weights;
    const details = {};
    let total = 0;

    // Age Group
    const ageGroupConfig = weights.ageGroup;
    const ageNormalized = ageGroupConfig.values[data.ageGroup] || 60;
    const ageWeighted = ageNormalized * ageGroupConfig.weight;
    details.ageGroup = { raw: data.ageGroup, normalized: ageNormalized, weighted: ageWeighted };
    total += ageWeighted;

    // Region Type
    const regionConfig = weights.regionType;
    const regionNormalized = regionConfig.values[data.regionType] || 60;
    const regionWeighted = regionNormalized * regionConfig.weight;
    details.regionType = { raw: data.regionType, normalized: regionNormalized, weighted: regionWeighted };
    total += regionWeighted;

    // SIM Tenure
    const simConfig = weights.simTenure;
    const simNormalized = Math.min((data.simTenure || 0) / simConfig.maxValue, 1) * 100;
    const simWeighted = simNormalized * simConfig.weight;
    details.simTenure = { raw: data.simTenure, normalized: simNormalized, weighted: simWeighted };
    total += simWeighted;

    // Location Stability
    const locConfig = weights.locationStability;
    const locNormalized = (data.locationStability || 0.5) * 100;
    const locWeighted = locNormalized * locConfig.weight;
    details.locationStability = { raw: data.locationStability, normalized: locNormalized, weighted: locWeighted };
    total += locWeighted;

    // Land Verified
    const landConfig = weights.landVerified;
    const landNormalized = data.landVerified ? landConfig.trueValue : landConfig.falseValue;
    const landWeighted = landNormalized * landConfig.weight;
    details.landVerified = { raw: data.landVerified, normalized: landNormalized, weighted: landWeighted };
    total += landWeighted;

    return { total: Math.round(total * 100) / 100, details, score: total };
  }

  /**
   * Calculate Behavioral Finance component (23% of total)
   */
  calculateBehavioralFinance(data) {
    const weights = this.config.weights;
    const details = {};
    let total = 0;

    // SMS Count
    const smsConfig = weights.smsCount;
    const smsNormalized = Math.min((data.smsCount || 0) / smsConfig.maxValue, 1) * 100;
    const smsWeighted = smsNormalized * smsConfig.weight;
    details.smsCount = { raw: data.smsCount, normalized: smsNormalized, weighted: smsWeighted };
    total += smsWeighted;

    // Recharge Frequency
    const rechargeConfig = weights.rechargeFrequency;
    const rechargeNormalized = Math.min((data.rechargeFrequency || 0) / rechargeConfig.maxValue, 1) * 100;
    const rechargeWeighted = rechargeNormalized * rechargeConfig.weight;
    details.rechargeFrequency = { raw: data.rechargeFrequency, normalized: rechargeNormalized, weighted: rechargeWeighted };
    total += rechargeWeighted;

    // Utility Payment Ratio
    const utilityConfig = weights.utilityPaymentRatio;
    const utilityNormalized = (data.utilityPaymentRatio || 0) * 100;
    const utilityWeighted = utilityNormalized * utilityConfig.weight;
    details.utilityPaymentRatio = { raw: data.utilityPaymentRatio, normalized: utilityNormalized, weighted: utilityWeighted };
    total += utilityWeighted;

    // Payment Streaks
    const streakConfig = weights.paymentStreaks;
    const streakNormalized = Math.min((data.paymentStreaks || 0) / streakConfig.maxValue, 1) * 100;
    const streakWeighted = streakNormalized * streakConfig.weight;
    details.paymentStreaks = { raw: data.paymentStreaks, normalized: streakNormalized, weighted: streakWeighted };
    total += streakWeighted;

    // Behavior Consistency
    const consistencyConfig = weights.behaviorConsistency;
    const consistencyNormalized = (data.behaviorConsistency || 0.5) * 100;
    const consistencyWeighted = consistencyNormalized * consistencyConfig.weight;
    details.behaviorConsistency = { raw: data.behaviorConsistency, normalized: consistencyNormalized, weighted: consistencyWeighted };
    total += consistencyWeighted;

    return { total: Math.round(total * 100) / 100, details, score: total };
  }

  /**
   * Calculate Economic Proxies component (17% of total)
   */
  calculateEconomicProxies(data) {
    const weights = this.config.weights;
    const details = {};
    let total = 0;

    // Income Signal
    const incomeConfig = weights.incomeSignal;
    const incomeNormalized = (data.incomeSignal || 0.3) * 100;
    const incomeWeighted = incomeNormalized * incomeConfig.weight;
    details.incomeSignal = { raw: data.incomeSignal, normalized: incomeNormalized, weighted: incomeWeighted };
    total += incomeWeighted;

    // Coop Score
    const coopConfig = weights.coopScore;
    const coopNormalized = (data.coopScore || 0) * 100;
    const coopWeighted = coopNormalized * coopConfig.weight;
    details.coopScore = { raw: data.coopScore, normalized: coopNormalized, weighted: coopWeighted };
    total += coopWeighted;

    // Expense Shock Recovery
    const shockConfig = weights.expenseShockRecovery;
    const shockNormalized = (data.expenseShockRecovery || 0.5) * 100;
    const shockWeighted = shockNormalized * shockConfig.weight;
    details.expenseShockRecovery = { raw: data.expenseShockRecovery, normalized: shockNormalized, weighted: shockWeighted };
    total += shockWeighted;

    return { total: Math.round(total * 100) / 100, details, score: total };
  }

  /**
   * Calculate Social Trust component (19% of total)
   */
  calculateSocialTrust(data, testimonyData) {
    const weights = this.config.weights;
    const details = {};
    let total = 0;

    // Community Validation Count
    const validationConfig = weights.communityValidationCount;
    const validationCount = testimonyData?.totalTestimonies || 0;
    const validationNormalized = Math.min(validationCount / validationConfig.maxValue, 1) * 100;
    const validationWeighted = validationNormalized * validationConfig.weight;
    details.communityValidationCount = { raw: validationCount, normalized: validationNormalized, weighted: validationWeighted };
    total += validationWeighted;

    // Verifier Trust Score
    const trustConfig = weights.verifierTrustScore;
    const trustScore = testimonyData?.avgWeightedScore || 0;
    const trustNormalized = trustScore * 100;
    const trustWeighted = trustNormalized * trustConfig.weight;
    details.verifierTrustScore = { raw: trustScore, normalized: trustNormalized, weighted: trustWeighted };
    total += trustWeighted;

    // Social Consistency
    const socialConfig = weights.socialConsistency;
    const socialConsistency = testimonyData?.uniqueVerifierCount > 1 ? 
      Math.min(testimonyData.uniqueVerifierCount / 5, 1) : 0.3;
    const socialNormalized = socialConsistency * 100;
    const socialWeighted = socialNormalized * socialConfig.weight;
    details.socialConsistency = { raw: socialConsistency, normalized: socialNormalized, weighted: socialWeighted };
    total += socialWeighted;

    return { total: Math.round(total * 100) / 100, details, score: total };
  }

  /**
   * Calculate Care/Informal Labor component (26% of total)
   * This is the UNIQUE component of our system
   */
  calculateCareLabor(data, activityData) {
    const weights = this.config.weights;
    const details = {};
    let total = 0;

    // Care Hours
    const hoursConfig = weights.careHours;
    const monthlyHours = activityData?.totalHours || 0;
    const hoursNormalized = Math.min(monthlyHours / hoursConfig.maxValue, 1) * 100;
    const hoursWeighted = hoursNormalized * hoursConfig.weight;
    details.careHours = { raw: monthlyHours, normalized: hoursNormalized, weighted: hoursWeighted };
    total += hoursWeighted;

    // Care Type Value (weighted by care multipliers)
    const typeConfig = weights.careTypeValue;
    const careTypeValue = activityData?.avgCareMultiplier || 1.0;
    const typeNormalized = ((careTypeValue - 1) / 0.5 + 0.5) * 100; // Normalize 1.0-1.5 to 50-100
    const typeWeighted = typeNormalized * typeConfig.weight;
    details.careTypeValue = { raw: careTypeValue, normalized: typeNormalized, weighted: typeWeighted };
    total += typeWeighted;

    // Validation Confidence
    const confConfig = weights.validationConfidence;
    const validationConf = activityData?.avgValidationConfidence || 0.5;
    const confNormalized = validationConf * 100;
    const confWeighted = confNormalized * confConfig.weight;
    details.validationConfidence = { raw: validationConf, normalized: confNormalized, weighted: confWeighted };
    total += confWeighted;

    // Care Continuity
    const contConfig = weights.careContinuity;
    const continuity = activityData?.continuityScore || 0.5;
    const contNormalized = continuity * 100;
    const contWeighted = contNormalized * contConfig.weight;
    details.careContinuity = { raw: continuity, normalized: contNormalized, weighted: contWeighted };
    total += contWeighted;

    return { total: Math.round(total * 100) / 100, details, score: total };
  }

  /**
   * Calculate penalties for fraud/anomalies
   */
  calculatePenalties(data, activityData, testimonyData) {
    const penaltyConfig = this.config.penalties;
    const details = {};
    let total = 0;

    // Behavior Entropy
    const entropyValue = data.behaviorEntropy || 0;
    if (entropyValue > penaltyConfig.behaviorEntropy.threshold) {
      const penalty = (entropyValue - penaltyConfig.behaviorEntropy.threshold) * 
                      penaltyConfig.behaviorEntropy.weight * penaltyConfig.behaviorEntropy.maxPenalty;
      details.behaviorEntropy = { value: entropyValue, penalty };
      total += penalty;
    } else {
      details.behaviorEntropy = { value: entropyValue, penalty: 0 };
    }

    // Anomaly Score (from activity data)
    const anomalyValue = activityData?.avgAnomalyScore || 0;
    if (anomalyValue > penaltyConfig.anomalyScore.threshold) {
      const penalty = (anomalyValue - penaltyConfig.anomalyScore.threshold) * 
                      penaltyConfig.anomalyScore.weight * penaltyConfig.anomalyScore.maxPenalty;
      details.anomalyScore = { value: anomalyValue, penalty };
      total += penalty;
    } else {
      details.anomalyScore = { value: anomalyValue, penalty: 0 };
    }

    // Fraud Probability
    const fraudValue = data.fraudProbability || 0;
    if (fraudValue > penaltyConfig.fraudProbability.threshold) {
      const penalty = (fraudValue - penaltyConfig.fraudProbability.threshold) * 
                      penaltyConfig.fraudProbability.weight * penaltyConfig.fraudProbability.maxPenalty;
      details.fraudProbability = { value: fraudValue, penalty };
      total += penalty;
    } else {
      details.fraudProbability = { value: fraudValue, penalty: 0 };
    }

    // Collusion Risk (from testimony data)
    const collusionValue = testimonyData?.avgCollusionRisk || 0;
    if (collusionValue > penaltyConfig.collusionRisk.threshold) {
      const penalty = (collusionValue - penaltyConfig.collusionRisk.threshold) * 
                      penaltyConfig.collusionRisk.weight * penaltyConfig.collusionRisk.maxPenalty;
      details.collusionRisk = { value: collusionValue, penalty };
      total += penalty;
    } else {
      details.collusionRisk = { value: collusionValue, penalty: 0 };
    }

    // Inconsistency Penalty
    const inconsistencyValue = data.inconsistencyScore || 0;
    if (inconsistencyValue > penaltyConfig.inconsistencyPenalty.threshold) {
      const penalty = (inconsistencyValue - penaltyConfig.inconsistencyPenalty.threshold) * 
                      penaltyConfig.inconsistencyPenalty.weight * penaltyConfig.inconsistencyPenalty.maxPenalty;
      details.inconsistencyPenalty = { value: inconsistencyValue, penalty };
      total += penalty;
    } else {
      details.inconsistencyPenalty = { value: inconsistencyValue, penalty: 0 };
    }

    return { total: Math.round(total), totalPenalty: Math.round(total), details };
  }

  /**
   * Get risk band based on score
   */
  getRiskBand(score) {
    const bands = this.config.bands;
    for (const [key, band] of Object.entries(bands)) {
      if (score >= band.min && score <= band.max) {
        return { key, ...band };
      }
    }
    return { key: 'noIdentity', ...bands.noIdentity };
  }

  /**
   * Calculate loan eligibility
   */
  calculateLoanEligibility(score, riskBand) {
    const loanParams = this.config.loanParams;
    
    if (!riskBand.loanEligibility) {
      return {
        eligible: false,
        maxLoanAmount: 0,
        suggestedInterestBand: null,
        confidenceInterval: { lower: 0, upper: 0 }
      };
    }

    const maxLoan = Math.min(
      loanParams.baseLoanAmount * riskBand.maxLoanMultiplier * (score / 500),
      loanParams.maxLoanCap
    );

    const interestBand = loanParams.interestBands[riskBand.suggestedInterestBand];

    return {
      eligible: true,
      maxLoanAmount: Math.round(maxLoan / 1000) * 1000, // Round to nearest 1000
      suggestedInterestBand: riskBand.suggestedInterestBand,
      interestRange: interestBand,
      confidenceInterval: {
        lower: Math.round(maxLoan * 0.8 / 1000) * 1000,
        upper: Math.round(maxLoan * 1.2 / 1000) * 1000
      }
    };
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(score, components, penalties, activityData) {
    const hours = activityData?.totalHours || 0;
    const value = activityData?.economicValue?.totalValue || 0;
    const careType = activityData?.primaryCareType || 'caregiving';
    
    let explanation = '';
    
    if (score >= 700) {
      explanation = `This score reflects ~${Math.round(hours)} hrs/month of verified ${careType} ` +
                   `equivalent to ₹${value.toLocaleString()} in local market value. ` +
                   `Strong community validation supports this profile.`;
    } else if (score >= 500) {
      explanation = `This score reflects ~${Math.round(hours)} hrs/month of ${careType} activities ` +
                   `with moderate verification. Continued consistent logging will improve your score.`;
    } else if (score >= 300) {
      explanation = `Emerging credit profile with ${Math.round(hours)} hrs/month of logged activities. ` +
                   `Build your profile through regular activity logging and community validations.`;
    } else {
      explanation = `Limited activity data available. Start logging your daily caregiving activities ` +
                   `and request community members to validate your work.`;
    }

    // Add penalty note if applicable
    if (penalties.total > 20) {
      explanation += ` Note: Score reduced by ${Math.round(penalties.total)} points due to detected inconsistencies.`;
    }

    return explanation;
  }

  /**
   * Generate improvement tips
   */
  generateImprovementTips(components) {
    const tips = [];
    
    // Check each component for improvement opportunities
    if (components.careScore.total < 15) {
      tips.push({
        category: 'Care Activities',
        tip: 'Log your daily caregiving activities consistently to build your care hours profile.',
        potentialGain: 50
      });
    }

    if (components.socialScore.total < 10) {
      tips.push({
        category: 'Community Validation',
        tip: 'Request community members like neighbors, teachers, or NGO workers to validate your work.',
        potentialGain: 40
      });
    }

    if (components.behavioralScore.total < 10) {
      tips.push({
        category: 'Financial Behavior',
        tip: 'Maintain regular mobile recharges and utility bill payments to improve your financial profile.',
        potentialGain: 30
      });
    }

    if (components.identityScore.total < 8) {
      tips.push({
        category: 'Identity Verification',
        tip: 'Verify your land ownership and maintain location stability to improve your identity score.',
        potentialGain: 20
      });
    }

    return tips;
  }

  /**
   * Get activity data for a caregiver
   */
  async getActivityData(caregiverId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await ActivityLog.find({
      caregiverId,
      activityDate: { $gte: thirtyDaysAgo }
    });

    if (activities.length === 0) {
      return {
        totalHours: 0,
        economicValue: { totalValue: 0 },
        avgCareMultiplier: 1.0,
        avgValidationConfidence: 0.5,
        continuityScore: 0,
        avgAnomalyScore: 0,
        primaryCareType: 'caregiving',
        activeDays: 0
      };
    }

    const totalHours = activities.reduce((sum, a) => sum + a.estimatedHours, 0);
    const totalValue = activities.reduce((sum, a) => sum + (a.economicValue?.totalValue || 0), 0);
    const avgCareMultiplier = activities.reduce((sum, a) => sum + a.careMultiplier, 0) / activities.length;
    const avgValidationConfidence = activities.reduce((sum, a) => sum + (a.parsedActivity?.processingConfidence || 0.5), 0) / activities.length;
    const avgAnomalyScore = activities.reduce((sum, a) => sum + (a.anomalyScore || 0), 0) / activities.length;

    // Calculate continuity (days with activity / 30)
    const uniqueDays = new Set(activities.map(a => a.activityDate.toDateString())).size;
    const continuityScore = Math.min(uniqueDays / 20, 1); // 20 days = full continuity

    // Get primary care type
    const careTypeCounts = {};
    activities.forEach(a => {
      careTypeCounts[a.activityType] = (careTypeCounts[a.activityType] || 0) + 1;
    });
    const primaryCareType = Object.entries(careTypeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'caregiving';

    return {
      totalHours,
      economicValue: { totalValue, currency: 'INR' },
      avgCareMultiplier,
      avgValidationConfidence,
      continuityScore,
      avgAnomalyScore,
      primaryCareType,
      activeDays: uniqueDays
    };
  }

  /**
   * Get testimony data for a caregiver
   */
  async getTestimonyData(caregiverId) {
    return await Testimony.getValidationSummary(caregiverId);
  }

  /**
   * Create input snapshot for audit trail
   */
  createInputSnapshot(caregiver, activity, testimony) {
    return {
      caregiver: {
        ageGroup: caregiver.ageGroup,
        regionType: caregiver.regionType,
        simTenure: caregiver.simTenure,
        locationStability: caregiver.locationStability,
        landVerified: caregiver.landVerified
      },
      activity: {
        totalHours: activity?.totalHours,
        activeDays: activity?.activeDays,
        primaryCareType: activity?.primaryCareType
      },
      testimony: {
        totalTestimonies: testimony?.totalTestimonies,
        uniqueVerifiers: testimony?.uniqueVerifierCount
      },
      snapshotAt: new Date()
    };
  }

  /**
   * Save VCS score to database
   */
  async saveScore(vcsResult) {
    // Get existing score history
    const existingScore = await VCSScore.findOne({ caregiverId: vcsResult.caregiverId })
      .sort({ calculatedAt: -1 });

    const scoreHistory = existingScore?.scoreHistory || [];
    
    // Add current score to history (keep last 30)
    if (scoreHistory.length >= 30) {
      scoreHistory.shift();
    }
    scoreHistory.push({
      date: new Date(),
      score: vcsResult.totalVCS,
      riskBand: vcsResult.riskBand
    });

    // Create or update score
    const vcsScore = new VCSScore({
      ...vcsResult,
      scoreHistory,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await vcsScore.save();
    return vcsScore;
  }
}

module.exports = new VCSEngine();
