import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader, Volume2, Check, X } from 'lucide-react';

/**
 * VoiceInput Component
 * 
 * Allows caregivers to speak their activities instead of typing.
 * Uses Web Audio API to record and sends to backend for transcription.
 */
const VoiceInput = ({ onTranscription, language = 'hi', placeholder = 'Click mic to speak...' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Supported languages
  const languages = [
    { code: 'hi', name: 'हिन्दी', label: 'Hindi' },
    { code: 'en', name: 'English', label: 'English' },
    { code: 'ta', name: 'தமிழ்', label: 'Tamil' },
    { code: 'te', name: 'తెలుగు', label: 'Telugu' },
    { code: 'bn', name: 'বাংলা', label: 'Bengali' },
    { code: 'mr', name: 'मराठी', label: 'Marathi' }
  ];

  const [selectedLanguage, setSelectedLanguage] = useState(language);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopRecording();
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setTranscription('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      // Setup audio analyzer for visual feedback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start level monitoring
      monitorAudioLevel();

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio level monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);

        // Process the recording
        await processRecording();
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

    } catch (err) {
      console.error('Microphone error:', err);
      setError('माइक्रोफ़ोन एक्सेस नहीं मिला। कृपया अनुमति दें।');
    }
  };

  // Monitor audio level for visual feedback
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Process the recording
  const processRecording = async () => {
    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', selectedLanguage);

      // Send to backend
      const token = localStorage.getItem('token');
      const response = await fetch('/api/advanced/voice/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success && data.transcription?.text) {
        setTranscription(data.transcription.text);
        if (onTranscription) {
          onTranscription(data.transcription.text);
        }
      } else {
        setError('ट्रांसक्रिप्शन विफल। कृपया पुन: प्रयास करें।');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('सर्वर से कनेक्ट नहीं हो पा रहा।');
    } finally {
      setIsProcessing(false);
    }
  };

  // Accept transcription
  const acceptTranscription = () => {
    if (onTranscription) {
      onTranscription(transcription);
    }
  };

  // Clear and retry
  const clearTranscription = () => {
    setTranscription('');
    setError(null);
  };

  return (
    <div className="voice-input-container">
      {/* Language selector */}
      <div className="voice-language-select">
        <select 
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isRecording}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.label})
            </option>
          ))}
        </select>
      </div>

      {/* Main voice button */}
      <div className="voice-button-container">
        <button
          className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          style={{
            transform: isRecording ? `scale(${1 + audioLevel * 0.3})` : 'scale(1)'
          }}
        >
          {isProcessing ? (
            <Loader className="animate-spin" size={32} />
          ) : isRecording ? (
            <MicOff size={32} />
          ) : (
            <Mic size={32} />
          )}
        </button>
        
        {/* Audio level indicator */}
        {isRecording && (
          <div className="audio-level-ring" style={{
            opacity: 0.5 + audioLevel * 0.5,
            transform: `scale(${1.2 + audioLevel * 0.5})`
          }} />
        )}
      </div>

      {/* Status text */}
      <div className="voice-status">
        {isProcessing ? (
          <span>🎯 प्रोसेसिंग...</span>
        ) : isRecording ? (
          <span className="recording-pulse">🎤 बोलें... (रोकने के लिए क्लिक करें)</span>
        ) : (
          <span>{placeholder}</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="voice-error">
          <X size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Transcription result */}
      {transcription && (
        <div className="voice-transcription">
          <Volume2 size={18} />
          <p>{transcription}</p>
          <div className="transcription-actions">
            <button className="accept-btn" onClick={acceptTranscription}>
              <Check size={16} /> उपयोग करें
            </button>
            <button className="retry-btn" onClick={clearTranscription}>
              <X size={16} /> फिर से
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .voice-input-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, #0a1628 0%, #1a2d47 100%);
          border-radius: 16px;
          margin: 1rem 0;
        }

        .voice-language-select select {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(212, 168, 83, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          cursor: pointer;
        }

        .voice-button-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #d4a853 0%, #b8943f 100%);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(212, 168, 83, 0.4);
          z-index: 2;
        }

        .voice-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(212, 168, 83, 0.5);
        }

        .voice-button.recording {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        }

        .voice-button.processing {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          cursor: wait;
        }

        .audio-level-ring {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 3px solid #ef4444;
          z-index: 1;
          transition: transform 0.1s ease, opacity 0.1s ease;
        }

        .voice-status {
          margin-top: 1rem;
          color: #94a3b8;
          font-size: 0.9rem;
          text-align: center;
        }

        .recording-pulse {
          color: #ef4444;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .voice-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 0.85rem;
        }

        .voice-transcription {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(212, 168, 83, 0.3);
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
        }

        .voice-transcription > div:first-child {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          color: #d4a853;
        }

        .voice-transcription p {
          margin: 0.5rem 0;
          color: #e2e8f0;
          font-size: 1rem;
          line-height: 1.5;
        }

        .transcription-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .accept-btn, .retry-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: none;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .accept-btn {
          background: #22c55e;
          color: white;
        }

        .accept-btn:hover {
          background: #16a34a;
        }

        .retry-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #94a3b8;
        }

        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default VoiceInput;
