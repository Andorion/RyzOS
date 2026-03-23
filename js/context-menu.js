// ============================================================
//  RyzOS — Context menu (right-click)
// ============================================================
(function() {
  const { $ } = RyzOS._internal;

  function showCtx(e) {
    if (e.target.closest('.window') || e.target.closest('#taskbar') || e.target.closest('#start-menu')) return;
    e.preventDefault();
    const m = $('ctx-menu');
    m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px'; m.style.display = 'block';
    m.innerHTML = `
      <div class="ctx-item" onclick="RyzOS.changeWP();RyzOS.closeCtx()">🖼️ Change Wallpaper</div>
      <div class="ctx-item" onclick="RyzOS.openApp('settings');RyzOS.closeCtx()">⚙️ Settings</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" onclick="RyzOS.openApp('terminal');RyzOS.closeCtx()">⬛ Open Terminal</div>
      <div class="ctx-item" onclick="RyzOS.openApp('about');RyzOS.closeCtx()">💠 About RyzOS</div>`;
  }

  function closeCtx() { $('ctx-menu').style.display = 'none'; }

  RyzOS.showCtx = showCtx;
  RyzOS.closeCtx = closeCtx;
})();
