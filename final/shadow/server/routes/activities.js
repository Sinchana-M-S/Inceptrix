const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { ActivityLog } = require('../models');
const { nlpProcessor, fraudDetector } = require('../services');

/**
 * @route   POST /api/activities
 * @desc    Log a new activity
 * @access  Private (Caregiver)
 */
router.post('/', protect, authorize('caregiver'), async (req, res) => {
  try {
    const { rawText, activityDate, reportedHours, geoLocation, isOffline, offlineId } = req.body;

    // Process with NLP
    const nlpResult = await nlpProcessor.processActivityLog(rawText);

    // Get recent activities for anomaly detection
    const recentActivities = await ActivityLog.find({
      caregiverId: req.user.id
    }).sort({ activityDate: -1 }).limit(30);

    // Check for anomalies
    const newActivity = {
      rawText,
      estimatedHours: reportedHours || nlpResult.estimatedHours,
      activityType: nlpResult.activityType
    };
    const anomalyResult = await nlpProcessor.detectAnomalies(recentActivities, newActivity);

    // Create activity log
    const activity = await ActivityLog.create({
      caregiverId: req.user.id,
      rawText,
      parsedActivity: {
        keywords: nlpResult.keywords,
        entities: nlpResult.entities,
        sentiment: nlpResult.sentiment,
        processingConfidence: nlpResult.processingConfidence
      },
      activityType: nlpResult.activityType,
      activitySubtype: nlpResult.activitySubtype,
      estimatedHours: reportedHours || nlpResult.estimatedHours,
      reportedHours,
      careMultiplier: getCareMultiplier(nlpResult.activityType),
      geoLocation: geoLocation || { regionType: req.user.regionType },
      anomalyFlags: anomalyResult.flags,
      anomalyScore: anomalyResult.anomalyScore,
      isOffline,
      offlineId,
      activityDate: activityDate || new Date(),
      syncedAt: isOffline ? new Date() : undefined
    });

    res.status(201).json({
      success: true,
      data: activity,
      nlpAnalysis: {
        type: nlpResult.activityType,
        confidence: nlpResult.confidence,
        estimatedHours: nlpResult.estimatedHours
      }
    });
  } catch (err) {
    console.error('Activity logging error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({
      success: false,
      error: err.message || 'Error logging activity'
    });
  }
});

/**
 * @route   GET /api/activities
 * @desc    Get my activities
 * @access  Private (Caregiver)
 */
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, activityType } = req.query;

    const query = { caregiverId: req.user.id };
    
    if (startDate || endDate) {
      query.activityDate = {};
      if (startDate) query.activityDate.$gte = new Date(startDate);
      if (endDate) query.activityDate.$lte = new Date(endDate);
    }
    
    if (activityType) {
      query.activityType = activityType;
    }

    const activities = await ActivityLog.find(query)
      .sort({ activityDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: activities
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching activities'
    });
  }
});

/**
 * @route   GET /api/activities/stats
 * @desc    Get activity statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await ActivityLog.aggregate([
      {
        $match: {
          caregiverId: req.user._id,
          activityDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$activityType',
          totalHours: { $sum: '$estimatedHours' },
          totalValue: { $sum: '$economicValue.totalValue' },
          count: { $sum: 1 },
          avgHoursPerDay: { $avg: '$estimatedHours' }
        }
      }
    ]);

    const dailyStats = await ActivityLog.aggregate([
      {
        $match: {
          caregiverId: req.user._id,
          activityDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$activityDate' } },
          totalHours: { $sum: '$estimatedHours' },
          activitiesCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const summary = {
      totalActivities: stats.reduce((sum, s) => sum + s.count, 0),
      totalHours: Math.round(stats.reduce((sum, s) => sum + s.totalHours, 0) * 10) / 10,
      totalValue: stats.reduce((sum, s) => sum + (s.totalValue || 0), 0),
      activeDays: dailyStats.length,
      byType: stats,
      dailyTrend: dailyStats
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching statistics'
    });
  }
});

/**
 * @route   GET /api/activities/:id
 * @desc    Get single activity
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const activity = await ActivityLog.findOne({
      _id: req.params.id,
      caregiverId: req.user.id
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching activity'
    });
  }
});

/**
 * @route   DELETE /api/activities/:id
 * @desc    Delete an activity
 * @access  Private (Caregiver)
 */
router.delete('/:id', protect, authorize('caregiver'), async (req, res) => {
  try {
    const activity = await ActivityLog.findOneAndDelete({
      _id: req.params.id,
      caregiverId: req.user.id
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error deleting activity'
    });
  }
});

// Helper function to get care multiplier
function getCareMultiplier(activityType) {
  const multipliers = {
    eldercare: 1.3,
    childcare: 1.2,
    specialNeeds: 1.5,
    housework: 1.0,
    community: 1.1,
    healthcare: 1.25,
    other: 1.0
  };
  return multipliers[activityType] || 1.0;
}

module.exports = router;
