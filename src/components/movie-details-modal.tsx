
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Star, Calendar, Clapperboard, Users, Tv, Play, PartyPopper, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import type { MediaItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AiResolutionSuggester } from "./ai-resolution-suggester";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { getMovieLinksAction, getMediaDetailsAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";

interface MovieDetailsModalProps {
  item?: MediaItem;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  directStreamInfo?: { hash: string; fileIndex: number; name: string; };
}

interface TorrentLink {
  name: string;
  size: string;
  quality: string;
  seeders: number;
  url: string;
  hash: string;
}

const mapTmdbDetailsToMediaItem = (tmdbItem: any, mediaType: 'movie' | 'tv'): MediaItem => ({
    id: tmdbItem.id.toString(),
    title: tmdbItem.title || tmdbItem.name,
    media_type: mediaType,
    description: tmdbItem.overview,
    posterUrl: tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbItem.poster_path}` : 'https://picsum.photos/500/750',
    rating: tmdbItem.vote_average ? tmdbItem.vote_average / 2 : 0,
    year: (tmdbItem.release_date || tmdbItem.first_air_date)?.substring(0, 4),
    plot: tmdbItem.overview,
    genre: tmdbItem.genres?.map((g: any) => g.name).join(', '),
    director: tmdbItem.credits?.crew.find((person: any) => person.job === 'Director')?.name || tmdbItem.created_by?.[0]?.name,
    actors: tmdbItem.credits?.cast.slice(0, 5).map((person: any) => person.name).join(', '),
});

export function MovieDetailsModal({
  item: initialItem,
  isOpen,
  onOpenChange,
  directStreamInfo,
}: MovieDetailsModalProps) {
  const [item, setItem] = useState<MediaItem | undefined>(initialItem);
  const [torrents, setTorrents] = useState<TorrentLink[]>([]);
  const [isFetchingLinks, setIsFetchingLinks] = useState(true);
  const [isFetchingDetails, setIsFetchingDetails] = useState(true);
  const [playerInfo, setPlayerInfo] = useState<{ title: string; magnetUri: string } | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      if (directStreamInfo) {
        setItem(undefined);
        const magnetUri = `magnet:?xt=urn:btih:${directStreamInfo.hash}&dn=${encodeURIComponent(directStreamInfo.name)}`;
        setPlayerInfo({ title: directStreamInfo.name, magnetUri: magnetUri });
        setIsFetchingDetails(false);
        setIsFetchingLinks(false);
      } else if (initialItem) {
        setItem(initialItem);
        setPlayerInfo(null);
        
        const fetchLinks = async () => {
          if (initialItem.media_type === 'tv') {
              setTorrents([]);
              setIsFetchingLinks(false);
              return;
          }

          setIsFetchingLinks(true);
          try {
            const result = await getMovieLinksAction(initialItem);
            setTorrents(result.torrents);
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Error fetching links",
              description: error instanceof Error ? error.message : "Could not load movie links.",
            });
            setTorrents([]); 
          } finally {
            setIsFetchingLinks(false);
          }
        };

        const fetchDetails = async () => {
          setIsFetchingDetails(true);
          try {
            const detailsData = await getMediaDetailsAction(parseInt(initialItem.id, 10), initialItem.media_type);
            const detailedItem = mapTmdbDetailsToMediaItem(detailsData, initialItem.media_type);
            setItem(detailedItem);
          } catch (error) {
             toast({
              variant: "destructive",
              title: "Error fetching details",
              description: error instanceof Error ? error.message : "Could not load movie details.",
            });
             setItem(initialItem);
          } finally {
            setIsFetchingDetails(false);
          }
        }

        fetchLinks();
        fetchDetails();
      }
    }
  }, [isOpen, initialItem, toast, directStreamInfo]);
  
  const handlePlay = (torrent: TorrentLink) => {
    const magnetUri = `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(torrent.name)}`;
    setPlayerInfo({ title: item?.title || torrent.name, magnetUri: magnetUri });
  };
  
  const handleBackToDetails = () => {
    if (directStreamInfo) {
        onOpenChange(false);
    } else {
        setPlayerInfo(null);
    }
  };

  const handleCreateParty = (torrent: TorrentLink) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    const magnetUri = `magnet:?xt=urn:btih:${torrent.hash}`;
    const url = `/party?roomId=${roomId}&magnet=${encodeURIComponent(magnetUri)}&title=${encodeURIComponent(item?.title || "Watch Party")}`;
    onOpenChange(false); // Close the modal
    router.push(url);
  };

  const renderStars = () => {
    if (!item || item.rating === undefined) return null;
    const fullStars = Math.round(item.rating);
    return Array(5)
      .fill(null)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < fullStars
              ? "text-yellow-400 fill-yellow-400"
              : "text-muted-foreground/50"
          }`}
        />
      ));
  };

  const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 text-sm">
        <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
        <div>
          <span className="font-semibold">{label}: </span>
          <span className="text-foreground/80">{value}</span>
        </div>
      </div>
    );
  };
  
  const renderPlayer = () => {
    if (!playerInfo) return null;
    
    return (
      <div className="p-6">
        <div className="w-full flex flex-col gap-4">
          <div className="w-full aspect-video bg-black rounded-lg relative overflow-hidden">
            <video
              src={`/api/stream?magnet=${encodeURIComponent(playerInfo.magnetUri)}`}
              controls
              autoPlay
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-semibold truncate">{playerInfo.title}</h3>
            <Button onClick={handleBackToDetails} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderDetails = () => {
    if (!item) return null;
    return (
       <div className="grid md:grid-cols-3 gap-0 md:gap-6 overflow-y-auto">
          <div className="md:col-span-1 p-6 hidden md:block">
            <Image
              src={item.posterUrl}
              alt={`Poster for ${item.title}`}
              width={500}
              height={750}
              className="rounded-lg object-cover w-full aspect-[2/3]"
              data-ai-hint="movie poster"
            />
          </div>
          <div className="md:col-span-2 p-6 flex flex-col gap-4">
              <>
                <DialogHeader>
                  <DialogTitle className="text-3xl font-bold">{item.title}</DialogTitle>
                  <DialogDescription className="sr-only">Details for the movie {item.title}</DialogDescription>
                  {isFetchingDetails ? (
                    <Skeleton className="h-6 w-24 mt-2"/>
                  ) : (
                    <div className="flex items-center gap-4 pt-2 text-muted-foreground">
                      {item.rating && <div className="flex items-center gap-2">{renderStars()}</div>}
                      {item.year && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {item.year}</div>}
                      <Badge variant="outline" className="flex items-center gap-1">
                        {item.media_type === 'movie' ? <Clapperboard className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                        {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                      </Badge>
                    </div>
                  )}
                </DialogHeader>

                 {isFetchingDetails ? (
                  <div className="space-y-3 mt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : (
                  <>
                    <p className="text-base text-foreground/80">{item.plot}</p>
                     {item.genre && (
                        <div className="flex flex-wrap gap-2">
                          {item.genre.split(', ').map(g => <Badge key={g} variant="outline">{g}</Badge>)}
                        </div>
                      )}
                    <div className="space-y-3 mt-4">
                      <DetailItem icon={Clapperboard} label={item.media_type === 'movie' ? "Director" : "Creator"} value={item.director} />
                      <DetailItem icon={Users} label="Actors" value={item.actors} />
                    </div>
                  </>
                )}

                <Separator />
                
                <div>
                  <h3 className="text-xl font-semibold mb-3">Torrents</h3>
                  {isFetchingLinks ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : torrents.length > 0 ? (
                    <ul className="space-y-2">
                      {torrents.map((torrent) => (
                        <li key={torrent.url} className="flex justify-between items-center bg-muted/30 hover:bg-muted/60 p-2 rounded-md transition-colors">
                          <div className="flex items-center gap-3 truncate">
                            <Download className="w-5 h-5 text-primary flex-shrink-0" />
                            <div className="truncate">
                              <p className="font-mono text-sm truncate">{torrent.name}</p>
                              <p className="text-xs text-muted-foreground">{torrent.size} - {torrent.quality} - {torrent.seeders} seeders</p>
                            </div>
                          </div>
                           <div className="flex gap-2">
                              <Button size="sm" onClick={() => handlePlay(torrent)}>
                                  <Play className="mr-2 h-4 w-4"/>
                                  Play
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleCreateParty(torrent)}>
                                  <PartyPopper className="mr-2 h-4 w-4"/>
                                  Party
                              </Button>
                           </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className="text-sm text-muted-foreground">
                        {item.media_type === 'tv' ? 'Torrent links for TV shows are not supported.' : 'No torrent links found for this title.'}
                     </p>
                  )}
                </div>

                <Separator />
                
                <AiResolutionSuggester movieTitle={item.title} />
              </>
          </div>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] grid-rows-[auto_1fr] p-0">
         {playerInfo ? renderPlayer() : renderDetails()}
      </DialogContent>
    </Dialog>
  );
}

    