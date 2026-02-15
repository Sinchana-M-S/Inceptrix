const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { User, VCSScore, LoanApplication } = require('../models');
const { explainability } = require('../services');
const VCS_CONFIG = require('../config/vcsConfig');

/**
 * @route   GET /api/lender/vcs-score/:id
 * @desc    Get VCS score for a caregiver (Credit Interface)
 * @access  Private (Lender)
 */
router.get('/vcs-score/:id', protect, authorize('lender'), async (req, res) => {
  try {
    const caregiver = await User.findById(req.params.id);
    if (!caregiver || caregiver.role !== 'caregiver') {
      return res.status(404).json({
        success: false,
        error: 'Caregiver not found'
      });
    }

    const vcsScore = await VCSScore.getLatestScore(req.params.id);
    
    if (!vcsScore) {
      return res.status(404).json({
        success: false,
        error: 'No VCS score available for this caregiver'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        caregiverId: req.params.id,
        caregiverName: caregiver.name,
        region: caregiver.region,
        totalVCS: vcsScore.totalVCS,
        riskBand: vcsScore.riskBand,
        riskBandLabel: vcsScore.riskBandLabel,
        riskBandColor: vcsScore.riskBandColor,
        loanEligibility: vcsScore.loanEligibility,
        humanExplanation: vcsScore.humanExplanation,
        calculatedAt: vcsScore.calculatedAt
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching VCS score'
    });
  }
});

/**
 * @route   GET /api/lender/score-breakdown/:id
 * @desc    Get detailed score breakdown for a caregiver
 * @access  Private (Lender)
 */
router.get('/score-breakdown/:id', protect, authorize('lender'), async (req, res) => {
  try {
    const vcsScore = await VCSScore.getLatestScore(req.params.id);
    
    if (!vcsScore) {
      return res.status(404).json({
        success: false,
        error: 'No VCS score available'
      });
    }

    const fullExplanation = explainability.generateFullExplanation(vcsScore);

    res.status(200).json({
      success: true,
      data: {
        totalVCS: vcsScore.totalVCS,
        breakdown: {
          identityStability: {
            score: vcsScore.breakdown.identityStability.total,
            maxPossible: 15,
            percentage: Math.round((vcsScore.breakdown.identityStability.total / 15) * 100)
          },
          behavioralFinance: {
            score: vcsScore.breakdown.behavioralFinance.total,
            maxPossible: 23,
            percentage: Math.round((vcsScore.breakdown.behavioralFinance.total / 23) * 100)
          },
          economicProxies: {
            score: vcsScore.breakdown.economicProxies.total,
            maxPossible: 17,
            percentage: Math.round((vcsScore.breakdown.economicProxies.total / 17) * 100)
          },
          socialTrust: {
            score: vcsScore.breakdown.socialTrust.total,
            maxPossible: 19,
            percentage: Math.round((vcsScore.breakdown.socialTrust.total / 19) * 100)
          },
          careLabor: {
            score: vcsScore.breakdown.careLabor.total,
            maxPossible: 26,
            percentage: Math.round((vcsScore.breakdown.careLabor.total / 26) * 100)
          },
          penalties: {
            total: vcsScore.breakdown.penalties.totalPenalty,
            details: vcsScore.breakdown.penalties.details
          }
        },
        explanation: fullExplanation.componentBreakdown,
        confidence: fullExplanation.confidence,
        riskFactors: fullExplanation.factorsHurting,
        strengths: fullExplanation.factorsHelping
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
 * @route   GET /api/lender/risk-bands
 * @desc    Get risk band definitions
 * @access  Private (Lender)
 */
router.get('/risk-bands', protect, authorize('lender'), async (req, res) => {
  try {
    const bands = Object.entries(VCS_CONFIG.bands).map(([key, band]) => ({
      key,
      label: band.label,
      range: { min: band.min, max: band.max },
      color: band.color,
      loanEligible: band.loanEligibility,
      maxLoanMultiplier: band.maxLoanMultiplier,
      suggestedInterestBand: band.suggestedInterestBand
    }));

    res.status(200).json({
      success: true,
      data: {
        bands,
        loanParams: {
          baseLoanAmount: VCS_CONFIG.loanParams.baseLoanAmount,
          maxCap: VCS_CONFIG.loanParams.maxLoanCap,
          interestBands: VCS_CONFIG.loanParams.interestBands
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching risk bands'
    });
  }
});

/**
 * @route   GET /api/lender/credit-limit/:id
 * @desc    Get suggested credit limit for a caregiver
 * @access  Private (Lender)
 */
router.get('/credit-limit/:id', protect, authorize('lender'), async (req, res) => {
  try {
    const vcsScore = await VCSScore.getLatestScore(req.params.id);
    
    if (!vcsScore) {
      return res.status(404).json({
        success: false,
        error: 'No VCS score available'
      });
    }

    if (!vcsScore.loanEligibility.eligible) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: 'VCS score below minimum threshold for loan eligibility',
          currentScore: vcsScore.totalVCS,
          requiredScore: 300
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        eligible: true,
        caregiverId: req.params.id,
        vcsScore: vcsScore.totalVCS,
        riskBand: vcsScore.riskBandLabel,
        suggestedCreditLimit: {
          min: vcsScore.loanEligibility.confidenceInterval.lower,
          recommended: vcsScore.loanEligibility.maxLoanAmount,
          max: vcsScore.loanEligibility.confidenceInterval.upper
        },
        interestBand: vcsScore.loanEligibility.suggestedInterestBand,
        interestRange: vcsScore.loanEligibility.interestRange,
        economicValue: vcsScore.economicValue,
        validUntil: vcsScore.expiresAt
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error calculating credit limit'
    });
  }
});

/**
 * @route   GET /api/lender/search
 * @desc    Search caregivers by region or score
 * @access  Private (Lender)
 */
router.get('/search', protect, authorize('lender'), async (req, res) => {
  try {
    const { region, minScore, maxScore, riskBand } = req.query;

    // Build query
    const caregiverQuery = { role: 'caregiver' };
    if (region) caregiverQuery.region = new RegExp(region, 'i');

    const caregivers = await User.find(caregiverQuery).select('name region regionType ageGroup');

    // Get VCS scores for each
    const results = [];
    for (const caregiver of caregivers) {
      const vcsScore = await VCSScore.getLatestScore(caregiver._id);
      
      if (!vcsScore) continue;
      
      // Apply score filters
      if (minScore && vcsScore.totalVCS < parseInt(minScore)) continue;
      if (maxScore && vcsScore.totalVCS > parseInt(maxScore)) continue;
      if (riskBand && vcsScore.riskBand !== riskBand) continue;

      results.push({
        caregiver: {
          id: caregiver._id,
          name: caregiver.name,
          region: caregiver.region,
          ageGroup: caregiver.ageGroup
        },
        vcs: {
          score: vcsScore.totalVCS,
          riskBand: vcsScore.riskBand,
          riskBandLabel: vcsScore.riskBandLabel,
          loanEligible: vcsScore.loanEligibility.eligible,
          maxLoanAmount: vcsScore.loanEligibility.maxLoanAmount
        }
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.vcs.score - a.vcs.score);

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error searching caregivers'
    });
  }
});

/**
 * @route   POST /api/lender/loan-application
 * @desc    Create loan application
 * @access  Private (Lender)
 */
router.post('/loan-application', protect, authorize('lender'), async (req, res) => {
  try {
    const { caregiverId, requestedAmount, terms } = req.body;

    const vcsScore = await VCSScore.getLatestScore(caregiverId);
    if (!vcsScore || !vcsScore.loanEligibility.eligible) {
      return res.status(400).json({
        success: false,
        error: 'Caregiver not eligible for loan'
      });
    }

    const application = await LoanApplication.create({
      caregiverId,
      lenderId: req.user.id,
      vcsScoreId: vcsScore._id,
      requestedAmount,
      vcsAtApplication: {
        score: vcsScore.totalVCS,
        riskBand: vcsScore.riskBand,
        breakdown: vcsScore.breakdown
      },
      riskAssessment: {
        lenderConfidence: 0.8,
        suggestedAmount: vcsScore.loanEligibility.maxLoanAmount,
        suggestedInterest: vcsScore.loanEligibility.interestRange?.min || 15
      },
      terms,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error creating loan application'
    });
  }
});

module.exports = router;
