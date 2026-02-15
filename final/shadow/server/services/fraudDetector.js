/**
 * Fraud Detector Service
 * 
 * Detects various types of fraud and collusion:
 * - Duplicate activities
 * - Collusion networks
 * - Impossible time claims
 * - Reciprocal verification patterns
 */

const { ActivityLog, Testimony, User } = require('../models');
const VCS_CONFIG = require('../config/vcsConfig');

class FraudDetector {
  constructor() {
    this.config = VCS_CONFIG.fraudDetection;
  }

  /**
   * Run full fraud analysis for a caregiver
   */
  async analyzeCaregiver(caregiverId) {
    const results = {
      overallRisk: 0,
      flags: [],
      details: {}
    };

    // Check activity patterns
    const activityFlags = await this.checkActivityPatterns(caregiverId);
    results.flags.push(...activityFlags.flags);
    results.details.activities = activityFlags;

    // Check testimony patterns
    const testimonyFlags = await this.checkTestimonyPatterns(caregiverId);
    results.flags.push(...testimonyFlags.flags);
    results.details.testimonies = testimonyFlags;

    // Check collusion networks
    const collusionFlags = await this.checkCollusionNetworks(caregiverId);
    results.flags.push(...collusionFlags.flags);
    results.details.collusion = collusionFlags;

    // Calculate overall risk
    results.overallRisk = this.calculateOverallRisk(results.flags);

    return results;
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkActivityPatterns(caregiverId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await ActivityLog.find({
      caregiverId,
      activityDate: { $gte: thirtyDaysAgo }
    }).sort({ activityDate: -1 });

    const flags = [];

    // Check for duplicate text patterns
    const textSimilarities = this.findSimilarTexts(activities);
    if (textSimilarities.length > 0) {
      flags.push({
        type: 'duplicate_activities',
        severity: 'medium',
        count: textSimilarities.length,
        details: `Found ${textSimilarities.length} similar activity logs`
      });
    }

    // Check for impossible hours in a single day
    const dailyHours = {};
    for (const activity of activities) {
      const dateKey = activity.activityDate.toDateString();
      dailyHours[dateKey] = (dailyHours[dateKey] || 0) + activity.estimatedHours;
    }

    const impossibleDays = Object.entries(dailyHours)
      .filter(([_, hours]) => hours > this.config.impossibleHoursPerDay);
    
    if (impossibleDays.length > 0) {
      flags.push({
        type: 'impossible_hours',
        severity: 'high',
        count: impossibleDays.length,
        details: `${impossibleDays.length} days with >18 hours logged`
      });
    }

    // Check for sudden spikes
    const avgHours = Object.values(dailyHours).reduce((a, b) => a + b, 0) / Object.keys(dailyHours).length;
    const spikeThreshold = avgHours * 3;
    const spikes = Object.entries(dailyHours)
      .filter(([_, hours]) => hours > spikeThreshold);
    
    if (spikes.length > 0 && avgHours > 2) {
      flags.push({
        type: 'activity_spike',
        severity: 'low',
        count: spikes.length,
        details: `${spikes.length} days with unusual activity spikes`
      });
    }

    return {
      totalActivities: activities.length,
      avgDailyHours: Math.round(avgHours * 10) / 10,
      flags
    };
  }

  /**
   * Find similar texts using simple similarity
   */
  findSimilarTexts(activities) {
    const similar = [];
    
    for (let i = 0; i < activities.length; i++) {
      for (let j = i + 1; j < activities.length; j++) {
        const similarity = this.textSimilarity(
          activities[i].rawText,
          activities[j].rawText
        );
        
        if (similarity > this.config.duplicateLogThreshold) {
          similar.push({
            activity1: activities[i]._id,
            activity2: activities[j]._id,
            similarity
          });
        }
      }
    }
    
    return similar;
  }

  /**
   * Simple text similarity (Jaccard)
   */
  textSimilarity(text1, text2) {
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check for suspicious testimony patterns
   */
  async checkTestimonyPatterns(caregiverId) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const testimonies = await Testimony.find({
      caregiverId,
      timestamp: { $gte: ninetyDaysAgo }
    }).populate('verifierId', 'name verifierMetadata');

    const flags = [];

    // Check for too-frequent verifications from same verifier
    const verifierCounts = {};
    for (const testimony of testimonies) {
      const verifierId = testimony.verifierId._id.toString();
      verifierCounts[verifierId] = (verifierCounts[verifierId] || 0) + 1;
    }

    const frequentVerifiers = Object.entries(verifierCounts)
      .filter(([_, count]) => count > this.config.maxVerificationsPerVerifier);
    
    if (frequentVerifiers.length > 0) {
      flags.push({
        type: 'repeated_verifier',
        severity: 'medium',
        count: frequentVerifiers.length,
        details: `${frequentVerifiers.length} verifiers with excessive validations`
      });
    }

    // Check for suspiciously quick verifications
    const quickVerifications = testimonies.filter(t => {
      const daysSinceCreation = (new Date() - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
      return daysSinceCreation < this.config.minDaysBetweenVerifications;
    });

    if (quickVerifications.length > 3) {
      flags.push({
        type: 'timing_pattern',
        severity: 'low',
        count: quickVerifications.length,
        details: 'Multiple verifications within short time period'
      });
    }

    return {
      totalTestimonies: testimonies.length,
      uniqueVerifiers: Object.keys(verifierCounts).length,
      flags
    };
  }

  /**
   * Check for collusion networks
   */
  async checkCollusionNetworks(caregiverId) {
    const flags = [];

    // Get all verifiers who have verified this caregiver
    const testimoniesReceived = await Testimony.find({ caregiverId });
    const verifierIds = [...new Set(testimoniesReceived.map(t => t.verifierId.toString()))];

    // Check if this caregiver has verified any of their verifiers (reciprocal)
    const caregiver = await User.findById(caregiverId);
    if (caregiver.role === 'verifier') {
      const reciprocal = await Testimony.find({
        verifierId: caregiverId,
        caregiverId: { $in: verifierIds }
      });

      if (reciprocal.length > 0) {
        flags.push({
          type: 'reciprocal_verification',
          severity: 'high',
          count: reciprocal.length,
          details: `Reciprocal verification detected with ${reciprocal.length} verifier(s)`
        });
      }
    }

    // Check for small network clusters (same verifiers verifying each other's contacts)
    const networkSize = verifierIds.length;
    if (networkSize >= this.config.collusionNetworkSize) {
      // Check if these verifiers share many common verifications
      const sharedVerifications = await this.findSharedVerifications(verifierIds);
      
      if (sharedVerifications.sharedCount > networkSize * 2) {
        flags.push({
          type: 'network_cluster',
          severity: 'medium',
          count: sharedVerifications.sharedCount,
          details: 'Potential collusion network detected'
        });
      }
    }

    return {
      networkSize,
      flags
    };
  }

  /**
   * Find shared verifications among a group
   */
  async findSharedVerifications(verifierIds) {
    const testimonies = await Testimony.find({
      verifierId: { $in: verifierIds }
    });

    const caregiverVerifierMap = {};
    for (const t of testimonies) {
      const caregiverId = t.caregiverId.toString();
      if (!caregiverVerifierMap[caregiverId]) {
        caregiverVerifierMap[caregiverId] = new Set();
      }
      caregiverVerifierMap[caregiverId].add(t.verifierId.toString());
    }

    // Count caregivers verified by multiple verifiers in this group
    let sharedCount = 0;
    for (const verifiers of Object.values(caregiverVerifierMap)) {
      if (verifiers.size > 1) {
        sharedCount++;
      }
    }

    return { sharedCount };
  }

  /**
   * Calculate overall fraud risk
   */
  calculateOverallRisk(flags) {
    let risk = 0;
    
    for (const flag of flags) {
      switch (flag.severity) {
        case 'high':
          risk += 0.3;
          break;
        case 'medium':
          risk += 0.15;
          break;
        case 'low':
          risk += 0.05;
          break;
      }
    }
    
    return Math.min(risk, 1);
  }

  /**
   * Analyze testimony for authenticity
   */
  async analyzeTestimonyAuthenticity(testimony) {
    const flags = [];
    let authenticityScore = 1.0;

    // Check text length (too short may be fake)
    if (testimony.freeText && testimony.freeText.length < 20) {
      authenticityScore -= 0.1;
      flags.push({
        type: 'short_text',
        severity: 'low',
        details: 'Testimony text is very short'
      });
    }

    // Check if all ratings are max (suspicious)
    const ratings = testimony.structuredRating;
    if (ratings.reliability === 5 && ratings.consistency === 5 && 
        ratings.quality === 5 && ratings.communityImpact === 5) {
      authenticityScore -= 0.15;
      flags.push({
        type: 'perfect_ratings',
        severity: 'medium',
        details: 'All ratings are maximum (suspicious)'
      });
    }

    // Check verifier history
    const verifier = await User.findById(testimony.verifierId);
    if (verifier && verifier.verifierMetadata?.totalVerifications < 3) {
      authenticityScore -= 0.05;
      flags.push({
        type: 'new_verifier',
        severity: 'low',
        details: 'Verifier has limited history'
      });
    }

    return {
      authenticityScore: Math.max(authenticityScore, 0.1),
      flags
    };
  }
}

module.exports = new FraudDetector();
