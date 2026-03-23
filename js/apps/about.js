// ============================================================
//  App: About RyzOS
// ============================================================
(function() {
  RyzOS.registerApp({
    id: 'about',
    name: 'About RyzOS',
    icon: '💠',
    w: 380, h: 360,
    desktop: false,
    init(body) {
      body.innerHTML = `<div class="about-app">
        <div class="about-logo">💠</div>
        <h2>RyzOS</h2>
        <div class="about-ver">Version ${RyzOS._internal.version.version} (build ${RyzOS._internal.version.build})</div>
        <p>A web-based desktop experience with apps, games, and multi-user chat. Built with HTML, CSS, and JavaScript.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Credits</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
            Created by <span style="color:var(--accent);font-weight:600;">Aram Doudian</span> and <span style="color:var(--accent);font-weight:600;">Claude</span>
          </div>
        </div>
        <div style="margin-top:16px;font-size:12px;color:var(--text-muted)">© 2026 RyzOS Project</div>
      </div>`;
    }
  });
})();
