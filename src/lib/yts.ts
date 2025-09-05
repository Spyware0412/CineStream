
import type { TorrentLink } from "@/types";

const YTS_API_BASE_URL = "https://yts.mx/api/v2";
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

async function getExternalIds(tmdbId: string, mediaType: 'movie' | 'tv', tmdbToken: string): Promise<{ imdb_id: string | null }> {
    try {
        const response = await fetch(`${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/external_ids`, {
            headers: {
                "Authorization": `Bearer ${tmdbToken}`,
                "Content-Type": "application/json",
            }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to fetch external IDs from TMDB. Status: ${response.status}, Body: ${errorBody}`);
            return { imdb_id: null };
        }
        const data = await response.json();
        return { imdb_id: data.imdb_id };
    } catch (error) {
        console.error("Error fetching external IDs from TMDB:", error);
        return { imdb_id: null };
    }
}

export async function searchYts(imdbId: string | null, query?: string) {
    try {
        let searchUrl = `${YTS_API_BASE_URL}/list_movies.json?limit=50&sort_by=peers&query_term=`;

        // Prioritize IMDb ID for accuracy
        if (imdbId) {
            searchUrl += encodeURIComponent(imdbId);
        } else if (query) {
            searchUrl += encodeURIComponent(query);
        } else {
            return []; // Not enough info to search
        }
        
        const ytsRes = await fetch(searchUrl);
        
        if (!ytsRes.ok) {
            const errorText = await ytsRes.text();
            console.error('Failed to fetch from YTS API', { status: ytsRes.status, error: errorText });
            return [];
        }
        const ytsData = await ytsRes.json();

        if (ytsData.data.movie_count === 0 || !ytsData.data.movies) {
            return [];
        }

        // If we searched by IMDb ID, we can be confident the first result is the correct one.
        // YTS API often returns only one movie when queried by imdb_id.
        const relevantMovies = imdbId ? ytsData.data.movies.slice(0, 1) : ytsData.data.movies;

        const allTorrents: TorrentLink[] = relevantMovies.flatMap((movie: any) =>
            (movie.torrents || []).map((t: any) => ({
                quality: t.quality,
                type: t.type,
                size: t.size,
                magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(movie.title_long)}&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://p4p.arenabg.ch:1337&tr=udp://tracker.internetwarriors.net:1337`,
                title: movie.title_long,
            }))
        );
        
        return allTorrents;

    } catch (error) {
        console.error(`Error searching YTS for query "${query || imdbId}":`, error);
        return [];
    }
}


export async function getMovieLinks(tmdbId: string, tmdbToken: string) {
    try {
        if (!tmdbToken) {
            throw new Error("TMDB access token is required.");
        }

        const { imdb_id } = await getExternalIds(tmdbId, 'movie', tmdbToken);
        if (!imdb_id) {
            console.log(`No IMDb ID found for movie with TMDB ID: ${tmdbId}`);
            return [];
        }

        return searchYts(imdb_id);

    } catch (error) {
        console.error("Error getting movie links:", error);
        return [];
    }
}

export async function getTvShowLinks(tmdbId: string, tmdbToken: string) {
     try {
        if (!tmdbToken) {
            throw new Error("TMDB access token is required.");
        }

        const { imdb_id } = await getExternalIds(tmdbId, 'tv', tmdbToken);
        if (!imdb_id) {
            console.log(`No IMDb ID found for TV show with TMDB ID: ${tmdbId}`);
            return [];
        }

        // For TV shows, we search by IMDb ID. This usually brings up season packs.
        return searchYts(imdb_id);

    } catch (error) {
        console.error("Error getting TV show links:", error);
        return [];
    }
}
