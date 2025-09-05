
"use client";

import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Clapperboard } from 'lucide-react';

interface VideoPlayerProps {
  magnetUri: string;
  title: string;
  onBack: () => void;
}

export function VideoPlayer({ magnetUri, title, onBack }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamUrl = `/api/stream?magnet=${encodeURIComponent(magnetUri)}`;

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        className="w-full aspect-video bg-black rounded-lg relative overflow-hidden group"
      >
        <video ref={videoRef} className="w-full h-full" controls autoPlay src={streamUrl}>
            Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Button onClick={onBack} variant="outline">
          <Clapperboard className="mr-2 h-4 w-4" />
          Back to details
        </Button>
      </div>
    </div>
  );
}
