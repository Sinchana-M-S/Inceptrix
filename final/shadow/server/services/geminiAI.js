/**
 * Gemini AI Service
 * 
 * Provides AI-powered features using Google's Gemini API:
 * - NLP text classification
 * - Loan eligibility prediction
 * - Fraud detection analysis
 * - Risk assessment
 * - Explainability generation
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAIService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isConfigured = false;
    
    // Initialize if API key is available
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      this.isConfigured = true;
      console.log('✓ Gemini AI Service initialized');
    } else {
      console.log('⚠ Gemini API key not configured - using fallback mode');
    }
  }

  /**
   * Classify caregiving activity using Gemini
   */
  async classifyActivity(rawText) {
    if (!this.isConfigured) {
      return this.fallbackClassify(rawText);
    }

    const prompt = `You are an AI assistant analyzing caregiving activities for a social impact platform.

Analyze this caregiving activity log and return a JSON object:

Activity: "${rawText}"

Return ONLY valid JSON in this exact format:
{
  "type": "eldercare" | "childcare" | "specialNeeds" | "housework" | "community" | "healthcare" | "other",
  "subtype": "specific activity mentioned",
  "estimatedHours": number between 0.5 and 18,
  "complexity": "low" | "medium" | "high",
  "skillsRequired": ["skill1", "skill2"],
  "emotionalLabor": true | false,
  "physicalLabor": true | false,
  "confidence": number between 0 and 1,
  "summary": "one sentence summary"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.fallbackClassify(rawText);
    } catch (error) {
      console.error('Gemini classification error:', error.message);
      return this.fallbackClassify(rawText);
    }
  }

  /**
   * Predict loan eligibility and risk
   */
  async predictLoanEligibility(userData) {
    if (!this.isConfigured) {
      return this.fallbackLoanPrediction(userData);
    }

    const prompt = `You are an AI risk assessment model for a micro-lending platform that provides loans to unpaid caregivers.

Analyze this caregiver's profile and predict loan eligibility:

Profile:
- VCS Score: ${userData.vcsScore}/1000
- Total Activities Logged: ${userData.activityCount}
- Days Active: ${userData.daysActive}
- Community Validations: ${userData.validationCount}
- Average Validation Rating: ${userData.avgRating}/5
- Consistency Score: ${userData.consistencyScore}%
- Fraud Flags: ${userData.fraudFlags || 0}
- Previous Loans Repaid: ${userData.loansRepaid || 0}
- Region: ${userData.region}

Return ONLY valid JSON:
{
  "eligible": true | false,
  "riskLevel": "very_low" | "low" | "medium" | "high" | "very_high",
  "riskScore": number between 0 and 100,
  "maxLoanAmount": number,
  "recommendedInterestBand": "prime" | "standard" | "subprime",
  "repaymentProbability": number between 0 and 1,
  "confidenceScore": number between 0 and 1,
  "keyFactors": {
    "positive": ["factor1", "factor2"],
    "negative": ["factor1", "factor2"]
  },
  "reasoning": "explanation of decision"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.fallbackLoanPrediction(userData);
    } catch (error) {
      console.error('Gemini loan prediction error:', error.message);
      return this.fallbackLoanPrediction(userData);
    }
  }

  /**
   * Analyze activity for fraud indicators
   */
  async analyzeFraud(activity, historicalData) {
    if (!this.isConfigured) {
      return this.fallbackFraudDetection(activity, historicalData);
    }

    const prompt = `You are a fraud detection AI for a caregiving credit platform.

Analyze this new activity for potential fraud:

New Activity:
- Text: "${activity.rawText}"
- Claimed Hours: ${activity.reportedHours || 'not specified'}
- Date: ${activity.activityDate}
- Type: ${activity.type}

Historical Pattern:
- Average daily hours: ${historicalData.avgDailyHours}
- Common activity types: ${historicalData.commonTypes?.join(', ')}
- Recent activities count (7 days): ${historicalData.recentCount}
- Similar text entries: ${historicalData.similarTextCount}

Return ONLY valid JSON:
{
  "isSuspicious": true | false,
  "fraudProbability": number between 0 and 1,
  "riskLevel": "none" | "low" | "medium" | "high" | "critical",
  "flags": [
    {
      "type": "duplicate" | "impossibleHours" | "patternAnomaly" | "velocityAnomaly" | "textManipulation",
      "severity": "low" | "medium" | "high",
      "description": "explanation"
    }
  ],
  "recommendation": "approve" | "review" | "flag" | "reject",
  "reasoning": "explanation"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.fallbackFraudDetection(activity, historicalData);
    } catch (error) {
      console.error('Gemini fraud analysis error:', error.message);
      return this.fallbackFraudDetection(activity, historicalData);
    }
  }

  /**
   * Generate human-readable explanation for VCS score
   */
  async generateScoreExplanation(scoreBreakdown, userProfile) {
    if (!this.isConfigured) {
      return this.fallbackExplanation(scoreBreakdown);
    }

    const prompt = `You are an AI assistant explaining a Validated Contribution Score (VCS) to a caregiver.

Score breakdown:
- Total VCS: ${scoreBreakdown.totalVCS}/1000
- Care Labor Score: ${scoreBreakdown.breakdown?.careLabor?.total || 0}/26
- Social Trust Score: ${scoreBreakdown.breakdown?.socialTrust?.total || 0}/19
- Financial Behavior: ${scoreBreakdown.breakdown?.behavioralFinance?.total || 0}/23
- Economic Stability: ${scoreBreakdown.breakdown?.economicProxies?.total || 0}/17
- Identity Stability: ${scoreBreakdown.breakdown?.identityStability?.total || 0}/15
- Penalties Applied: ${scoreBreakdown.breakdown?.penalties?.totalPenalty || 0}

User context:
- Name: ${userProfile.name}
- Region: ${userProfile.region}
- Days since registration: ${userProfile.daysSinceRegistration}

Write a warm, encouraging explanation (2-3 paragraphs) that:
1. Explains what their score means
2. Highlights their strengths
3. Gives 2-3 specific tips to improve

Use simple language suitable for someone with limited formal education. Be encouraging!`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini explanation error:', error.message);
      return this.fallbackExplanation(scoreBreakdown);
    }
  }

  // ============ FALLBACK METHODS (when API is not available) ============

  fallbackClassify(rawText) {
    const text = rawText.toLowerCase();
    const types = {
      eldercare: ['elder', 'grandparent', 'grandmother', 'grandfather', 'senior', 'old', 'aged', 'parent', 'medicine', 'bedridden'],
      childcare: ['child', 'baby', 'kid', 'son', 'daughter', 'homework', 'school', 'diaper', 'feeding'],
      specialNeeds: ['disabled', 'disability', 'special needs', 'autism', 'therapy', 'wheelchair'],
      housework: ['clean', 'cook', 'laundry', 'wash', 'dishes', 'sweep', 'grocery', 'kitchen'],
      community: ['community', 'volunteer', 'neighbor', 'village', 'help', 'meeting'],
      healthcare: ['doctor', 'hospital', 'clinic', 'medicine', 'checkup', 'appointment']
    };

    let bestType = 'other';
    let maxScore = 0;

    for (const [type, keywords] of Object.entries(types)) {
      const score = keywords.filter(k => text.includes(k)).length;
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }

    const hourMatch = text.match(/(\d+)\s*hours?/);
    const estimatedHours = hourMatch ? Math.min(parseInt(hourMatch[1]), 18) : 3;

    return {
      type: bestType,
      subtype: null,
      estimatedHours,
      complexity: 'medium',
      skillsRequired: ['caregiving'],
      emotionalLabor: true,
      physicalLabor: bestType === 'housework' || bestType === 'eldercare',
      confidence: Math.min(maxScore / 3, 0.8),
      summary: `Detected ${bestType} activity`
    };
  }

  fallbackLoanPrediction(userData) {
    const vcs = userData.vcsScore || 0;
    const eligible = vcs >= 300;
    
    let riskLevel = 'very_high';
    let maxLoan = 0;
    let repaymentProb = 0.3;
    let interestBand = 'subprime';

    if (vcs >= 700) {
      riskLevel = 'very_low';
      maxLoan = 50000;
      repaymentProb = 0.95;
      interestBand = 'prime';
    } else if (vcs >= 500) {
      riskLevel = 'low';
      maxLoan = 30000;
      repaymentProb = 0.85;
      interestBand = 'standard';
    } else if (vcs >= 300) {
      riskLevel = 'medium';
      maxLoan = 15000;
      repaymentProb = 0.7;
      interestBand = 'subprime';
    }

    return {
      eligible,
      riskLevel,
      riskScore: 100 - (vcs / 10),
      maxLoanAmount: maxLoan,
      recommendedInterestBand: interestBand,
      repaymentProbability: repaymentProb,
      confidenceScore: 0.7,
      keyFactors: {
        positive: vcs >= 500 ? ['Good VCS score', 'Active caregiver'] : [],
        negative: vcs < 500 ? ['Score needs improvement'] : []
      },
      reasoning: `Based on VCS score of ${vcs}`
    };
  }

  fallbackFraudDetection(activity, historicalData) {
    const flags = [];
    let fraudProbability = 0;

    // Check for impossible hours
    if (activity.reportedHours > 18) {
      flags.push({
        type: 'impossibleHours',
        severity: 'high',
        description: `Claimed ${activity.reportedHours} hours in a single day`
      });
      fraudProbability += 0.4;
    }

    // Check for velocity anomaly
    if (historicalData.recentCount > 10) {
      flags.push({
        type: 'velocityAnomaly',
        severity: 'medium',
        description: 'Unusually high activity logging rate'
      });
      fraudProbability += 0.2;
    }

    // Check for duplicate text
    if (historicalData.similarTextCount > 2) {
      flags.push({
        type: 'duplicate',
        severity: 'medium',
        description: 'Similar text found in recent entries'
      });
      fraudProbability += 0.3;
    }

    return {
      isSuspicious: fraudProbability > 0.3,
      fraudProbability: Math.min(fraudProbability, 1),
      riskLevel: fraudProbability > 0.6 ? 'high' : fraudProbability > 0.3 ? 'medium' : 'low',
      flags,
      recommendation: fraudProbability > 0.6 ? 'flag' : fraudProbability > 0.3 ? 'review' : 'approve',
      reasoning: 'Rule-based fraud detection analysis'
    };
  }

  fallbackExplanation(scoreBreakdown) {
    const vcs = scoreBreakdown.totalVCS || 0;
    let rating = 'developing';
    
    if (vcs >= 700) rating = 'excellent';
    else if (vcs >= 500) rating = 'good';
    else if (vcs >= 300) rating = 'fair';

    return `Your VCS score of ${vcs} out of 1000 shows your ${rating} caregiving contribution. ` +
      `Your care activities and community validations are being recognized!\n\n` +
      `To improve your score: log activities consistently each day, ask more community members ` +
      `to validate your work, and provide detailed descriptions of your caregiving.`;
  }
}

module.exports = new GeminiAIService();
