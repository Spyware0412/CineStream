
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
        WebTorrent?: any;
    }
}

export function TorrentPlayer({ magnetUri, title, onBack }: TorrentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<any>(null);
  
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Loading Player...");

  // Effect to load the WebTorrent script once.
  useEffect(() => {
    const scriptId = 'webtorrent-sdk-script';
    
    if (document.getElementById(scriptId) || window.WebTorrent) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('WebTorrent SDK script loaded successfully.');
      setIsScriptLoaded(true);
    };

    script.onerror = () => {
      console.error("Failed to load WebTorrent script.");
      setStatus("Error: Could not load required player script.");
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
            // In a standard environment, you might remove the script.
            // But for stability, we'll leave it in case other components need it.
        }
    };
  }, []); // Empty dependency array ensures this runs only once.


  // Effect to manage the WebTorrent client and torrents.
  useEffect(() => {
    if (!isScriptLoaded || !videoRef.current) {
        return;
    }

    // Initialize client if it doesn't exist.
    if (!clientRef.current) {
      console.log('Initializing WebTorrent client.');
      setStatus('Initializing Torrent Client...');
      try {
        clientRef.current = new window.WebTorrent();
        clientRef.current.on('error', (err: any) => {
          console.error('WebTorrent Client Error:', err);
          setStatus(`Error: ${err.message}`);
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Failed to construct WebTorrent client:', err);
        setStatus('Error: Failed to initialize player.');
        setIsLoading(false);
        return;
      }
    }

    const client = clientRef.current;
    
    // Clear any existing torrents before adding a new one.
    if(client.torrents.length > 0) {
        console.log(`Destroying ${client.torrents.length} existing torrents.`);
        // Create a copy of the array to safely iterate while destroying
        const torrentsToDestroy = [...client.torrents];
        torrentsToDestroy.forEach(t => t.destroy());
    }
    
    console.log('Adding new torrent:', magnetUri);
    setIsLoading(true);
    setStatus('Fetching torrent metadata...');

    client.add(magnetUri, (torrent: any) => {
      console.log('Torrent metadata received for:', torrent.name);
      setStatus('Starting stream...');

      const file = torrent.files.find((f: any) => 
        f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.avi')
      );
      
      if (file && videoRef.current) {
        console.log('Appending video file to player:', file.name);
        file.renderTo(videoRef.current, { autoplay: true });
        setIsLoading(false);
        setStatus('');
      } else {
        console.warn('No compatible video file found in torrent.');
        setStatus('No compatible video file found in torrent.');
        setIsLoading(false);
      }
    });

    // This is the cleanup function for THIS torrent, not the client.
    return () => {
      const torrent = client.get(magnetUri);
      if (torrent) {
        console.log('Cleaning up torrent:', torrent.name);
        torrent.destroy();
      }
    };

  }, [magnetUri, isScriptLoaded]); // Re-run only when magnetUri or script loaded status changes.

  // Effect to clean up the client only when the component fully unmounts.
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        console.log('Component unmounting. Destroying WebTorrent client.');
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only on unmount.


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
