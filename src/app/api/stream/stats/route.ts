
import { NextRequest, NextResponse } from 'next/server';
import { findTorrent } from '../route';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnetUri = searchParams.get('magnet');

  if (!magnetUri) {
    return new NextResponse('Magnet link is required', { status: 400 });
  }

  const torrent = findTorrent(magnetUri);

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
