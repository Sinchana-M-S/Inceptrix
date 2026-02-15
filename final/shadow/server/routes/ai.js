/**
 * AI/ML API Routes
 * 
 * Provides endpoints for AI-powered features:
 * - Activity classification
 * - Loan prediction
 * - Fraud analysis
 * - Risk assessment
 * - Score explanation
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const geminiAI = require('../services/geminiAI');
const loanPredictionModel = require('../services/loanPredictionModel');
const statisticalFraudDetector = require('../services/statisticalFraudDetector');
const riskPredictionEngine = require('../services/riskPredictionEngine');
const ActivityLog = require('../models/ActivityLog');
const Testimony = require('../models/Testimony');
const VCSScore = require('../models/VCSScore');
const User = require('../models/User');

/**
 * @route   POST /api/ai/classify-activity
 * @desc    Classify caregiving activity using AI
 * @access  Private (Caregivers)
 */
router.post('/classify-activity', protect, authorize('caregiver'), async (req, res) => {
  try {
    const { rawText } = req.body;

    if (!rawText || rawText.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Activity text must be at least 10 characters'
      });
    }

    const classification = await geminiAI.classifyActivity(rawText);

    res.json({
      success: true,
      data: classification
    });
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to classify activity'
    });
  }
});

/**
 * @route   GET /api/ai/loan-prediction
 * @desc    Get AI-powered loan eligibility prediction
 * @access  Private (Caregivers, Lenders)
 */
router.get('/loan-prediction', protect, authorize('caregiver', 'lender'), async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    
    // Check authorization for lenders viewing other users
    if (req.user.role === 'lender' && !req.query.userId) {
      return res.status(400).json({
        success: false,
        error: 'Lenders must specify a caregiver userId'
      });
    }

    // Gather user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const vcsScore = await VCSScore.findOne({ userId }).sort({ calculatedAt: -1 });
    const activities = await ActivityLog.find({ userId }).sort({ activityDate: -1 }).limit(100);
    const testimonies = await Testimony.find({ caregiverId: userId });

    // Get ML prediction
    const prediction = await loanPredictionModel.predict({
      vcsScore: vcsScore?.totalVCS || 0,
      activities,
      testimonies,
      createdAt: user.createdAt,
      validationCount: testimonies.length,
      loanHistory: user.loanHistory || []
    });

    // Get Gemini AI prediction for comparison
    const geminiPrediction = await geminiAI.predictLoanEligibility({
      vcsScore: vcsScore?.totalVCS || 0,
      activityCount: activities.length,
      daysActive: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      validationCount: testimonies.length,
      avgRating: testimonies.length > 0 
        ? testimonies.reduce((sum, t) => sum + (t.structuredRating?.reliability || 3), 0) / testimonies.length 
        : 0,
      consistencyScore: prediction.features?.activityConsistency || 0,
      region: user.region
    });

    res.json({
      success: true,
      data: {
        mlPrediction: prediction,
        aiPrediction: geminiPrediction,
        combined: {
          eligible: prediction.eligible && geminiPrediction.eligible !== false,
          confidenceScore: (prediction.confidenceScore + (geminiPrediction.confidenceScore || 0.7)) / 2,
          recommendation: prediction.explanation
        }
      }
    });
  } catch (error) {
    console.error('Loan prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate loan prediction'
    });
  }
});

/**
 * @route   GET /api/ai/loan-prediction/:caregiverId
 * @desc    Get loan prediction for a specific caregiver (for lenders)
 * @access  Private (Lenders)
 */
router.get('/loan-prediction/:caregiverId', protect, authorize('lender'), async (req, res) => {
  try {
    const { caregiverId } = req.params;
    
    const user = await User.findById(caregiverId);
    if (!user || user.role !== 'caregiver') {
      return res.status(404).json({ success: false, error: 'Caregiver not found' });
    }

    const vcsScore = await VCSScore.findOne({ userId: caregiverId }).sort({ calculatedAt: -1 });
    const activities = await ActivityLog.find({ userId: caregiverId }).sort({ activityDate: -1 }).limit(100);
    const testimonies = await Testimony.find({ caregiverId });

    const prediction = await loanPredictionModel.predict({
      vcsScore: vcsScore?.totalVCS || 0,
      activities,
      testimonies,
      createdAt: user.createdAt,
      validationCount: testimonies.length,
      loanHistory: user.loanHistory || []
    });

    res.json({
      success: true,
      data: {
        caregiver: {
          id: user._id,
          name: user.name,
          region: user.region
        },
        prediction
      }
    });
  } catch (error) {
    console.error('Loan prediction error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate prediction' });
  }
});

/**
 * @route   POST /api/ai/fraud-analysis
 * @desc    Analyze activity for fraud indicators
 * @access  Private (Admins)
 */
router.post('/fraud-analysis', protect, authorize('admin'), async (req, res) => {
  try {
    const { activityId } = req.body;

    const activity = await ActivityLog.findById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    const historicalActivities = await ActivityLog.find({
      userId: activity.userId,
      _id: { $ne: activityId }
    }).sort({ activityDate: -1 }).limit(50);

    // Statistical fraud detection
    const statAnalysis = await statisticalFraudDetector.detectFraud(
      activity,
      historicalActivities,
      {}
    );

    // AI fraud detection
    const avgDailyHours = historicalActivities.length > 0
      ? historicalActivities.reduce((sum, a) => sum + (a.parsedActivity?.estimatedHours || 2), 0) / historicalActivities.length
      : 2;

    const aiAnalysis = await geminiAI.analyzeFraud(activity, {
      avgDailyHours,
      commonTypes: [...new Set(historicalActivities.slice(0, 10).map(a => a.parsedActivity?.type))],
      recentCount: historicalActivities.filter(a => 
        (Date.now() - new Date(a.activityDate).getTime()) < 7 * 24 * 60 * 60 * 1000
      ).length,
      similarTextCount: 0
    });

    res.json({
      success: true,
      data: {
        activity: {
          id: activity._id,
          userId: activity.userId,
          rawText: activity.rawText,
          activityDate: activity.activityDate
        },
        statisticalAnalysis: statAnalysis,
        aiAnalysis,
        combined: {
          fraudScore: (statAnalysis.fraudScore + (aiAnalysis.fraudProbability || 0)) / 2,
          recommendation: statAnalysis.recommendation,
          flags: statAnalysis.flags
        }
      }
    });
  } catch (error) {
    console.error('Fraud analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze for fraud' });
  }
});

/**
 * @route   GET /api/ai/risk-assessment/:userId
 * @desc    Get comprehensive risk assessment for a user
 * @access  Private (Lenders, Admins)
 */
router.get('/risk-assessment/:userId', protect, authorize('lender', 'admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const activities = await ActivityLog.find({ userId }).sort({ activityDate: -1 }).limit(100);
    const testimonies = await Testimony.find({ caregiverId: userId });
    const vcsHistory = await VCSScore.find({ userId }).sort({ calculatedAt: -1 }).limit(30);
    const latestVCS = vcsHistory[0];

    const assessment = await riskPredictionEngine.assessRisk({
      vcsScore: latestVCS?.totalVCS || 0,
      vcsHistory,
      activities,
      testimonies,
      createdAt: user.createdAt,
      loanHistory: user.loanHistory || []
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          region: user.region,
          createdAt: user.createdAt
        },
        currentVCS: latestVCS?.totalVCS || 0,
        assessment
      }
    });
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate risk assessment' });
  }
});

/**
 * @route   GET /api/ai/score-explanation
 * @desc    Get AI-generated explanation of VCS score
 * @access  Private (Caregivers)
 */
router.get('/score-explanation', protect, authorize('caregiver'), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const vcsScore = await VCSScore.findOne({ userId }).sort({ calculatedAt: -1 });

    if (!vcsScore) {
      return res.status(404).json({ success: false, error: 'No VCS score found' });
    }

    const explanation = await geminiAI.generateScoreExplanation(vcsScore, {
      name: user.name,
      region: user.region,
      daysSinceRegistration: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    });

    res.json({
      success: true,
      data: {
        totalVCS: vcsScore.totalVCS,
        breakdown: vcsScore.breakdown,
        explanation
      }
    });
  } catch (error) {
    console.error('Score explanation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate explanation' });
  }
});

/**
 * @route   GET /api/ai/status
 * @desc    Check AI service status
 * @access  Private (Admins)
 */
router.get('/status', protect, authorize('admin'), async (req, res) => {
  res.json({
    success: true,
    data: {
      geminiAPI: geminiAI.isConfigured ? 'configured' : 'fallback_mode',
      loanPredictionModel: 'active',
      fraudDetector: 'active',
      riskEngine: 'active',
      timestamp: new Date()
    }
  });
});

module.exports = router;
