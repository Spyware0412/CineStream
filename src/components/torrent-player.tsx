
"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Clapperboard, Loader2 } from 'lucide-react';

interface TorrentPlayerProps {
  magnetUri: string;
  title: string;
  onBack: () => void;
}

declare global {
    interface Window {
        Player: any;
    }
}

export function TorrentPlayer({ magnetUri, title, onBack }: TorrentPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    const scriptId = 'player-sdk-js-script';
    const scriptSrc = 'https://cdn.jsdelivr.net/npm/player-sdk-js@1.0.9/dist/player-sdk.min.js';

    // Check if the script is already on the page
    if (document.getElementById(scriptId) || window.Player) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load player-sdk-js script.");
    }
    
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        // Optional: you might not want to remove it if other components use it
        // document.body.removeChild(existingScript);
      }
    }

  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !playerRef.current) {
      return;
    }
    
    if (playerInstance.current) {
        playerInstance.current.destroy();
        playerInstance.current = null;
    }
    
    console.log('Initializing player-sdk-js...');
    setIsPlayerReady(false);

    try {
      playerInstance.current = new window.Player({
        selector: `#${playerRef.current.id}`,
        source: magnetUri,
        autoPlay: true,
        title: title,
        logLevel: 'debug'
      });
      playerInstance.current.on('ready', () => {
        setIsPlayerReady(true);
      });
    } catch (error) {
       console.error("Failed to initialize player-sdk-js:", error);
    }
    
    return () => {
      if (playerInstance.current) {
        console.log('Destroying player-sdk-js instance.');
        playerInstance.current.destroy();
        playerInstance.current = null;
      }
    };
  }, [isScriptLoaded, magnetUri, title]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        id="video-player-container" 
        ref={playerRef} 
        className="w-full aspect-video bg-black rounded-lg relative overflow-hidden group"
      >
        {!isPlayerReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white">
                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                <p className="text-lg">Preparing player...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
        )}
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
