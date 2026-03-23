// ============================================================
//  App: Settings
// ============================================================
(function() {
  const { state, $, esc } = RyzOS._internal;

  RyzOS.registerApp({
    id: 'settings',
    name: 'Settings',
    icon: '⚙️',
    w: 450, h: 400,
    init(body) {
      const isDark = !document.body.classList.contains('light-mode');
      body.innerHTML = `<div class="settings-app">
        <h3>⚙️ Settings</h3>
        <div class="setting-row">
          <div class="setting-info"><div class="setting-label">Dark Mode</div><div class="setting-desc">Toggle light/dark theme</div></div>
          <button class="toggle ${isDark?'on':''}" id="toggle-dark" onclick="RyzOS._toggleDark()"></button>
        </div>
        <div class="setting-row">
          <div class="setting-info"><div class="setting-label">Wallpaper</div><div class="setting-desc">Cycle desktop background</div></div>
          <button class="game-btn" style="padding:6px 14px;font-size:12px" onclick="RyzOS.changeWP()">Change</button>
        </div>
        <div class="setting-row">
          <div class="setting-info"><div class="setting-label">Username</div><div class="setting-desc">${esc(state.user||'')}</div></div>
        </div>
        <div class="setting-row">
          <div class="setting-info"><div class="setting-label">Chat Server</div><div class="setting-desc">${state.wsAuthed?'Connected ✅':'Disconnected ❌'}</div></div>
        </div>
        <div class="setting-row">
          <div class="setting-info"><div class="setting-label">Version</div><div class="setting-desc">RyzOS ${RyzOS._internal.version.version} build ${RyzOS._internal.version.build}</div></div>
        </div>
        <div class="setting-row" style="cursor:pointer" onclick="RyzOS.openApp('about')">
          <div class="setting-info"><div class="setting-label">About RyzOS</div><div class="setting-desc">Created by Aram Doudian and Claude</div></div>
          <span style="color:var(--text-muted);font-size:18px">→</span>
        </div>
      </div>`;
    }
  });

  RyzOS._toggleDark = function() {
    document.body.classList.toggle('light-mode');
    const btn = $('toggle-dark');
    if (btn) btn.classList.toggle('on');
  };
})();
