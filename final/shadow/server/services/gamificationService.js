/**
 * Gamification Service
 * 
 * Manages badges, achievements, streaks, and leaderboards
 * to increase engagement and provide social recognition.
 */

class GamificationService {
  constructor() {
    // Badge definitions
    this.badges = {
      // Activity badges
      firstActivity: {
        id: 'first_activity',
        name: 'First Steps',
        description: 'Logged your first activity',
        icon: '🎯',
        category: 'activity',
        requirement: { type: 'activityCount', value: 1 }
      },
      dedication10: {
        id: 'dedication_10',
        name: 'Dedicated Caregiver',
        description: 'Logged 10 activities',
        icon: '💪',
        category: 'activity',
        requirement: { type: 'activityCount', value: 10 }
      },
      dedication50: {
        id: 'dedication_50',
        name: 'Caregiving Champion',
        description: 'Logged 50 activities',
        icon: '🏆',
        category: 'activity',
        requirement: { type: 'activityCount', value: 50 }
      },
      dedication100: {
        id: 'dedication_100',
        name: 'Care Legend',
        description: 'Logged 100 activities',
        icon: '👑',
        category: 'activity',
        requirement: { type: 'activityCount', value: 100 }
      },

      // Hour badges
      hours50: {
        id: 'hours_50',
        name: 'Time Giver',
        description: 'Logged 50 hours of care',
        icon: '⏰',
        category: 'hours',
        requirement: { type: 'totalHours', value: 50 }
      },
      hours100: {
        id: 'hours_100',
        name: 'Century Caregiver',
        description: 'Logged 100 hours of care',
        icon: '💯',
        category: 'hours',
        requirement: { type: 'totalHours', value: 100 }
      },
      hours500: {
        id: 'hours_500',
        name: 'Care Hero',
        description: 'Logged 500 hours of care',
        icon: '🦸',
        category: 'hours',
        requirement: { type: 'totalHours', value: 500 }
      },

      // Streak badges
      streak7: {
        id: 'streak_7',
        name: 'Week Warrior',
        description: '7-day logging streak',
        icon: '🔥',
        category: 'streak',
        requirement: { type: 'streak', value: 7 }
      },
      streak30: {
        id: 'streak_30',
        name: 'Monthly Motivation',
        description: '30-day logging streak',
        icon: '🌟',
        category: 'streak',
        requirement: { type: 'streak', value: 30 }
      },
      streak100: {
        id: 'streak_100',
        name: 'Unstoppable',
        description: '100-day logging streak',
        icon: '💎',
        category: 'streak',
        requirement: { type: 'streak', value: 100 }
      },

      // Community badges
      trusted3: {
        id: 'trusted_3',
        name: 'Community Member',
        description: 'Received 3 community validations',
        icon: '🤝',
        category: 'community',
        requirement: { type: 'validationCount', value: 3 }
      },
      trusted10: {
        id: 'trusted_10',
        name: 'Trusted Neighbor',
        description: 'Received 10 community validations',
        icon: '⭐',
        category: 'community',
        requirement: { type: 'validationCount', value: 10 }
      },
      trusted25: {
        id: 'trusted_25',
        name: 'Community Pillar',
        description: 'Received 25 community validations',
        icon: '🏛️',
        category: 'community',
        requirement: { type: 'validationCount', value: 25 }
      },

      // Special care badges
      elderCareExpert: {
        id: 'elder_care_expert',
        name: 'Elder Care Expert',
        description: '100 hours of elder care',
        icon: '👴',
        category: 'specialty',
        requirement: { type: 'careTypeHours', careType: 'eldercare', value: 100 }
      },
      childCareExpert: {
        id: 'child_care_expert',
        name: 'Child Care Expert',
        description: '100 hours of child care',
        icon: '👶',
        category: 'specialty',
        requirement: { type: 'careTypeHours', careType: 'childcare', value: 100 }
      },
      specialNeedsHero: {
        id: 'special_needs_hero',
        name: 'Special Needs Hero',
        description: '50 hours caring for special needs',
        icon: '💜',
        category: 'specialty',
        requirement: { type: 'careTypeHours', careType: 'specialNeeds', value: 50 }
      },

      // Score milestones
      score300: {
        id: 'score_300',
        name: 'Credit Eligible',
        description: 'Reached VCS score of 300',
        icon: '📈',
        category: 'score',
        requirement: { type: 'vcsScore', value: 300 }
      },
      score500: {
        id: 'score_500',
        name: 'Rising Star',
        description: 'Reached VCS score of 500',
        icon: '🌠',
        category: 'score',
        requirement: { type: 'vcsScore', value: 500 }
      },
      score700: {
        id: 'score_700',
        name: 'Prime Borrower',
        description: 'Reached VCS score of 700',
        icon: '💫',
        category: 'score',
        requirement: { type: 'vcsScore', value: 700 }
      },

      // First loan
      firstLoan: {
        id: 'first_loan',
        name: 'Financial Freedom',
        description: 'Received your first loan',
        icon: '💰',
        category: 'loan',
        requirement: { type: 'loanCount', value: 1 }
      },
      loanRepaid: {
        id: 'loan_repaid',
        name: 'Promise Keeper',
        description: 'Successfully repaid a loan',
        icon: '✅',
        category: 'loan',
        requirement: { type: 'loansRepaid', value: 1 }
      }
    };

    console.log('✓ Gamification Service initialized');
  }

  /**
   * Calculate user's earned badges
   */
  calculateBadges(userData) {
    const earnedBadges = [];
    const upcomingBadges = [];

    for (const [key, badge] of Object.entries(this.badges)) {
      const { earned, progress } = this.checkBadgeEarned(badge, userData);
      
      if (earned) {
        earnedBadges.push({
          ...badge,
          earnedAt: userData.badgeEarnedDates?.[badge.id] || new Date()
        });
      } else if (progress > 0.3) {
        upcomingBadges.push({
          ...badge,
          progress: Math.round(progress * 100)
        });
      }
    }

    return {
      earned: earnedBadges,
      upcoming: upcomingBadges.slice(0, 3), // Top 3 closest badges
      totalEarned: earnedBadges.length,
      totalAvailable: Object.keys(this.badges).length
    };
  }

  /**
   * Check if a specific badge is earned
   */
  checkBadgeEarned(badge, userData) {
    const req = badge.requirement;
    let current = 0;
    let target = req.value;

    switch (req.type) {
      case 'activityCount':
        current = userData.activityCount || 0;
        break;
      case 'totalHours':
        current = userData.totalHours || 0;
        break;
      case 'streak':
        current = userData.currentStreak || 0;
        break;
      case 'validationCount':
        current = userData.validationCount || 0;
        break;
      case 'careTypeHours':
        current = userData.careTypeHours?.[req.careType] || 0;
        break;
      case 'vcsScore':
        current = userData.vcsScore || 0;
        break;
      case 'loanCount':
        current = userData.loanCount || 0;
        break;
      case 'loansRepaid':
        current = userData.loansRepaid || 0;
        break;
    }

    return {
      earned: current >= target,
      progress: Math.min(current / target, 1)
    };
  }

  /**
   * Calculate current streak
   */
  calculateStreak(activities) {
    if (!activities || activities.length === 0) return 0;

    // Sort by date descending
    const sorted = [...activities].sort((a, b) => 
      new Date(b.activityDate) - new Date(a.activityDate)
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Get unique activity dates
    const activityDates = new Set(
      sorted.map(a => new Date(a.activityDate).toDateString())
    );

    // Count consecutive days
    while (true) {
      const dateStr = currentDate.toDateString();
      if (activityDates.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (streak === 0) {
        // Allow for today not being logged yet
        currentDate.setDate(currentDate.getDate() - 1);
        if (!activityDates.has(currentDate.toDateString())) {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(region = null, limit = 10) {
    // This would query the database in production
    // For now, return mock data structure
    return {
      type: region ? 'regional' : 'global',
      region,
      entries: [],
      generatedAt: new Date()
    };
  }

  /**
   * Get all badge definitions
   */
  getAllBadges() {
    return Object.values(this.badges);
  }

  /**
   * Get badges by category
   */
  getBadgesByCategory(category) {
    return Object.values(this.badges).filter(b => b.category === category);
  }
}

module.exports = new GamificationService();
