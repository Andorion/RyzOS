// ============================================================
//  RyzOS — Window management (open, close, focus, drag, resize)
// ============================================================
(function() {
  const { state, $, APPS, initApp } = RyzOS._internal;

  function openApp(id) {
    if (state.wins[id]) { focusWin(state.wins[id]); return; }
    const app = APPS.find(a => a.id === id);
    if (!app) return;

    const w = document.createElement('div');
    w.className = 'window'; w.id = 'win-' + id;
    w.style.width = app.w + 'px'; w.style.height = app.h + 'px';
    w.style.left = Math.max(20, (innerWidth - app.w) / 2 + (Math.random()*60-30)|0) + 'px';
    w.style.top  = Math.max(20, (innerHeight - 48 - app.h) / 2 + (Math.random()*40-20)|0) + 'px';
    w.style.zIndex = state.zIdx++;

    const hdr = document.createElement('div');
    hdr.className = 'win-header';
    hdr.innerHTML = `<span class="win-icon">${app.icon}</span><span class="win-title">${app.name}</span>
      <div class="win-controls">
        <button data-act="min" title="Minimize">─</button>
        <button data-act="max" title="Maximize">☐</button>
        <button data-act="close" class="btn-close" title="Close">✕</button>
      </div>`;

    // Header drag
    hdr.addEventListener('mousedown', e => {
      if (e.target.closest('.win-controls') || e.target.tagName === 'BUTTON') return;
      if (w.classList.contains('maximized')) return;
      e.preventDefault();
      const r = w.getBoundingClientRect();
      state.dragState = { win:w, type:'move', ox:e.clientX-r.left, oy:e.clientY-r.top };
      focusWin(w);
    });

    // Window control buttons
    hdr.querySelector('[data-act="min"]').onclick = () => { w.style.display = 'none'; };
    hdr.querySelector('[data-act="max"]').onclick = () => { w.classList.toggle('maximized'); };
    hdr.querySelector('[data-act="close"]').onclick = () => { closeApp(id); };

    const body = document.createElement('div');
    body.className = 'win-body'; body.id = 'body-' + id;

    const rh = document.createElement('div');
    rh.className = 'win-resize';
    rh.addEventListener('mousedown', e => {
      if (w.classList.contains('maximized')) return;
      e.preventDefault(); e.stopPropagation();
      const r = w.getBoundingClientRect();
      state.dragState = { win:w, type:'resize', sw:r.width, sh:r.height, sx:e.clientX, sy:e.clientY };
    });

    w.appendChild(hdr); w.appendChild(body); w.appendChild(rh);
    w.addEventListener('mousedown', e => {
      if (e.target.matches('input,textarea,canvas,select,button,[tabindex]')) return;
      focusWin(w);
    });

    document.body.appendChild(w);
    state.wins[id] = w;
    initApp(id, body);
    addTbBtn(id);
    focusWin(w);
  }

  function closeApp(id) {
    const w = state.wins[id];
    if (w) { w.remove(); delete state.wins[id]; }
    // Notify apps that need cleanup
    if (RyzOS._onAppClose) RyzOS._onAppClose(id);
    removeTbBtn(id);
  }

  function focusWin(w) {
    if (!w) return;
    w.style.display = 'flex'; w.style.zIndex = state.zIdx++;
    document.querySelectorAll('.taskbar-app').forEach(b => b.classList.remove('active'));
    const tb = $('tb-' + w.id.replace('win-',''));
    if (tb) tb.classList.add('active');
  }

  function addTbBtn(id) {
    const a = APPS.find(x => x.id === id); if (!a) return;
    const b = document.createElement('button');
    b.className = 'taskbar-app active'; b.id = 'tb-' + id;
    b.innerHTML = `<span class="tb-icon">${a.icon}</span>${a.name}`;
    b.onclick = () => {
      const w = state.wins[id]; if (!w) return;
      if (w.style.display === 'none') focusWin(w);
      else if (+w.style.zIndex >= state.zIdx - 1) w.style.display = 'none';
      else focusWin(w);
    };
    $('taskbar-apps').appendChild(b);
  }

  function removeTbBtn(id) { const b = $('tb-'+id); if (b) b.remove(); }

  // ---------- DRAG / RESIZE (global) ----------
  document.addEventListener('mousemove', e => {
    if (!state.dragState) return;
    e.preventDefault();
    const d = state.dragState;
    if (d.type === 'move') {
      d.win.style.left = (e.clientX - d.ox) + 'px';
      d.win.style.top  = (e.clientY - d.oy) + 'px';
    } else if (d.type === 'resize') {
      d.win.style.width  = Math.max(280, d.sw + e.clientX - d.sx) + 'px';
      d.win.style.height = Math.max(180, d.sh + e.clientY - d.sy) + 'px';
      // Notify paint canvas if open
      if (d.win.id === 'win-paint' && RyzOS._resizePaintCanvas) RyzOS._resizePaintCanvas();
    }
  });
  document.addEventListener('mouseup', () => { state.dragState = null; });

  // Expose public API
  RyzOS.openApp = openApp;
  RyzOS.closeApp = closeApp;
  RyzOS.focusWin = focusWin;
})();
