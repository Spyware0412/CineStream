
import { NextRequest, NextResponse } from 'next/server';
import WebTorrent from 'webtorrent';
import rangeParser from 'range-parser';
import { Readable } from 'stream';

// We need to use a singleton instance of the client to avoid re-creating it on every request.
// In a serverless environment, this instance might be reset between invocations,
// but it's still better practice than creating a new one every time.
const client = new WebTorrent();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnet = searchParams.get('magnet');

  if (!magnet) {
    return new NextResponse('Magnet link is required', { status: 400 });
  }

  try {
    const torrent = await new Promise<WebTorrent.Torrent>((resolve, reject) => {
        const existingTorrent = client.get(magnet);
        if (existingTorrent) {
            return resolve(existingTorrent);
        }
        client.add(magnet, (tor) => resolve(tor));
        setTimeout(() => reject(new Error('Torrent resolution timed out')), 30000);
    });

    const file = torrent.files.find(f => f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.avi'));

    if (!file) {
      return new NextResponse('No playable video file found in torrent', { status: 404 });
    }

    const rangeHeader = req.headers.get('range');
    const fileSize = file.length;

    if (rangeHeader) {
      const ranges = rangeParser(fileSize, rangeHeader);

      if (ranges === -1 || ranges === -2 || ranges.length > 1) {
        return new NextResponse('Malformed range header', { status: 416 });
      }
      
      const { start, end } = ranges[0];
      const contentLength = end - start + 1;

      const headers = new Headers();
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', contentLength.toString());
      headers.set('Content-Type', 'video/mp4');

      const stream = file.createReadStream({ start, end });
      
      // Convert Node.js stream to a Web Stream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        }
      });
      
      return new NextResponse(webStream, { status: 206, headers });

    } else {
      const headers = new Headers();
      headers.set('Content-Length', fileSize.toString());
      headers.set('Content-Type', 'video/mp4');

      const stream = file.createReadStream();
      const webStream = new ReadableStream({
         start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        }
      });

      return new NextResponse(webStream, { status: 200, headers });
    }

  } catch (error) {
    console.error('Streaming error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(`Error processing torrent: ${errorMessage}`, { status: 500 });
  }
}
