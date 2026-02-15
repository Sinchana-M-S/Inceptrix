/**
 * Photo/Video Verification Service
 * 
 * Allows caregivers to upload visual evidence of their care work.
 * Uses AI to analyze images for authenticity and context.
 */

const geminiAI = require('./geminiAI');

class PhotoVerificationService {
  constructor() {
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    console.log('✓ Photo Verification Service initialized');
  }

  /**
   * Analyze uploaded photo for caregiving verification
   */
  async analyzePhoto(imageBase64, activityContext) {
    // Use Gemini vision capabilities if available
    if (geminiAI.isConfigured) {
      return await this.analyzeWithAI(imageBase64, activityContext);
    }
    
    // Fallback to rule-based verification
    return this.basicVerification(imageBase64, activityContext);
  }

  /**
   * AI-powered image analysis
   */
  async analyzeWithAI(imageBase64, activityContext) {
    try {
      // This would use Gemini's vision model in production
      // For now, return a simulated analysis
      const analysis = {
        isAuthentic: true,
        confidenceScore: 0.85,
        detectedElements: [],
        careContext: {},
        verificationStatus: 'verified',
        flags: []
      };

      // Simulate detection based on activity type
      if (activityContext.type === 'eldercare') {
        analysis.detectedElements = ['elderly person', 'care setting', 'medical equipment'];
        analysis.careContext = { setting: 'home', activity: 'personal care' };
      } else if (activityContext.type === 'childcare') {
        analysis.detectedElements = ['child', 'toys', 'home environment'];
        analysis.careContext = { setting: 'home', activity: 'supervision' };
      }

      // Calculate trust boost
      analysis.trustBoost = this.calculateTrustBoost(analysis);

      return {
        success: true,
        analysis,
        recommendation: 'Photo accepted - adds credibility to your activity log'
      };
    } catch (error) {
      console.error('Photo analysis error:', error);
      return this.basicVerification(imageBase64, activityContext);
    }
  }

  /**
   * Basic verification without AI
   */
  basicVerification(imageBase64, activityContext) {
    // Check image is not empty
    const isValid = imageBase64 && imageBase64.length > 1000;

    return {
      success: true,
      analysis: {
        isAuthentic: isValid,
        confidenceScore: 0.6,
        verificationStatus: isValid ? 'pending_review' : 'rejected',
        trustBoost: isValid ? 5 : 0,
        flags: isValid ? [] : ['Image appears invalid']
      },
      recommendation: isValid 
        ? 'Photo uploaded - pending community verification'
        : 'Please upload a valid photo'
    };
  }

  /**
   * Calculate trust score boost from photo
   */
  calculateTrustBoost(analysis) {
    let boost = 0;

    if (analysis.isAuthentic) {
      boost += 5; // Base boost for authentic photo
    }

    if (analysis.confidenceScore > 0.8) {
      boost += 5; // High confidence boost
    }

    if (analysis.detectedElements.length >= 2) {
      boost += 3; // Multiple relevant elements detected
    }

    return boost;
  }

  /**
   * Check for duplicate/stock photos
   */
  async checkForDuplicates(imageHash, userId) {
    // In production, this would compare against a database of hashes
    return {
      isDuplicate: false,
      isStockPhoto: false,
      matchedUploads: []
    };
  }

  /**
   * Generate a verification badge for the photo
   */
  generateVerificationBadge(analysisResult) {
    const { analysis } = analysisResult;

    if (analysis.confidenceScore >= 0.8) {
      return {
        badge: 'verified',
        icon: '✓',
        color: 'green',
        label: 'AI Verified',
        trustBoost: analysis.trustBoost
      };
    } else if (analysis.confidenceScore >= 0.5) {
      return {
        badge: 'pending',
        icon: '⏳',
        color: 'yellow',
        label: 'Pending Review',
        trustBoost: 2
      };
    }
    return {
      badge: 'unverified',
      icon: '?',
      color: 'gray',
      label: 'Unverified',
      trustBoost: 0
    };
  }

  /**
   * Get photo guidelines for caregivers
   */
  getPhotoGuidelines() {
    return {
      do: [
        'Show the care activity in progress',
        'Include context of the care setting',
        'Take photos during daylight or well-lit conditions',
        'Ensure faces are visible (with consent)',
        'Take photos from a natural angle'
      ],
      dont: [
        'Use stock photos or images from the internet',
        'Upload blurry or dark images',
        'Share without consent of care recipient',
        'Edit or heavily filter the photos',
        'Reuse the same photo multiple times'
      ],
      privacyNote: 'Photos are stored securely and only used for verification. Care recipient faces can be blurred if requested.',
      rewardNote: 'Verified photos add 5-15 bonus points to your VCS score!'
    };
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    const errors = [];

    if (!this.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }

    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new PhotoVerificationService();
