
import { NextRequest } from 'next/server';
import WebTorrent, { Torrent } from 'webtorrent';
import { Readable } from 'stream';

// Use a singleton instance for the WebTorrent client
const client = new WebTorrent();
const torrentsMap = new Map<string, Torrent>();

// Handle potential client errors
client.on('error', (err) => {
  console.error('WebTorrent client error:', err);
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
      return new Response('No video file found in torrent', { status: 404 });
    }

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
    
    // Convert Node.js stream to a Web Stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          console.error('Stream error:', err);
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
    console.error('Error handling torrent:', error);
    return new Response(error instanceof Error ? error.message : 'Failed to stream torrent', { status: 500 });
  }
}

function getTorrent(magnetUri: string): Promise<Torrent> {
  return new Promise((resolve, reject) => {
    // If torrent is already being handled, resolve immediately
    if (torrentsMap.has(magnetUri)) {
      const existingTorrent = torrentsMap.get(magnetUri)!;
      // Wait for metadata if not ready
      if(existingTorrent.ready) {
        return resolve(existingTorrent);
      }
      existingTorrent.on('ready', () => resolve(existingTorrent));
      existingTorrent.on('error', reject);
      return;
    }

    console.log(`Adding new torrent: ${magnetUri}`);
    const torrent = client.add(magnetUri);
    torrentsMap.set(magnetUri, torrent);

    torrent.on('ready', () => {
      console.log(`Torrent ready: ${torrent.infoHash}`);
      resolve(torrent);
    });

    torrent.on('error', (err) => {
      console.error(`Torrent error for ${magnetUri}:`, err);
      torrentsMap.delete(magnetUri); // Clean up on error
      reject(err);
    });

    // Optional: clean up map when torrent is done to save memory
    torrent.on('done', () => {
      console.log(`Torrent finished downloading: ${torrent.infoHash}`);
      // Consider if you want to keep it for seeding or remove it
      // torrentsMap.delete(magnetUri); 
    });
  });
}
