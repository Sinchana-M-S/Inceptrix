'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const DEFAULT_CONFIG = {
  energyThreshold: 0.02,
  conversationBreakDuration: 2.5,
  minSpeechDuration: 0.8,
  maxSpeechDuration: 15,
  sampleRate: 16000
};

export function useVoiceInput(options: {
  isConnected: boolean;
  sendAudioSegment: (audioData: ArrayBuffer) => void;
  sendAudioWithImage: (audioData: ArrayBuffer, imageData: string) => void;
  captureImage?: () => { data: string } | null;
}) {
  const { isConnected, sendAudioSegment, sendAudioWithImage, captureImage } =
    options;
  const [isListening, setIsListening] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const silenceFramesRef = useRef(0);
  const speechFramesRef = useRef(0);
  const isInSpeechRef = useRef(false);
  const config = DEFAULT_CONFIG;

  const createAndSendAudio = useCallback(
    (audioBuffers: Float32Array[]) => {
      if (!isConnected) return;
      const totalLength = audioBuffers.reduce(
        (sum, buffer) => sum + buffer.length,
        0
      );
      const combinedBuffer = new Float32Array(totalLength);
      let offset = 0;
      for (const buffer of audioBuffers) {
        combinedBuffer.set(buffer, offset);
        offset += buffer.length;
      }
      const int16Buffer = new Int16Array(combinedBuffer.length);
      for (let i = 0; i < combinedBuffer.length; i++) {
        int16Buffer[i] = Math.max(
          -32768,
          Math.min(32767, combinedBuffer[i] * 32767)
        );
      }
      const audioData = int16Buffer.buffer;
      const imageCapture = captureImage?.();
      if (imageCapture) {
        sendAudioWithImage(audioData, imageCapture.data);
      } else {
        sendAudioSegment(audioData);
      }
    },
    [isConnected, sendAudioSegment, sendAudioWithImage, captureImage]
  );

  const processAudioData = useCallback(
    (energy: number, audioData: Float32Array) => {
      const conversationBreakFrames = Math.floor(
        (config.conversationBreakDuration * config.sampleRate) / 1024
      );
      const minSpeechFrames = Math.floor(
        (config.minSpeechDuration * config.sampleRate) / 1024
      );
      const maxSpeechFrames = Math.floor(
        (config.maxSpeechDuration * config.sampleRate) / 1024
      );

      audioBufferRef.current.push(new Float32Array(audioData));

      if (energy > config.energyThreshold) {
        if (!isInSpeechRef.current) {
          isInSpeechRef.current = true;
        }
        speechFramesRef.current++;
        silenceFramesRef.current = 0;
      } else {
        if (isInSpeechRef.current) {
          silenceFramesRef.current++;
          if (
            silenceFramesRef.current >= conversationBreakFrames &&
            speechFramesRef.current >= minSpeechFrames
          ) {
            createAndSendAudio(audioBufferRef.current);
            speechFramesRef.current = 0;
            silenceFramesRef.current = 0;
            isInSpeechRef.current = false;
            audioBufferRef.current = [];
          }
        }
      }

      if (isInSpeechRef.current && speechFramesRef.current >= maxSpeechFrames) {
        createAndSendAudio(audioBufferRef.current);
        speechFramesRef.current = 0;
        silenceFramesRef.current = 0;
        audioBufferRef.current = [new Float32Array(audioData)];
      }

      if (
        !isInSpeechRef.current &&
        audioBufferRef.current.length > conversationBreakFrames * 2
      ) {
        audioBufferRef.current = audioBufferRef.current.slice(
          -conversationBreakFrames
        );
      }
    },
    [config, createAndSendAudio]
  );

  const initializeAudioWorklet = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({
        sampleRate: config.sampleRate
      });
    }
    const audioContext = audioContextRef.current;
    const workletCode = `
      class VoiceActivityProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 1024;
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }
        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input.length > 0) {
            const inputChannel = input[0];
            for (let i = 0; i < inputChannel.length; i++) {
              this.buffer[this.bufferIndex++] = inputChannel[i];
              if (this.bufferIndex >= this.bufferSize) {
                let sum = 0;
                for (let j = 0; j < this.bufferSize; j++)
                  sum += this.buffer[j] * this.buffer[j];
                const energy = Math.sqrt(sum / this.bufferSize);
                this.port.postMessage({
                  type: 'audioData',
                  energy,
                  audioData: new Float32Array(this.buffer)
                });
                this.bufferIndex = 0;
              }
            }
          }
          return true;
        }
      }
      registerProcessor('voice-activity-processor', VoiceActivityProcessor);
    `;
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);
    return audioContext;
  }, [config.sampleRate]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;
      const audioContext = await initializeAudioWorklet();
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        'voice-activity-processor'
      );
      workletNodeRef.current = workletNode;
      workletNode.port.onmessage = (event) => {
        const { type, energy, audioData } = event.data;
        if (type === 'audioData') processAudioData(energy, audioData);
      };
      source.connect(workletNode);
      setIsListening(true);
    } catch (err) {
      console.error('Failed to access microphone', err);
    }
  }, [config.sampleRate, initializeAudioWorklet, processAudioData]);

  const stopListening = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioBufferRef.current = [];
    silenceFramesRef.current = 0;
    speechFramesRef.current = 0;
    isInSpeechRef.current = false;
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  return { isListening, toggleListening };
}
