
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebTorrent = require('webtorrent-hybrid');

const client = new WebTorrent();

// Public domain movie: "Night of the Living Dead"
const magnetURI = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36&dn=Night+of+the+Living+Dead+(1968)&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80';

let torrentFile = null;
let torrentError = null;

console.log('Adding magnet URI...');
client.add(magnetURI, (torrent) => {
  console.log('Client is downloading a torrent:', torrent.infoHash);

  const file = torrent.files.find((f) => f.name.endsWith('.mp4'));
  if (file) {
    console.log('Video file found:', file.name);
    torrentFile = file;
  } else {
    console.error('No .mp4 file found in the torrent.');
    torrentError = 'No .mp4 file found in torrent.';
  }

  torrent.on('error', (err) => {
    console.error('Torrent error:', err);
    torrentError = err.message;
  });

  torrent.on('done', () => {
    console.log('Torrent download finished');
  });
});

client.on('error', (err) => {
  console.error('WebTorrent client error:', err);
  torrentError = 'WebTorrent client initialization failed.';
});

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);

  if (req.url === '/') {
    // Serve the HTML page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const htmlPath = path.join(__dirname, 'index.html');
    fs.createReadStream(htmlPath).pipe(res);

  } else if (req.url === '/stream') {
    if (torrentError) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server error: ${torrentError}`);
      return;
    }

    if (!torrentFile) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Torrent metadata is not ready yet. Please try again in a moment.');
      return;
    }

    console.log('Streaming file:', torrentFile.name);

    const range = req.headers.range;
    if (!range) {
      res.writeHead(416, { 'Content-Type': 'text/plain' });
      return res.end('Requires Range header');
    }

    const total = torrentFile.length;
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });

    const stream = torrentFile.createReadStream({ start, end });
    stream.pipe(res);
    stream.on('error', (err) => {
        console.error('Stream error:', err);
        res.end();
    });

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open this URL in your browser.`);
});
