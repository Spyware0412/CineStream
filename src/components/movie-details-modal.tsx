
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, Calendar, Clapperboard, Users, Tv, PlayCircle, Loader2 } from "lucide-react";

import type { MediaItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AiResolutionSuggester } from "./ai-resolution-suggester";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { getMediaDetailsAction, getMovieLinksAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface MovieDetailsModalProps {
  item?: MediaItem;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
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
}: MovieDetailsModalProps) {
  const [item, setItem] = useState<MediaItem | undefined>(initialItem);
  const [isFetchingDetails, setIsFetchingDetails] = useState(true);
  const [links, setLinks] = useState<{ quality: string; type: string; magnet: string; size: string; }[]>([]);
  const [isFetchingLinks, setIsFetchingLinks] = useState(false);
  const [selectedMagnet, setSelectedMagnet] = useState<string | null>(null);
  const { toast } = useToast();

  const streamingServerUrl = process.env.NEXT_PUBLIC_STREAMING_SERVER_URL;

  useEffect(() => {
    if (isOpen && initialItem) {
        setItem(initialItem);
        setIsFetchingDetails(true);
        setIsFetchingLinks(true);
        setLinks([]);
        setSelectedMagnet(null);

        const fetchDetails = async () => {
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
        
        const fetchLinks = async () => {
            try {
                if (initialItem.media_type === 'movie') {
                    const linkData = await getMovieLinksAction(initialItem.id);
                    setLinks(linkData || []);
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error fetching links",
                    description: "Could not find streaming links for this movie.",
                });
            } finally {
                setIsFetchingLinks(false);
            }
        }

        fetchDetails();
        fetchLinks();
    }
  }, [isOpen, initialItem, toast]);
  
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
  
  const renderDetails = () => {
    if (!item) return null;
    const playerUrl = selectedMagnet && streamingServerUrl
        ? `${streamingServerUrl}?magnet=${encodeURIComponent(selectedMagnet)}`
        : '';
    return (
       <div className="grid md:grid-cols-3 gap-0 md:gap-6 overflow-y-auto max-h-[80vh]">
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
                  <DialogDescription>
                      Details for {item.media_type}: {item.title}. Released in {item.year}.
                  </DialogDescription>
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
                
                {playerUrl && (
                  <video
                    key={selectedMagnet}
                    id="player"
                    controls
                    autoPlay
                    src={playerUrl}
                    className="w-full rounded-lg bg-black"
                  />
                )}
                
                {item.media_type === 'movie' && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-3">Streaming Links</h3>
                    {!streamingServerUrl && (
                      <p className="text-destructive text-sm mb-2">Streaming server URL is not configured. Please set NEXT_PUBLIC_STREAMING_SERVER_URL in your environment variables.</p>
                    )}
                    {isFetchingLinks ? (
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    ) : links.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {links.map((link) => (
                          <Button 
                            key={link.magnet} 
                            onClick={() => setSelectedMagnet(link.magnet)} 
                            variant="outline"
                            disabled={!streamingServerUrl}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            {`${link.quality} ${link.type.toUpperCase()}`} ({link.size})
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No streaming links found for this movie.</p>
                    )}
                  </div>
                )}
                
                <Separator />

                <AiResolutionSuggester movieTitle={item.title} />
              </>
          </div>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
         {renderDetails()}
      </DialogContent>
    </Dialog>
  );
}
