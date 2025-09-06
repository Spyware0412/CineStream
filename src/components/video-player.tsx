
"use client"

import { TorrentLink } from "@/types";
import { useEffect, useState, useRef } from "react";
import { Badge } from "./ui/badge";
import { ArrowDown, Users, Percent } from "lucide-react";
import { Progress } from "./ui/progress";

interface VideoPlayerProps {
    link: TorrentLink;
}

const formatSpeed = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function VideoPlayer({ link }: VideoPlayerProps) {
    const [peers, setPeers] = useState(0);
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamingServerUrl = process.env.NEXT_PUBLIC_STREAMING_SERVER_URL;

    useEffect(() => {
        // Simulate real-time statistics
        const interval = setInterval(() => {
            setPeers(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
            setDownloadSpeed(Math.random() * 5 * 1024 * 1024); // Simulate up to 5 MB/s
        }, 2000);

        // Initial values
        setPeers(Math.floor(Math.random() * 20) + 5);

        return () => clearInterval(interval);
    }, [link]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.duration > 0) {
                setProgress((video.currentTime / video.duration) * 100);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, []);


    const getPlayerUrl = () => {
        if (!streamingServerUrl) return '';

        const { infoHash, displayName, trackers } = link;
        const trackerParams = trackers.map(tr => `tr=${encodeURIComponent(tr)}`).join('&');
        const magnetURI = `magnet:?xt=urn:btih:${infoHash}`;

        const url = `${streamingServerUrl}/api/stream?magnet=${encodeURIComponent(infoHash)}&dn=${encodeURIComponent(displayName)}&${trackerParams}`;
        return url;
    }

    const playerUrl = getPlayerUrl();

    if (!streamingServerUrl) {
        return (
             <div className="aspect-video w-full rounded-lg bg-destructive/20 text-destructive flex items-center justify-center p-4">
                <p className="text-center">Streaming server URL is not configured. Please set NEXT_PUBLIC_STREAMING_SERVER_URL in your environment variables.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <video
                id="player"
                ref={videoRef}
                controls
                autoPlay
                src={playerUrl}
                className="w-full rounded-lg bg-black aspect-video"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <Badge variant="outline" className="flex items-center gap-3 p-3 justify-center">
                    <Users className="w-5 h-5 text-primary" />
                    <div className="text-left">
                        <p className="font-semibold">{peers} Peers</p>
                        <p className="text-xs text-muted-foreground">Connected users</p>
                    </div>
                </Badge>
                 <Badge variant="outline" className="flex items-center gap-3 p-3 justify-center">
                    <ArrowDown className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                        <p className="font-semibold">{formatSpeed(downloadSpeed)}</p>
                        <p className="text-xs text-muted-foreground">Bandwidth</p>
                    </div>
                </Badge>
                <div className="md:col-span-1">
                     <Badge variant="outline" className="w-full flex items-center gap-3 p-3 justify-center">
                        <Percent className="w-5 h-5 text-accent-foreground" />
                        <div className="text-left w-full">
                           <div className="flex justify-between items-center mb-1">
                             <p className="font-semibold">Completion</p>
                             <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
                           </div>
                           <Progress value={progress} className="h-2" />
                        </div>
                    </Badge>
                </div>
            </div>
             <p className="text-xs text-muted-foreground text-center">Note: Statistics are simulated for this prototype.</p>
        </div>
    )
}
