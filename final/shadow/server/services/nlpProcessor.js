/**
 * NLP Processor Service
 * 
 * Handles natural language processing for activity logs:
 * - Activity type classification
 * - Time/effort estimation
 * - Sentiment analysis
 * - Duplicate/pattern detection
 * 
 * Uses a hybrid approach: keyword matching + NLP library
 */

const natural = require('natural');
const compromise = require('compromise');

// Tokenizer and classifiers
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const Analyzer = natural.SentimentAnalyzer;
const stemmer = natural.PorterStemmer;
const analyzer = new Analyzer('English', stemmer, 'afinn');

// Activity type keywords (multilingual support planned)
const ACTIVITY_KEYWORDS = {
  eldercare: [
    'elder', 'elderly', 'grandparent', 'grandmother', 'grandfather', 'senior', 'old',
    'bathe', 'bathing', 'feed', 'feeding', 'medicine', 'medication', 'wheelchair',
    'bedridden', 'dementia', 'alzheimer', 'caretaker', 'nursing', 'aged', 'parent',
    'बुज़ुर्ग', 'दादा', 'दादी', 'नाना', 'नानी', 'वृद्ध' // Hindi
  ],
  childcare: [
    'child', 'children', 'baby', 'infant', 'toddler', 'kid', 'son', 'daughter',
    'homework', 'school', 'diaper', 'feeding', 'breastfeed', 'play', 'nurse',
    'babysit', 'daycare', 'kindergarten', 'preschool', 'nap', 'bedtime',
    'बच्चा', 'बेटा', 'बेटी', 'शिशु', 'स्कूल' // Hindi
  ],
  specialNeeds: [
    'disabled', 'disability', 'special needs', 'autism', 'cerebral palsy', 'down syndrome',
    'therapy', 'therapist', 'wheelchair', 'prosthetic', 'speech therapy', 'occupational',
    'physical therapy', 'mental health', 'psychiatric', 'counseling',
    'विकलांग', 'थेरेपी' // Hindi
  ],
  housework: [
    'clean', 'cleaning', 'cook', 'cooking', 'laundry', 'wash', 'dishes', 'sweep',
    'mop', 'dust', 'iron', 'ironing', 'grocery', 'market', 'shopping', 'house',
    'home', 'kitchen', 'bathroom', 'bedroom', 'organizing', 'maintenance',
    'सफाई', 'खाना', 'बर्तन', 'कपड़े', 'घर' // Hindi
  ],
  community: [
    'community', 'volunteer', 'help', 'neighbor', 'village', 'society', 'group',
    'meeting', 'organize', 'event', 'festival', 'religious', 'temple', 'church',
    'mosque', 'charity', 'donation', 'support', 'counsel', 'advice',
    'समुदाय', 'समाज', 'मदद', 'पड़ोसी' // Hindi
  ],
  healthcare: [
    'doctor', 'hospital', 'clinic', 'medicine', 'prescription', 'checkup',
    'appointment', 'treatment', 'care', 'health', 'medical', 'pharmacy',
    'injection', 'dressing', 'wound', 'blood pressure', 'sugar', 'diabetes',
    'डॉक्टर', 'अस्पताल', 'दवाई', 'इलाज' // Hindi
  ]
};

// Time patterns for estimation
const TIME_PATTERNS = {
  morning: { start: 6, end: 12, typical: 3 },
  afternoon: { start: 12, end: 17, typical: 3 },
  evening: { start: 17, end: 21, typical: 2 },
  night: { start: 21, end: 6, typical: 4 },
  fullDay: { start: 6, end: 21, typical: 8 },
  allDay: { start: 0, end: 24, typical: 10 }
};

// Duration keywords
const DURATION_KEYWORDS = {
  short: ['quick', 'brief', 'few minutes', '15 minutes', '30 minutes', 'half hour'],
  medium: ['hour', 'couple hours', '2 hours', '3 hours', 'morning', 'afternoon'],
  long: ['all day', 'full day', 'whole day', 'entire day', 'many hours', '6 hours', '8 hours'],
  overnight: ['overnight', 'night', 'all night', 'through the night', '24 hours']
};

class NLPProcessor {
  constructor() {
    this.tfidf = new TfIdf();
  }

  /**
   * Process activity log text
   * Returns classified activity with confidence scores
   */
  async processActivityLog(rawText, language = 'en') {
    const result = {
      keywords: [],
      entities: [],
      sentiment: {},
      activityType: 'other',
      activitySubtype: null,
      estimatedHours: 2,
      confidence: 0.5,
      processingConfidence: 0.5
    };

    // Normalize text
    const normalizedText = rawText.toLowerCase().trim();
    
    // Extract keywords
    result.keywords = this.extractKeywords(normalizedText);
    
    // Classify activity type
    const classification = this.classifyActivity(normalizedText);
    result.activityType = classification.type;
    result.activitySubtype = classification.subtype;
    result.confidence = classification.confidence;
    
    // Estimate time
    result.estimatedHours = this.estimateTime(normalizedText, result.activityType);
    
    // Analyze sentiment
    result.sentiment = this.analyzeSentiment(normalizedText);
    
    // Extract entities (people, places, times)
    result.entities = this.extractEntities(rawText);
    
    // Calculate overall processing confidence
    result.processingConfidence = this.calculateConfidence(result);
    
    return result;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const tokens = tokenizer.tokenize(text);
    const stopWords = natural.stopwords;
    
    return tokens.filter(token => 
      token.length > 2 && 
      !stopWords.includes(token.toLowerCase())
    );
  }

  /**
   * Classify activity type using keyword matching
   */
  classifyActivity(text) {
    const scores = {};
    const tokens = text.toLowerCase().split(/\s+/);
    
    // Calculate score for each activity type
    for (const [type, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
      scores[type] = 0;
      for (const keyword of keywords) {
        // Check for exact word match
        if (tokens.includes(keyword.toLowerCase())) {
          scores[type] += 2;
        }
        // Check for partial match (substring)
        else if (text.includes(keyword.toLowerCase())) {
          scores[type] += 1;
        }
      }
    }
    
    // Find highest scoring type
    let maxScore = 0;
    let bestType = 'other';
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type;
      }
    }
    
    // Calculate confidence based on score
    const confidence = Math.min(maxScore / 6, 0.95); // Max 95% confidence
    
    // Extract subtype if possible
    let subtype = null;
    if (bestType !== 'other') {
      const matchedKeywords = ACTIVITY_KEYWORDS[bestType].filter(k => 
        text.toLowerCase().includes(k.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        subtype = matchedKeywords[0];
      }
    }
    
    return {
      type: bestType,
      subtype,
      confidence,
      scores
    };
  }

  /**
   * Estimate hours based on text analysis
   */
  estimateTime(text, activityType) {
    const lowerText = text.toLowerCase();
    
    // Check for explicit time mentions
    const hourMatch = lowerText.match(/(\d+)\s*hours?/);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1]);
      return Math.min(Math.max(hours, 0.5), 18); // Cap at 0.5-18 hours
    }
    
    // Check duration keywords
    for (const duration of DURATION_KEYWORDS.overnight) {
      if (lowerText.includes(duration)) return 10;
    }
    for (const duration of DURATION_KEYWORDS.long) {
      if (lowerText.includes(duration)) return 7;
    }
    for (const duration of DURATION_KEYWORDS.medium) {
      if (lowerText.includes(duration)) return 3;
    }
    for (const duration of DURATION_KEYWORDS.short) {
      if (lowerText.includes(duration)) return 1;
    }
    
    // Check time of day patterns
    for (const keyword of ['morning', 'afternoon', 'evening']) {
      if (lowerText.includes(keyword)) {
        return TIME_PATTERNS[keyword].typical;
      }
    }
    
    // Default estimates by activity type
    const defaults = {
      eldercare: 4,
      childcare: 4,
      specialNeeds: 5,
      housework: 3,
      community: 2,
      healthcare: 2,
      other: 2
    };
    
    return defaults[activityType] || 2;
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text) {
    try {
      const tokens = tokenizer.tokenize(text);
      
      // Handle empty tokens
      if (!tokens || tokens.length === 0) {
        return { score: 0, label: 'neutral' };
      }
      
      let score = analyzer.getSentiment(tokens);
      
      // Handle NaN (happens with non-English text like Hindi)
      if (isNaN(score) || !isFinite(score)) {
        score = 0;
      }
      
      let label = 'neutral';
      if (score > 0.2) label = 'positive';
      else if (score < -0.2) label = 'negative';
      
      return {
        score: Math.round(score * 100) / 100,
        label
      };
    } catch (err) {
      // Fallback for any errors
      return { score: 0, label: 'neutral' };
    }
  }

  /**
   * Extract named entities using compromise
   */
  extractEntities(text) {
    const doc = compromise(text);
    const entities = [];
    
    // Extract people - using match for compromise v14 compatibility
    doc.match('#Person').forEach(p => {
      entities.push({
        type: 'person',
        value: p.text(),
        confidence: 0.8
      });
    });
    
    // Extract places - using match for compromise v14 compatibility
    doc.match('#Place').forEach(p => {
      entities.push({
        type: 'place',
        value: p.text(),
        confidence: 0.7
      });
    });
    
    // Extract times/dates - using match instead of dates() for compromise v14
    doc.match('#Date').forEach(d => {
      entities.push({
        type: 'time',
        value: d.text(),
        confidence: 0.9
      });
    });
    
    // Also extract time expressions
    doc.match('#Time').forEach(t => {
      entities.push({
        type: 'time',
        value: t.text(),
        confidence: 0.8
      });
    });
    
    return entities;
  }

  /**
   * Calculate overall confidence
   */
  calculateConfidence(result) {
    let confidence = result.confidence;
    
    // Boost if we have good sentiment analysis
    if (result.sentiment.label !== 'neutral') {
      confidence += 0.1;
    }
    
    // Boost if we have entities
    if (result.entities.length > 0) {
      confidence += 0.1;
    }
    
    // Boost if keywords found
    if (result.keywords.length > 3) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Detect similarity between two texts (for duplicate detection)
   */
  calculateSimilarity(text1, text2) {
    const tokens1 = new Set(tokenizer.tokenize(text1.toLowerCase()));
    const tokens2 = new Set(tokenizer.tokenize(text2.toLowerCase()));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Detect anomalies in activity logs
   */
  async detectAnomalies(activities, newActivity) {
    const flags = [];
    
    // Check for duplicate text
    for (const activity of activities) {
      const similarity = this.calculateSimilarity(activity.rawText, newActivity.rawText);
      if (similarity > 0.85) {
        flags.push({
          type: 'textSimilarity',
          severity: similarity > 0.95 ? 'high' : 'medium',
          details: `${Math.round(similarity * 100)}% similar to log from ${activity.activityDate.toDateString()}`
        });
      }
    }
    
    // Check for impossible hours
    if (newActivity.estimatedHours > 18) {
      flags.push({
        type: 'impossibleHours',
        severity: 'high',
        details: `Claimed ${newActivity.estimatedHours} hours in a single day`
      });
    }
    
    // Check for pattern mismatch (sudden change in activity type)
    const recentTypes = activities.slice(-10).map(a => a.activityType);
    if (recentTypes.length >= 5) {
      const typeCount = recentTypes.filter(t => t === newActivity.activityType).length;
      if (typeCount === 0 && recentTypes.length >= 10) {
        flags.push({
          type: 'patternMismatch',
          severity: 'low',
          details: 'New activity type not seen in recent history'
        });
      }
    }
    
    // Calculate anomaly score
    let anomalyScore = 0;
    for (const flag of flags) {
      if (flag.severity === 'high') anomalyScore += 0.4;
      else if (flag.severity === 'medium') anomalyScore += 0.2;
      else anomalyScore += 0.1;
    }
    
    return {
      flags,
      anomalyScore: Math.min(anomalyScore, 1)
    };
  }
}

module.exports = new NLPProcessor();
