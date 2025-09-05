
import { NextRequest } from 'next/server';
import WebTorrent, { Torrent } from 'webtorrent';
import { Readable } from 'stream';

// Use a singleton instance for the WebTorrent client
const client = new WebTorrent();
const torrentsMap = new Map<string, Torrent>();

// Handle potential client errors
client.on('error', (err) => {
  console.error('[WebTorrent] Client error:', err);
});


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnetUri = searchParams.get('magnet');

  if (!magnetUri || typeof magnetUri !== 'string') {
    return new Response('Magnet link is required', { status: 400 });
  }

  try {
    const torrent = await getTorrent(magnetUri);
    const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));

    if (!file) {
      console.error(`[WebTorrent] No video file found in torrent: ${torrent.infoHash}`);
      return new Response('No video file found in torrent', { status: 404 });
    }
    
    console.log(`[WebTorrent] Streaming file: ${file.name} for torrent: ${torrent.infoHash}`);

    const total = file.length;
    const range = req.headers.get('range');
    
    let start = 0;
    let end = total - 1;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : end;
    }

    const chunkSize = end - start + 1;

    const stream = file.createReadStream({ start, end });
    
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          console.error('[WebTorrent] Stream error:', err);
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
      },
    });
    
    const status = range ? 206 : 200;
    const headers = new Headers({
        'Accept-Ranges': 'bytes',
        'Content-Type': `video/${file.name.endsWith('.mkv') ? 'x-matroska' : 'mp4'}`,
        'Content-Length': chunkSize.toString(),
    });

    if (range) {
        headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    }

    return new Response(webStream, { status, headers });

  } catch (error) {
    console.error('[WebTorrent] Error handling torrent stream:', error);
    return new Response(error instanceof Error ? error.message : 'Failed to stream torrent', { status: 500 });
  }
}

export function getTorrent(magnetUri: string): Promise<Torrent> {
  return new Promise((resolve, reject) => {
    // If torrent is already being handled, resolve immediately if ready
    if (torrentsMap.has(magnetUri)) {
      const existingTorrent = torrentsMap.get(magnetUri)!;
      console.log(`[WebTorrent] Found existing torrent: ${existingTorrent.infoHash}`);
      if (existingTorrent.ready) {
        return resolve(existingTorrent);
      }
      // If not ready, wait for it
      existingTorrent.once('ready', () => resolve(existingTorrent));
      existingTorrent.once('error', (err) => {
        console.error(`[WebTorrent] Error on existing torrent: ${magnetUri}`, err);
        reject(err);
      });
      return;
    }

    console.log(`[WebTorrent] Adding new torrent: ${magnetUri}`);
    
    const torrent = client.add(magnetUri, {
      path: '/tmp/webtorrent/' 
    });
    
    torrentsMap.set(magnetUri, torrent);

    torrent.once('ready', () => {
      console.log(`[WebTorrent] Torrent ready: ${torrent.infoHash}`);
      console.log(`[WebTorrent] Files in torrent:`, torrent.files.map(f => f.name));
      resolve(torrent);
    });

    torrent.once('error', (err) => {
      console.error(`[WebTorrent] Error adding new torrent ${magnetUri}:`, err);
      torrentsMap.delete(magnetUri); // Clean up on error
      reject(err);
    });
    
    torrent.on('download', (bytes) => {
        console.log(`[WebTorrent Console] ${torrent.infoHash.substring(0, 8)} - Progress: ${(torrent.progress * 100).toFixed(1)}% | Down: ${(client.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s | Up: ${(client.uploadSpeed / 1024 / 1024).toFixed(2)} MB/s | Peers: ${torrent.numPeers}`);
    });

    torrent.on('done', () => {
      console.log(`[WebTorrent Console] ${torrent.infoHash.substring(0, 8)} - Torrent finished downloading.`);
    });
  });
}

// This function is for the new stats endpoint
export function findTorrent(magnetUri: string): Torrent | undefined {
    return torrentsMap.get(magnetUri);
}
