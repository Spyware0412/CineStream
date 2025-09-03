import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-alternative-resolutions.ts';
import '@/ai/flows/fetch-latest-movies.ts';
import '@/ai/flows/search-movies.ts';
import '@/ai/flows/fetch-movie-details.ts';
