
const express = require('express');
const cors = require('cors');
const ytsr = require('ytsr');
const ytdlp = require('yt-dlp-exec');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Helper to transform ytsr result items
function mapItem(i) {
  return {
    type: i.type,
    title: i.title,
    author: i.author && i.author.name ? i.author.name : (i.author || ""),
    duration: i.duration || "",
    videoId: i.id || (i.url ? new URL(i.url).searchParams.get('v') : ""),
    url: i.url,
    thumbnails: i.bestThumbnail || i.thumbnails || null
  };
}

// Search endpoint (bias toward Bollywood)
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q && req.query.q.trim() ? req.query.q.trim() : "Bollywood hits";
    const query = /bollywood|hindi|punjabi|tollywood|kollywood/i.test(q) ? q : (q + " bollywood");
    const results = await ytsr(query, { pages: 1 });
    const items = (results.items || [])
      .filter(i => i.type === 'video')
      .map(mapItem)
      .slice(0, 25);
    res.json({ query, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'search_failed' });
  }
});

// Stream audio with yt-dlp (pipes stdout)
app.get('/api/stream/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing video id' });
  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    // Let browser sniff mime; chunked streaming
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Accept-Ranges', 'bytes');

    const proc = ytdlp.exec(url, {
      // Best audio only, no video
      format: 'bestaudio/best',
      // Output to stdout
      output: '-',
      // Reduce buffering
      'no-playlist': true,
      // Prefer m4a if available
      'audio-format': 'mp3/bestaudio'
    }, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.pipe(res);

    proc.stderr.on('data', (d) => {
      // Optional: log progress lines, do not spam client
      // console.log('yt-dlp:', d.toString());
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        // If yt-dlp fails after headers were sent, just end
        if (!res.headersSent) res.status(500).end('stream_error');
        else res.end();
      }
    });

    req.on('close', () => {
      try { proc.kill('SIGKILL'); } catch(e) {}
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'stream_failed' });
    else res.end();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('Open / in your browser for the Spotify-like UI');
});
