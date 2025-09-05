// app/api/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import WebTorrent, { Torrent } from 'webtorrent';
import { Readable } from 'stream';
import { ReadableStream as WebReadableStream } from 'web-streams-polyfill/ponyfill';

declare global {
  var webtorrentClient: WebTorrent.Instance | undefined;
}

// -------------------
// Global WebTorrent client
// -------------------
const getClient = (): WebTorrent.Instance => {
  if (!global.webtorrentClient) {
    console.log('Creating new WebTorrent client');
    global.webtorrentClient = new WebTorrent();

    global.webtorrentClient.on('error', (err) => {
      console.error('WebTorrent client error:', err);
    });

    // Auto cleanup completed torrents after 10 minutes
    global.webtorrentClient.on('torrent', (torrent) => {
      torrent.on('done', () => {
        console.log(`Torrent done: ${torrent.infoHash}`);
        setTimeout(() => {
          if (torrent.done) {
            global.webtorrentClient?.remove(torrent.infoHash);
            console.log(`Removed torrent: ${torrent.infoHash}`);
          }
        }, 1000 * 60 * 10); // 10 minutes
      });
    });
  }
  return global.webtorrentClient;
};

// -------------------
// Add or fetch torrent
// -------------------
async function getTorrent(client: WebTorrent.Instance, magnetUri: string): Promise<Torrent> {
  const existingTorrent = client.get(magnetUri);
  if (existingTorrent) {
    console.log('Returning existing torrent');
    return existingTorrent;
  }

  return new Promise((resolve, reject) => {
    console.log('Adding new torrent:', magnetUri);
    const torrent = client.add(magnetUri, (t) => {
      console.log('Torrent ready:', t.infoHash);
      resolve(t);
    });

    torrent.on('error', (err) => {
      console.error(`Error with torrent ${magnetUri}:`, err);
      reject(err);
    });
  });
}

// -------------------
// Find the video file in torrent
// -------------------
function findVideoStreamFile(torrent: Torrent) {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
  return torrent.files.find(file =>
    videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  );
}

// -------------------
// Get MIME type
// -------------------
function getContentType(fileName: string): string {
  if (fileName.endsWith('.mp4')) return 'video/mp4';
  if (fileName.endsWith('.mkv')) return 'video/x-matroska';
  if (fileName.endsWith('.avi')) return 'video/x-msvideo';
  if (fileName.endsWith('.mov')) return 'video/quicktime';
  if (fileName.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

// -------------------
// Convert NodeJS Readable to Web ReadableStream
// -------------------
function nodeStreamToWeb(stream: NodeJS.ReadableStream) {
  return new WebReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    }
  });
}

// -------------------
// GET handler
// -------------------
export async function GET(req: NextRequest) {
  const magnetUri = req.nextUrl.searchParams.get('magnet');
  if (!magnetUri) {
    return new NextResponse('Magnet link required', { status: 400 });
  }

  try {
    const client = getClient();
    const torrent = await getTorrent(client, magnetUri);
    const file = findVideoStreamFile(torrent);

    if (!file) {
      return new NextResponse('No video file found in torrent', { status: 404 });
    }

    const total = file.length;
    const range = req.headers.get('range');

    if (!range) {
      // Full content
      const headers = new Headers();
      headers.set('Content-Length', total.toString());
      headers.set('Content-Type', getContentType(file.name));
      headers.set('Accept-Ranges', 'bytes');

      const stream = nodeStreamToWeb(file.createReadStream());
      return new NextResponse(stream as any, { status: 200, headers });
    }

    // Partial content (Range request)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? Math.min(parseInt(parts[1], 10), total - 1) : total - 1;
    const chunkSize = (end - start) + 1;

    const stream = nodeStreamToWeb(file.createReadStream({ start, end }));

    const headers = new Headers();
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', chunkSize.toString());
    headers.set('Content-Type', getContentType(file.name));
    headers.set('Connection', 'keep-alive');

    return new NextResponse(stream as any, { status: 206, headers });

  } catch (error) {
    console.error('Streaming error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(`Streaming error: ${errorMessage}`, { status: 500 });
  }
}
