
'use server';

/**
 * @fileOverview This file defines a function for fetching movie torrent links from YTS APIs.
 *
 * It exports:
 * - `fetchYtsMovieLinks`: An async function that takes a movie title and year and returns potential torrent links.
 * - `FetchYtsMovieLinksInput`: The input type for the fetchYtsMovieLinks function.
 * - `FetchYtsMovieLinksOutput`: The output type for the fetchYtsMovieLinks function.
 */

import {z} from 'genkit';

const YTS_API_DOMAINS = [
    'yts.mx',
    'yts.lt',
    'yts.rs',
];

const FetchYtsMovieLinksInputSchema = z.object({
  title: z.string().describe('The title of the movie.'),
  year: z.string().optional().describe('The release year of the movie.'),
});
export type FetchYtsMovieLinksInput = z.infer<typeof FetchYtsMovieLinksInputSchema>;

const TorrentLinkSchema = z.object({
  name: z.string().describe('The name of the torrent file.'),
  size: z.string().describe('The size of the torrent file (e.g., "2.5 GB").'),
  quality: z.string().describe('The video quality (e.g., "1080p", "4K").'),
  seeders: z.number().describe('The number of seeders for the torrent.'),
  url: z.string().describe('The magnet or torrent URL.'),
  hash: z.string().describe('The torrent hash.'),
});

const FetchYtsMovieLinksOutputSchema = z.object({
  torrents: z
    .array(TorrentLinkSchema)
    .describe('An array of potential torrent links for the movie.'),
});
export type FetchYtsMovieLinksOutput = z.infer<typeof FetchYtsMovieLinksOutputSchema>;


async function queryYtsApi(domain: string, title: string): Promise<any> {
    const searchUrl = `https://${domain}/api/v2/list_movies.json?query_term=${encodeURIComponent(title)}&sort_by=peers&limit=50`;
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
        throw new Error(`YTS API (${domain}) search error: ${response.statusText}`);
    }
    return response.json();
}

export async function fetchYtsMovieLinks(
  input: FetchYtsMovieLinksInput
): Promise<FetchYtsMovieLinksOutput> {
  const { title, year } = input;
  
  for (const domain of YTS_API_DOMAINS) {
      try {
        const searchResult = await queryYtsApi(domain, title);

        if (searchResult.status !== 'ok' || searchResult.data.movie_count === 0) {
          continue; // Try next domain if no movies found
        }
        
        const movies = searchResult.data.movies;
        let targetMovie = null;

        // Prioritize exact match on title and year
        if(year) {
          targetMovie = movies.find((m: any) => m.title.toLowerCase() === title.toLowerCase() && m.year.toString() === year);
        }

        // Fallback to first result if no exact match found
        if (!targetMovie) {
          targetMovie = movies[0];
          // If a year is provided, it's better to check if the first result is a reasonable match
          if (year && movies.length > 1) {
             const yearMatch = movies.find((m: any) => m.year.toString() === year);
             if (yearMatch) targetMovie = yearMatch;
          }
        }
    
        if (!targetMovie || !targetMovie.torrents) {
          continue; // No torrents for the found movie, try next domain
        }
    
        const torrents = targetMovie.torrents.map((torrent: any) => ({
          name: `${targetMovie.title_long} [${torrent.quality}] [YTS]`,
          size: torrent.size,
          quality: torrent.quality,
          seeders: torrent.seeds,
          url: torrent.url,
          hash: torrent.hash,
        }));
    
        return { torrents };
      } catch (error) {
          console.log(`Failed to fetch from YTS domain: ${domain}`, error);
          // On failure, continue to the next domain in the list
      }
  }

  // If all domains fail
  return { torrents: [] };
}
