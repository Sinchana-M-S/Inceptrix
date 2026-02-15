/**
 * What-If Score Simulator
 * 
 * Allows caregivers to simulate how their actions would affect their VCS score.
 * "If I log 5 more hours this week, how much would my score increase?"
 */

const vcsConfig = require('../config/vcsConfig');

class WhatIfSimulator {
  constructor() {
    console.log('✓ What-If Simulator initialized');
  }

  /**
   * Simulate score changes based on hypothetical actions
   */
  async simulate(currentData, scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      const result = this.calculateScenarioImpact(currentData, scenario);
      results.push(result);
    }

    return {
      currentScore: currentData.vcsScore || 0,
      currentLoanLimit: this.getLoanLimit(currentData.vcsScore || 0),
      scenarios: results,
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Calculate impact of a single scenario
   */
  calculateScenarioImpact(currentData, scenario) {
    const currentScore = currentData.vcsScore || 0;
    let projectedIncrease = 0;
    let explanation = '';

    switch (scenario.type) {
      case 'logHours':
        // Each hour of care work adds approximately 2-5 points
        const hourlyImpact = this.getHourlyImpact(scenario.careType);
        projectedIncrease = scenario.hours * hourlyImpact;
        explanation = `Logging ${scenario.hours} hours of ${scenario.careType || 'caregiving'} could add ~${Math.round(projectedIncrease)} points`;
        break;

      case 'getValidation':
        // Each validation adds 5-15 points based on verifier trust
        const validationImpact = 10 * (scenario.count || 1);
        projectedIncrease = validationImpact;
        explanation = `Getting ${scenario.count || 1} community validation(s) could add ~${Math.round(projectedIncrease)} points`;
        break;

      case 'maintainStreak':
        // Streaks add consistency bonus
        const streakBonus = Math.min(scenario.days * 0.5, 20);
        projectedIncrease = streakBonus;
        explanation = `Maintaining a ${scenario.days}-day streak could add ~${Math.round(projectedIncrease)} points`;
        break;

      case 'diversifyActivities':
        // Diversifying care types adds 5-10 points
        projectedIncrease = 8;
        explanation = 'Logging different types of activities could add ~8 points';
        break;

      case 'improveQuality':
        // More detailed logs with verification
        projectedIncrease = 15;
        explanation = 'Adding more detail and getting photo verification could add ~15 points';
        break;

      default:
        projectedIncrease = 0;
        explanation = 'Unknown scenario type';
    }

    const projectedScore = Math.min(currentScore + projectedIncrease, 1000);
    const currentLoanLimit = this.getLoanLimit(currentScore);
    const projectedLoanLimit = this.getLoanLimit(projectedScore);
    const loanIncrease = projectedLoanLimit - currentLoanLimit;

    return {
      scenario: scenario.type,
      input: scenario,
      projectedIncrease: Math.round(projectedIncrease),
      projectedScore: Math.round(projectedScore),
      currentLoanLimit,
      projectedLoanLimit,
      loanIncrease,
      explanation,
      riskBandChange: this.getRiskBandChange(currentScore, projectedScore)
    };
  }

  /**
   * Get hourly impact based on care type
   */
  getHourlyImpact(careType) {
    const impacts = {
      eldercare: 4,
      childcare: 3.5,
      specialNeeds: 5,
      healthcare: 4,
      housework: 2,
      community: 2.5,
      other: 2
    };
    return impacts[careType] || 2.5;
  }

  /**
   * Get loan limit for a given score
   */
  getLoanLimit(score) {
    if (score >= 850) return 50000;
    if (score >= 700) return 30000;
    if (score >= 500) return 15000;
    if (score >= 300) return 5000;
    return 0;
  }

  /**
   * Get risk band for a score
   */
  getRiskBand(score) {
    if (score >= 850) return { band: 'prime', label: 'Prime Borrower' };
    if (score >= 700) return { band: 'lowRisk', label: 'Low-Risk Borrower' };
    if (score >= 500) return { band: 'creditEligible', label: 'Credit Eligible' };
    if (score >= 300) return { band: 'emerging', label: 'Emerging Borrower' };
    return { band: 'none', label: 'Building Credit' };
  }

  /**
   * Check if risk band changes
   */
  getRiskBandChange(currentScore, projectedScore) {
    const current = this.getRiskBand(currentScore);
    const projected = this.getRiskBand(projectedScore);

    if (current.band !== projected.band) {
      return {
        changed: true,
        from: current,
        to: projected
      };
    }
    return { changed: false };
  }

  /**
   * Generate recommendations based on scenarios
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Sort by impact
    const sorted = [...results].sort((a, b) => b.projectedIncrease - a.projectedIncrease);

    for (const result of sorted.slice(0, 3)) {
      if (result.projectedIncrease > 0) {
        recommendations.push({
          action: result.scenario,
          impact: result.projectedIncrease,
          explanation: result.explanation,
          priority: result.projectedIncrease > 20 ? 'high' : 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Get quick simulation presets
   */
  getPresets() {
    return [
      {
        name: 'Log 5 hours this week',
        scenarios: [{ type: 'logHours', hours: 5, careType: 'eldercare' }]
      },
      {
        name: 'Get 2 community validations',
        scenarios: [{ type: 'getValidation', count: 2 }]
      },
      {
        name: 'Maintain 7-day streak',
        scenarios: [{ type: 'maintainStreak', days: 7 }]
      },
      {
        name: 'Full week commitment',
        scenarios: [
          { type: 'logHours', hours: 20, careType: 'eldercare' },
          { type: 'getValidation', count: 3 },
          { type: 'maintainStreak', days: 7 }
        ]
      },
      {
        name: 'Reach next loan tier',
        scenarios: [
          { type: 'logHours', hours: 30, careType: 'eldercare' },
          { type: 'getValidation', count: 5 },
          { type: 'maintainStreak', days: 14 },
          { type: 'improveQuality' }
        ]
      }
    ];
  }
}

module.exports = new WhatIfSimulator();
