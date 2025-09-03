
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import { ChevronLeft, Loader2, AlertCircle, Users, ArrowDown, Percent, Terminal } from "lucide-react";

interface LogEntry {
    type: 'info' | 'success' | 'error';
    message: string;
    timestamp: string;
}

interface TorrentPlayerProps {
  magnetUri: string;
  title: string;
  onBack: () => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function TorrentPlayer({ magnetUri, title, onBack }: TorrentPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
      peers: 0,
      downloadSpeed: 0,
      progress: 0,
  });

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const newLog = {
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
  }, []);

  useEffect(() => {
    addLog('info', 'Torrent Player Initialized.');

    const loadWebTorrentScript = () => {
        return new Promise<void>((resolve, reject) => {
            if (document.getElementById('webtorrent-script')) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.id = 'webtorrent-script';
            script.src = '/api/vendor/webtorrent';
            script.async = true;
            script.onload = () => {
                addLog('success', 'WebTorrent client script loaded locally.');
                resolve();
            };
            script.onerror = (err) => {
                const errorMessage = err instanceof Event ? 'Script loading failed.' : String(err);
                addLog('error', `Failed to load WebTorrent client script: ${errorMessage}`);
                reject(err);
            };
            document.body.appendChild(script);
        });
    };

    const startTorrent = async () => {
        try {
            await loadWebTorrentScript();
        } catch (error) {
            setStatus("Error: Could not load player.");
            return;
        }

        if (!(window as any).WebTorrent || !(window as any).WebTorrent.WEBRTC_SUPPORT) {
            addLog('error', 'WebRTC is not supported in this browser.');
            setStatus("Error: Browser not supported.");
            return;
        }

        try {
            const client = new (window as any).WebTorrent();
            clientRef.current = client;

            client.on('error', (err: any) => {
                const errorMessage = typeof err === 'string' ? err : err.message;
                console.error("WebTorrent client error:", err);
                addLog('error', `Client error: ${errorMessage}`);
                setStatus("Error");
            });

            const trackers = [
                'wss://tracker.openwebtorrent.com',
                'wss://tracker.btorrent.xyz',
                'wss://tracker.fastcast.nz',
            ];
            const fullMagnetUri = `${magnetUri}&tr=${trackers.map(encodeURIComponent).join('&tr=')}`;
            const infoHash = magnetUri.match(/btih:([a-fA-F0-9]{40})/)?.[1] || 'N/A';
            
            addLog('info', `Adding magnet URI: ${infoHash}`);

            client.add(fullMagnetUri, { timeout: 60000 }, (torrent: any) => {
                addLog('success', `Metadata received for: ${torrent.name}`);
                setStatus("Downloading...");

                const file = torrent.files.find((f: any) => 
                    f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.avi')
                );
                
                if (file) {
                    addLog('success', `Found video file: ${file.name}`);
                    setStatus("Buffering...");
                    if (videoRef.current) {
                        file.appendTo(videoRef.current, (err: any) => {
                           if (err) {
                               addLog('error', `Failed to append video: ${err.message}`);
                               setStatus('Error');
                           } else {
                               addLog('success', 'Video appended to player.');
                               setStatus('Playing');
                           }
                        });
                    }
                } else {
                    addLog('error', 'No playable video file found in torrent.');
                    setStatus('Error: No video file found');
                }

                torrent.on('download', () => {
                    setStats({
                        peers: torrent.numPeers,
                        downloadSpeed: torrent.downloadSpeed,
                        progress: torrent.progress,
                    });
                });
    
                torrent.on('done', () => {
                    addLog('success', 'Download complete.');
                    setStats(prev => ({ ...prev, progress: 1 }));
                });

                torrent.on('warning', (err: any) => {
                    addLog('error', `Torrent warning: ${err.message}`);
                });

                torrent.on('error', (err: any) => {
                    addLog('error', `Torrent error: ${err.message}`);
                    setStatus('Error');
                });
            });

        } catch (error: any) {
            console.error("Failed to start WebTorrent", error);
            addLog('error', `Failed to start WebTorrent: ${error.message}`);
            setStatus("Error");
        }
    };
    
    startTorrent();

    return () => {
        if (clientRef.current) {
            clientRef.current.destroy((err: any) => {
                if (err) console.error("Error destroying client:", err);
                else addLog('info', 'WebTorrent client destroyed.');
            });
        }
    };
  }, [magnetUri, addLog]);

  const getLogColorClass = (type: LogEntry['type']) => {
    switch(type) {
        case 'success': return 'text-green-400';
        case 'error': return 'text-red-400';
        default: return 'text-gray-400';
    }
  }

  const renderOverlay = () => {
    if (status === 'Playing') return null;

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-lg p-4 text-center z-10">
            {status.startsWith("Error") ? (
              <div className="text-destructive bg-destructive-foreground/10 p-4 rounded-md flex flex-col items-center gap-2">
                <AlertCircle className="w-10 h-10"/>
                <h3 className="text-lg font-bold">Playback Error</h3>
                <p className="text-sm max-w-md">{status}</p>
              </div>
            ) : (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-white mb-4"/>
                <h3 className="text-xl font-bold text-white mb-2">
                    {status}
                </h3>
                <p className="text-sm text-white/80 max-w-md truncate mb-4">{title}</p>
                <div className="flex gap-6 text-white/90">
                    <div className="flex items-center gap-2"><Users className="w-4 h-4"/> {stats.peers} Peers</div>
                    <div className="flex items-center gap-2"><ArrowDown className="w-4 h-4"/> {formatBytes(stats.downloadSpeed)}/s</div>
                    <div className="flex items-center gap-2"><Percent className="w-4 h-4"/> { (stats.progress * 100).toFixed(2) }</div>
                </div>
              </>
            )}
        </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div ref={videoRef} className="w-full aspect-video bg-black rounded-lg relative overflow-hidden [&>video]:(w-full h-full object-contain rounded-lg)">
        {renderOverlay()}
      </div>
       <div className="flex justify-between items-center">
            <Button onClick={onBack} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to details
            </Button>
       </div>
       <div className="bg-black/80 rounded-lg p-4 border border-border/20">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Terminal className="w-5 h-5"/>
                <h3 className="text-sm font-semibold">Player Logs</h3>
            </div>
            <div className="h-40 overflow-y-auto bg-black/50 rounded p-2 space-y-1">
                {logs.map((log, index) => (
                    <p key={index} className={`font-mono text-xs ${getLogColorClass(log.type)}`}>
                        <span className="text-gray-500 mr-2">{log.timestamp}</span>
                        <span>{log.message}</span>
                    </p>
                ))}
            </div>
       </div>
    </div>
  );
}
