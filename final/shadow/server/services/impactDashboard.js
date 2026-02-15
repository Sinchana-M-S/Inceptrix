/**
 * Impact Dashboard Service
 * 
 * Tracks and calculates platform-wide social impact metrics:
 * - Total labor value recognized
 * - Caregivers empowered
 * - Loans disbursed
 * - Economic upliftment metrics
 */

class ImpactDashboardService {
  constructor() {
    console.log('✓ Impact Dashboard Service initialized');
  }

  /**
   * Get real-time platform impact metrics
   */
  async getImpactMetrics(db = null) {
    // In production, these would be calculated from the database
    // For demo, we'll show realistic metrics structure
    
    const metrics = {
      // Labor Recognition
      laborRecognition: {
        totalHoursLogged: 124567,
        totalLaborValue: 9965360, // In rupees (using ₹80/hour average)
        caregiverCount: 2847,
        activitiesLogged: 45823,
        averageHoursPerCaregiver: 43.7
      },

      // Financial Impact
      financialImpact: {
        totalLoansApproved: 342,
        totalLoanAmount: 8540000,
        averageLoanSize: 24971,
        repaymentRate: 94.2,
        lendersOnPlatform: 12
      },

      // Community Trust
      communityTrust: {
        totalValidations: 18934,
        verifiersActive: 567,
        averageRating: 4.3,
        trustScore: 87
      },

      // Growth Metrics
      growth: {
        newCaregiversThisMonth: 234,
        newLoansThisMonth: 45,
        monthOverMonthGrowth: 23,
        regionsServed: 47
      },

      // Social Impact
      socialImpact: {
        womenEmpowered: 2398, // 84% of caregivers
        firstTimeBorrowers: 287,
        averageIncomeIncrease: 4500,
        familiesBenefited: 2847
      },

      // Care Categories
      careBreakdown: {
        elderCare: { hours: 45678, percentage: 37 },
        childCare: { hours: 38912, percentage: 31 },
        housework: { hours: 24567, percentage: 20 },
        specialNeeds: { hours: 9876, percentage: 8 },
        community: { hours: 5534, percentage: 4 }
      },

      // Time series for charts
      timeline: this.generateTimelineData(),
      
      generatedAt: new Date()
    };

    return metrics;
  }

  /**
   * Generate timeline data for charts
   */
  generateTimelineData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => ({
      month,
      caregivers: 1500 + (i * 250),
      hours: 15000 + (i * 5000),
      loans: 30 + (i * 15),
      value: 800000 + (i * 400000)
    }));
  }

  /**
   * Get live counter values for the landing page
   */
  async getLiveCounters() {
    // This simulates real-time growth
    const baseData = {
      laborRecognized: 9965360,
      caregiversEmpowered: 2847,
      loansEnabled: 342,
      communitiesServed: 47
    };

    // Add some variation to simulate real-time updates
    const variation = Math.floor(Math.random() * 1000);
    
    return {
      laborRecognized: {
        value: baseData.laborRecognized + variation,
        formatted: `₹${((baseData.laborRecognized + variation) / 100000).toFixed(1)} Lakh`,
        label: 'Invisible Labor Recognized'
      },
      caregiversEmpowered: {
        value: baseData.caregiversEmpowered,
        formatted: baseData.caregiversEmpowered.toLocaleString(),
        label: 'Caregivers Empowered'
      },
      loansEnabled: {
        value: baseData.loansEnabled,
        formatted: baseData.loansEnabled.toString(),
        label: 'Loans Enabled'
      },
      communitiesServed: {
        value: baseData.communitiesServed,
        formatted: baseData.communitiesServed.toString(),
        label: 'Districts Covered'
      }
    };
  }

  /**
   * Calculate regional impact breakdown
   */
  async getRegionalImpact() {
    return [
      { region: 'Maharashtra', caregivers: 456, hours: 18234, loanValue: 1250000 },
      { region: 'Uttar Pradesh', caregivers: 389, hours: 15678, loanValue: 980000 },
      { region: 'Karnataka', caregivers: 312, hours: 12456, loanValue: 870000 },
      { region: 'Tamil Nadu', caregivers: 287, hours: 11234, loanValue: 760000 },
      { region: 'Gujarat', caregivers: 234, hours: 9876, loanValue: 650000 },
      { region: 'Rajasthan', caregivers: 198, hours: 8234, loanValue: 540000 },
      { region: 'West Bengal', caregivers: 176, hours: 7234, loanValue: 480000 },
      { region: 'Others', caregivers: 795, hours: 31621, loanValue: 2010000 }
    ];
  }

  /**
   * Get impact stories/testimonials
   */
  async getImpactStories() {
    return [
      {
        id: 1,
        name: 'Lakshmi Devi',
        region: 'Jaipur, Rajasthan',
        avatar: 'LD',
        story: 'After 15 years of caring for my mother-in-law, I finally got a loan to start my tailoring business. My VCS score proved my dedication.',
        loanAmount: 25000,
        vcsScore: 687,
        careType: 'Elder Care'
      },
      {
        id: 2,
        name: 'Sunita Kumari',
        region: 'Patna, Bihar',
        avatar: 'SK',
        story: 'I never thought caring for my special needs child would count as work. Now banks see my value.',
        loanAmount: 15000,
        vcsScore: 542,
        careType: 'Special Needs Care'
      },
      {
        id: 3,
        name: 'Meena Gupta',
        region: 'Bhopal, MP',
        avatar: 'MG',
        story: 'The community validations from my neighbors helped me get credit for the first time in my life.',
        loanAmount: 20000,
        vcsScore: 623,
        careType: 'Child Care'
      }
    ];
  }
}

module.exports = new ImpactDashboardService();
