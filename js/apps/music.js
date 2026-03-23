// ============================================================
//  App: Music Player
// ============================================================
(function() {
  const { $, esc } = RyzOS._internal;
  let musicIdx = 0, musicPlaying = false;
  const tracks = [
    { title:'Neon Nights',     artist:'Synthwave FM',  dur:'3:42', grad:'linear-gradient(135deg,#667eea,#764ba2)' },
    { title:'Digital Dreams',  artist:'Cyber Pulse',   dur:'4:15', grad:'linear-gradient(135deg,#f093fb,#f5576c)' },
    { title:'Midnight Drive',  artist:'Retro Waves',   dur:'3:58', grad:'linear-gradient(135deg,#4facfe,#00f2fe)' },
    { title:'Electric Sunset', artist:'Vapor Trail',   dur:'5:01', grad:'linear-gradient(135deg,#43e97b,#38f9d7)' },
    { title:'Binary Stars',   artist:'Data Flow',     dur:'4:33', grad:'linear-gradient(135deg,#fa709a,#fee140)' },
  ];

  function renderMusic(body) {
    if (!body) body = $('body-music');
    if (!body) return;
    const t=tracks[musicIdx];
    body.innerHTML = `<div class="music-app">
      <div class="music-art" style="background:${t.grad}">🎵</div>
      <div class="music-title">${esc(t.title)}</div>
      <div class="music-artist">${esc(t.artist)}</div>
      <div class="music-controls">
        <button onclick="RyzOS._musicPrev()">⏮</button>
        <button class="play-btn" id="music-play" onclick="RyzOS._musicToggle()">${musicPlaying?'⏸':'▶'}</button>
        <button onclick="RyzOS._musicNext()">⏭</button>
      </div>
      <div class="music-progress"><input type="range" min="0" max="100" value="0"></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${t.dur}</div>
    </div>`;
  }

  RyzOS.registerApp({
    id: 'music',
    name: 'Music',
    icon: '🎵',
    w: 340, h: 420,
    init: renderMusic
  });

  RyzOS._musicToggle = function(){musicPlaying=!musicPlaying;const b=$('music-play');if(b)b.textContent=musicPlaying?'⏸':'▶';};
  RyzOS._musicNext = function(){musicIdx=(musicIdx+1)%tracks.length;renderMusic();};
  RyzOS._musicPrev = function(){musicIdx=(musicIdx-1+tracks.length)%tracks.length;renderMusic();};
})();
