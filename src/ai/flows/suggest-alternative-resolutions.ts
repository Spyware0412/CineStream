// This is a server-side file.
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting alternative video resolutions.
 *
 * It exports:
 * - `suggestAlternativeResolutions`: An async function that takes a movie title and provides resolution suggestions.
 * - `SuggestAlternativeResolutionsInput`: The input type for the suggestAlternativeResolutions function.
 * - `SuggestAlternativeResolutionsOutput`: The output type for the suggestAlternativeResolutions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlternativeResolutionsInputSchema = z.object({
  movieTitle: z
    .string()
    .describe('The title of the movie for which to suggest alternative resolutions.'),
});
export type SuggestAlternativeResolutionsInput = z.infer<
  typeof SuggestAlternativeResolutionsInputSchema
>;

const SuggestAlternativeResolutionsOutputSchema = z.object({
  suggestedResolutions: z
    .array(z.string())
    .describe('An array of suggested alternative resolutions for the movie.'),
  reasoning: z
    .string()
    .describe(
      'The AI explanation of why these resolutions are suitable for the movie.'
    ),
});
export type SuggestAlternativeResolutionsOutput = z.infer<
  typeof SuggestAlternativeResolutionsOutputSchema
>;

export async function suggestAlternativeResolutions(
  input: SuggestAlternativeResolutionsInput
): Promise<SuggestAlternativeResolutionsOutput> {
  return suggestAlternativeResolutionsFlow(input);
}

const suggestAlternativeResolutionsPrompt = ai.definePrompt({
  name: 'suggestAlternativeResolutionsPrompt',
  input: {schema: SuggestAlternativeResolutionsInputSchema},
  output: {schema: SuggestAlternativeResolutionsOutputSchema},
  prompt: `You are an AI assistant helping users find the best video resolutions for movies.

  Based on the movie title: {{{movieTitle}}},
  suggest alternative video resolutions that might be available. Consider common resolutions such as 720p, 1080p, 4K, and factors like the movie's popularity and release year.

  Also provide a brief reasoning for your suggestions.

  Output the suggestions as a JSON object with 'suggestedResolutions' (an array of strings) and 'reasoning' (a string).`,
});

const suggestAlternativeResolutionsFlow = ai.defineFlow(
  {
    name: 'suggestAlternativeResolutionsFlow',
    inputSchema: SuggestAlternativeResolutionsInputSchema,
    outputSchema: SuggestAlternativeResolutionsOutputSchema,
  },
  async input => {
    const {output} = await suggestAlternativeResolutionsPrompt(input);
    return output!;
  }
);
