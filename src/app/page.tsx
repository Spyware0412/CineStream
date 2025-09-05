
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Movie as MediaItem } from "@/types";
import { getLatestMoviesAction, searchMediaAction, getDiscoverAction } from "@/app/actions";

import { AppSidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MovieGrid } from "@/components/movie-grid";
import { useToast } from "@/hooks/use-toast";
import { TmdbApiChecker } from "@/components/tmdb-api-checker";
import { MovieDetailsModal } from "@/components/movie-details-modal";

const mapTmdbToMediaItem = (tmdbItem: any, mediaType: 'movie' | 'tv'): MediaItem => ({
    id: tmdbItem.id.toString(),
    title: tmdbItem.title || tmdbItem.name,
    media_type: mediaType,
    description: tmdbItem.overview,
    posterUrl: tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbItem.poster_path}` : 'https://picsum.photos/500/750',
    rating: tmdbItem.vote_average ? tmdbItem.vote_average / 2 : 0,
    year: (tmdbItem.release_date || tmdbItem.first_air_date)?.substring(0, 4) ?? undefined,
    plot: tmdbItem.overview,
    genre: tmdbItem.genres?.map((g: any) => g.name).join(', '),
});

type FetchFunction = (page: number) => Promise<any>;

export default function Home() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeSearch, setActiveSearch] = useState("Latest from Hollywood");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const currentFetchFunction = useRef<FetchFunction | null>(null);

  const handleFetch = useCallback(async (
    fetchPromise: Promise<any>,
    mediaType: 'movie' | 'tv' = 'movie',
    isLoadMore: boolean = false
  ) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setMedia([]);
    }

    try {
      const result = await fetchPromise;
      const newMedia: MediaItem[] = result.results.map((item: any) => mapTmdbToMediaItem(item, mediaType));
      
      setMedia(prevMedia => {
        if (isLoadMore) {
          const existingIds = new Set(prevMedia.map(item => item.id));
          const filteredNewMedia = newMedia.filter(item => !existingIds.has(item.id));
          return [...prevMedia, ...filteredNewMedia];
        }
        return newMedia;
      });

      setCurrentPage(result.page);
      setTotalPages(result.total_pages);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Fetching Media",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
      if (!isLoadMore) {
        setMedia([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [toast]);

  const startNewFetch = (fetchFn: FetchFunction, activeSearchLabel: string, mediaType: 'movie' | 'tv') => {
    currentFetchFunction.current = (page) => fetchFn(page);
    setActiveSearch(activeSearchLabel);
    setCurrentPage(1);
    setTotalPages(1);
    handleFetch(fetchFn(1), mediaType, false);
  };

  const handleSearch = (query: string, mediaType: 'movie' | 'tv') => {
    if (!query) {
      fetchLatest("Hollywood");
      return;
    }
    startNewFetch(
      (page) => searchMediaAction(query, mediaType, page),
      `Search: "${query}"`,
      mediaType
    );
  };

  const fetchLatest = (industry: "Hollywood" | "Bollywood") => {
    startNewFetch(
      (page) => getLatestMoviesAction(industry, page),
      `Latest from ${industry}`,
      'movie'
    );
  };
  
  const fetchByGenre = (genre: {id: number, name: string}, mediaType: 'movie' | 'tv') => {
    startNewFetch(
      (page) => getDiscoverAction(mediaType, genre.id, page),
      `${mediaType === 'tv' ? 'TV' : 'Movie'} Genre: ${genre.name}`,
      mediaType
    );
  }
  
  const handleLoadMore = useCallback(() => {
    if (currentFetchFunction.current && currentPage < totalPages && !isLoadingMore) {
        const nextPage = currentPage + 1;
        const mediaType = activeSearch.includes("TV") ? 'tv' : 'movie';
        handleFetch(currentFetchFunction.current(nextPage), mediaType, true);
    }
  }, [currentFetchFunction, currentPage, totalPages, isLoadingMore, activeSearch, handleFetch]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && !isLoadingMore) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, isLoadingMore, handleLoadMore]);

  useEffect(() => {
    fetchLatest("Hollywood");
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar 
        onFetchLatest={fetchLatest}
        onFetchByGenre={fetchByGenre}
      />
      <div className="flex-1 flex flex-col">
        <Header onSearch={handleSearch} onPlayMagnet={() => {}} />
        <main className="flex-grow p-4 md:p-6 lg:p-8">
            <TmdbApiChecker />
            <h1 className="text-3xl font-bold mb-6">{activeSearch}</h1>
            <MovieGrid 
              items={media}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
            />
        </main>
      </div>
    </div>
  );
}
