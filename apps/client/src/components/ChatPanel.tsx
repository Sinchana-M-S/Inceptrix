'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'voice';
}

interface ChatPanelProps {
  cameraStream?: MediaStream | null;
}

export default function ChatPanel({ cameraStream }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    isConnected,
    sendText,
    sendAudioSegment,
    sendAudioWithImage,
    onStatusChange,
    onAssistantText,
    onUserTranscript
  } = useWebSocketContext();

  const captureImage = useCallback((): { data: string } | null => {
    if (!cameraStream) return null;
    try {
      const video = document.querySelector(
        'video[autoplay]'
      ) as HTMLVideoElement;
      if (!video || video.videoWidth === 0) return null;
      const canvas = document.createElement('canvas');
      const aspect = video.videoWidth / video.videoHeight;
      canvas.width = 320;
      canvas.height = Math.round(320 / aspect);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      return base64 ? { data: base64 } : null;
    } catch {
      return null;
    }
  }, [cameraStream]);

  const { isListening, toggleListening } = useVoiceInput({
    isConnected,
    sendAudioSegment,
    sendAudioWithImage,
    captureImage
  });

  useEffect(() => {
    const handleStatus = (status: string) => {
      if (status === 'connected') {
        setMessages((prev) =>
          prev.length
            ? prev
            : [
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: 'Connected. Type a message or use the mic to talk.',
                  type: 'text'
                }
              ]
        );
      }
    };
    onStatusChange(handleStatus);
  }, [onStatusChange]);

  // Chatbot integration: show assistant reply in chat (replace "…" placeholder or append)
  useEffect(() => {
    const handleAssistantText = (text: string) => {
      if (!text.trim()) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === '…') {
          return prev.slice(0, -1).concat({ ...last, content: text });
        }
        return prev.concat({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: text,
          type: 'text'
        });
      });
    };
    onAssistantText(handleAssistantText);
  }, [onAssistantText]);

  // Chatbot integration: show user speech transcript in chat (voice turns)
  useEffect(() => {
    const handleUserTranscript = (text: string) => {
      if (!text.trim()) return;
      setMessages((prev) =>
        prev.concat({
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          type: 'voice'
        })
      );
    };
    onUserTranscript(handleUserTranscript);
  }, [onUserTranscript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !isConnected) return;
    sendText(text);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text, type: 'text' }
    ]);
    setInput('');
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '…',
        type: 'text'
      }
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg bg-white shadow-lg">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
        <p className="text-xs text-gray-500">
          {isConnected ? 'Connected' : 'Disconnected'}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {m.type === 'voice' && m.role === 'user' && (
                <span className="mr-1 text-xs opacity-80">🎤 </span>
              )}
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder={
              isConnected ? 'Type a message...' : 'Connect to send messages'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            className="max-h-32 min-h-[44px] resize-none"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            variant={isListening ? 'destructive' : 'outline'}
            onClick={toggleListening}
            disabled={!isConnected}
            className="h-11 w-11 shrink-0"
            title={isListening ? 'Stop voice' : 'Voice input'}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!isConnected || !input.trim()}
            className="h-11 w-11 shrink-0"
            title="Send"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
