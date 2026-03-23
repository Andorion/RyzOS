// ============================================================
//  RyzOS — Desktop icons & wallpaper
// ============================================================
(function() {
  const { state, $, APPS, DESKTOP_IDS } = RyzOS._internal;

  function buildDesktopIcons() {
    const c = $('desktop-icons'); c.innerHTML = '';
    DESKTOP_IDS.forEach(id => {
      const a = APPS.find(x => x.id === id);
      if (!a) return;
      const d = document.createElement('div');
      d.className = 'desktop-icon';
      d.ondblclick = () => RyzOS.openApp(a.id);
      d.innerHTML = `<div class="di-icon">${a.icon}</div><div class="di-label">${a.name}</div>`;
      c.appendChild(d);
    });
  }

  function changeWP() {
    state.wpIdx = (state.wpIdx + 1) % state.wallpapers.length;
    $('desktop').style.background = state.wallpapers[state.wpIdx];
  }

  RyzOS.buildDesktopIcons = buildDesktopIcons;
  RyzOS.changeWP = changeWP;
})();
