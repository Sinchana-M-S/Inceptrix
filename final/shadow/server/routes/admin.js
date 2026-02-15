const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { User, ActivityLog, Testimony, VCSScore } = require('../models');
const { fraudDetector } = require('../services');

/**
 * @route   GET /api/admin/bias-audit
 * @desc    Get bias audit report
 * @access  Private (Admin)
 */
router.get('/bias-audit', protect, authorize('admin'), async (req, res) => {
  try {
    // Gender distribution (assuming name-based heuristic or explicit field)
    const regionDistribution = await VCSScore.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'caregiverId',
          foreignField: '_id',
          as: 'caregiver'
        }
      },
      { $unwind: '$caregiver' },
      {
        $group: {
          _id: '$caregiver.regionType',
          avgScore: { $avg: '$totalVCS' },
          count: { $sum: 1 },
          minScore: { $min: '$totalVCS' },
          maxScore: { $max: '$totalVCS' }
        }
      }
    ]);

    // Age group distribution
    const ageDistribution = await VCSScore.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'caregiverId',
          foreignField: '_id',
          as: 'caregiver'
        }
      },
      { $unwind: '$caregiver' },
      {
        $group: {
          _id: '$caregiver.ageGroup',
          avgScore: { $avg: '$totalVCS' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Risk band distribution
    const riskBandDistribution = await VCSScore.aggregate([
      {
        $group: {
          _id: '$riskBand',
          count: { $sum: 1 },
          avgScore: { $avg: '$totalVCS' }
        }
      }
    ]);

    // Calculate disparity metrics
    const urbanAvg = regionDistribution.find(r => r._id === 'urban')?.avgScore || 0;
    const ruralAvg = regionDistribution.find(r => r._id === 'rural')?.avgScore || 0;
    const urbanRuralGap = Math.round(urbanAvg - ruralAvg);

    res.status(200).json({
      success: true,
      data: {
        regionBias: {
          distribution: regionDistribution,
          urbanRuralGap,
          alert: urbanRuralGap > 100 ? 'HIGH' : urbanRuralGap > 50 ? 'MEDIUM' : 'LOW'
        },
        ageBias: {
          distribution: ageDistribution
        },
        riskBandDistribution,
        recommendations: generateBiasRecommendations(regionDistribution, ageDistribution)
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error generating bias audit'
    });
  }
});

/**
 * @route   GET /api/admin/fraud-alerts
 * @desc    Get fraud detection alerts
 * @access  Private (Admin)
 */
router.get('/fraud-alerts', protect, authorize('admin'), async (req, res) => {
  try {
    // Get activities with high anomaly scores
    const suspiciousActivities = await ActivityLog.find({
      anomalyScore: { $gt: 0.5 }
    })
      .populate('caregiverId', 'name region')
      .sort({ anomalyScore: -1 })
      .limit(50);

    // Get testimonies with high collusion risk
    const suspiciousTestimonies = await Testimony.find({
      collusionRisk: { $gt: 0.4 }
    })
      .populate('caregiverId', 'name')
      .populate('verifierId', 'name verifierMetadata.organization')
      .sort({ collusionRisk: -1 })
      .limit(50);

    // Get users with fraud flags
    const flaggedUsers = [];
    const caregivers = await User.find({ role: 'caregiver' }).limit(100);
    
    for (const caregiver of caregivers) {
      const fraudAnalysis = await fraudDetector.analyzeCaregiver(caregiver._id);
      if (fraudAnalysis.overallRisk > 0.3) {
        flaggedUsers.push({
          user: {
            id: caregiver._id,
            name: caregiver.name,
            region: caregiver.region
          },
          riskScore: fraudAnalysis.overallRisk,
          flags: fraudAnalysis.flags
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        suspiciousActivities: suspiciousActivities.map(a => ({
          id: a._id,
          caregiver: a.caregiverId,
          anomalyScore: a.anomalyScore,
          flags: a.anomalyFlags,
          activityDate: a.activityDate
        })),
        suspiciousTestimonies: suspiciousTestimonies.map(t => ({
          id: t._id,
          caregiver: t.caregiverId,
          verifier: t.verifierId,
          collusionRisk: t.collusionRisk,
          flags: t.antiCollusionFlags
        })),
        flaggedUsers: flaggedUsers.sort((a, b) => b.riskScore - a.riskScore)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error fetching fraud alerts'
    });
  }
});

/**
 * @route   GET /api/admin/model-drift
 * @desc    Monitor model drift
 * @access  Private (Admin)
 */
router.get('/model-drift', protect, authorize('admin'), async (req, res) => {
  try {
    // Get score distribution over time
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const scoresByDate = await VCSScore.aggregate([
      { $match: { calculatedAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$calculatedAt' } },
          avgScore: { $avg: '$totalVCS' },
          count: { $sum: 1 },
          stdDev: { $stdDevPop: '$totalVCS' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate drift metrics
    const scores = scoresByDate.map(s => s.avgScore);
    const avgOverall = scores.reduce((a, b) => a + b, 0) / scores.length;
    const recentAvg = scores.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, scores.length);
    const drift = Math.abs(recentAvg - avgOverall);

    res.status(200).json({
      success: true,
      data: {
        trend: scoresByDate,
        metrics: {
          overallAverage: Math.round(avgOverall),
          recentWeekAverage: Math.round(recentAvg),
          driftAmount: Math.round(drift),
          driftStatus: drift > 50 ? 'HIGH' : drift > 20 ? 'MEDIUM' : 'STABLE'
        },
        totalScoresCalculated: scoresByDate.reduce((sum, s) => sum + s.count, 0)
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error monitoring model drift'
    });
  }
});

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard summary
 * @access  Private (Admin)
 */
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const [
      totalCaregivers,
      totalVerifiers,
      totalLenders,
      totalActivities,
      totalTestimonies,
      avgVCS
    ] = await Promise.all([
      User.countDocuments({ role: 'caregiver' }),
      User.countDocuments({ role: 'verifier' }),
      User.countDocuments({ role: 'lender' }),
      ActivityLog.countDocuments(),
      Testimony.countDocuments(),
      VCSScore.aggregate([
        { $group: { _id: null, avg: { $avg: '$totalVCS' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          caregivers: totalCaregivers,
          verifiers: totalVerifiers,
          lenders: totalLenders
        },
        activities: {
          total: totalActivities,
          avgPerCaregiver: Math.round(totalActivities / (totalCaregivers || 1))
        },
        testimonies: {
          total: totalTestimonies,
          avgPerCaregiver: Math.round(totalTestimonies / (totalCaregivers || 1))
        },
        vcs: {
          averageScore: Math.round(avgVCS[0]?.avg || 0)
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching dashboard'
    });
  }
});

// Helper function to generate bias recommendations
function generateBiasRecommendations(regionDist, ageDist) {
  const recommendations = [];
  
  const urbanAvg = regionDist.find(r => r._id === 'urban')?.avgScore || 0;
  const ruralAvg = regionDist.find(r => r._id === 'rural')?.avgScore || 0;
  
  if (urbanAvg - ruralAvg > 100) {
    recommendations.push({
      type: 'regional',
      severity: 'high',
      message: 'Significant urban-rural scoring gap detected. Consider adjusting regional benchmarks.'
    });
  }
  
  const youngAvg = ageDist.filter(a => ['18-25', '26-35'].includes(a._id))
    .reduce((sum, a) => sum + a.avgScore, 0) / 2;
  const oldAvg = ageDist.filter(a => ['56-65', '65+'].includes(a._id))
    .reduce((sum, a) => sum + a.avgScore, 0) / 2;
    
  if (Math.abs(youngAvg - oldAvg) > 100) {
    recommendations.push({
      type: 'age',
      severity: 'medium',
      message: 'Age-based scoring disparity detected. Review age-related weight factors.'
    });
  }
  
  return recommendations;
}

module.exports = router;
