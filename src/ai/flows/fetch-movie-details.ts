'use server';

/**
 * @fileOverview A Genkit flow for fetching detailed movie information from TMDB.
 *
 * It exports:
 * - `fetchMovieDetails`: An async function that takes a movie ID and returns detailed information.
 * - `FetchMovieDetailsInput`: The input type for the fetchMovieDetails function.
 * - `FetchMovieDetailsOutput`: The output type for the fetchMovieDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Movie } from '@/types';
import { searchMoviesTool } from './search-movies';

const FetchMovieDetailsInputSchema = z.object({
  tmdbId: z.number().optional().describe('The TMDB ID of the movie to fetch details for.'),
  title: z.string().optional().describe('The title of the movie to fetch details for if ID is not known.'),
  accessToken: z.string().optional().describe('The TMDB API access token.'),
});
export type FetchMovieDetailsInput = z.infer<typeof FetchMovieDetailsInputSchema>;


const MovieDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  posterUrl: z.string(),
  description: z.string().optional(),
  rating: z.number().optional(),
  year: z.string().optional(),
  genre: z.string().optional(),
  director: z.string().optional(),
  actors: z.string().optional(),
  plot: z.string().optional(),
});

export type FetchMovieDetailsOutput = z.infer<typeof MovieDetailSchema>;


async function callTmdbApi(tmdbId: number, accessToken?: string): Promise<FetchMovieDetailsOutput> {
  if (!accessToken) {
    throw new Error('TMDB API access token is not configured.');
  }

  const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?append_to_response=credits`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    console.error('TMDB API Error:', await response.text());
    throw new Error('Failed to fetch movie details from TMDB API.');
  }

  const data = await response.json();

  const director = data.credits?.crew.find((person: any) => person.job === 'Director');
  const actors = data.credits?.cast.slice(0, 5).map((person: any) => person.name).join(', ');

  const movie: Movie = {
    id: data.id.toString(),
    title: data.title,
    media_type: 'movie',
    posterUrl: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
    year: data.release_date ? new Date(data.release_date).getFullYear().toString() : undefined,
    genre: data.genres?.map((g: any) => g.name).join(', ') || undefined,
    director: director?.name || undefined,
    actors: actors || undefined,
    plot: data.overview,
    rating: data.vote_average ? data.vote_average / 2 : undefined,
  };

  return movie;
}


export async function fetchMovieDetails(
  input: FetchMovieDetailsInput
): Promise<FetchMovieDetailsOutput> {
  return fetchMovieDetailsFlow(input);
}

const fetchMovieDetailsPrompt = ai.definePrompt(
  {
    name: 'fetchMovieDetailsPrompt',
    input: { schema: FetchMovieDetailsInputSchema },
    output: { schema: MovieDetailSchema },
    tools: [searchMoviesTool],
    prompt: `You are an assistant that helps find movie details.
    
    If you are given a tmdbId, use it directly.
    If you are given a title but no tmdbId, you MUST use the provided searchMovies tool to find the movie and its tmdbId first.
    
    If the user provides a title, respond with a confirmation of the movie you are fetching details for.
    `,
  },
);

const fetchMovieDetailsFlow = ai.defineFlow(
  {
    name: 'fetchMovieDetailsFlow',
    inputSchema: FetchMovieDetailsInputSchema,
    outputSchema: MovieDetailSchema,
  },
  async (input) => {
    let tmdbId = input.tmdbId;

    if (!tmdbId && input.title) {
        const searchResult = await searchMoviesTool({ query: input.title, accessToken: input.accessToken });
        if (searchResult.movies.length > 0) {
            tmdbId = parseInt(searchResult.movies[0].id, 10);
        } else {
            throw new Error(`Could not find a movie with the title: ${input.title}`);
        }
    }

    if (!tmdbId) {
        throw new Error('An TMDB ID or title is required to fetch movie details.');
    }
    
    return callTmdbApi(tmdbId, input.accessToken);
  }
);
