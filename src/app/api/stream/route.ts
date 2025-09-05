
import { NextRequest, NextResponse } from 'next/server';
import WebTorrent, { Torrent } from 'webtorrent';
import { Readable } from 'stream';

// Extend the NodeJS.Global interface to include our custom properties
declare global {
  var webtorrentClient: WebTorrent.Instance | undefined;
  var torrentsMap: Map<string, Torrent> | undefined;
}


// Use a singleton instance for the WebTorrent client and torrents map
// This prevents re-creating them on every hot reload in development
const client = global.webtorrentClient || new WebTorrent();
const torrentsMap = global.torrentsMap || new Map<string, Torrent>();

if (process.env.NODE_ENV !== 'production') {
  global.webtorrentClient = client;
  global.torrentsMap = torrentsMap;
}


// Handle potential client errors
client.on('error', (err) => {
  console.error('[WebTorrent Console] Client error:', err);
});


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnetUri = searchParams.get('magnet');
  const getStats = searchParams.get('stats');

  if (!magnetUri || typeof magnetUri !== 'string') {
    return new Response('Magnet link is required', { status: 400 });
  }

  // Handle stats request
  if (getStats === 'true') {
    const torrent = torrentsMap.get(magnetUri);

    if (!torrent) {
        return new NextResponse('Torrent not found or not active on server', { status: 404 });
    }

    const stats = {
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
        peers: torrent.numPeers,
    };

    return NextResponse.json(stats);
  }


  // Handle stream request
  try {
    const torrent = await getTorrent(magnetUri);
    const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));

    if (!file) {
      console.error(`[WebTorrent Console] No video file found in torrent: ${torrent.infoHash}`);
      return new Response('No video file found in torrent', { status: 404 });
    }
    
    console.log(`[WebTorrent Console] Streaming file: ${file.name} for torrent: ${torrent.infoHash}`);

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
          console.error('[WebTorrent Console] Stream error:', err);
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
    console.error('[WebTorrent Console] Error handling torrent stream:', error);
    return new Response(error instanceof Error ? error.message : 'Failed to stream torrent', { status: 500 });
  }
}

export function getTorrent(magnetUri: string): Promise<Torrent> {
  return new Promise((resolve, reject) => {
    // If torrent is already being handled, resolve immediately if ready
    if (torrentsMap.has(magnetUri)) {
      const existingTorrent = torrentsMap.get(magnetUri)!;
      console.log(`[WebTorrent Console] Found existing torrent instance: ${existingTorrent.infoHash}`);
      if (existingTorrent.ready) {
        console.log(`[WebTorrent Console] Existing torrent is ready. Resolving.`);
        return resolve(existingTorrent);
      }
      // If not ready, wait for it
      console.log(`[WebTorrent Console] Existing torrent not ready yet. Waiting for 'ready' event.`);
      existingTorrent.once('ready', () => {
        console.log(`[WebTorrent Console] Existing torrent is now ready: ${existingTorrent.infoHash}`);
        resolve(existingTorrent)
      });
      existingTorrent.once('error', (err) => {
        console.error(`[WebTorrent Console] Error on existing torrent: ${magnetUri}`, err);
        reject(err);
      });
      return;
    }

    console.log(`[WebTorrent Console] Adding new torrent: ${magnetUri}`);
    
    const torrent = client.add(magnetUri, {
      path: '/tmp/webtorrent/' 
    });
    
    torrentsMap.set(magnetUri, torrent);

    torrent.once('ready', () => {
      console.log(`[WebTorrent Console] Torrent ready (metadata downloaded): ${torrent.infoHash}`);
      console.log(`[WebTorrent Console] Files in torrent:`, torrent.files.map(f => f.name));
      resolve(torrent);
    });

    torrent.once('error', (err) => {
      console.error(`[WebTorrent Console] Error adding new torrent ${magnetUri}:`, err);
      torrentsMap.delete(magnetUri); // Clean up on error
      reject(err);
    });
    
    torrent.on('download', (bytes) => {
        const progress = (torrent.progress * 100).toFixed(1);
        const downloadSpeed = (client.downloadSpeed / 1024 / 1024).toFixed(2);
        const uploadSpeed = (client.uploadSpeed / 1024 / 1024).toFixed(2);
        const downloaded = (torrent.downloaded / 1024 / 1024).toFixed(2);
        const total = (torrent.length / 1024 / 1024).toFixed(2);

        // Using process.stdout.write to create a single, updating line in the console
        process.stdout.write(`[WebTorrent Console] ${torrent.infoHash.substring(0, 8)}: ${progress}% | ↓ ${downloadSpeed} MB/s | ↑ ${uploadSpeed} MB/s | Peers: ${torrent.numPeers} | Total: ${downloaded}/${total} MB\r`);
    });

    torrent.on('done', () => {
      // Add a newline after the progress bar is done
      process.stdout.write('\n');
      console.log(`[WebTorrent Console] Torrent finished downloading: ${torrent.infoHash}`);
    });
  });
}
