
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, Calendar, Clapperboard, Users, Tv, PlayCircle, Loader2 } from "lucide-react";

import type { MediaItem, Season, Episode, TorrentLink } from "@/types";
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
import { getMediaDetailsAction, getMovieLinksAction, getSeasonDetailsAction, getTvEpisodeLinksAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent } from "./ui/card";


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
    seasons: tmdbItem.seasons,
});

export function MovieDetailsModal({
  item: initialItem,
  isOpen,
  onOpenChange,
}: MovieDetailsModalProps) {
  const [item, setItem] = useState<MediaItem | undefined>(initialItem);
  const [isFetchingDetails, setIsFetchingDetails] = useState(true);
  
  const [movieLinks, setMovieLinks] = useState<TorrentLink[]>([]);
  const [isFetchingMovieLinks, setIsFetchingMovieLinks] = useState(false);
  
  const [episodeLinks, setEpisodeLinks] = useState<Record<string, TorrentLink[]>>({});
  const [isFetchingEpisodeLinks, setIsFetchingEpisodeLinks] = useState<Record<string, boolean>>({});

  const [selectedMagnet, setSelectedMagnet] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isFetchingEpisodes, setIsFetchingEpisodes] = useState(false);

  const streamingServerUrl = process.env.NEXT_PUBLIC_STREAMING_SERVER_URL;

  useEffect(() => {
    if (isOpen && initialItem) {
        setItem(initialItem);
        setIsFetchingDetails(true);
        setMovieLinks([]);
        setSelectedMagnet(null);
        setEpisodes([]);
        setSelectedSeason(null);
        setEpisodeLinks({});
        setIsFetchingEpisodeLinks({});


        const fetchDetails = async () => {
          try {
            const detailsData = await getMediaDetailsAction(parseInt(initialItem.id, 10), initialItem.media_type);
            const detailedItem = mapTmdbDetailsToMediaItem(detailsData, initialItem.media_type);
            setItem(detailedItem);
            
            if (detailedItem.media_type === 'tv' && detailedItem.seasons && detailedItem.seasons.length > 0) {
              const defaultSeason = detailedItem.seasons.find(s => s.season_number > 0) || detailedItem.seasons[0];
              if (defaultSeason) {
                handleSeasonChange(defaultSeason.season_number.toString());
              }
            }

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
        
        fetchDetails();
    }
  }, [isOpen, initialItem, toast]);

  const handleFetchMovieLinks = async () => {
    if (!initialItem || initialItem.media_type !== 'movie') return;
    setIsFetchingMovieLinks(true);
    setMovieLinks([]);
    try {
        const linkData = await getMovieLinksAction(initialItem.id);
        setMovieLinks(linkData || []);
        if ((linkData || []).length === 0) {
             toast({
                title: "No links found",
                description: "Could not find streaming links for this movie.",
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error fetching links",
            description: "Could not find streaming links for this movie.",
        });
    } finally {
        setIsFetchingMovieLinks(false);
    }
  }

  const handleSeasonChange = async (seasonNumberStr: string) => {
    const seasonNumber = parseInt(seasonNumberStr, 10);
    if (!item || isNaN(seasonNumber)) return;

    setSelectedSeason(seasonNumber);
    setIsFetchingEpisodes(true);
    setEpisodes([]);
    try {
        const seasonDetails = await getSeasonDetailsAction(parseInt(item.id, 10), seasonNumber);
        setEpisodes(seasonDetails.episodes || []);
    } catch(error) {
        toast({
            variant: "destructive",
            title: "Error fetching episodes",
            description: "Could not load episodes for this season.",
        });
    } finally {
        setIsFetchingEpisodes(false);
    }
  }

  const handleEpisodePlay = async (episode: Episode) => {
    if (!item || !selectedSeason) return;

    const episodeId = `${selectedSeason}-${episode.episode_number}`;
    setIsFetchingEpisodeLinks(prev => ({ ...prev, [episodeId]: true }));
    setEpisodeLinks(prev => ({...prev, [episodeId]: []}));

    try {
      const links = await getTvEpisodeLinksAction(item.id, selectedSeason, episode.episode_number);
      setEpisodeLinks(prev => ({...prev, [episodeId]: links}));
       if (links.length === 0) {
        toast({
          title: "No links found",
          description: `Could not find any streaming links for ${item.title} S${selectedSeason}E${episode.episode_number}. This could be a new episode or a rare show.`,
        });
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error fetching episode links",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsFetchingEpisodeLinks(prev => ({ ...prev, [episodeId]: false }));
    }
  }
  
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

  const renderTvShowContent = () => {
    if (!item || item.media_type !== 'tv') return null;

    return (
        <div className="mt-4">
            <h3 className="text-xl font-semibold mb-3">Seasons</h3>
             {isFetchingDetails ? (
                <Skeleton className="h-10 w-48" />
            ) : item.seasons && item.seasons.length > 0 ? (
                <Select
                    onValueChange={handleSeasonChange}
                    value={selectedSeason?.toString()}
                >
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a season" />
                    </SelectTrigger>
                    <SelectContent>
                        {item.seasons
                          .filter(s => s.season_number > 0 && s.episode_count > 0)
                          .map((season) => (
                            <SelectItem key={season.id} value={season.season_number.toString()}>
                                {season.name} ({season.episode_count} episodes)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <p className="text-muted-foreground text-sm">No season information available.</p>
            )}

            <div className="mt-4 space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {isFetchingEpisodes ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="p-4">
                            <Skeleton className="h-20 w-full" />
                        </Card>
                    ))
                ) : episodes.length > 0 ? (
                    episodes.map(episode => {
                        const episodeId = `${selectedSeason}-${episode.episode_number}`;
                        const links = episodeLinks[episodeId] || [];
                        const isLoading = isFetchingEpisodeLinks[episodeId] || false;

                        return (
                        <Card key={episode.id} className="p-0 overflow-hidden">
                             <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                                <div className="relative w-full sm:w-32 h-24 sm:h-20 flex-shrink-0 bg-muted rounded-md">
                                    {episode.still_path ? (
                                        <Image
                                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                                            alt={`Still from ${episode.name}`}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <Tv className="w-8 h-8"/>
                                       </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <h4 className="font-semibold">{episode.episode_number}. {episode.name}</h4>
                                    <p className="text-xs text-muted-foreground mb-2">{episode.air_date}</p>
                                    <p className="text-sm text-foreground/70 line-clamp-2 mb-3">{episode.overview}</p>
                                    
                                     {isLoading ? (
                                        <Button size="sm" disabled>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Fetching...
                                        </Button>
                                    ) : links.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {links.map(link => (
                                                <Button key={link.magnet} size="sm" variant="outline" onClick={() => setSelectedMagnet(link.magnet)}>
                                                   <PlayCircle className="mr-2 h-4 w-4" /> 
                                                   {`${link.quality} (${link.size})`}
                                                </Button>
                                            ))}
                                        </div>
                                    ) : (
                                        <Button size="sm" onClick={() => handleEpisodePlay(episode)} disabled={!streamingServerUrl}>
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Play
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        )
                    })
                ) : selectedSeason !== null ? (
                    <p className="text-muted-foreground text-sm">No episodes found for this season.</p>
                ) : null}
            </div>
        </div>
    )
  }
  
  const renderDetails = () => {
    if (!item) return null;
    const playerUrl = selectedMagnet && streamingServerUrl
        ? `${streamingServerUrl}/api/stream?magnet=${encodeURIComponent(selectedMagnet)}`
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
                    
                     <Button onClick={handleFetchMovieLinks} disabled={!streamingServerUrl || isFetchingMovieLinks}>
                        {isFetchingMovieLinks ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <PlayCircle className="mr-2 h-4 w-4" />
                        )}
                        {isFetchingMovieLinks ? 'Fetching...' : 'Fetch Links'}
                    </Button>
                    
                    {movieLinks.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <h4 className="font-semibold">Select Quality:</h4>
                            <div className="flex flex-wrap gap-2">
                            {movieLinks.map(link => (
                                <Button key={link.magnet} variant="outline" onClick={() => setSelectedMagnet(link.magnet)}>
                                    {`${link.quality} (${link.size})`}
                                </Button>
                            ))}
                            </div>
                        </div>
                    )}
                     {movieLinks.length === 0 && !isFetchingMovieLinks && (
                        <p className="text-sm text-muted-foreground mt-2">Click the button to find available streaming links.</p>
                    )}
                  </div>
                )}

                {item.media_type === 'tv' && renderTvShowContent()}
                
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
