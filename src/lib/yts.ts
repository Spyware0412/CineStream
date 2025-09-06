import type {TorrentLink} from '@/types';
import {getExternalIds} from './tmdb';

const YTS_API_BASE_URL = 'https://yts.mx/api/v2';
const YTS_TRACKERS = [
    "udp://glotorrents.pw:6969/announce",
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://torrent.gresille.org:80/announce",
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://tracker.leechers-paradise.org:6969",
    "udp://p4p.arenabg.ch:1337",
    "udp://tracker.internetwarriors.net:1337",
];

export async function searchYts(imdbId: string | null, query?: string) {
  try {
    let searchUrl = `${YTS_API_BASE_URL}/list_movies.json?limit=50&sort_by=peers&query_term=`;

    if (imdbId) {
      searchUrl += encodeURIComponent(imdbId);
    } else if (query) {
      searchUrl += encodeURIComponent(query);
    } else {
      return [];
    }

    const ytsRes = await fetch(searchUrl);

    if (!ytsRes.ok) {
      const errorText = await ytsRes.text();
      console.error('Failed to fetch from YTS API', {
        status: ytsRes.status,
        error: errorText,
      });
      return [];
    }
    const ytsData = await ytsRes.json();

    if (ytsData.data.movie_count === 0 || !ytsData.data.movies) {
      return [];
    }

    const relevantMovies = imdbId
      ? ytsData.data.movies.slice(0, 1)
      : ytsData.data.movies;

    const allTorrents: TorrentLink[] = relevantMovies.flatMap((movie: any) =>
      (movie.torrents || []).map((t: any) => ({
        quality: t.quality,
        type: t.type,
        size: t.size,
        infoHash: t.hash,
        displayName: movie.title_long,
        trackers: YTS_TRACKERS,
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
      throw new Error('TMDB access token is required.');
    }

    const {imdb_id} = await getExternalIds(tmdbId, 'movie', tmdbToken);
    if (!imdb_id) {
      console.log(`No IMDb ID found for movie with TMDB ID: ${tmdbId}`);
      return [];
    }

    return searchYts(imdb_id);
  } catch (error) {
    console.error('Error getting movie links:', error);
    return [];
  }
}
