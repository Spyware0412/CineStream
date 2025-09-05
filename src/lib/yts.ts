
const YTS_API_BASE_URL = "https://yts.mx/api/v2";
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

async function getImdbId(tmdbId: string, tmdbToken: string): Promise<string | null> {
    try {
        const response = await fetch(`${TMDB_API_BASE_URL}/movie/${tmdbId}`, {
            headers: {
                "Authorization": `Bearer ${tmdbToken}`,
                "Content-Type": "application/json",
            }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to fetch movie details from TMDB to get IMDb ID. Status: ${response.status}, Body: ${errorBody}`);
            return null;
        }
        const data = await response.json();
        return data.imdb_id;
    } catch (error) {
        console.error("Error fetching IMDb ID from TMDB:", error);
        return null;
    }
}

export async function getMovieLinks(tmdbId: string, tmdbToken: string) {
    try {
        if (!tmdbToken) {
            throw new Error("TMDB access token is required.");
        }

        const imdbId = await getImdbId(tmdbId, tmdbToken);
        if (!imdbId) {
            console.log(`No IMDb ID found for TMDB ID: ${tmdbId}`);
            return [];
        }

        const ytsRes = await fetch(`${YTS_API_BASE_URL}/list_movies.json?query_term=${imdbId}`);
        if (!ytsRes.ok) {
            console.error('Failed to fetch from YTS API');
            return [];
        }
        const ytsData = await ytsRes.json();

        if (ytsData.data.movie_count === 0) {
            return [];
        }

        const movie = ytsData.data.movies[0];
        const torrents = movie.torrents.map((t: any) => ({
            quality: t.quality,
            type: t.type,
            size: t.size,
            magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(movie.title_long)}&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://p4p.arenabg.ch:1337&tr=udp://tracker.internetwarriors.net:1337`
        }));
        
        return torrents;

    } catch (error) {
        console.error("Error getting movie links:", error);
        return [];
    }
}
