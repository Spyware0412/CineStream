import type {TorrentLink} from '@/types';

const TORRENTIO_BASE_URL = 'https://torrentio.strem.fun';

function parseTitle(title: string): {quality: string; size: string} {
  const lines = title.split('\n');
  const qualityLine = lines.find(l =>
    ['4K', '1080p', '720p', '480p', '360p'].some(q => l.includes(q))
  );
  
  const quality = qualityLine ? (qualityLine.match(/(4K|1080p|720p|480p|360p)/) || [])[0] || 'unknown' : 'unknown';

  const sizeMatch = title.match(/💾\s*([\d.]+\s*[GMK]?B)/);
  const size = sizeMatch ? sizeMatch[1] : 'unknown';
  return {quality, size};
}

export async function getTorrentioLinks(
  imdbId: string,
  season: number,
  episode: number
): Promise<TorrentLink[]> {
  try {
    const url = `${TORRENTIO_BASE_URL}/stream/series/${imdbId}:${season}:${episode}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Torrentio API error:', {status: response.status, errorText});
      return [];
    }

    const data = await response.json();

    if (!data.streams || data.streams.length === 0) {
      return [];
    }

    const links: TorrentLink[] = data.streams.map((stream: any) => {
      const {quality, size} = parseTitle(stream.title || '');
       const trackers = (stream.sources || [])
        .filter((s: string) => s.startsWith("tracker:"))
        .map((s: string) => s.replace('tracker:', ''));
      
      return {
        quality: quality,
        type: 'torrent', 
        size: size,
        infoHash: stream.infoHash,
        displayName: stream.title,
        trackers: trackers,
      };
    });

    return links;
  } catch (error) {
    console.error('Error fetching from Torrentio:', error);
    return [];
  }
}
