'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

interface TalkingHeadProps {
  className?: string;
  cameraStream?: MediaStream | null;
}

const TalkingHead: React.FC<TalkingHeadProps> = ({
  className = '',
  cameraStream
}) => {
  const avatarRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<any[]>([]);
  const isPlayingAudioRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [selectedAvatar, setSelectedAvatar] = useState('F');
  const [selectedMood, setSelectedMood] = useState('neutral');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [scriptLoadStarted, setScriptLoadStarted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const avatarOptions = [
    { value: 'F', label: 'Female Avatar' },
    { value: 'M', label: 'Male Avatar' }
  ];

  const moodOptions = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'angry', label: 'Angry' },
    { value: 'love', label: 'Love' }
  ];

  // Get WebSocket context
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    onAudioReceived,
    onInterrupt,
    onError,
    onStatusChange
  } = useWebSocketContext();

  const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
    if (type === 'success' || type === 'info') {
      setTimeout(() => setStatus(null), 3000);
    }
  };

  // Initialize audio context
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 22050 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  // Convert base64 to ArrayBuffer
  const base64ToArrayBuffer = useCallback((base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }, []);

  // Convert Int16Array to Float32Array
  const int16ArrayToFloat32 = useCallback((int16Array: Int16Array) => {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }, []);

  // Play next audio in queue
  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingAudioRef.current = true;
    setIsSpeaking(true);

    const audioItem = audioQueueRef.current.shift();
    console.log('Playing audio item:', audioItem);

    try {
      if (
        headRef.current &&
        audioItem.timingData &&
        audioItem.timingData.words
      ) {
        // Use TalkingHead with native timing
        const speakData = {
          audio: audioItem.buffer,
          words: audioItem.timingData.words,
          wtimes: audioItem.timingData.word_times,
          wdurations: audioItem.timingData.word_durations
        };

        console.log('Using TalkingHead with timing data:', speakData);
        headRef.current.speakAudio(speakData);

        // Set timer for next audio
        setTimeout(() => {
          console.log('TalkingHead audio finished, playing next...');
          playNextAudio();
        }, audioItem.duration * 1000);
      } else if (headRef.current) {
        // Basic TalkingHead audio without timing
        console.log('Using basic TalkingHead audio');
        headRef.current.speakAudio({ audio: audioItem.buffer });

        setTimeout(() => {
          console.log('Basic TalkingHead audio finished, playing next...');
          playNextAudio();
        }, audioItem.duration * 1000);
      } else {
        // Fallback to Web Audio API
        console.log('Using Web Audio API fallback');
        await initAudioContext();
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioItem.buffer;
        source.connect(audioContextRef.current!.destination);
        source.onended = () => {
          console.log('Web Audio finished, playing next...');
          playNextAudio();
        };
        source.start();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      // Continue to next audio on error
      setTimeout(() => playNextAudio(), 100);
    }
  }, [initAudioContext]);

  // Handle audio from WebSocket
  const handleAudioReceived = useCallback(
    async (
      base64Audio: string,
      timingData?: any,
      sampleRate = 24000,
      method = 'unknown'
    ) => {
      console.log('🎵 TALKINGHEAD handleAudioReceived CALLED!', {
        audioLength: base64Audio.length,
        timingData,
        sampleRate,
        method
      });

      try {
        await initAudioContext();

        // Convert base64 to audio buffer
        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = int16ArrayToFloat32(int16Array);

        console.log('Audio conversion successful:', {
          arrayBufferLength: arrayBuffer.byteLength,
          int16Length: int16Array.length,
          float32Length: float32Array.length
        });

        // Create AudioBuffer
        const audioBuffer = audioContextRef.current!.createBuffer(
          1,
          float32Array.length,
          sampleRate
        );
        audioBuffer.copyToChannel(float32Array, 0);

        console.log('AudioBuffer created:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          length: audioBuffer.length
        });

        // Add to queue
        audioQueueRef.current.push({
          buffer: audioBuffer,
          timingData: timingData,
          duration: audioBuffer.duration,
          method: method
        });

        console.log(
          'Audio added to queue. Queue length:',
          audioQueueRef.current.length
        );

        // Start playing if not already playing
        if (!isPlayingAudioRef.current) {
          console.log('Starting audio playback...');
          playNextAudio();
        } else {
          console.log('Audio already playing, added to queue');
        }

        const timingInfo = timingData
          ? ` with ${timingData.words?.length || 0} word timings`
          : ' (no timing)';
        console.log(
          `✅ Audio queued successfully: ${audioBuffer.duration.toFixed(2)}s${timingInfo} [${method}]`
        );
      } catch (error) {
        console.error(
          '❌ Error processing audio in handleAudioReceived:',
          error
        );
      }
    },
    [initAudioContext, base64ToArrayBuffer, int16ArrayToFloat32, playNextAudio]
  );

  // Handle interrupt from server
  const handleInterrupt = useCallback(() => {
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    setIsSpeaking(false);

    // Stop TalkingHead if speaking
    // if (headRef.current) {
    //   try {
    //     headRef.current.stop();
    //   } catch (error) {
    //     console.error('Error stopping TalkingHead:', error);
    //   }
    // }

    console.log('Audio interrupted and cleared');
  }, []);

  // Register WebSocket callbacks
  useEffect(() => {
    onAudioReceived(handleAudioReceived);
    onInterrupt(handleInterrupt);
    onError((error) => showStatus(`WebSocket error: ${error}`, 'error'));
    onStatusChange((status) => {
      if (status === 'connected')
        showStatus('Connected to voice assistant', 'success');
      if (status === 'disconnected')
        showStatus('Disconnected from server', 'info');
    });
  }, [
    onAudioReceived,
    onInterrupt,
    onError,
    onStatusChange,
    handleAudioReceived,
    handleInterrupt
  ]);

  // Load TalkingHead library via document script so the page's import map applies (required for 'three' etc.)
  const TALKINGHEAD_URLS = [
    'https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.7.0/modules/talkinghead.mjs',
    'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.4/modules/talkinghead.mjs'
  ];

  const loadTalkingHeadScript = useCallback(() => {
    if ((window as any).TalkingHead) {
      setScriptsLoaded(true);
      return;
    }
    setScriptLoadStarted(true);

    let urlIndex = 0;

    const tryLoad = () => {
      const url = TALKINGHEAD_URLS[urlIndex];
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = `
        import('${url}')
          .then(function(m) {
            window.TalkingHead = m.TalkingHead;
            window.dispatchEvent(new Event('talkinghead-loaded'));
          })
          .catch(function(err) {
            console.error('TalkingHead load failed:', err);
            window.dispatchEvent(new CustomEvent('talkinghead-error', { detail: err }));
          });
      `;
      document.body.appendChild(script);
    };

    const onLoaded = () => {
      setScriptsLoaded(true);
      window.removeEventListener('talkinghead-loaded', onLoaded);
      window.removeEventListener('talkinghead-error', onError);
    };
    const onError = () => {
      window.removeEventListener('talkinghead-loaded', onLoaded);
      window.removeEventListener('talkinghead-error', onError);
      urlIndex += 1;
      if (urlIndex < TALKINGHEAD_URLS.length) {
        setScriptLoadStarted(false);
        setTimeout(() => {
          setScriptLoadStarted(true);
          window.addEventListener('talkinghead-loaded', onLoaded);
          window.addEventListener('talkinghead-error', onError);
          tryLoad();
        }, 500);
      } else {
        showStatus('Failed to load TalkingHead library', 'error');
        setScriptLoadStarted(false);
      }
    };

    window.addEventListener('talkinghead-loaded', onLoaded);
    window.addEventListener('talkinghead-error', onError);
    tryLoad();
  }, []);

  // Listen for script-tag load result (loaded state is set in loadTalkingHeadScript's onLoaded; error after all retries is set there too)
  useEffect(() => {
    const onLoaded = () => setScriptsLoaded(true);
    window.addEventListener('talkinghead-loaded', onLoaded);
    return () => window.removeEventListener('talkinghead-loaded', onLoaded);
  }, []);

  // Auto-load TalkingHead script on mount so avatar appears
  useEffect(() => {
    if ((window as any).TalkingHead) {
      setScriptsLoaded(true);
      return;
    }
    const t = setTimeout(() => {
      setScriptLoadStarted(true);
      loadTalkingHeadScript();
    }, 150);
    return () => clearTimeout(t);
  }, [loadTalkingHeadScript]);

  // Initialize TalkingHead
  useEffect(() => {
    if (!scriptsLoaded || !avatarRef.current) return;

    const initTalkingHead = async () => {
      try {
        setIsLoading(true);
        showStatus('Initializing avatar...', 'info');

        const TalkingHead = (window as any).TalkingHead;
        if (!TalkingHead) {
          throw new Error('TalkingHead library not loaded');
        }

        headRef.current = new TalkingHead(avatarRef.current, {
          ttsEndpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize',
          jwtGet: () => Promise.resolve('dummy-jwt-token'),
          lipsyncModules: ['en'],
          lipsyncLang: 'en',
          modelFPS: 30,
          cameraView: 'full',
          avatarMute: false,
          avatarMood: selectedMood
        });

        await loadAvatar(selectedAvatar);
        setIsLoading(false);
        showStatus('Avatar ready!', 'success');

        // Auto-connect to WebSocket
        connect();
      } catch (error: any) {
        setIsLoading(false);
        showStatus(`Failed to initialize: ${error.message}`, 'error');
      }
    };

    initTalkingHead();

    return () => {
      if (headRef.current) {
        try {
          headRef.current.stop();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }, [scriptsLoaded, connect]);

  const loadAvatar = async (gender: string = 'F') => {
    const avatarUrls = {
      F: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png',
      M: 'https://models.readyplayer.me/638df5d0d72bffc6fa179441.glb'
    };

    try {
      await headRef.current?.showAvatar({
        url: avatarUrls[gender as keyof typeof avatarUrls],
        body: gender,
        avatarMood: selectedMood,
        lipsyncLang: 'en'
      });
    } catch (error: any) {
      showStatus(`Failed to load avatar: ${error.message}`, 'error');
    }
  };

  const handleAvatarChange = (gender: string) => {
    setSelectedAvatar(gender);
    if (scriptsLoaded && headRef.current) {
      loadAvatar(gender);
    }
  };

  const handleMoodChange = (mood: string) => {
    setSelectedMood(mood);
    if (headRef.current) {
      headRef.current.setMood(mood);
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="py-3 text-center">
        <CardTitle className="text-lg font-semibold">AI Avatar</CardTitle>
        <CardDescription className="text-xs">
          Voice-controlled 3D avatar
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Avatar Display */}
        <div
          className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200"
          style={{ height: '420px' }}
        >
          <div ref={avatarRef} className="h-full w-full" />

          {/* Loading Overlay */}
          {(isLoading || !scriptsLoaded) && (
            <div className="bg-opacity-90 absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                {!scriptLoadStarted ? (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Click below to load the avatar (required for audio)
                    </p>
                    <Button
                      onClick={loadTalkingHeadScript}
                      size="lg"
                      className="min-w-[180px]"
                    >
                      Get started
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="text-primary mx-auto mb-4 h-12 w-12 animate-spin" />
                    <p className="text-muted-foreground">
                      {!scriptsLoaded
                        ? 'Loading TalkingHead...'
                        : 'Loading avatar...'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Status Badges */}
          {scriptsLoaded && !isLoading && (
            <div className="absolute top-4 left-4 space-y-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnecting
                  ? 'Connecting...'
                  : isConnected
                    ? 'Connected'
                    : 'Disconnected'}
              </Badge>
              {isSpeaking && (
                <Badge variant="destructive" className="block">
                  Speaking...
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Connection Control */}
        <div className="flex gap-2">
          <Button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting || !scriptsLoaded}
            className="flex-1"
            variant={isConnected ? 'destructive' : 'default'}
            size="sm"
          >
            {isConnecting
              ? 'Connecting...'
              : isConnected
                ? 'Disconnect'
                : 'Connect'}
          </Button>
        </div>

        {/* Settings - collapsed by default */}
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              <Settings className="mr-1 h-3 w-3" />
              Avatar settings
              {isSettingsOpen ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : (
                <ChevronDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Avatar</Label>
                <Select
                  value={selectedAvatar}
                  onValueChange={handleAvatarChange}
                  disabled={!scriptsLoaded}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {avatarOptions.map((avatar) => (
                      <SelectItem key={avatar.value} value={avatar.value}>
                        {avatar.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mood</Label>
                <Select
                  value={selectedMood}
                  onValueChange={handleMoodChange}
                  disabled={!scriptsLoaded}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>
                        {mood.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Status Display */}
        {status && (
          <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default TalkingHead;
