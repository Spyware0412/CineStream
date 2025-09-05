
import { NextRequest, NextResponse } from 'next/server';
import WebTorrent, { Torrent } from 'webtorrent';
import { Readable } from 'stream';

declare global {
  var webtorrentClient: WebTorrent.Instance | undefined;
}

const getClient = (): WebTorrent.Instance => {
  if (!global.webtorrentClient) {
    console.log("Creating new WebTorrent client");
    global.webtorrentClient = new WebTorrent();
    
    global.webtorrentClient.on('error', (err) => {
        console.error('WebTorrent client error:', err);
    });

  }
  return global.webtorrentClient;
};

async function getTorrent(client: WebTorrent.Instance, magnetUri: string): Promise<Torrent> {
    const existingTorrent = client.get(magnetUri);
    if (existingTorrent) {
        console.log("Returning existing torrent");
        return existingTorrent;
    }

    return new Promise((resolve, reject) => {
        console.log("Adding new torrent:", magnetUri);
        const torrent = client.add(magnetUri, (t) => {
            console.log("Torrent ready:", t.infoHash);
            resolve(t);
        });

        torrent.on('error', (err) => {
            console.error(`Error with torrent ${magnetUri}:`, err);
            reject(err);
        });
    });
}

function findVideoStreamFile(torrent: Torrent) {
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
    return torrent.files.find(file => 
        videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
}

function getContentType(fileName: string): string {
    if (fileName.endsWith('.mp4')) return 'video/mp4';
    if (fileName.endsWith('.mkv')) return 'video/x-matroska';
    if (fileName.endsWith('.avi')) return 'video/x-msvideo';
    if (fileName.endsWith('.mov')) return 'video/quicktime';
    if (fileName.endsWith('.webm')) return 'video/webm';
    return 'application/octet-stream';
}


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
            const headers = new Headers();
            headers.set('Content-Length', total.toString());
            headers.set('Content-Type', getContentType(file.name));
            
            const stream = file.createReadStream() as unknown as ReadableStream<Uint8Array>;
            return new NextResponse(stream, { status: 200, headers });
        }

        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunkSize = (end - start) + 1;

        const stream = file.createReadStream({ start, end }) as unknown as ReadableStream<Uint8Array>;
        
        const headers = new Headers();
        headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Content-Length', chunkSize.toString());
        headers.set('Content-Type', getContentType(file.name));

        return new NextResponse(stream, { status: 206, headers });

    } catch (error) {
        console.error('Streaming error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new NextResponse(`Streaming error: ${errorMessage}`, { status: 500 });
    }
}
