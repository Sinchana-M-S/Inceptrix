const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { User, VCSScore } = require('../models');
const { vcsEngine, explainability } = require('../services');

/**
 * @route   GET /api/vcs/score
 * @desc    Get my current VCS score
 * @access  Private (Caregiver)
 */
router.get('/score', protect, authorize('caregiver'), async (req, res) => {
  try {
    // Get latest score
    let vcsScore = await VCSScore.getLatestScore(req.user.id);

    // Check if score is stale (>24 hours old)
    const isStale = !vcsScore || 
      (new Date() - new Date(vcsScore.calculatedAt)) > 24 * 60 * 60 * 1000;

    if (isStale) {
      // Recalculate score
      const user = await User.findById(req.user.id);
      const vcsResult = await vcsEngine.calculateVCS(user);
      vcsScore = await vcsEngine.saveScore(vcsResult);
    }

    res.status(200).json({
      success: true,
      data: {
        totalVCS: vcsScore.totalVCS,
        riskBand: vcsScore.riskBand,
        riskBandLabel: vcsScore.riskBandLabel,
        humanExplanation: vcsScore.humanExplanation,
        economicValue: vcsScore.economicValue,
        loanEligibility: vcsScore.loanEligibility,
        calculatedAt: vcsScore.calculatedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error fetching VCS score'
    });
  }
});

/**
 * @route   GET /api/vcs/breakdown
 * @desc    Get detailed VCS breakdown
 * @access  Private (Caregiver)
 */
router.get('/breakdown', protect, authorize('caregiver'), async (req, res) => {
  try {
    const vcsScore = await VCSScore.getLatestScore(req.user.id);

    if (!vcsScore) {
      return res.status(404).json({
        success: false,
        error: 'No VCS score found. Please wait for score calculation.'
      });
    }

    // Generate full explanation
    const fullExplanation = explainability.generateFullExplanation(vcsScore);

    res.status(200).json({
      success: true,
      data: {
        totalVCS: vcsScore.totalVCS,
        breakdown: vcsScore.breakdown,
        explanation: fullExplanation,
        improvementTips: vcsScore.improvementTips
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching breakdown'
    });
  }
});

/**
 * @route   GET /api/vcs/history
 * @desc    Get VCS score history (30 days)
 * @access  Private (Caregiver)
 */
router.get('/history', protect, authorize('caregiver'), async (req, res) => {
  try {
    const history = await VCSScore.getScoreTrend(req.user.id, 30);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history.map(h => ({
        date: h.calculatedAt,
        score: h.totalVCS,
        riskBand: h.riskBand
      }))
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching history'
    });
  }
});

/**
 * @route   POST /api/vcs/calculate
 * @desc    Trigger VCS recalculation
 * @access  Private (Caregiver)
 */
router.post('/calculate', protect, authorize('caregiver'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const vcsResult = await vcsEngine.calculateVCS(user);
    const vcsScore = await vcsEngine.saveScore(vcsResult);

    res.status(200).json({
      success: true,
      data: {
        totalVCS: vcsScore.totalVCS,
        riskBand: vcsScore.riskBand,
        riskBandLabel: vcsScore.riskBandLabel,
        humanExplanation: vcsScore.humanExplanation,
        breakdown: vcsScore.breakdown,
        calculatedAt: vcsScore.calculatedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error calculating VCS'
    });
  }
});

/**
 * @route   GET /api/vcs/insights
 * @desc    Get personalized insights
 * @access  Private (Caregiver)
 */
router.get('/insights', protect, authorize('caregiver'), async (req, res) => {
  try {
    const vcsScore = await VCSScore.getLatestScore(req.user.id);
    
    if (!vcsScore) {
      return res.status(404).json({
        success: false,
        error: 'No VCS score found'
      });
    }

    const fullExplanation = explainability.generateFullExplanation(vcsScore);

    res.status(200).json({
      success: true,
      data: {
        currentScore: vcsScore.totalVCS,
        riskBand: vcsScore.riskBandLabel,
        factorsHelping: fullExplanation.factorsHelping,
        factorsHurting: fullExplanation.factorsHurting,
        improvement: fullExplanation.improvement,
        nextMilestone: fullExplanation.comparison.nextBand,
        confidence: fullExplanation.confidence
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching insights'
    });
  }
});

module.exports = router;
