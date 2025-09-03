import express from "express";
import cors from "cors";
import WebTorrent from "webtorrent";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new WebTorrent();

// 👉 Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 👉 Torrent streaming API
app.get("/stream", (req, res) => {
  const magnetUri = req.query.magnet;

  if (!magnetUri) {
    return res.status(400).send("Magnet link required");
  }

  client.add(magnetUri, (torrent) => {
    const file = torrent.files.find(
      (f) => f.name.endsWith(".mp4") || f.name.endsWith(".mkv")
    );

    if (!file) {
      return res.status(404).send("No video file found in torrent");
    }

    res.writeHead(200, { "Content-Type": "video/mp4" });

    file.createReadStream().pipe(res);

    torrent.on("download", () => {
      console.log(`Progress: ${(torrent.progress * 100).toFixed(2)}%`);
    });

    torrent.on("done", () => {
      console.log("Torrent download complete!");
    });
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
