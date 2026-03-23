// ============================================================
//  RyzOS — Login, boot, logout
// ============================================================
(function() {
  const { state, $ } = RyzOS._internal;

  function setLoginErr(m) { $('login-error').textContent = m || ''; }

  async function createUser() {
    const u = $('login-user').value.trim(), p = $('login-pass').value.trim();
    if (!u || !p) { setLoginErr('Username & password required.'); return; }
    try {
      const r = await fetch('/api/create-user', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p}) });
      const d = await r.json();
      setLoginErr(d.ok ? 'Account created! Sign in now.' : (d.error||'Failed.'));
    } catch { setLoginErr('Server not reachable.'); }
  }

  async function login() {
    const u = $('login-user').value.trim(), p = $('login-pass').value.trim();
    if (!u || !p) { setLoginErr('Username & password required.'); return; }
    try {
      const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p}) });
      const d = await r.json();
      if (!d.ok) { setLoginErr(d.error||'Login failed.'); return; }
    } catch { setLoginErr('Server not reachable.'); return; }
    state.user = u; state.pass = p;
    boot();
  }

  function boot() {
    $('login-screen').style.display = 'none';
    const b = $('boot-screen'); b.style.display = 'flex';
    const dots = b.querySelector('.boot-dots');
    const fr = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'.split('');
    let i = 0;
    const iv = setInterval(() => { dots.textContent = fr[i++ % fr.length]; }, 100);
    setTimeout(() => { clearInterval(iv); b.style.display = 'none'; enterDesktop(); }, 1200);
  }

  function enterDesktop() {
    $('desktop').style.display = 'block';
    $('taskbar').style.display = 'flex';
    $('sys-user').textContent = state.user;
    $('start-uname').textContent = state.user;
    RyzOS.buildDesktopIcons();
    RyzOS.buildStartMenu();
    RyzOS.connectWS();
    RyzOS.tickClock();
  }

  function logout() {
    if (state.ws) state.ws.close();
    state.ws = null; state.wsAuthed = false; state.user = null; state.pass = null;
    Object.keys(state.wins).forEach(RyzOS.closeApp);
    $('taskbar-apps').innerHTML = '';
    $('desktop').style.display = 'none';
    $('taskbar').style.display = 'none';
    RyzOS.closeStart();
    $('login-screen').style.display = 'flex';
    $('login-error').textContent = '';
    state.chatChannel = 'general';
    Object.keys(state.chatMessages).forEach(k => delete state.chatMessages[k]);
    state.onlineUsers = [];
  }

  // Expose public API
  RyzOS.createUser = createUser;
  RyzOS.login = login;
  RyzOS.logout = logout;
})();
