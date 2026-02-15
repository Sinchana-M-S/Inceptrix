const express = require('express');
const router = express.Router();
const { User } = require('../models');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, role, region, regionType, ageGroup, verifierMetadata } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Phone number already registered'
      });
    }

    // Create user
    const user = await User.create({
      name,
      phone,
      password,
      role: role || 'caregiver',
      region,
      regionType,
      ageGroup,
      verifierMetadata: role === 'verifier' ? verifierMetadata : undefined,
      consentGiven: true,
      consentDate: new Date()
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error registering user'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide phone and password'
      });
    }

    // Find user
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Error logging in'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
const { protect } = require('../middleware/auth');

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error getting user'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedFields = [
      'name', 'ageGroup', 'region', 'regionType', 'simTenure', 
      'locationStability', 'landVerified', 'smsCount', 'rechargeFrequency',
      'utilityPaymentRatio', 'paymentStreaks', 'behaviorConsistency',
      'incomeSignal', 'coopScore', 'expenseShockRecovery'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error updating profile'
    });
  }
});

/**
 * @route   POST /api/auth/consent
 * @desc    Record user consent
 * @access  Private
 */
router.post('/consent', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        consentGiven: true,
        consentDate: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Error recording consent'
    });
  }
});

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      region: user.region
    }
  });
};

module.exports = router;
