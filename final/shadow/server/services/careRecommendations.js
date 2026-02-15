/**
 * AI-Powered Care Recommendations Service
 * 
 * Provides personalized recommendations for:
 * - Government schemes eligibility
 * - Financial products
 * - Health programs
 * - Community resources
 */

const geminiAI = require('./geminiAI');

class CareRecommendationsService {
  constructor() {
    // Government schemes database
    this.governmentSchemes = [
      {
        id: 'ayushman_bharat',
        name: 'Ayushman Bharat Yojana',
        nameHi: 'आयुष्मान भारत योजना',
        type: 'health',
        eligibility: { minCareHours: 0, careTypes: ['all'] },
        benefits: 'Free health insurance up to ₹5 lakh per family',
        link: 'https://pmjay.gov.in',
        icon: '🏥'
      },
      {
        id: 'widow_pension',
        name: 'Widow Pension Scheme',
        nameHi: 'विधवा पेंशन योजना',
        type: 'pension',
        eligibility: { minCareHours: 0, careTypes: ['all'], widowOnly: true },
        benefits: '₹500-2000 monthly pension',
        icon: '💰'
      },
      {
        id: 'old_age_pension',
        name: 'Indira Gandhi National Old Age Pension',
        nameHi: 'इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन',
        type: 'pension',
        eligibility: { minAge: 60, careTypes: ['eldercare'] },
        benefits: '₹500 monthly for 60-79 years, ₹800 for 80+',
        icon: '👴'
      },
      {
        id: 'mahila_samridhi',
        name: 'Mahila Samridhi Yojana',
        nameHi: 'महिला समृद्धि योजना',
        type: 'finance',
        eligibility: { minCareHours: 50, careTypes: ['all'], womenOnly: true },
        benefits: 'Micro-credit at 1% interest for SHG members',
        icon: '👩'
      },
      {
        id: 'mudra_shishu',
        name: 'MUDRA Shishu Loan',
        nameHi: 'मुद्रा शिशु ऋण',
        type: 'finance',
        eligibility: { minVcsScore: 300, careTypes: ['all'] },
        benefits: 'Collateral-free loans up to ₹50,000',
        link: 'https://mudra.org.in',
        icon: '🏦'
      },
      {
        id: 'anganwadi_worker',
        name: 'Anganwadi Worker Registration',
        nameHi: 'आंगनवाड़ी कार्यकर्ता पंजीकरण',
        type: 'employment',
        eligibility: { minCareHours: 100, careTypes: ['childcare'] },
        benefits: 'Part-time employment opportunity with ₹3000-5000 stipend',
        icon: '👶'
      },
      {
        id: 'pmjdy',
        name: 'Pradhan Mantri Jan Dhan Yojana',
        nameHi: 'प्रधानमंत्री जन धन योजना',
        type: 'finance',
        eligibility: { minCareHours: 0, careTypes: ['all'] },
        benefits: 'Zero-balance bank account with ₹1 lakh accident insurance',
        icon: '🏛️'
      },
      {
        id: 'skill_development',
        name: 'Deen Dayal Upadhyaya Grameen Kaushalya Yojana',
        nameHi: 'दीन दयाल उपाध्याय ग्रामीण कौशल्य योजना',
        type: 'skill',
        eligibility: { minAge: 15, maxAge: 35, careTypes: ['all'] },
        benefits: 'Free skill training with placement assistance',
        icon: '📚'
      },
      {
        id: 'caregiver_allowance',
        name: 'National Caregiver Allowance (Proposed)',
        nameHi: 'राष्ट्रीय देखभालकर्ता भत्ता',
        type: 'pension',
        eligibility: { minCareHours: 100, careTypes: ['eldercare', 'specialNeeds'] },
        benefits: '₹2000 monthly for primary caregivers',
        status: 'proposed',
        icon: '🤲'
      },
      {
        id: 'shg_registration',
        name: 'Self Help Group Registration',
        nameHi: 'स्वयं सहायता समूह पंजीकरण',
        type: 'community',
        eligibility: { minCareHours: 50, careTypes: ['all'] },
        benefits: 'Access to group loans, training, and community support',
        icon: '👥'
      }
    ];

    console.log('✓ Care Recommendations Service initialized');
  }

  /**
   * Get personalized recommendations for a caregiver
   */
  async getRecommendations(caregiverProfile) {
    const recommendations = {
      governmentSchemes: this.matchGovernmentSchemes(caregiverProfile),
      financialProducts: this.matchFinancialProducts(caregiverProfile),
      healthPrograms: this.matchHealthPrograms(caregiverProfile),
      communityResources: this.matchCommunityResources(caregiverProfile),
      nextSteps: this.generateNextSteps(caregiverProfile),
      personalizedTips: await this.generatePersonalizedTips(caregiverProfile)
    };

    return recommendations;
  }

  /**
   * Match government schemes based on profile
   */
  matchGovernmentSchemes(profile) {
    const matched = [];

    for (const scheme of this.governmentSchemes) {
      const eligibility = this.checkSchemeEligibility(scheme, profile);
      
      if (eligibility.eligible || eligibility.almostEligible) {
        matched.push({
          ...scheme,
          eligibility,
          priority: eligibility.eligible ? 'high' : 'medium'
        });
      }
    }

    // Sort by priority
    return matched.sort((a, b) => 
      a.priority === 'high' ? -1 : 1
    );
  }

  /**
   * Check eligibility for a specific scheme
   */
  checkSchemeEligibility(scheme, profile) {
    const req = scheme.eligibility;
    let eligible = true;
    let reasons = [];
    let almostEligible = false;

    // Check care hours
    if (req.minCareHours && profile.totalHours < req.minCareHours) {
      eligible = false;
      const gap = req.minCareHours - profile.totalHours;
      if (gap <= 20) {
        almostEligible = true;
        reasons.push(`Need ${gap} more care hours`);
      } else {
        reasons.push(`Requires ${req.minCareHours} care hours`);
      }
    }

    // Check VCS score
    if (req.minVcsScore && profile.vcsScore < req.minVcsScore) {
      eligible = false;
      const gap = req.minVcsScore - profile.vcsScore;
      if (gap <= 50) {
        almostEligible = true;
        reasons.push(`Need ${gap} more VCS points`);
      } else {
        reasons.push(`Requires VCS score of ${req.minVcsScore}`);
      }
    }

    // Check care type
    if (req.careTypes && !req.careTypes.includes('all')) {
      if (!req.careTypes.includes(profile.primaryCareType)) {
        eligible = false;
        reasons.push(`For ${req.careTypes.join('/')} caregivers`);
      }
    }

    return {
      eligible,
      almostEligible: !eligible && almostEligible,
      reasons
    };
  }

  /**
   * Match financial products
   */
  matchFinancialProducts(profile) {
    const products = [];

    if (profile.vcsScore >= 300) {
      products.push({
        name: 'VCS-Backed Micro Loan',
        provider: 'Partner MFIs',
        amount: this.calculateLoanEligibility(profile.vcsScore),
        interest: this.calculateInterestRate(profile.vcsScore),
        features: ['No collateral', 'Flexible repayment', 'Score-based pricing'],
        priority: 'high'
      });
    }

    if (profile.vcsScore >= 500) {
      products.push({
        name: 'Home Improvement Loan',
        provider: 'Housing Finance Partners',
        amount: 100000,
        interest: '10-14%',
        features: ['For home repairs/improvements', 'Up to 3 year tenure'],
        priority: 'medium'
      });
    }

    products.push({
      name: 'Emergency Microloan',
      provider: 'Shadow-Labor Emergency Fund',
      amount: 5000,
      interest: '0%',
      features: ['For medical emergencies', 'Instant approval', '3-month repayment'],
      priority: 'medium'
    });

    return products;
  }

  /**
   * Match health programs
   */
  matchHealthPrograms(profile) {
    return [
      {
        name: 'Free Health Checkup',
        provider: 'Government PHC',
        description: 'Annual health checkup at nearest Primary Health Center',
        eligibility: 'All caregivers',
        howToAccess: 'Visit PHC with Aadhaar card'
      },
      {
        name: 'Mental Health Support',
        provider: 'iCall / Vandrevala Foundation',
        description: 'Free counseling for caregiver burnout and stress',
        eligibility: 'All caregivers',
        phone: '9152987821'
      },
      {
        name: 'Caregiver Support Group',
        provider: 'Local NGO Partners',
        description: 'Weekly peer support meetings',
        eligibility: 'All caregivers'
      }
    ];
  }

  /**
   * Match community resources
   */
  matchCommunityResources(profile) {
    return [
      {
        name: 'Local Self-Help Group',
        type: 'SHG',
        description: 'Join a group of women for mutual savings and support',
        benefits: 'Group loans, training, community'
      },
      {
        name: 'Caregiver Training Program',
        type: 'training',
        description: 'Learn professional caregiving skills',
        benefits: 'Certificate, employment opportunities',
        duration: '2 weeks'
      },
      {
        name: 'Respite Care Network',
        type: 'support',
        description: 'Take a break while another verified caregiver helps',
        benefits: 'Self-care, reduced burnout'
      }
    ];
  }

  /**
   * Generate next steps based on profile
   */
  generateNextSteps(profile) {
    const steps = [];

    // Score-based suggestions
    if (profile.vcsScore < 300) {
      steps.push({
        action: 'Log 5 more activities this week',
        impact: '+20-40 VCS points',
        priority: 'high'
      });
    }

    if (profile.validationCount < 5) {
      steps.push({
        action: 'Ask 2 neighbors to verify your care work',
        impact: '+15-30 VCS points',
        priority: 'high'
      });
    }

    if (!profile.hasPhoto) {
      steps.push({
        action: 'Add a photo to your next activity log',
        impact: '+10-15 VCS points',
        priority: 'medium'
      });
    }

    steps.push({
      action: 'Apply for Ayushman Bharat card if not enrolled',
      impact: 'Free health coverage',
      priority: 'medium'
    });

    return steps;
  }

  /**
   * Generate personalized tips using AI
   */
  async generatePersonalizedTips(profile) {
    if (geminiAI.isConfigured) {
      // Use AI for personalized tips
      try {
        // Would call Gemini here
        return this.getDefaultTips(profile);
      } catch (error) {
        return this.getDefaultTips(profile);
      }
    }

    return this.getDefaultTips(profile);
  }

  /**
   * Get default tips
   */
  getDefaultTips(profile) {
    const tips = [
      {
        tip: 'Log activities daily for the best score growth',
        category: 'consistency'
      },
      {
        tip: 'Community validations from verified neighbors boost your score significantly',
        category: 'trust'
      },
      {
        tip: 'Detailed activity descriptions with time spent help in verification',
        category: 'quality'
      }
    ];

    if (profile.primaryCareType === 'eldercare') {
      tips.push({
        tip: 'Elder care has high economic value - your score reflects this',
        category: 'value'
      });
    }

    return tips;
  }

  /**
   * Calculate loan eligibility amount
   */
  calculateLoanEligibility(vcsScore) {
    if (vcsScore >= 850) return 50000;
    if (vcsScore >= 700) return 30000;
    if (vcsScore >= 500) return 15000;
    if (vcsScore >= 300) return 5000;
    return 0;
  }

  /**
   * Calculate interest rate based on VCS
   */
  calculateInterestRate(vcsScore) {
    if (vcsScore >= 850) return '8-10%';
    if (vcsScore >= 700) return '10-12%';
    if (vcsScore >= 500) return '12-15%';
    return '15-18%';
  }
}

module.exports = new CareRecommendationsService();
