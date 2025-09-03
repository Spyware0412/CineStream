'use server';

/**
 * @fileOverview A Genkit flow for fetching the latest movie titles from Hollywood and Bollywood.
 *
 * It exports:
 * - `fetchLatestMovies`: An async function that takes an industry ('Hollywood' or 'Bollywood') and returns a list of movie titles.
 * - `FetchLatestMoviesInput`: The input type for the fetchLatestMovies function.
 * - `FetchLatestMoviesOutput`: The output type for the fetchLatestMovies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FetchLatestMoviesInputSchema = z.object({
  industry: z
    .enum(['Hollywood', 'Bollywood'])
    .describe('The movie industry from which to fetch the latest titles.'),
});
export type FetchLatestMoviesInput = z.infer<
  typeof FetchLatestMoviesInputSchema
>;

const FetchLatestMoviesOutputSchema = z.object({
  movieTitles: z
    .array(z.string())
    .describe('An array of the latest movie titles.'),
});
export type FetchLatestMoviesOutput = z.infer<
  typeof FetchLatestMoviesOutputSchema
>;

export async function fetchLatestMovies(
  input: FetchLatestMoviesInput
): Promise<FetchLatestMoviesOutput> {
  return fetchLatestMoviesFlow(input);
}

const fetchLatestMoviesPrompt = ai.definePrompt({
  name: 'fetchLatestMoviesPrompt',
  input: {schema: FetchLatestMoviesInputSchema},
  output: {schema: FetchLatestMoviesOutputSchema},
  prompt: `You are an AI assistant that provides the latest movie information.

  Provide a list of 10 of the most recent movie titles from {{{industry}}}.
  
  Output the suggestions as a JSON object with 'movieTitles' (an array of strings).`,
});

const fetchLatestMoviesFlow = ai.defineFlow(
  {
    name: 'fetchLatestMoviesFlow',
    inputSchema: FetchLatestMoviesInputSchema,
    outputSchema: FetchLatestMoviesOutputSchema,
  },
  async input => {
    const {output} = await fetchLatestMoviesPrompt(input);
    return output!;
  }
);
