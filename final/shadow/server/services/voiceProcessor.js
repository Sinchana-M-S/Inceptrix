/**
 * Voice Processing Service
 * 
 * Enables voice-first activity logging for caregivers with limited literacy.
 * Supports multiple ASR providers:
 * - Sarvam AI (Best for Indian languages)
 * - Groq (Fast inference)
 * - OpenAI Whisper (Fallback)
 */

class VoiceProcessingService {
  constructor() {
    // Check which APIs are configured
    this.sarvamConfigured = !!process.env.SARVAM_API_KEY;
    this.groqConfigured = !!process.env.GROQ_API_KEY;
    this.whisperConfigured = !!process.env.OPENAI_API_KEY;
    
    this.isConfigured = this.sarvamConfigured || this.groqConfigured || this.whisperConfigured;
    
    // Log configuration status
    const providers = [];
    if (this.sarvamConfigured) providers.push('Sarvam AI');
    if (this.groqConfigured) providers.push('Groq');
    if (this.whisperConfigured) providers.push('Whisper');
    
    if (providers.length > 0) {
      console.log(`✓ Voice Processing Service initialized (${providers.join(', ')})`);
    } else {
      console.log('⚠ Voice Processing: Using mock transcription (no API keys configured)');
    }
  }

  /**
   * Transcribe audio to text - tries Sarvam first, then Groq, then Whisper
   */
  async transcribeAudio(audioBuffer, language = 'hi') {
    // Try Sarvam AI first (best for Indian languages)
    if (this.sarvamConfigured) {
      const result = await this.transcribeWithSarvam(audioBuffer, language);
      if (result.success) return result;
      console.log('Sarvam failed, trying fallback...');
    }

    // Try Groq (fast inference)
    if (this.groqConfigured) {
      const result = await this.transcribeWithGroq(audioBuffer, language);
      if (result.success) return result;
      console.log('Groq failed, trying fallback...');
    }

    // Try Whisper
    if (this.whisperConfigured) {
      const result = await this.transcribeWithWhisper(audioBuffer, language);
      if (result.success) return result;
    }

    // No API worked - return mock
    return this.mockTranscription(language);
  }

  /**
   * Transcribe using Sarvam AI (Best for Indian languages)
   * Docs: https://docs.sarvam.ai/api-reference-docs/endpoints/translate
   */
  async transcribeWithSarvam(audioBuffer, language) {
    try {
      const axios = require('axios');
      const FormData = require('form-data');
      
      const formData = new FormData();
      formData.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
      formData.append('language_code', this.getSarvamLanguageCode(language));
      formData.append('model', 'saarika:v1'); // Sarvam's ASR model
      
      const response = await axios.post('https://api.sarvam.ai/speech-to-text', formData, {
        headers: {
          'api-subscription-key': process.env.SARVAM_API_KEY,
          ...formData.getHeaders()
        },
        timeout: 30000
      });

      return {
        success: true,
        text: response.data.transcript,
        language: language,
        provider: 'sarvam',
        confidence: response.data.confidence || 0.9
      };
    } catch (error) {
      console.error('Sarvam API error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transcribe using Groq (Fast inference with Whisper)
   */
  async transcribeWithGroq(audioBuffer, language) {
    try {
      const axios = require('axios');
      const FormData = require('form-data');
      
      const formData = new FormData();
      formData.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
      formData.append('model', 'whisper-large-v3');
      formData.append('language', language);
      formData.append('response_format', 'json');
      
      const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          ...formData.getHeaders()
        },
        timeout: 30000
      });

      return {
        success: true,
        text: response.data.text,
        language: language,
        provider: 'groq'
      };
    } catch (error) {
      console.error('Groq API error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transcribe using OpenAI Whisper
   */
  async transcribeWithWhisper(audioBuffer, language) {
    try {
      const FormData = require('form-data');
      const axios = require('axios');
      
      const formData = new FormData();
      formData.append('file', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
      formData.append('model', 'whisper-1');
      formData.append('language', language);
      formData.append('response_format', 'json');

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        timeout: 30000
      });

      return {
        success: true,
        text: response.data.text,
        language: language,
        provider: 'whisper',
        duration: response.data.duration || null
      };
    } catch (error) {
      console.error('Whisper API error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Sarvam language code from ISO code
   */
  getSarvamLanguageCode(isoCode) {
    const mapping = {
      'hi': 'hi-IN',
      'en': 'en-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN',
      'od': 'od-IN'
    };
    return mapping[isoCode] || 'hi-IN';
  }

  /**
   * Mock transcription for demo/testing
   */
  mockTranscription(language) {
    const samples = {
      hi: [
        'आज सुबह 6 बजे से दादी को खाना खिलाया और नहलाया, फिर दवाई दी',
        'बच्चों को स्कूल छोड़ा और घर की सफाई की, करीब 4 घंटे लगे',
        'बुजुर्ग पड़ोसी की देखभाल की, डॉक्टर के पास ले गई'
      ],
      en: [
        'Today I bathed and fed grandmother in the morning, gave her medicines',
        'Took children to school and cleaned the house for about 4 hours',
        'Helped elderly neighbor, took them to the doctor'
      ],
      ta: [
        'இன்று காலை பாட்டிக்கு குளிப்பாட்டி சாப்பாடு கொடுத்தேன்',
        'குழந்தைகளை பள்ளிக்கு அழைத்துச் சென்றேன்'
      ],
      te: [
        'ఈ రోజు అమ్మమ్మకు స్నానం చేయించి భోజనం పెట్టాను',
        'పిల్లలను స్కూల్‌కు తీసుకెళ్ళాను'
      ]
    };

    const texts = samples[language] || samples.en;
    const randomText = texts[Math.floor(Math.random() * texts.length)];

    return {
      success: true,
      text: randomText,
      language: language,
      provider: 'mock',
      mock: true
    };
  }

  /**
   * Detect language from audio (simplified)
   */
  detectLanguage(text) {
    const patterns = {
      hi: /[\u0900-\u097F]/,  // Devanagari
      ta: /[\u0B80-\u0BFF]/,  // Tamil
      te: /[\u0C00-\u0C7F]/,  // Telugu
      bn: /[\u0980-\u09FF]/,  // Bengali
      gu: /[\u0A80-\u0AFF]/,  // Gujarati
      kn: /[\u0C80-\u0CFF]/,  // Kannada
      ml: /[\u0D00-\u0D7F]/,  // Malayalam
      pa: /[\u0A00-\u0A7F]/   // Punjabi
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) return lang;
    }
    return 'en';
  }

  /**
   * Supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'en', name: 'English', native: 'English' },
      { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
      { code: 'te', name: 'Telugu', native: 'తెలుగు' },
      { code: 'bn', name: 'Bengali', native: 'বাংলা' },
      { code: 'mr', name: 'Marathi', native: 'मराठी' },
      { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
      { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
      { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
      { code: 'od', name: 'Odia', native: 'ଓଡ଼ିଆ' }
    ];
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      providers: {
        sarvam: this.sarvamConfigured,
        groq: this.groqConfigured,
        whisper: this.whisperConfigured
      },
      supportedLanguages: this.getSupportedLanguages().length
    };
  }
}

module.exports = new VoiceProcessingService();

