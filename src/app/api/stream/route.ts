
'use server';

import { NextRequest, NextResponse } from 'next/server';
import WebTorrent, { Torrent, TorrentFile } from 'webtorrent';
import { Writable } from 'stream';

// Extend the NodeJS.Global interface to include our client
declare global {
  var webtorrentClient: WebTorrent.Instance | undefined;
}

// Initialize the client only once and store it globally
if (!global.webtorrentClient) {
  console.log('[WebTorrent] Creating new client instance.');
  global.webtorrentClient = new WebTorrent();

  global.webtorrentClient.on('error', (err) => {
    console.error('[WebTorrent] Client Error:', err);
  });
}

const client = global.webtorrentClient;

const getTorrent = (magnetUri: string): Promise<Torrent> => {
  return new Promise((resolve, reject) => {
    // First, try to get the torrent if it already exists
    const existingTorrent = client.get(magnetUri);
    if (existingTorrent) {
      console.log(`[WebTorrent] Found existing torrent for: ${existingTorrent.name}`);
      if (existingTorrent.ready) {
        resolve(existingTorrent);
      } else {
        existingTorrent.once('ready', () => resolve(existingTorrent));
        existingTorrent.once('error', (err) => reject(err));
      }
      return;
    }

    // If it doesn't exist, add it.
    console.log(`[WebTorrent] Adding new torrent for: ${magnetUri}`);
    const torrent = client.add(magnetUri, {
      destroyStoreOnDestroy: true,
      path: '/tmp/webtorrent'
    });

    torrent.on('error', (err) => {
      console.error(`[WebTorrent] Error on torrent add: ${err.message}`);
      if (!torrent.destroyed) {
        torrent.destroy(() => {
          console.log(`[WebTorrent] Destroyed torrent after error: ${torrent.infoHash}`);
        });
      }
      reject(err);
    });

    torrent.on('ready', () => {
      console.log(`[WebTorrent] Torrent ready: ${torrent.name}`);
      const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));
       if (!file) {
           const fileNames = torrent.files.map(f => f.name);
           console.error('[WebTorrent] No video file found. Available files:', fileNames);
           reject(new Error('No video file found in torrent.'));
           return;
       }
      resolve(torrent);
    });

    torrent.on('download', () => {
      const progress = (torrent.progress * 100).toFixed(2);
      const speed = (torrent.downloadSpeed / 1024 / 1024).toFixed(2);
      process.stdout.write(`[WebTorrent] Downloading ${torrent.name}: ${progress}% at ${speed} MB/s \r`);
    });

    torrent.on('done', () => {
      console.log(`\n[WebTorrent] Torrent download finished: ${torrent.name}`);
    });
  });
};

const getContentType = (fileName: string) => {
    if (fileName.endsWith('.mkv')) return 'video/x-matroska';
    if (fileName.endsWith('.mp4')) return 'video/mp4';
    return 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnetUri = searchParams.get('magnet');

  if (!magnetUri) {
    return new NextResponse('Magnet link is required', { status: 400 });
  }

  try {
    const torrent = await getTorrent(magnetUri);
    const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv'));

    if (!file) {
      return new NextResponse('No video file found in torrent', { status: 404 });
    }

    const total = file.length;
    const range = req.headers.get('range');
    
    let start = 0;
    let end = total - 1;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    }
    
    const chunkSize = (end - start) + 1;
    const statusCode = range ? 206 : 200;
    const contentType = getContentType(file.name);

    const headers = new Headers({
      'Content-Length': chunkSize.toString(),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    if (range) {
      headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    }

    const stream = new ReadableStream({
      start(controller) {
        const fileStream = file.createReadStream({ start, end });
        
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        fileStream.on('end', () => {
          controller.close();
        });

        fileStream.on('error', (err) => {
          console.error('[WebTorrent] File stream error:', err);
          controller.error(err);
        });

        // Handle client disconnect
        req.signal.onabort = () => {
          console.log('[WebTorrent] Client disconnected, destroying file stream.');
          fileStream.destroy();
        };
      }
    });

    return new NextResponse(stream, { status: statusCode, headers });

  } catch (error) {
    console.error('[WebTorrent] Final catch error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new NextResponse(message, { status: 500 });
  }
}
