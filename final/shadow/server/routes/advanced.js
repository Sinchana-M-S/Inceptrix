/**
 * Advanced Features API Routes
 * 
 * Exposes all 10 unique features via REST API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');

// Import all advanced services
const voiceProcessor = require('../services/voiceProcessor');
const gamificationService = require('../services/gamificationService');
const whatIfSimulator = require('../services/whatIfSimulator');
const impactDashboard = require('../services/impactDashboard');
const lenderMarketplace = require('../services/lenderMarketplace');
const photoVerification = require('../services/photoVerification');
const whatsappBot = require('../services/whatsappBot');
const blockchainProof = require('../services/blockchainProof');
const careRecommendations = require('../services/careRecommendations');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ============================================
// 1. VOICE LOGGING ENDPOINTS
// ============================================

/**
 * @route   POST /api/advanced/voice/transcribe
 * @desc    Transcribe voice audio to text
 * @access  Private (Caregiver)
 */
router.post('/voice/transcribe', protect, upload.single('audio'), async (req, res) => {
  try {
    const language = req.body.language || 'hi';
    const result = await voiceProcessor.transcribeAudio(req.file?.buffer, language);
    
    res.json({
      success: true,
      transcription: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/voice/languages
 * @desc    Get supported languages for voice input
 * @access  Public
 */
router.get('/voice/languages', (req, res) => {
  res.json({
    success: true,
    languages: voiceProcessor.getSupportedLanguages()
  });
});

// ============================================
// 2. GAMIFICATION ENDPOINTS
// ============================================

/**
 * @route   GET /api/advanced/badges
 * @desc    Get user's badges and achievements
 * @access  Private
 */
router.get('/badges', protect, async (req, res) => {
  try {
    // Mock user data - in production, fetch from database
    const userData = {
      activityCount: 35,
      totalHours: 120,
      currentStreak: 8,
      validationCount: 12,
      vcsScore: req.user?.vcsScore?.totalVCS || 500,
      careTypeHours: {
        eldercare: 80,
        childcare: 30,
        housework: 10
      },
      loanCount: 0,
      loansRepaid: 0
    };

    const badges = gamificationService.calculateBadges(userData);
    
    res.json({
      success: true,
      ...badges
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/badges/all
 * @desc    Get all available badges
 * @access  Public
 */
router.get('/badges/all', (req, res) => {
  res.json({
    success: true,
    badges: gamificationService.getAllBadges()
  });
});

// ============================================
// 3. WHAT-IF SIMULATOR ENDPOINTS
// ============================================

/**
 * @route   POST /api/advanced/simulator
 * @desc    Simulate score changes
 * @access  Private
 */
router.post('/simulator', protect, async (req, res) => {
  try {
    const { scenarios } = req.body;
    const currentData = {
      vcsScore: req.user?.vcsScore?.totalVCS || 450
    };

    const result = await whatIfSimulator.simulate(currentData, scenarios);
    
    res.json({
      success: true,
      simulation: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/simulator/presets
 * @desc    Get simulation presets
 * @access  Public
 */
router.get('/simulator/presets', (req, res) => {
  res.json({
    success: true,
    presets: whatIfSimulator.getPresets()
  });
});

// ============================================
// 4. IMPACT DASHBOARD ENDPOINTS
// ============================================

/**
 * @route   GET /api/advanced/impact
 * @desc    Get platform impact metrics
 * @access  Public
 */
router.get('/impact', async (req, res) => {
  try {
    const metrics = await impactDashboard.getImpactMetrics();
    res.json({
      success: true,
      impact: metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/impact/counters
 * @desc    Get live counter values
 * @access  Public
 */
router.get('/impact/counters', async (req, res) => {
  try {
    const counters = await impactDashboard.getLiveCounters();
    res.json({
      success: true,
      counters
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/impact/stories
 * @desc    Get impact stories
 * @access  Public
 */
router.get('/impact/stories', async (req, res) => {
  try {
    const stories = await impactDashboard.getImpactStories();
    res.json({
      success: true,
      stories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 5. MULTI-LENDER MARKETPLACE ENDPOINTS
// ============================================

/**
 * @route   GET /api/advanced/marketplace/lenders
 * @desc    Get all lenders
 * @access  Private (Caregiver)
 */
router.get('/marketplace/lenders', protect, async (req, res) => {
  try {
    const profile = {
      vcsScore: req.user?.vcsScore?.totalVCS || 500,
      primaryCareType: 'eldercare',
      requestedAmount: parseInt(req.query.amount) || 15000
    };

    const lenders = await lenderMarketplace.getEligibleLenders(profile);
    
    res.json({
      success: true,
      lenders
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/advanced/marketplace/auction
 * @desc    Create loan auction
 * @access  Private (Caregiver)
 */
router.post('/marketplace/auction', protect, async (req, res) => {
  try {
    const { requestedAmount } = req.body;
    const profile = {
      vcsScore: req.user?.vcsScore?.totalVCS || 500,
      primaryCareType: 'eldercare',
      requestedAmount
    };

    const auction = await lenderMarketplace.createLoanAuction(profile);
    
    res.json({
      success: true,
      auction
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 6. PHOTO VERIFICATION ENDPOINTS
// ============================================

/**
 * @route   POST /api/advanced/photo/verify
 * @desc    Verify uploaded photo
 * @access  Private (Caregiver)
 */
router.post('/photo/verify', protect, upload.single('photo'), async (req, res) => {
  try {
    const activityContext = {
      type: req.body.activityType || 'eldercare',
      description: req.body.description
    };

    const imageBase64 = req.file?.buffer?.toString('base64');
    const result = await photoVerification.analyzePhoto(imageBase64, activityContext);
    
    res.json({
      success: true,
      verification: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/photo/guidelines
 * @desc    Get photo upload guidelines
 * @access  Public
 */
router.get('/photo/guidelines', (req, res) => {
  res.json({
    success: true,
    guidelines: photoVerification.getPhotoGuidelines()
  });
});

// ============================================
// 7. WHATSAPP BOT ENDPOINTS
// ============================================

/**
 * @route   POST /api/advanced/bot/webhook
 * @desc    WhatsApp/SMS webhook
 * @access  Public (Twilio verified)
 */
router.post('/bot/webhook', async (req, res) => {
  try {
    const { Body: message, From: userPhone, Language: language } = req.body;
    
    const response = await whatsappBot.processMessage(message, userPhone, language || 'en');
    
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${response}</Message>
      </Response>`);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/advanced/bot/demo
 * @desc    Demo the WhatsApp bot
 * @access  Public
 */
router.post('/bot/demo', async (req, res) => {
  try {
    const { message, language } = req.body;
    const response = await whatsappBot.processMessage(message, 'demo-user', language || 'en');
    
    res.json({
      success: true,
      input: message,
      response
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 8. BLOCKCHAIN PROOF ENDPOINTS
// ============================================

/**
 * @route   POST /api/advanced/blockchain/proof
 * @desc    Create blockchain proof for activity
 * @access  Private (Caregiver)
 */
router.post('/blockchain/proof', protect, async (req, res) => {
  try {
    const { activity } = req.body;
    activity.caregiver = req.user._id;
    
    const proof = blockchainProof.createActivityProof(activity);
    
    res.json({
      success: true,
      proof
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/blockchain/verify/:hash
 * @desc    Verify a proof by hash
 * @access  Public
 */
router.get('/blockchain/verify/:hash', (req, res) => {
  try {
    const verification = blockchainProof.verifyProof(req.params.hash);
    
    res.json({
      success: true,
      verification
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/blockchain/stats
 * @desc    Get blockchain statistics
 * @access  Public
 */
router.get('/blockchain/stats', (req, res) => {
  res.json({
    success: true,
    stats: blockchainProof.getChainStats()
  });
});

/**
 * @route   GET /api/advanced/blockchain/certificate/:hash
 * @desc    Get verification certificate
 * @access  Public
 */
router.get('/blockchain/certificate/:hash', (req, res) => {
  try {
    const certificate = blockchainProof.generateCertificate(req.params.hash);
    
    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Proof not found' });
    }
    
    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 9. AI RECOMMENDATIONS ENDPOINTS
// ============================================

/**
 * @route   GET /api/advanced/recommendations
 * @desc    Get personalized recommendations
 * @access  Private (Caregiver)
 */
router.get('/recommendations', protect, async (req, res) => {
  try {
    // Build caregiver profile
    const profile = {
      vcsScore: req.user?.vcsScore?.totalVCS || 450,
      totalHours: 120,
      primaryCareType: 'eldercare',
      validationCount: 8,
      hasPhoto: false,
      age: 35,
      gender: 'female'
    };

    const recommendations = await careRecommendations.getRecommendations(profile);
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 10. PWA SUPPORT ENDPOINTS
// ============================================

/**
 * @route   GET /api/advanced/pwa/sync
 * @desc    Sync offline data
 * @access  Private
 */
router.post('/pwa/sync', protect, async (req, res) => {
  try {
    const { offlineData } = req.body;
    
    // Process offline data
    const synced = {
      activities: offlineData?.activities?.length || 0,
      success: true,
      timestamp: new Date()
    };
    
    res.json({
      success: true,
      synced
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/advanced/status
 * @desc    Get status of all advanced features
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    features: {
      voiceLogging: { enabled: true, provider: 'Whisper API' },
      gamification: { enabled: true, badges: 20 },
      whatIfSimulator: { enabled: true },
      impactDashboard: { enabled: true },
      lenderMarketplace: { enabled: true, lenders: 5 },
      photoVerification: { enabled: true },
      whatsappBot: { enabled: true, configured: !!process.env.TWILIO_SID },
      blockchainProof: { enabled: true },
      aiRecommendations: { enabled: true, schemes: 10 },
      offlinePWA: { enabled: true }
    },
    timestamp: new Date()
  });
});

module.exports = router;
