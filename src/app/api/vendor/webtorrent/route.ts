
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // Find the path to webtorrent.min.js within node_modules
    const webtorrentPath = require.resolve('webtorrent');
    const webtorrentDir = path.dirname(webtorrentPath);
    const scriptPath = path.join(webtorrentDir, 'webtorrent.min.js');

    if (!fs.existsSync(scriptPath)) {
      return new NextResponse('File not found.', { status: 404 });
    }

    const fileContents = fs.readFileSync(scriptPath, 'utf-8');

    return new NextResponse(fileContents, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving webtorrent.min.js:', error);
    // require.resolve throws an error if the module is not found
    if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
         return new NextResponse('WebTorrent library not found on server.', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
