
"use server";

import { suggestAlternativeResolutions } from "@/ai/flows/suggest-alternative-resolutions";
import type { SuggestAlternativeResolutionsOutput } from "@/ai/flows/suggest-alternative-resolutions";
import { getMovieLinks } from "@/lib/yts";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN!;

async function tmdbFetch(endpoint: string, query: string = "") {
  try {
    const url = `${TMDB_BASE_URL}${endpoint}${query}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let errorData: any;
      try {
        errorData = await res.json();
      } catch {
        errorData = { status_message: res.statusText };
      }
      console.error("TMDB API error:", errorData);
      throw new Error(errorData.status_message || "Failed to fetch from TMDB");
    }

    return res.json();
  } catch (err) {
    console.error(`Fetch error from ${endpoint}:`, err);
    throw err;
  }
}

export async function checkTmdbApiStatus() {
    try {
        if (!TMDB_TOKEN) {
            throw new Error("TMDB Access Token is not set in environment variables.");
        }
        await tmdbFetch("/configuration");
        return { success: true, message: "TMDB API connection successful." };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred." };
    }
}


export async function getLatestMoviesAction(industry: "Hollywood" | "Bollywood", page: number = 1) {
  if (industry === "Bollywood") {
    // Hindi language movies
    return tmdbFetch("/discover/movie", `?with_original_language=hi&sort_by=popularity.desc&page=${page}`);
  }
  // For Hollywood, get now playing movies
  return tmdbFetch("/movie/now_playing", `?language=en-US&page=${page}`);
}

export async function getDiscoverAction(mediaType: 'movie' | 'tv', genreId: number, page: number = 1) {
    return tmdbFetch(`/discover/${mediaType}`, `?with_genres=${genreId}&language=en-US&page=${page}&sort_by=popularity.desc`);
}

export async function searchMediaAction(query: string, mediaType: 'movie' | 'tv' = 'movie', page: number = 1) {
  return tmdbFetch(
    `/search/${mediaType}`,
    `?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`
  );
}

export async function getMediaDetailsAction(mediaId: number, mediaType: 'movie' | 'tv') {
  return tmdbFetch(
    `/${mediaType}/${mediaId}`,
    "?language=en-US&append_to_response=credits,videos,images"
  );
}

export async function getAiSuggestions(
  movieTitle: string
): Promise<SuggestAlternativeResolutionsOutput> {
  try {
    return await suggestAlternativeResolutions({ movieTitle });
  } catch (error) {
    console.error("AI suggestion error:", error);
    throw new Error("Failed to get AI suggestions. Please try again later.");
  }
}

export async function getMovieLinksAction(tmdbId: string) {
    return getMovieLinks(tmdbId);
}
