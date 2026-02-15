const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Testimony, User, ActivityLog } = require('../models');
const { fraudDetector } = require('../services');
const VCS_CONFIG = require('../config/vcsConfig');

/**
 * @route   POST /api/testimonies
 * @desc    Submit a testimony for a caregiver
 * @access  Private (Verifier)
 */
router.post('/', protect, authorize('verifier'), async (req, res) => {
  try {
    const { 
      caregiverId, 
      activityLogId, 
      structuredRating, 
      freeText, 
      relationshipToCaregiver,
      knownDuration 
    } = req.body;

    // Check if caregiver exists
    const caregiver = await User.findById(caregiverId);
    if (!caregiver || caregiver.role !== 'caregiver') {
      return res.status(404).json({
        success: false,
        error: 'Caregiver not found'
      });
    }

    // Get verifier trust level
    const verifierTrust = VCS_CONFIG.verifierTrust[req.user.verifierMetadata?.verifierType] || 
                          VCS_CONFIG.verifierTrust.peer;

    // Create testimony
    const testimony = await Testimony.create({
      caregiverId,
      verifierId: req.user.id,
      activityLogId,
      structuredRating,
      freeText,
      verifierTrustLevel: verifierTrust.trust,
      relationshipToCaregiver,
      knownDuration,
      validationConfidence: 0.7 // Default, gets updated by fraud detection
    });

    // Analyze for authenticity
    const authenticityResult = await fraudDetector.analyzeTestimonyAuthenticity(testimony);
    testimony.authenticityScore = authenticityResult.authenticityScore;
    testimony.antiCollusionFlags = authenticityResult.flags;
    await testimony.save();

    // Update verifier stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'verifierMetadata.totalVerifications': 1 }
    });

    // If activity specified, update its verification status
    if (activityLogId) {
      await ActivityLog.findByIdAndUpdate(activityLogId, {
        $push: {
          verifiedBy: {
            verifierId: req.user.id,
            verifiedAt: new Date(),
            confidence: verifierTrust.trust
          }
        },
        verificationStatus: 'verified'
      });
    }

    res.status(201).json({
      success: true,
      data: testimony
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error submitting testimony'
    });
  }
});

/**
 * @route   GET /api/testimonies/pending
 * @desc    Get caregivers pending verification in verifier's region
 * @access  Private (Verifier)
 */
router.get('/pending', protect, authorize('verifier'), async (req, res) => {
  try {
    // Find caregivers in same region who need verification
    const caregivers = await User.find({
      role: 'caregiver',
      region: req.user.region,
      _id: { $ne: req.user.id }
    }).select('name region ageGroup createdAt');

    // Get pending activities for each
    const pendingVerifications = [];
    
    for (const caregiver of caregivers) {
      // Check if verifier already verified this caregiver recently
      const recentTestimony = await Testimony.findOne({
        caregiverId: caregiver._id,
        verifierId: req.user.id,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      if (!recentTestimony) {
        const unverifiedCount = await ActivityLog.countDocuments({
          caregiverId: caregiver._id,
          verificationStatus: 'pending'
        });

        if (unverifiedCount > 0) {
          pendingVerifications.push({
            caregiver: {
              id: caregiver._id,
              name: caregiver.name,
              region: caregiver.region,
              ageGroup: caregiver.ageGroup
            },
            pendingActivities: unverifiedCount
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: pendingVerifications.length,
      data: pendingVerifications
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching pending verifications'
    });
  }
});

/**
 * @route   GET /api/testimonies/my-validations
 * @desc    Get testimonies I have submitted
 * @access  Private (Verifier)
 */
router.get('/my-validations', protect, authorize('verifier'), async (req, res) => {
  try {
    const testimonies = await Testimony.find({ verifierId: req.user.id })
      .populate('caregiverId', 'name region')
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: testimonies.length,
      data: testimonies
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching validations'
    });
  }
});

/**
 * @route   GET /api/testimonies/received
 * @desc    Get testimonies received (for caregiver)
 * @access  Private (Caregiver)
 */
router.get('/received', protect, authorize('caregiver'), async (req, res) => {
  try {
    const testimonies = await Testimony.find({ caregiverId: req.user.id })
      .populate('verifierId', 'name verifierMetadata.verifierType')
      .sort({ timestamp: -1 });

    const summary = await Testimony.getValidationSummary(req.user.id);

    res.status(200).json({
      success: true,
      count: testimonies.length,
      summary,
      data: testimonies
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching testimonies'
    });
  }
});

/**
 * @route   GET /api/testimonies/caregiver/:id
 * @desc    Get all testimonies for a caregiver (for lender)
 * @access  Private (Lender)
 */
router.get('/caregiver/:id', protect, authorize('lender', 'admin'), async (req, res) => {
  try {
    const testimonies = await Testimony.find({ 
      caregiverId: req.params.id,
      status: { $in: ['submitted', 'verified'] }
    })
      .populate('verifierId', 'name verifierMetadata.verifierType verifierMetadata.organization')
      .sort({ timestamp: -1 });

    const summary = await Testimony.getValidationSummary(req.params.id);

    res.status(200).json({
      success: true,
      count: testimonies.length,
      summary,
      data: testimonies
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error fetching testimonies'
    });
  }
});

module.exports = router;
