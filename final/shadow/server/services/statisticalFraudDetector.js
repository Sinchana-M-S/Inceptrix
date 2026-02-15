/**
 * Statistical Fraud Detector Service
 * 
 * Uses statistical anomaly detection algorithms:
 * - Z-score analysis for outlier detection
 * - Isolation Forest concept for multi-dimensional anomalies
 * - Pattern recognition for behavioral anomalies
 * - Velocity analysis for sudden changes
 */

class StatisticalFraudDetector {
  constructor() {
    // Configuration
    this.config = {
      zScoreThreshold: 2.5,     // Standard deviations for outlier
      minDataPoints: 5,          // Minimum data for statistical analysis
      velocityWindow: 7,         // Days for velocity analysis
      similarityThreshold: 0.85, // Text similarity threshold
      maxDailyHours: 18          // Maximum believable hours per day
    };

    console.log('✓ Statistical Fraud Detector initialized');
  }

  /**
   * Main fraud detection entry point
   */
  async detectFraud(newActivity, historicalActivities, userProfile) {
    const flags = [];
    let fraudScore = 0;

    // 1. Statistical Outlier Detection
    const outlierResult = this.detectStatisticalOutliers(newActivity, historicalActivities);
    if (outlierResult.isOutlier) {
      flags.push(...outlierResult.flags);
      fraudScore += outlierResult.score;
    }

    // 2. Text Similarity Analysis
    const similarityResult = this.detectTextSimilarity(newActivity, historicalActivities);
    if (similarityResult.isDuplicate) {
      flags.push(...similarityResult.flags);
      fraudScore += similarityResult.score;
    }

    // 3. Velocity Anomaly Detection
    const velocityResult = this.detectVelocityAnomaly(newActivity, historicalActivities);
    if (velocityResult.isAnomalous) {
      flags.push(...velocityResult.flags);
      fraudScore += velocityResult.score;
    }

    // 4. Pattern Deviation Detection
    const patternResult = this.detectPatternDeviation(newActivity, historicalActivities);
    if (patternResult.isDeviant) {
      flags.push(...patternResult.flags);
      fraudScore += patternResult.score;
    }

    // 5. Time-based Anomaly Detection
    const timeResult = this.detectTimeAnomalies(newActivity, historicalActivities);
    if (timeResult.isAnomalous) {
      flags.push(...timeResult.flags);
      fraudScore += timeResult.score;
    }

    // Normalize fraud score to 0-1
    fraudScore = Math.min(fraudScore, 1);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(fraudScore);

    return {
      fraudScore,
      riskLevel,
      isSuspicious: fraudScore > 0.3,
      flags,
      recommendation: this.getRecommendation(fraudScore),
      analysisDetails: {
        outlier: outlierResult,
        similarity: similarityResult,
        velocity: velocityResult,
        pattern: patternResult,
        time: timeResult
      }
    };
  }

  /**
   * Detect statistical outliers using z-score
   */
  detectStatisticalOutliers(newActivity, historicalActivities) {
    const result = { isOutlier: false, flags: [], score: 0 };

    if (historicalActivities.length < this.config.minDataPoints) {
      return result;
    }

    // Analyze hours
    const hours = historicalActivities.map(a => a.parsedActivity?.estimatedHours || a.reportedHours || 2);
    const newHours = newActivity.parsedActivity?.estimatedHours || newActivity.reportedHours || 2;
    
    const hoursZScore = this.calculateZScore(newHours, hours);
    
    if (Math.abs(hoursZScore) > this.config.zScoreThreshold) {
      result.isOutlier = true;
      result.flags.push({
        type: 'statisticalOutlier',
        subtype: 'hours',
        severity: hoursZScore > 3.5 ? 'high' : 'medium',
        zScore: Math.round(hoursZScore * 100) / 100,
        description: `Hours claimed (${newHours}) is ${hoursZScore > 0 ? 'unusually high' : 'unusually low'} compared to history`
      });
      result.score += Math.min(Math.abs(hoursZScore) / 5, 0.4);
    }

    // Check for impossible hours
    if (newHours > this.config.maxDailyHours) {
      result.isOutlier = true;
      result.flags.push({
        type: 'impossibleHours',
        severity: 'high',
        description: `Claimed ${newHours} hours exceeds maximum possible (${this.config.maxDailyHours}h)`
      });
      result.score += 0.5;
    }

    return result;
  }

  /**
   * Detect duplicate/similar text entries
   */
  detectTextSimilarity(newActivity, historicalActivities) {
    const result = { isDuplicate: false, flags: [], score: 0, matches: [] };

    const newText = newActivity.rawText.toLowerCase();
    
    for (const activity of historicalActivities.slice(-30)) { // Check last 30
      const similarity = this.calculateJaccardSimilarity(newText, activity.rawText.toLowerCase());
      
      if (similarity > this.config.similarityThreshold) {
        result.matches.push({
          activityDate: activity.activityDate,
          similarity: Math.round(similarity * 100)
        });
      }
    }

    if (result.matches.length > 0) {
      const maxSimilarity = Math.max(...result.matches.map(m => m.similarity));
      result.isDuplicate = true;
      result.flags.push({
        type: 'textDuplication',
        severity: maxSimilarity > 95 ? 'high' : 'medium',
        description: `Text is ${maxSimilarity}% similar to ${result.matches.length} previous entries`,
        matchCount: result.matches.length
      });
      result.score += (maxSimilarity / 100) * 0.4;
    }

    return result;
  }

  /**
   * Detect velocity anomalies (sudden increase in activity)
   */
  detectVelocityAnomaly(newActivity, historicalActivities) {
    const result = { isAnomalous: false, flags: [], score: 0 };

    const windowMs = this.config.velocityWindow * 24 * 60 * 60 * 1000;
    const recentActivities = historicalActivities.filter(a => 
      (Date.now() - new Date(a.activityDate || a.createdAt).getTime()) < windowMs
    );

    // Calculate daily activity rates
    const currentDayActivities = historicalActivities.filter(a => 
      new Date(a.activityDate).toDateString() === new Date(newActivity.activityDate).toDateString()
    );

    // Check for same-day flooding
    if (currentDayActivities.length >= 5) {
      result.isAnomalous = true;
      result.flags.push({
        type: 'velocityAnomaly',
        subtype: 'dailyFlood',
        severity: currentDayActivities.length > 8 ? 'high' : 'medium',
        description: `${currentDayActivities.length + 1} activities logged for the same day`
      });
      result.score += 0.2 + (currentDayActivities.length - 5) * 0.05;
    }

    // Check total hours on same day
    const dayHours = currentDayActivities.reduce((sum, a) => 
      sum + (a.parsedActivity?.estimatedHours || a.reportedHours || 2), 0
    );
    const newHours = newActivity.parsedActivity?.estimatedHours || newActivity.reportedHours || 2;

    if (dayHours + newHours > 20) {
      result.isAnomalous = true;
      result.flags.push({
        type: 'velocityAnomaly',
        subtype: 'excessiveHours',
        severity: 'high',
        description: `Total hours for day (${dayHours + newHours}) exceeds believable limit`
      });
      result.score += 0.35;
    }

    return result;
  }

  /**
   * Detect pattern deviation (unusual activity types)
   */
  detectPatternDeviation(newActivity, historicalActivities) {
    const result = { isDeviant: false, flags: [], score: 0 };

    if (historicalActivities.length < 10) return result;

    // Analyze activity type distribution
    const typeCounts = {};
    historicalActivities.forEach(a => {
      const type = a.parsedActivity?.type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const newType = newActivity.parsedActivity?.type || 'other';
    const typePercentage = (typeCounts[newType] || 0) / historicalActivities.length;

    // Flag if activity type has never been seen or is very rare
    if (!typeCounts[newType]) {
      result.isDeviant = true;
      result.flags.push({
        type: 'patternDeviation',
        subtype: 'newActivityType',
        severity: 'low',
        description: `First time logging "${newType}" activity type`
      });
      result.score += 0.1;
    } else if (typePercentage < 0.05 && historicalActivities.length > 20) {
      result.isDeviant = true;
      result.flags.push({
        type: 'patternDeviation',
        subtype: 'rareActivityType',
        severity: 'low',
        description: `"${newType}" represents only ${Math.round(typePercentage * 100)}% of usual activities`
      });
      result.score += 0.05;
    }

    return result;
  }

  /**
   * Detect time-based anomalies
   */
  detectTimeAnomalies(newActivity, historicalActivities) {
    const result = { isAnomalous: false, flags: [], score: 0 };

    const activityDate = new Date(newActivity.activityDate);
    const now = new Date();

    // Flag future-dated activities
    if (activityDate > now) {
      result.isAnomalous = true;
      result.flags.push({
        type: 'timeAnomaly',
        subtype: 'futureDate',
        severity: 'high',
        description: 'Activity is dated in the future'
      });
      result.score += 0.5;
    }

    // Flag very old backdated activities (more than 30 days)
    const daysDiff = (now - activityDate) / (24 * 60 * 60 * 1000);
    if (daysDiff > 30) {
      result.isAnomalous = true;
      result.flags.push({
        type: 'timeAnomaly',
        subtype: 'backdated',
        severity: daysDiff > 60 ? 'high' : 'medium',
        description: `Activity is backdated by ${Math.round(daysDiff)} days`
      });
      result.score += Math.min(daysDiff / 100, 0.3);
    }

    return result;
  }

  /**
   * Calculate z-score for a value against a dataset
   */
  calculateZScore(value, dataset) {
    if (dataset.length === 0) return 0;
    
    const mean = dataset.reduce((a, b) => a + b, 0) / dataset.length;
    const variance = dataset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataset.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  calculateJaccardSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 && words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Determine risk level from fraud score
   */
  determineRiskLevel(fraudScore) {
    if (fraudScore >= 0.7) return 'critical';
    if (fraudScore >= 0.5) return 'high';
    if (fraudScore >= 0.3) return 'medium';
    if (fraudScore >= 0.1) return 'low';
    return 'none';
  }

  /**
   * Get recommendation based on fraud score
   */
  getRecommendation(fraudScore) {
    if (fraudScore >= 0.7) return 'reject';
    if (fraudScore >= 0.5) return 'flag_for_review';
    if (fraudScore >= 0.3) return 'monitor';
    return 'approve';
  }

  /**
   * Aggregate fraud analysis for a user's complete history
   */
  async analyzeUserHistory(activities, testimonies) {
    const analysis = {
      totalActivities: activities.length,
      flaggedCount: 0,
      suspiciousPatternsFound: [],
      overallRiskScore: 0,
      timeline: []
    };

    // Analyze each activity against its predecessors
    for (let i = 0; i < activities.length; i++) {
      const historical = activities.slice(0, i);
      const result = await this.detectFraud(activities[i], historical, {});
      
      if (result.fraudScore > 0.3) {
        analysis.flaggedCount++;
        analysis.timeline.push({
          date: activities[i].activityDate,
          fraudScore: result.fraudScore,
          flags: result.flags.map(f => f.type)
        });
      }
    }

    // Calculate overall risk
    analysis.overallRiskScore = analysis.flaggedCount / Math.max(activities.length, 1);
    
    // Identify patterns
    if (analysis.flaggedCount > activities.length * 0.2) {
      analysis.suspiciousPatternsFound.push('High proportion of flagged activities');
    }

    return analysis;
  }
}

module.exports = new StatisticalFraudDetector();
