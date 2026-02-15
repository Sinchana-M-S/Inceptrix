/**
 * Explainability Service
 * 
 * Generates human-readable explanations for VCS scores
 * Ensures transparency and compliance with "no black-box" requirement
 */

const VCS_CONFIG = require('../config/vcsConfig');

class ExplainabilityService {
  /**
   * Generate comprehensive explanation for a VCS score
   */
  generateFullExplanation(vcsResult) {
    return {
      summary: this.generateSummary(vcsResult),
      componentBreakdown: this.explainComponents(vcsResult.breakdown),
      factorsHelping: this.identifyPositiveFactors(vcsResult),
      factorsHurting: this.identifyNegativeFactors(vcsResult),
      improvement: this.generateImprovementPlan(vcsResult),
      comparison: this.generateComparison(vcsResult),
      confidence: this.explainConfidence(vcsResult)
    };
  }

  /**
   * Generate summary explanation
   */
  generateSummary(vcsResult) {
    const { totalVCS, riskBandLabel, economicValue, breakdown } = vcsResult;
    
    let summary = `Your Validated Contribution Score is ${totalVCS} out of 1000, `;
    summary += `placing you in the "${riskBandLabel}" category. `;
    
    if (economicValue?.totalValue > 0) {
      summary += `Your caregiving activities are valued at approximately ₹${economicValue.totalValue.toLocaleString()} per month. `;
    }
    
    if (breakdown.penalties.totalPenalty > 0) {
      summary += `Your score was reduced by ${breakdown.penalties.totalPenalty} points due to detected inconsistencies.`;
    }
    
    return summary;
  }

  /**
   * Explain each component
   */
  explainComponents(breakdown) {
    const explanations = [];
    
    // Identity & Stability
    const identity = breakdown.identityStability;
    explanations.push({
      category: 'Identity & Stability',
      score: identity.total,
      maxScore: 15,
      percentage: Math.round((identity.total / 15) * 100),
      explanation: this.explainIdentity(identity.details)
    });
    
    // Behavioral Finance
    const behavioral = breakdown.behavioralFinance;
    explanations.push({
      category: 'Financial Behavior',
      score: behavioral.total,
      maxScore: 23,
      percentage: Math.round((behavioral.total / 23) * 100),
      explanation: this.explainBehavioral(behavioral.details)
    });
    
    // Economic Proxies
    const economic = breakdown.economicProxies;
    explanations.push({
      category: 'Economic Indicators',
      score: economic.total,
      maxScore: 17,
      percentage: Math.round((economic.total / 17) * 100),
      explanation: this.explainEconomic(economic.details)
    });
    
    // Social Trust
    const social = breakdown.socialTrust;
    explanations.push({
      category: 'Community Trust',
      score: social.total,
      maxScore: 19,
      percentage: Math.round((social.total / 19) * 100),
      explanation: this.explainSocial(social.details)
    });
    
    // Care Labor
    const care = breakdown.careLabor;
    explanations.push({
      category: 'Caregiving Activities',
      score: care.total,
      maxScore: 26,
      percentage: Math.round((care.total / 26) * 100),
      explanation: this.explainCare(care.details)
    });
    
    return explanations;
  }

  /**
   * Explain identity component
   */
  explainIdentity(details) {
    const factors = [];
    
    if (details.simTenure.raw > 24) {
      factors.push('Long-term phone usage shows stability');
    }
    if (details.locationStability.raw > 0.7) {
      factors.push('Consistent location demonstrates rootedness');
    }
    if (details.landVerified.raw) {
      factors.push('Verified land ownership strengthens profile');
    }
    
    return factors.length > 0 
      ? factors.join('. ') + '.'
      : 'Limited identity verification data available.';
  }

  /**
   * Explain behavioral component
   */
  explainBehavioral(details) {
    const factors = [];
    
    if (details.utilityPaymentRatio.raw > 0.8) {
      factors.push('Excellent utility payment history');
    }
    if (details.paymentStreaks.raw > 6) {
      factors.push(`${details.paymentStreaks.raw} consecutive months of on-time payments`);
    }
    if (details.behaviorConsistency.raw > 0.7) {
      factors.push('Consistent behavioral patterns demonstrate reliability');
    }
    
    return factors.length > 0
      ? factors.join('. ') + '.'
      : 'Limited financial behavior data available.';
  }

  /**
   * Explain economic component
   */
  explainEconomic(details) {
    const factors = [];
    
    if (details.incomeSignal.raw > 0.5) {
      factors.push('Stable income indicators detected');
    }
    if (details.coopScore.raw > 0.5) {
      factors.push('Active participation in cooperative/SHG groups');
    }
    if (details.expenseShockRecovery.raw > 0.7) {
      factors.push('Good recovery from financial shocks');
    }
    
    return factors.length > 0
      ? factors.join('. ') + '.'
      : 'Limited economic proxy data available.';
  }

  /**
   * Explain social component
   */
  explainSocial(details) {
    const factors = [];
    
    const validations = details.communityValidationCount.raw;
    if (validations > 0) {
      factors.push(`${validations} community members have validated your work`);
    }
    if (details.verifierTrustScore.raw > 0.7) {
      factors.push('Validations from highly trusted community members');
    }
    
    return factors.length > 0
      ? factors.join('. ') + '.'
      : 'No community validations yet. Ask neighbors or community leaders to validate your work.';
  }

  /**
   * Explain care component
   */
  explainCare(details) {
    const hours = details.careHours.raw;
    const factors = [];
    
    if (hours > 0) {
      factors.push(`${Math.round(hours)} hours of caregiving logged this month`);
    }
    if (details.careTypeValue.raw > 1.1) {
      factors.push('High-value care activities (elderly/special needs)');
    }
    if (details.careContinuity.raw > 0.7) {
      factors.push('Consistent daily caregiving demonstrated');
    }
    
    return factors.length > 0
      ? factors.join('. ') + '.'
      : 'Start logging your daily caregiving activities to build your profile.';
  }

  /**
   * Identify positive factors
   */
  identifyPositiveFactors(vcsResult) {
    const positive = [];
    const breakdown = vcsResult.breakdown;
    
    // Check each component for strengths
    if (breakdown.careLabor.total > 18) {
      positive.push({
        factor: 'Strong caregiving record',
        impact: '+' + Math.round(breakdown.careLabor.total * 10) + ' points'
      });
    }
    
    if (breakdown.socialTrust.total > 12) {
      positive.push({
        factor: 'Good community validation',
        impact: '+' + Math.round(breakdown.socialTrust.total * 10) + ' points'
      });
    }
    
    if (breakdown.behavioralFinance.total > 15) {
      positive.push({
        factor: 'Consistent financial behavior',
        impact: '+' + Math.round(breakdown.behavioralFinance.total * 10) + ' points'
      });
    }
    
    return positive;
  }

  /**
   * Identify negative factors
   */
  identifyNegativeFactors(vcsResult) {
    const negative = [];
    const breakdown = vcsResult.breakdown;
    
    // Check penalties
    const penalties = breakdown.penalties.details;
    
    if (penalties.anomalyScore?.penalty > 0) {
      negative.push({
        factor: 'Detected inconsistencies in activity logs',
        impact: '-' + Math.round(penalties.anomalyScore.penalty) + ' points'
      });
    }
    
    if (penalties.collusionRisk?.penalty > 0) {
      negative.push({
        factor: 'Verification pattern concerns',
        impact: '-' + Math.round(penalties.collusionRisk.penalty) + ' points'
      });
    }
    
    // Check weak areas
    if (breakdown.socialTrust.total < 5) {
      negative.push({
        factor: 'Limited community validation',
        impact: 'Up to -140 points potential'
      });
    }
    
    if (breakdown.careLabor.total < 10) {
      negative.push({
        factor: 'Limited caregiving activity logged',
        impact: 'Up to -160 points potential'
      });
    }
    
    return negative;
  }

  /**
   * Generate improvement plan
   */
  generateImprovementPlan(vcsResult) {
    const recommendations = [];
    const breakdown = vcsResult.breakdown;
    
    // Prioritize by impact
    if (breakdown.careLabor.total < 20) {
      recommendations.push({
        priority: 1,
        action: 'Log daily activities',
        description: 'Record your caregiving activities every day, even small tasks.',
        potentialGain: '+' + (20 - breakdown.careLabor.total) * 10 + ' points',
        timeframe: '1-2 weeks'
      });
    }
    
    if (breakdown.socialTrust.total < 15) {
      recommendations.push({
        priority: 2,
        action: 'Get community validations',
        description: 'Ask 3-5 trusted community members (teachers, NGO workers, neighbors) to validate your work.',
        potentialGain: '+' + (15 - breakdown.socialTrust.total) * 10 + ' points',
        timeframe: '1 week'
      });
    }
    
    if (breakdown.behavioralFinance.total < 18) {
      recommendations.push({
        priority: 3,
        action: 'Improve payment consistency',
        description: 'Pay utility bills on time and maintain regular recharges.',
        potentialGain: '+' + (18 - breakdown.behavioralFinance.total) * 10 + ' points',
        timeframe: '1-3 months'
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate comparison with bands
   */
  generateComparison(vcsResult) {
    const bands = VCS_CONFIG.bands;
    const currentScore = vcsResult.totalVCS;
    
    // Find next band
    let nextBand = null;
    for (const [key, band] of Object.entries(bands)) {
      if (band.min > currentScore) {
        nextBand = { key, ...band };
        break;
      }
    }
    
    return {
      currentBand: {
        name: vcsResult.riskBandLabel,
        range: `${bands[vcsResult.riskBand].min}-${bands[vcsResult.riskBand].max}`
      },
      nextBand: nextBand ? {
        name: nextBand.label,
        pointsNeeded: nextBand.min - currentScore,
        benefits: nextBand.loanEligibility ? 
          `Higher loan limits (up to ${nextBand.maxLoanMultiplier}x base)` :
          'Improved credit standing'
      } : null
    };
  }

  /**
   * Explain confidence in score
   */
  explainConfidence(vcsResult) {
    const dataPoints = [];
    let confidence = 0.5;
    
    // More data = higher confidence
    if (vcsResult.inputSnapshot?.activity?.activeDays > 20) {
      dataPoints.push('30+ days of activity data');
      confidence += 0.2;
    } else if (vcsResult.inputSnapshot?.activity?.activeDays > 10) {
      dataPoints.push('10+ days of activity data');
      confidence += 0.1;
    }
    
    if (vcsResult.inputSnapshot?.testimony?.uniqueVerifiers >= 3) {
      dataPoints.push('Multiple community validations');
      confidence += 0.2;
    }
    
    if (vcsResult.breakdown.penalties.totalPenalty === 0) {
      dataPoints.push('No fraud flags detected');
      confidence += 0.1;
    }
    
    return {
      level: confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low',
      percentage: Math.round(confidence * 100),
      dataPoints,
      note: confidence < 0.6 ? 
        'Continue logging activities and getting validations to improve confidence.' : 
        'Your score is well-supported by data.'
    };
  }
}

module.exports = new ExplainabilityService();
