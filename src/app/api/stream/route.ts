
import { NextRequest, NextResponse } from 'next/server';
import WebTorrent, { Torrent } from 'webtorrent';

declare global {
  var webtorrentClient: WebTorrent.Instance | undefined;
}

if (!global.webtorrentClient) {
  console.log('[WebTorrent Console] Creating new WebTorrent client instance.');
  global.webtorrentClient = new WebTorrent();
  global.webtorrentClient.on('error', (err) => {
    console.error('[WebTorrent Console] Client error:', err);
  });
}
const client = global.webtorrentClient;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnetUri = searchParams.get('magnet');
  const getStats = searchParams.get('stats');

  if (!magnetUri || typeof magnetUri !== 'string') {
    return new Response('Magnet link is required', { status: 400 });
  }

  const infoHashMatch = magnetUri.match(/btih:([a-fA-F0-9]{40})/);
  if (!infoHashMatch) {
    return new Response('Invalid magnet URI, cannot extract info hash.', { status: 400 });
  }
  const infoHash = infoHashMatch[1].toLowerCase();

  if (getStats === 'true') {
    try {
      const torrent = client.get(infoHash) as Torrent | undefined;
      if (!torrent) {
        return new NextResponse('Torrent not found or not active on server.', { status: 404 });
      }
      const stats = {
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
        peers: torrent.numPeers,
      };
      return NextResponse.json(stats);
    } catch (error) {
      console.error('[WebTorrent Console] Error fetching stats:', error);
      return new Response(error instanceof Error ? error.message : 'Failed to fetch stats', { status: 500 });
    }
  }

  try {
    const torrent = await getTorrent(magnetUri, infoHash);
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
        // When client closes connection, abort the stream
        req.signal.onabort = () => {
            console.log('[WebTorrent Console] Client aborted request. Destroying stream.');
            stream.destroy();
            controller.close();
        };
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
    console.error('[WebTorrent Console] Fatal error handling torrent stream:', error);
    return new Response(error instanceof Error ? error.message : 'Failed to stream torrent', { status: 500 });
  }
}

function getTorrent(magnetUri: string, infoHash: string): Promise<Torrent> {
  return new Promise((resolve, reject) => {
    const existingTorrent = client.get(infoHash) as Torrent | undefined;
    if (existingTorrent) {
      if (existingTorrent.ready) {
        console.log(`[WebTorrent Console] Existing torrent is ready: ${existingTorrent.infoHash}`);
        return resolve(existingTorrent);
      }
      console.log(`[WebTorrent Console] Existing torrent not ready. Waiting for 'ready' event.`);
      existingTorrent.once('ready', () => {
        console.log(`[WebTorrent Console] Existing torrent is now ready: ${existingTorrent.infoHash}`);
        resolve(existingTorrent);
      });
      existingTorrent.once('error', (err) => {
        console.error(`[WebTorrent Console] Error on existing torrent: ${magnetUri}`, err);
        reject(err);
      });
      return;
    }

    console.log(`[WebTorrent Console] Adding new torrent: ${magnetUri.substring(0, 50)}...`);
    const torrent = client.add(magnetUri, { path: '/tmp/webtorrent/' });

    torrent.once('error', (err) => {
      console.error(`[WebTorrent Console] Error adding new torrent ${magnetUri}:`, err);
      if (!torrent.destroyed) torrent.destroy();
      reject(err);
    });

    torrent.once('ready', () => {
      console.log(`[WebTorrent Console] Torrent ready (metadata downloaded): ${torrent.infoHash}`);
      console.log(`[WebTorrent Console] Files in torrent:`, torrent.files.map(f => f.name));
      resolve(torrent);
    });

    torrent.on('download', () => {
        const progress = (torrent.progress * 100).toFixed(1);
        const downloadSpeed = (torrent.downloadSpeed / 1024 / 1024).toFixed(2); // MB/s
        const uploadSpeed = (torrent.uploadSpeed / 1024 / 1024).toFixed(2); // MB/s
        const downloaded = (torrent.downloaded / 1024 / 1024).toFixed(2); // MB
        const total = (torrent.length / 1024 / 1024).toFixed(2); // MB
        process.stdout.write(`[WebTorrent Console] ${torrent.infoHash.substring(0, 8)}: ${progress}% | ↓ ${downloadSpeed} MB/s | ↑ ${uploadSpeed} MB/s | Peers: ${torrent.numPeers} | Total: ${downloaded}/${total} MB\r`);
    });

    torrent.on('done', () => {
      process.stdout.write('\n');
      console.log(`[WebTorrent Console] Torrent finished downloading: ${torrent.infoHash}`);
    });
  });
}
