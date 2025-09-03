
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TorrentPlayer } from '@/components/torrent-player';
import { Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function WatchPartyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [roomId, setRoomId] = useState('');
  const [magnetLink, setMagnetLink] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [isPartyStarted, setIsPartyStarted] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');

  useEffect(() => {
    const roomIdParam = searchParams.get('roomId');
    const magnetParam = searchParams.get('magnet');
    const titleParam = searchParams.get('title');

    if (roomIdParam && magnetParam) {
      setRoomId(roomIdParam);
      setMagnetLink(magnetParam);
      setMovieTitle(titleParam || 'Watch Party');
      setIsPartyStarted(true);
    }
  }, [searchParams]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId) {
      // In a real app, you'd fetch the magnet link for this room ID
      toast({
        title: "Joining Room...",
        description: `This feature is not fully implemented. In a real app, you would now be joining room ${joinRoomId}.`,
      });
      // Example redirect:
      // router.push(`/party?roomId=${joinRoomId}`);
    }
  };

  const copyInviteLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Copied to Clipboard!",
        description: "You can now share this link with your friends.",
      });
    }).catch(err => {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive",
      });
    });
  };

  if (isPartyStarted) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-2">{movieTitle}</h1>
        <p className="text-muted-foreground mb-6">Welcome to the Watch Party!</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             {magnetLink ? (
                <TorrentPlayer magnetUri={magnetLink} title={movieTitle} onBack={() => router.push('/')} />
              ) : (
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                    <p className="text-white">Waiting for video...</p>
                </div>
              )}
          </div>
          <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Party Details</CardTitle>
                    <CardDescription>Share this link with friends to invite them.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div>
                       <Label htmlFor="invite-link">Invite Link</Label>
                        <div className="flex gap-2">
                           <Input id="invite-link" value={window.location.href} readOnly />
                           <Button onClick={copyInviteLink} size="icon" variant="outline">
                               <Copy className="h-4 w-4" />
                           </Button>
                        </div>
                   </div>
                   <div>
                       <h4 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4"/> Participants</h4>
                       <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                        This area will show who has joined the party. Real-time synchronization is not yet implemented.
                       </div>
                   </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join a Watch Party</CardTitle>
          <CardDescription>
            Enter the Room ID from an invite link to join an existing party. To create a new party, find a movie and click the 'Party' button.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoinRoom}>
            <CardContent>
              <Label htmlFor="room-id">Room ID</Label>
              <Input 
                  id="room-id" 
                  placeholder="Enter Room ID..." 
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Join Room</Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}


export default function WatchPartyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WatchPartyContent />
        </Suspense>
    )
}
