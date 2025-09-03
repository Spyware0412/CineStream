
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  ChevronLeft,
  DownloadCloud,
  Signal,
  Users,
  AlertTriangle,
  Loader2,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TorrentPlayerProps {
  magnetUri: string;
  title: string;
  onBack: () => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export function TorrentPlayer({ magnetUri, title, onBack }: TorrentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [logs, setLogs] = useState<string[]>(["Initializing player..."]);
  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [peers, setPeers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  const { toast } = useToast();

  const addLog = useCallback((log: string) => {
    console.log("LOG:", log);
    setLogs((prev) => [log, ...prev.slice(0, 99)]);
  }, []);

  useEffect(() => {
    if (window.WebTorrent) {
      setIsScriptLoaded(true);
      return;
    }

    addLog("Loading WebTorrent client script...");
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js";
    script.async = true;
    script.onload = () => {
      addLog("WebTorrent client script loaded.");
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      const errorMsg = "Failed to load WebTorrent client script.";
      addLog(errorMsg);
      setError(errorMsg);
      toast({ title: "Player Error", description: errorMsg, variant: "destructive" });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [addLog, toast]);

  useEffect(() => {
    if (!isScriptLoaded || !magnetUri) return;

    addLog("Creating new WebTorrent client.");
    const client = new window.WebTorrent({
        tracker: {
            rtcConfig: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ],
            },
        },
    });
    clientRef.current = client;

    client.on('error', (err: Error) => {
        const errorMsg = `Client error: ${err.message}`;
        addLog(errorMsg);
        setError(errorMsg);
    });

    const enhancedMagnetUri = magnetUri + '&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337';
    addLog(`Adding torrent: ${title}`);

    client.add(enhancedMagnetUri, (torrent: any) => {
      addLog("Torrent added. Waiting for metadata...");
      setIsReady(false);

      const file = torrent.files.find(
        (f: any) => f.name.endsWith(".mp4") || f.name.endsWith(".mkv") || f.name.endsWith('.avi')
      );

      if (!file) {
        const errorMsg = "No playable video file found in torrent.";
        addLog(errorMsg);
        setError(errorMsg);
        return;
      }

      addLog(`File found: ${file.name}`);
      file.renderTo(videoRef.current, { autoplay: true, controls: false }, (err: Error | null) => {
        if (err) {
          const errorMsg = `Error rendering video: ${err.message}`;
          addLog(errorMsg);
          setError(errorMsg);
          return;
        }
        addLog("Video rendered and ready to play.");
        setIsReady(true);
        if(videoRef.current) {
            videoRef.current.play().catch(e => console.error("Autoplay was prevented:", e));
            setIsPaused(videoRef.current.paused);
        }
      });
      
      torrent.on("download", () => {
        setProgress(torrent.progress * 100);
        setDownloadSpeed(torrent.downloadSpeed);
        setPeers(torrent.numPeers);
      });

      torrent.on('done', () => {
        addLog("Torrent download finished.");
        setProgress(100);
      });

      torrent.on('noPeers', (announceType: string) => {
          addLog(`No peers found for tracker type: ${announceType}`);
      });

      const interval = setInterval(() => {
          setDownloadSpeed(torrent.downloadSpeed);
          setPeers(torrent.numPeers);
          setProgress(torrent.progress * 100);
      }, 1000);
      
      return () => clearInterval(interval);
    });

    return () => {
        if (clientRef.current && !clientRef.current.destroyed) {
            clientRef.current.destroy(() => addLog("WebTorrent client destroyed."));
            clientRef.current = null;
        }
    }

  }, [isScriptLoaded, magnetUri, title, addLog]);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full aspect-video bg-black rounded-lg relative overflow-hidden group">
        <video ref={videoRef} className="w-full h-full object-contain" onClick={handleTogglePlay} />
         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {!isReady && !error && (
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p>Preparing stream, please wait...</p>
            </div>
          )}
          {isReady && (
            <Button variant="ghost" size="icon" className="w-20 h-20 text-white/80 hover:text-white hover:bg-white/10" onClick={handleTogglePlay}>
                {isPaused ? <PlayCircle className="w-16 h-16" /> : <PauseCircle className="w-16 h-16" />}
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <Button onClick={onBack} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to details
        </Button>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <Badge variant="outline" className="flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-blue-500"/>
            Speed: {formatBytes(downloadSpeed)}/s
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            Peers: {peers}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Signal className="w-4 h-4 text-purple-500" />
            Progress: {progress.toFixed(2)}%
          </Badge>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-md text-destructive flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="h-40 bg-muted/50 rounded-md p-3 overflow-y-auto">
        <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/70">
          {logs.join("\n")}
        </pre>
      </div>
    </div>
  );
}
