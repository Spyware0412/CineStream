
export type Movie = {
  id: string;
  title: string;
  media_type: 'movie' | 'tv';
  description?: string;
  posterUrl: string;
  rating?: number;
  year?: string;
  genre?: string;
  director?: string;
  actors?: string;
  plot?: string;
  seasons?: Season[];
};

export type Season = {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
};

export type Episode = {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  still_path: string | null;
  air_date: string;
};

export type TorrentLink = {
  quality: string;
  type: string;
  magnet: string;
  size: string;
};
