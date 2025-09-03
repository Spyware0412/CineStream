'use server';

/**
 * @fileOverview A Genkit flow for searching movies using the TMDB API.
 *
 * It exports:
 * - `searchMovies`: An async function that takes a search query and returns a list of movies.
 * - `SearchMoviesInput`: The input type for the searchMovies function.
 * - `SearchMoviesOutput`: The output type for the searchMovies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Movie } from '@/types';

const SearchMoviesInputSchema = z.object({
  query: z.string().describe('The movie title to search for.'),
  accessToken: z.string().optional().describe('The TMDB API access token.'),
});
export type SearchMoviesInput = z.infer<typeof SearchMoviesInputSchema>;

const MovieSchema = z.object({
  id: z.string(),
  title: z.string(),
  posterUrl: z.string(),
  description: z.string().optional(),
  rating: z.number().optional(),
});

const SearchMoviesOutputSchema = z.object({
  movies: z.array(MovieSchema).describe('An array of movies found.'),
});
export type SearchMoviesOutput = z.infer<typeof SearchMoviesOutputSchema>;

async function callTmdbApi(query: string, accessToken?: string): Promise<SearchMoviesOutput> {
  if (!accessToken) {
    throw new Error('TMDB API access token is not configured.');
  }

  const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`, {
    method: 'GET',
    headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    console.error('TMDB API Error:', await response.text());
    throw new Error('Failed to fetch from TMDB API.');
  }

  const data = await response.json();

  if (!data.results) {
    return { movies: [] };
  }

  const movies: Omit<Movie, 'media_type'>[] = data.results
    .filter((m: any) => m.poster_path)
    .map((m: any) => ({
      id: m.id.toString(),
      title: m.title,
      posterUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
      description: m.overview, 
      rating: m.vote_average ? m.vote_average / 2 : 0,
    }));

  return { movies };
}

export const searchMoviesTool = ai.defineTool(
    {
      name: 'searchMovies',
      description: 'Search for movies by title using the TMDB API.',
      inputSchema: SearchMoviesInputSchema,
      outputSchema: SearchMoviesOutputSchema,
    },
    async (input) => callTmdbApi(input.query, input.accessToken)
);


export async function searchMovies(
  input: SearchMoviesInput
): Promise<SearchMoviesOutput> {
  return searchMoviesFlow(input);
}

const searchMoviesFlow = ai.defineFlow(
  {
    name: 'searchMoviesFlow',
    inputSchema: SearchMoviesInputSchema,
    outputSchema: SearchMoviesOutputSchema,
  },
  async (input) => {
    return callTmdbApi(input.query, input.accessToken);
  }
);
