
const q = document.getElementById('q');
const resultsEl = document.getElementById('results');
const audio = document.getElementById('audio');
const playPause = document.getElementById('playPause');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const searchBtn = document.getElementById('searchBtn');

async function search() {
  const query = q.value.trim() || 'Bollywood hits';
  resultsEl.innerHTML = '<div style="opacity:.6">Searching…</div>';
  const res = await fetch('/api/search?q=' + encodeURIComponent(query));
  const data = await res.json();
  const items = data.items || [];
  if (!items.length) {
    resultsEl.innerHTML = '<div style="opacity:.6">No results.</div>';
    return;
  }
  resultsEl.innerHTML = items.map(item => {
    const thumb = item.thumbnails?.url || item.thumbnails?.url_overridden_by_dest || '';
    return `
      <div class="card" data-id="${item.videoId}" data-title="${encodeURIComponent(item.title)}" data-artist="${encodeURIComponent(item.author||'')}">
        <img class="thumb" src="${thumb}" alt="thumb"/>
        <div class="info">
          <div class="title">${item.title}</div>
          <div class="artist">${item.author||''}</div>
        </div>
        <div class="duration">${item.duration||''}</div>
      </div>
    `;
  }).join('');

  // Wire up clicks
  document.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const title = decodeURIComponent(el.getAttribute('data-title'));
      const artist = decodeURIComponent(el.getAttribute('data-artist'));
      play(id, title, artist);
    });
  });
}

function play(id, title, artist) {
  audio.src = '/api/stream/' + id;
  audio.play();
  trackTitle.textContent = title;
  trackArtist.textContent = artist;
  playPause.textContent = '⏸︎';
}

playPause.addEventListener('click', () => {
  if (audio.paused) { audio.play(); playPause.textContent = '⏸︎'; }
  else { audio.pause(); playPause.textContent = '▶︎'; }
});

searchBtn.addEventListener('click', search);
q.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });

// Initial search
search();
