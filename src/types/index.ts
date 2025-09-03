
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
};
