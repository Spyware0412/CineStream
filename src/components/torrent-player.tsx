
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
  const clientRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Loading WebTorrent...");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const scriptId = 'webtorrent-sdk-script';
    const scriptSrc = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';

    if (document.getElementById(scriptId)) {
        setScriptLoaded(true);
    } else {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = scriptSrc;
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => {
            console.error("Failed to load WebTorrent script.");
            setStatus("Failed to load required player script.");
            setIsLoading(false);
        };
        document.body.appendChild(script);
    }
  }, []);


  useEffect(() => {
    if (!scriptLoaded || !videoRef.current) return;

    console.log('WebTorrent SDK loaded, initializing client.');
    setStatus('Initializing Torrent Client...');
    
    // Ensure client is only created once
    if (!clientRef.current) {
        clientRef.current = new window.WebTorrent();
    }
    
    const client = clientRef.current;

    client.on('error', (err: any) => {
      console.error('WebTorrent Client Error:', err);
      setStatus(`Error: ${err.message}`);
      setIsLoading(false);
    });
    
    // Remove any existing torrents before adding a new one
    if (client.torrents.length > 0) {
        // Create a copy of the torrents array before iterating
        const torrentsToRemove = [...client.torrents];
        torrentsToRemove.forEach((t: any) => {
            try {
                t.destroy();
            } catch (e) {
                console.warn("Error destroying existing torrent:", e);
            }
        });
    }

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

    return () => {
      console.log('Cleaning up WebTorrent client.');
      // Only destroy if the client instance exists
      if (clientRef.current) {
        try {
            clientRef.current.destroy();
            clientRef.current = null;
        } catch (e) {
            console.warn("Could not destroy WebTorrent client during cleanup:", e);
        }
      }
    };
  }, [magnetUri, scriptLoaded]);

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