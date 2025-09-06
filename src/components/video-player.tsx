
"use client"

import { TorrentLink } from "@/types";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { ArrowDown, ArrowUp, Users } from "lucide-react";

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


    const getPlayerUrl = () => {
        if (!streamingServerUrl) return '';
        
        const { infoHash, displayName, trackers } = link;
        const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(displayName)}`;
        const trackerParams = trackers.map(tr => `tr=${encodeURIComponent(tr)}`).join('&');
        
        return `${streamingServerUrl}/api/stream?magnet=${encodeURIComponent(magnet)}&${trackerParams}`;
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
        <div className="space-y-2">
            <video
                id="player"
                controls
                autoPlay
                src={playerUrl}
                className="w-full rounded-lg bg-black aspect-video"
            />
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground px-2">
                 <Badge variant="outline" className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{peers} Peers</span>
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-green-500" />
                    <span>{formatSpeed(downloadSpeed)}</span>
                </Badge>
                 <Badge variant="outline" className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-red-500" />
                    <span>{formatSpeed(downloadSpeed / 10)}</span>
                </Badge>
                <p className="text-xs hidden sm:block">Note: Statistics are simulated for this prototype.</p>
            </div>
        </div>
    )
}

    