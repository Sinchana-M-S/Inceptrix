/**
 * Multi-Lender Marketplace Service
 * 
 * Creates a marketplace where multiple lenders can bid on loan offers.
 * Caregivers get the best rates through competition.
 */

class LenderMarketplace {
  constructor() {
    // Registered lender profiles
    this.lenders = [
      {
        id: 'lender_1',
        name: 'Grameen Microfinance',
        type: 'MFI',
        logo: 'GM',
        interestRates: { prime: 12, standard: 15, subprime: 18 },
        maxLoanAmount: 50000,
        processingFee: 1.5,
        minVCSScore: 300,
        specializations: ['eldercare', 'childcare'],
        avgApprovalTime: '24 hours',
        rating: 4.5,
        loansIssued: 1234
      },
      {
        id: 'lender_2',
        name: 'CareCredit NBFC',
        type: 'NBFC',
        logo: 'CC',
        interestRates: { prime: 10, standard: 14, subprime: 17 },
        maxLoanAmount: 100000,
        processingFee: 2.0,
        minVCSScore: 400,
        specializations: ['specialNeeds', 'healthcare'],
        avgApprovalTime: '48 hours',
        rating: 4.7,
        loansIssued: 2341
      },
      {
        id: 'lender_3',
        name: 'Women Welfare Bank',
        type: 'Cooperative',
        logo: 'WW',
        interestRates: { prime: 8, standard: 11, subprime: 14 },
        maxLoanAmount: 30000,
        processingFee: 0.5,
        minVCSScore: 250,
        specializations: ['all'],
        avgApprovalTime: '12 hours',
        rating: 4.8,
        loansIssued: 5678
      },
      {
        id: 'lender_4',
        name: 'Rural Credit Union',
        type: 'Cooperative',
        logo: 'RC',
        interestRates: { prime: 9, standard: 12, subprime: 16 },
        maxLoanAmount: 25000,
        processingFee: 1.0,
        minVCSScore: 200,
        specializations: ['community', 'housework'],
        avgApprovalTime: '6 hours',
        rating: 4.3,
        loansIssued: 3456
      },
      {
        id: 'lender_5',
        name: 'Digital Finance Corp',
        type: 'NBFC',
        logo: 'DF',
        interestRates: { prime: 11, standard: 14, subprime: 19 },
        maxLoanAmount: 75000,
        processingFee: 2.5,
        minVCSScore: 450,
        specializations: ['eldercare'],
        avgApprovalTime: '72 hours',
        rating: 4.1,
        loansIssued: 987
      }
    ];

    console.log('✓ Lender Marketplace Service initialized');
  }

  /**
   * Get all eligible lenders for a caregiver's profile
   */
  async getEligibleLenders(caregiverProfile) {
    const { vcsScore, primaryCareType, requestedAmount } = caregiverProfile;
    const riskBand = this.getRiskBand(vcsScore);

    return this.lenders
      .filter(lender => {
        // Check minimum score
        if (vcsScore < lender.minVCSScore) return false;
        // Check max loan amount
        if (requestedAmount > lender.maxLoanAmount) return false;
        return true;
      })
      .map(lender => ({
        ...lender,
        offeredRate: lender.interestRates[riskBand],
        eligible: true,
        estimatedEMI: this.calculateEMI(requestedAmount, lender.interestRates[riskBand], 12),
        totalRepayment: this.calculateTotalRepayment(requestedAmount, lender.interestRates[riskBand], 12, lender.processingFee),
        matchScore: this.calculateMatchScore(caregiverProfile, lender)
      }))
      .sort((a, b) => a.offeredRate - b.offeredRate); // Sort by best rate first
  }

  /**
   * Create a loan auction (reverse auction - lenders bid for borrower)
   */
  async createLoanAuction(caregiverProfile) {
    const eligibleLenders = await this.getEligibleLenders(caregiverProfile);

    // Simulate lender bids (in real world, this would notify lenders)
    const bids = eligibleLenders.map(lender => ({
      lenderId: lender.id,
      lenderName: lender.name,
      lenderLogo: lender.logo,
      interestRate: lender.offeredRate + (Math.random() * 2 - 1), // Slight variation
      processingFee: lender.processingFee,
      approvalTime: lender.avgApprovalTime,
      specialOffer: Math.random() > 0.7 ? 'First month interest-free!' : null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    })).sort((a, b) => a.interestRate - b.interestRate);

    return {
      auctionId: `auction_${Date.now()}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      caregiverProfile: {
        vcsScore: caregiverProfile.vcsScore,
        requestedAmount: caregiverProfile.requestedAmount
      },
      bids,
      bestOffer: bids[0] || null,
      status: 'active'
    };
  }

  /**
   * Compare loan offers side by side
   */
  async compareLenders(lenderIds, caregiverProfile) {
    const allLenders = await this.getEligibleLenders(caregiverProfile);
    return allLenders.filter(l => lenderIds.includes(l.id));
  }

  /**
   * Calculate match score between caregiver and lender
   */
  calculateMatchScore(caregiverProfile, lender) {
    let score = 50; // Base score

    // Specialization match
    if (lender.specializations.includes('all') || 
        lender.specializations.includes(caregiverProfile.primaryCareType)) {
      score += 20;
    }

    // Rating bonus
    score += lender.rating * 5;

    // Experience bonus (loans issued)
    if (lender.loansIssued > 2000) score += 10;
    else if (lender.loansIssued > 1000) score += 5;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Get risk band from VCS score
   */
  getRiskBand(vcsScore) {
    if (vcsScore >= 700) return 'prime';
    if (vcsScore >= 500) return 'standard';
    return 'subprime';
  }

  /**
   * Calculate EMI
   */
  calculateEMI(principal, annualRate, months) {
    const monthlyRate = annualRate / 12 / 100;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  }

  /**
   * Calculate total repayment
   */
  calculateTotalRepayment(principal, annualRate, months, processingFee) {
    const emi = this.calculateEMI(principal, annualRate, months);
    const totalInterest = (emi * months) - principal;
    const fee = principal * processingFee / 100;
    return Math.round(principal + totalInterest + fee);
  }

  /**
   * Get lender by ID
   */
  getLenderById(lenderId) {
    return this.lenders.find(l => l.id === lenderId);
  }

  /**
   * Get all registered lenders
   */
  getAllLenders() {
    return this.lenders;
  }
}

module.exports = new LenderMarketplace();
