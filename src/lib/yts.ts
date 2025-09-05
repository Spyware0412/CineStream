
// lib/yts.ts
const YTS_API_BASE_URL = "https://yts.mx/api/v2";

export async function getMovieLinks(tmdbId: string) {
    try {
        // First, get the IMDb ID from TMDB
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`);
        if (!tmdbRes.ok) {
            throw new Error('Failed to fetch movie details from TMDB');
        }
        const tmdbData = await tmdbRes.json();
        const imdbId = tmdbData.imdb_id;

        if (!imdbId) {
            throw new Error('IMDb ID not found for this movie.');
        }

        // Then, use the IMDb ID to search on YTS
        const ytsRes = await fetch(`${YTS_API_BASE_URL}/list_movies.json?query_term=${imdbId}`);
        if (!ytsRes.ok) {
            throw new Error('Failed to fetch from YTS API');
        }
        const ytsData = await ytsRes.json();

        if (ytsData.data.movie_count === 0) {
            return { torrents: [] };
        }

        const movie = ytsData.data.movies[0];
        const torrents = movie.torrents.map((t: any) => ({
            quality: t.quality,
            magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(movie.title_long)}&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969&tr=udp://p4p.arenabg.ch:1337&tr=udp://tracker.internetwarriors.net:1337`
        }));
        
        return { torrents };

    } catch (error) {
        console.error("Error getting movie links:", error);
        return { torrents: [] };
    }
}
