'use client';

import { useState } from 'react';
import TalkingHead from '@/components/TalkingHead';
import ChatPanel from '@/components/ChatPanel';
import { CameraToggleButton } from '@/components/CameraStream';

export default function Home() {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">TalkMateAI</h1>
          <p className="text-sm text-gray-600">
            Voice-controlled avatar with chat
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: Avatar */}
          <div className="flex flex-col">
            <TalkingHead cameraStream={cameraStream} />
          </div>

          {/* Right: Chat */}
          <div className="flex min-h-[500px] flex-col">
            <ChatPanel cameraStream={cameraStream} />
          </div>
        </div>
      </div>

      <CameraToggleButton onStreamChange={setCameraStream} />
    </main>
  );
}
