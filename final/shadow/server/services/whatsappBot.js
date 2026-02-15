/**
 * WhatsApp/SMS Bot Service
 * 
 * Enables caregivers to log activities and check their score via WhatsApp/SMS.
 * Integrates with Twilio for messaging.
 */

const nlpProcessor = require('./nlpProcessor');
const geminiAI = require('./geminiAI');

class WhatsAppBotService {
  constructor() {
    this.twilioConfigured = !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN);
    
    // Command patterns
    this.commands = {
      logActivity: /^(log|logged|did|today|आज|काम)/i,
      checkScore: /^(score|my score|vcs|स्कोर|मेरा)/i,
      help: /^(help|menu|मदद|सहायता)/i,
      loan: /^(loan|ऋण|कर्ज)/i,
      badges: /^(badge|badges|उपलब्धि)/i
    };

    // Response templates
    this.templates = {
      welcome: {
        en: `🏠 *Shadow-Labor Ledger*\n\nWelcome! I help you log your caregiving work and track your credit score.\n\n*Commands:*\n📝 LOG - Log care activity\n📊 SCORE - Check VCS score\n💰 LOAN - Check loan eligibility\n🏆 BADGES - View achievements\n❓ HELP - Get help\n\nJust type or speak naturally about your day's work!`,
        hi: `🏠 *शैडो-लेबर लेजर*\n\nस्वागत है! मैं आपको देखभाल के काम को दर्ज करने और क्रेडिट स्कोर ट्रैक करने में मदद करता हूं।\n\n*कमांड:*\n📝 LOG - गतिविधि दर्ज करें\n📊 SCORE - VCS स्कोर देखें\n💰 LOAN - ऋण पात्रता जांचें\n🏆 BADGES - उपलब्धियां देखें\n❓ HELP - मदद लें`
      },
      activityLogged: {
        en: (activity) => `✅ *Activity Logged!*\n\n📋 Type: ${activity.type}\n⏰ Hours: ${activity.hours}\n📝 ${activity.description}\n\nYour activity has been recorded. Get a neighbor to verify it for bonus points!`,
        hi: (activity) => `✅ *गतिविधि दर्ज!*\n\n📋 प्रकार: ${activity.type}\n⏰ घंटे: ${activity.hours}\n📝 ${activity.description}\n\nआपकी गतिविधि दर्ज हो गई है। बोनस अंक के लिए पड़ोसी से सत्यापित करवाएं!`
      },
      scoreReport: {
        en: (score) => `📊 *Your VCS Score*\n\n🎯 Score: *${score.totalVCS}*/1000\n📈 Band: ${score.riskBandLabel}\n💰 Loan Eligible: ₹${score.maxLoanAmount}\n\n*Breakdown:*\n🏠 Care Labor: ${score.breakdown?.careLabor?.total || 0}\n🤝 Social Trust: ${score.breakdown?.socialTrust?.total || 0}\n📱 Behavioral: ${score.breakdown?.behavioralFinance?.total || 0}\n\n_Keep logging to increase your score!_`,
        hi: (score) => `📊 *आपका VCS स्कोर*\n\n🎯 स्कोर: *${score.totalVCS}*/1000\n📈 बैंड: ${score.riskBandLabel}\n💰 ऋण पात्रता: ₹${score.maxLoanAmount}`
      }
    };

    console.log('✓ WhatsApp Bot Service initialized');
  }

  /**
   * Process incoming message
   */
  async processMessage(message, userPhone, language = 'en') {
    // Detect command type
    const command = this.detectCommand(message);

    switch (command) {
      case 'logActivity':
        return await this.handleActivityLog(message, userPhone, language);
      case 'checkScore':
        return await this.handleScoreCheck(userPhone, language);
      case 'loan':
        return await this.handleLoanCheck(userPhone, language);
      case 'badges':
        return await this.handleBadgesCheck(userPhone, language);
      case 'help':
        return this.templates.welcome[language] || this.templates.welcome.en;
      default:
        // Try to parse as natural language activity log
        return await this.handleNaturalLanguage(message, userPhone, language);
    }
  }

  /**
   * Detect command from message
   */
  detectCommand(message) {
    for (const [command, pattern] of Object.entries(this.commands)) {
      if (pattern.test(message)) {
        return command;
      }
    }
    return 'natural';
  }

  /**
   * Handle activity logging
   */
  async handleActivityLog(message, userPhone, language) {
    try {
      // Parse the activity from natural language
      const parsed = await this.parseActivityFromMessage(message);

      if (!parsed.success) {
        return language === 'hi' 
          ? '❌ मुझे आपकी गतिविधि समझने में कठिनाई हो रही है। कृपया बताएं कि आपने क्या किया और कितने घंटे।'
          : '❌ I had trouble understanding your activity. Please tell me what you did and for how long.\n\n_Example: "Took care of grandmother for 3 hours, gave medicine and fed her"_';
      }

      // Return logged confirmation
      const template = this.templates.activityLogged[language] || this.templates.activityLogged.en;
      return template(parsed.activity);
    } catch (error) {
      console.error('Activity log error:', error);
      return '❌ Something went wrong. Please try again.';
    }
  }

  /**
   * Parse activity from natural language message
   */
  async parseActivityFromMessage(message) {
    // Use NLP processor to classify
    const classification = await nlpProcessor.classifyActivity(message);
    
    // Extract hours
    const hoursMatch = message.match(/(\d+)\s*(hour|hr|घंटे|घंटा)/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 2; // Default 2 hours

    return {
      success: true,
      activity: {
        type: classification.category || 'other',
        hours: hours,
        description: message.substring(0, 100),
        rawText: message,
        confidence: classification.confidence || 0.7
      }
    };
  }

  /**
   * Handle score check
   */
  async handleScoreCheck(userPhone, language) {
    // In production, fetch from database
    const mockScore = {
      totalVCS: 567,
      riskBandLabel: 'Credit Eligible',
      maxLoanAmount: 15000,
      breakdown: {
        careLabor: { total: 18 },
        socialTrust: { total: 12 },
        behavioralFinance: { total: 15 }
      }
    };

    const template = this.templates.scoreReport[language] || this.templates.scoreReport.en;
    return template(mockScore);
  }

  /**
   * Handle loan eligibility check
   */
  async handleLoanCheck(userPhone, language) {
    return language === 'hi'
      ? `💰 *ऋण पात्रता*\n\nआपका VCS स्कोर: 567\nअधिकतम ऋण राशि: ₹15,000\n\n🏦 *उपलब्ध ऋणदाता:*\n1. ग्रामीण माइक्रोफाइनेंस - 12% ब्याज\n2. केयरक्रेडिट - 14% ब्याज\n\nऋण के लिए आवेदन करने हेतु "APPLY" टाइप करें।`
      : `💰 *Loan Eligibility*\n\nYour VCS Score: 567\nMax Loan Amount: ₹15,000\n\n🏦 *Available Lenders:*\n1. Grameen Microfinance - 12% interest\n2. CareCredit NBFC - 14% interest\n3. Women Welfare Bank - 8% interest\n\nType "APPLY" to start a loan application.`;
  }

  /**
   * Handle badges check
   */
  async handleBadgesCheck(userPhone, language) {
    return language === 'hi'
      ? `🏆 *आपकी उपलब्धियां*\n\n✅ 🎯 पहला कदम - पहली गतिविधि दर्ज\n✅ 💪 समर्पित देखभालकर्ता - 10 गतिविधियां\n✅ 🔥 सप्ताह योद्धा - 7 दिन की स्ट्रीक\n\n🔒 *आगामी:*\n⏳ 🏆 चैंपियन - 50 गतिविधियां (32/50)\n⏳ ⭐ विश्वसनीय पड़ोसी - 10 सत्यापन (7/10)`
      : `🏆 *Your Badges*\n\n✅ 🎯 First Steps - Logged first activity\n✅ 💪 Dedicated Caregiver - 10 activities\n✅ 🔥 Week Warrior - 7-day streak\n\n🔒 *Coming Up:*\n⏳ 🏆 Champion - 50 activities (32/50)\n⏳ ⭐ Trusted Neighbor - 10 validations (7/10)`;
  }

  /**
   * Handle natural language (fallback)
   */
  async handleNaturalLanguage(message, userPhone, language) {
    // Try to interpret as activity log
    const parsed = await this.parseActivityFromMessage(message);

    if (parsed.success && parsed.activity.confidence > 0.5) {
      const template = this.templates.activityLogged[language] || this.templates.activityLogged.en;
      return `🤔 I understood this as a care activity:\n\n${template(parsed.activity)}\n\n_If this is incorrect, type HELP for commands._`;
    }

    return this.templates.welcome[language] || this.templates.welcome.en;
  }

  /**
   * Send outbound message (requires Twilio)
   */
  async sendMessage(toPhone, message) {
    if (!this.twilioConfigured) {
      console.log(`[WhatsApp] Would send to ${toPhone}: ${message.substring(0, 50)}...`);
      return { success: true, mock: true };
    }

    // In production, use Twilio client
    return { success: true };
  }

  /**
   * Send daily reminder
   */
  async sendDailyReminder(userPhone, language = 'en') {
    const message = language === 'hi'
      ? `🌅 *सुप्रभात!*\n\nआज की देखभाल गतिविधि दर्ज करना न भूलें। नियमित लॉगिंग से आपका VCS स्कोर बढ़ता है!\n\n📝 "आज मैंने..." से शुरू करें`
      : `🌅 *Good Morning!*\n\nDon't forget to log your caregiving activities today. Regular logging increases your VCS score!\n\n📝 Start with "Today I..."`;

    return await this.sendMessage(userPhone, message);
  }

  /**
   * Get webhook URL for setup
   */
  getWebhookInfo() {
    return {
      whatsappWebhook: '/api/bot/whatsapp/webhook',
      smsWebhook: '/api/bot/sms/webhook',
      setupInstructions: 'Configure these URLs in your Twilio console'
    };
  }
}

module.exports = new WhatsAppBotService();
