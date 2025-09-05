
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Clapperboard } from 'lucide-react';

interface VideoPlayerProps {
  magnetUri: string;
  title: string;
  onBack: () => void;
}

export function VideoPlayer({ magnetUri, title, onBack }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const streamUrl = `/api/stream?magnet=${encodeURIComponent(magnetUri)}`;

  const hideControls = () => {
    if (isPlaying) {
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
        
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                {/* Progress Bar */}
                <Slider
                    value={[progress]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="w-full h-2 cursor-pointer"
                />

                {/* Controls */}
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
                    <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                        {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                    </Button>
                </div>
            </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-2">
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
