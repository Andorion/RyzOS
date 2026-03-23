// ============================================================
//  RyzOS Core — namespace, shared state, helpers, app registry
// ============================================================
const RyzOS = (() => {
  // ---------- HELPERS ----------
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // ---------- APP REGISTRY ----------
  const APPS = [];
  const DESKTOP_IDS = [];
  const appInits = {};

  function registerApp(config) {
    // config: { id, name, icon, w, h, desktop (default true), init }
    APPS.push({ id: config.id, name: config.name, icon: config.icon, w: config.w, h: config.h });
    if (config.desktop !== false) DESKTOP_IDS.push(config.id);
    if (config.init) appInits[config.id] = config.init;
  }

  function initApp(id, body) {
    const fn = appInits[id];
    if (fn) fn(body);
    else body.innerHTML = `<div style="padding:20px">App "${id}" not implemented yet.</div>`;
  }

  // ---------- SHARED STATE ----------
  const state = {
    user: null,
    pass: null,
    ws: null,
    wsAuthed: false,
    zIdx: 100,
    wins: {},            // appId -> DOM element
    startOpen: false,
    dragState: null,     // { win, type, ... }
    wpIdx: 0,
    wallpapers: [
      'linear-gradient(160deg,#0f2027,#203a43,#2c5364)',
      'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
      'linear-gradient(160deg,#0d0221,#0d324d,#7b2d8e)',
      'linear-gradient(135deg,#141e30,#243b55)',
      'linear-gradient(160deg,#232526,#414345)',
      'linear-gradient(135deg,#0c0c0c,#1a1a2e,#e94560)',
      'linear-gradient(160deg,#000428,#004e92)',
    ],
    // Chat state
    chatChannel: 'general',
    chatMessages: {},
    onlineUsers: [],
    chatUnread: {},
    joinedChannels: new Set(['general','random','games']),
  };

  // ---------- SHARED FILESYSTEM ----------
  const fs = {
    '~': { t:'d', c:{
      'Desktop':   { t:'d', c:{} },
      'Documents': { t:'d', c:{
        'readme.txt': { t:'f', data:'Welcome to RyzOS!\nYour personal web-based operating system.' },
        'todo.txt':   { t:'f', data:'1. Have fun\n2. Try all the apps\n3. Play some games\n4. Chat with friends' },
        'notes.txt':  { t:'f', data:'RyzOS notes file.\nEdit me!' },
      }},
      'Pictures':  { t:'d', c:{
        'wallpaper_info.txt': { t:'f', data:'Right-click the desktop to change wallpaper.' },
      }},
      'Music':     { t:'d', c:{
        'playlist.txt': { t:'f', data:'Neon Nights - Synthwave FM\nDigital Dreams - Cyber Pulse\nMidnight Drive - Retro Waves' },
      }},
      'Downloads': { t:'d', c:{} },
    }}
  };

  function getNode(path) {
    const p = path.split('/').filter(Boolean);
    let n = fs['~'];
    if (p[0]==='~') p.shift();
    for (const s of p) { if (!n||n.t!=='d'||!n.c[s]) return null; n=n.c[s]; }
    return n;
  }

  // ---------- VERSION ----------
  const version = { version: '1.1.0', build: 0 };
  // Fetch actual version from server (non-blocking)
  fetch('/api/version').then(r => r.json()).then(v => Object.assign(version, v)).catch(() => {});

  // ---------- PUBLIC + INTERNAL API ----------
  const api = { registerApp };

  // _internal is for OS modules and app files to access shared state
  api._internal = {
    state, $, esc, APPS, DESKTOP_IDS, appInits, initApp,
    fs, getNode, version,
  };

  return api;
})();
