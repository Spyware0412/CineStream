
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
        WebTorrent: any;
    }
}

export function TorrentPlayer({ magnetUri, title, onBack }: TorrentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webtorrentClient = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Loading WebTorrent...");

  useEffect(() => {
    const scriptId = 'webtorrent-sdk-script';
    const scriptSrc = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
    let client: any = null;

    const initializePlayer = () => {
      if (!window.WebTorrent || !videoRef.current) return;

      console.log('WebTorrent SDK loaded, initializing client.');
      setStatus('Initializing Torrent Client...');
      client = new window.WebTorrent();
      webtorrentClient.current = client;

      client.on('error', (err: any) => {
        console.error('WebTorrent Client Error:', err);
        setStatus(`Error: ${err.message}`);
        setIsLoading(false);
      });
      
      setStatus('Fetching torrent metadata...');
      client.add(magnetUri, (torrent: any) => {
        console.log('Torrent metadata received.');
        setStatus('Starting stream...');
        const file = torrent.files.find((f: any) => f.name.endsWith('.mp4'));
        
        if (file && videoRef.current) {
          console.log('Appending video file to player.');
          file.renderTo(videoRef.current, { autoplay: true });
          setIsLoading(false);
          setStatus('');
        } else {
          console.warn('No .mp4 file found in torrent.');
          setStatus('No compatible video file found in torrent.');
          setIsLoading(false);
        }
      });
    };
    
    // Check if script already exists
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = scriptSrc;
      script.async = true;
      script.onload = initializePlayer;
      script.onerror = () => {
          console.error("Failed to load WebTorrent script.");
          setStatus("Failed to load required player script.");
          setIsLoading(false);
      }
      document.body.appendChild(script);
    } else {
      initializePlayer();
    }
    
    return () => {
      console.log('Cleaning up WebTorrent client.');
      if (client) {
          try {
              client.destroy();
          } catch(e) {
              console.warn("Could not destroy WebTorrent client:", e);
          }
      }
    };
  }, [magnetUri]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        className="w-full aspect-video bg-black rounded-lg relative overflow-hidden group"
      >
        <video ref={videoRef} className="w-full h-full" controls />
        {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-white pointer-events-none">
                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                <p className="text-lg font-semibold">Preparing Video</p>
                <p className="text-sm text-muted-foreground">{status}</p>
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

