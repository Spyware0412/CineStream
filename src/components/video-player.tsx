
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Clapperboard, Wifi, Users, ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface VideoPlayerProps {
  magnetUri: string;
  title: string;
  onBack: () => void;
}

interface TorrentStats {
    downloadSpeed: number;
    uploadSpeed: number;
    peers: number;
}

export function VideoPlayer({ magnetUri, title, onBack }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [stats, setStats] = useState<TorrentStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const streamUrl = `/api/stream?magnet=${encodeURIComponent(magnetUri)}`;

  const hideControls = () => {
    if (isPlaying && !showStats) {
      setShowControls(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(hideControls, 3000);
  };
  
  const handleMouseLeave = () => {
      if (isPlaying) {
          setShowControls(false);
      }
  }

  const fetchStats = useCallback(async () => {
      try {
          const response = await fetch(`/api/stream?stats=true&magnet=${encodeURIComponent(magnetUri)}`);
          if(response.ok) {
              const data: TorrentStats = await response.json();
              setStats(data);
          } else {
              setStats(null);
          }
      } catch (error) {
          console.error("Failed to fetch stats:", error);
          setStats(null);
      }
  }, [magnetUri]);

  useEffect(() => {
      if(showStats) {
          fetchStats(); // initial fetch
          statsIntervalRef.current = setInterval(fetchStats, 3000); // fetch every 3 seconds
      } else {
          if (statsIntervalRef.current) {
              clearInterval(statsIntervalRef.current);
          }
      }
      return () => {
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
          }
      }
  }, [showStats, fetchStats]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
        if (video.duration) {
            setProgress((video.currentTime / video.duration) * 100);
        }
    };
    const handleLoadedMetadata = () => {
        setDuration(video.duration);
        video.play().catch(e => console.error("Autoplay was prevented:", e));
    };
    const handleVolumeChange = () => {
        setVolume(video.volume);
        setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    handleMouseMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.paused ? video.play() : video.pause();
    }
  }, []);
  
  const handleSeek = (value: number[]) => {
      const video = videoRef.current;
      if(video) {
          const newTime = (value[0] / 100) * duration;
          video.currentTime = newTime;
          setProgress(value[0]);
      }
  }

  const handleVolumeChange = (value: number[]) => {
      const video = videoRef.current;
      if(video) {
          const newVolume = value[0];
          video.volume = newVolume;
          setVolume(newVolume);
          if(newVolume > 0 && isMuted) {
              video.muted = false;
              setIsMuted(false);
          }
      }
  }

  const toggleMute = () => {
      const video = videoRef.current;
      if(video) {
          video.muted = !video.muted;
          setIsMuted(!isMuted);
           if (!video.muted && volume === 0) {
              handleVolumeChange([0.5]);
          }
      }
  }

  const toggleFullscreen = () => {
      const player = playerRef.current;
      if (!player) return;

      if (!document.fullscreenElement) {
        player.requestFullscreen().catch(err => {
          alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    const kBps = bytesPerSecond / 1024;
    if (kBps < 1024) return `${kBps.toFixed(1)} KB/s`;
    const mBps = kBps / 1024;
    return `${mBps.toFixed(2)} MB/s`;
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        ref={playerRef}
        className="w-full aspect-video bg-black rounded-lg relative overflow-hidden group/player"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <video ref={videoRef} className="w-full h-full" src={streamUrl} onClick={togglePlayPause}>
            Your browser does not support the video tag.
        </video>
        
        {showStats && (
            <div className="absolute top-4 right-4 z-20">
                <Card className="bg-black/70 text-white border-white/20">
                    <CardHeader className='p-4'>
                        <CardTitle className='text-lg'>Live Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm space-y-2">
                        {stats ? (
                           <>
                             <div className="flex items-center gap-2">
                                <ArrowDown className="w-4 h-4 text-green-400" />
                                <span>Download: {formatSpeed(stats.downloadSpeed)}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <ArrowUp className="w-4 h-4 text-orange-400" />
                                <span>Upload: {formatSpeed(stats.uploadSpeed)}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-400" />
                                <span>Peers: {stats.peers}</span>
                             </div>
                           </>
                        ) : (
                            <p>Loading stats...</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center">
                <h3 className="text-white text-lg font-semibold truncate">{title}</h3>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                <Slider
                    value={[progress]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="w-full h-2 cursor-pointer"
                />

                <div className="flex justify-between items-center text-white">
                    <div className="flex items-center gap-4">
                        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                        </Button>
                        <div className="flex items-center gap-2">
                             <Button onClick={toggleMute} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                                {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                            </Button>
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                onValueChange={handleVolumeChange}
                                max={1}
                                step={0.05}
                                className="w-24 h-1 cursor-pointer"
                            />
                        </div>
                         <div className="text-sm font-mono">
                            <span>{formatTime(videoRef.current?.currentTime ?? 0)}</span> / <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setShowStats(!showStats)} variant={showStats ? "secondary" : "ghost"} size="icon" className="text-white hover:bg-white/20 hover:text-white">
                           <Wifi className="h-6 w-6" />
                        </Button>
                        <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-2">
        <div />
        <Button onClick={onBack} variant="outline">
          <Clapperboard className="mr-2 h-4 w-4" />
          Back to details
        </Button>
      </div>
    </div>
  );
}
