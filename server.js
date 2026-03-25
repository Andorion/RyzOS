// server.js — RyzOS backend
// Zero external dependencies beyond 'ws' (WebSocket).
// Run: npm start
// Deploy: works on any Node.js host (Render, Railway, Fly, Glitch, etc.)

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;

// ---------- Version ----------
const versionFile = resolve('version.json');
const versionInfo = JSON.parse(readFileSync(versionFile, 'utf8'));
console.log(`[RyzOS] v${versionInfo.version} build ${versionInfo.build}`);

// ---------- In-memory stores ----------
// User model: { password: string|null, role: 'user'|'admin'|'superuser', hint: string }
// password=null means user must set password on first login
const users = {};
const MAX_HISTORY = 100;
const channelHistory = {}; // channel -> [{user, text, time}]
const pendingDMs = {};     // username -> [{from, to, text, time}]

// ---------- Superuser seed ----------
const SUPERUSER = 'admin';
const SUPERUSER_PASS = 'RyzOS123!';
users[SUPERUSER] = { password: SUPERUSER_PASS, role: 'superuser', hint: 'Default admin password' };
console.log(`[RyzOS] Superuser "${SUPERUSER}" seeded`);

function pushHistory(channel, msg) {
  if (!channelHistory[channel]) channelHistory[channel] = [];
  channelHistory[channel].push(msg);
  if (channelHistory[channel].length > MAX_HISTORY) channelHistory[channel].shift();
}

// ---------- MIME map ----------
const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.mp3':'audio/mpeg','.wav':'audio/wav',
  '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf',
};

// ---------- HTTP server ----------
const server = createServer((req, res) => {
  // CORS headers for flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API routes
  if (req.method === 'GET'  && req.url === '/api/version')       return jsonRes(res, 200, versionInfo);
  if (req.method === 'POST' && req.url === '/api/check-user')    return handleCheckUser(req, res);
  if (req.method === 'POST' && req.url === '/api/login')         return handleLogin(req, res);
  if (req.method === 'POST' && req.url === '/api/set-password')  return handleSetPassword(req, res);
  if (req.method === 'POST' && req.url === '/api/get-hint')      return handleGetHint(req, res);
  if (req.method === 'POST' && req.url === '/api/change-password') return handleChangePassword(req, res);
  if (req.method === 'POST' && req.url === '/api/users')          return handleListAllUsers(req, res);
  if (req.method === 'POST' && req.url === '/api/admin/create-user')    return handleAdminCreateUser(req, res);
  if (req.method === 'POST' && req.url === '/api/admin/list-users')     return handleAdminListUsers(req, res);
  if (req.method === 'POST' && req.url === '/api/admin/delete-user')    return handleAdminDeleteUser(req, res);
  if (req.method === 'POST' && req.url === '/api/admin/change-role')    return handleAdminChangeRole(req, res);
  if (req.method === 'POST' && req.url === '/api/admin/rename-user')    return handleAdminRenameUser(req, res);
  if (req.method === 'POST' && req.url === '/api/admin/reset-password') return handleAdminResetPassword(req, res);

  // Static file serving
  let filePath = req.url.split('?')[0]; // strip query
  filePath = filePath === '/' ? './index.html' : '.' + filePath;
  filePath = resolve(filePath);

  // Security: stay inside project dir
  if (!filePath.startsWith(resolve('.'))) { res.writeHead(403); res.end('Forbidden'); return; }

  if (!existsSync(filePath)) filePath = resolve('./index.html'); // SPA fallback

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(500); res.end('Internal Server Error');
  }
});

// ---------- JSON body parser ----------
function parseBody(req, cb) {
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 1e5) req.destroy(); }); // 100KB limit
  req.on('end', () => { try { cb(JSON.parse(body || '{}')); } catch { cb({}); } });
}

function jsonRes(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// ---------- Auth helper: validate caller is admin/superuser ----------
function authCaller(data) {
  const u = (data._caller || '').trim();
  const p = (data._callerPass || '').trim();
  if (!u || !p || !users[u] || users[u].password !== p) return null;
  return users[u];
}

// ---------- API: Check if user exists and password status ----------
function handleCheckUser(req, res) {
  parseBody(req, ({ username }) => {
    username = (username || '').trim();
    if (!username) return jsonRes(res, 400, { ok: false, error: 'Username required.' });
    const user = users[username];
    if (!user) return jsonRes(res, 200, { ok: true, exists: false });
    jsonRes(res, 200, {
      ok: true,
      exists: true,
      needsPassword: user.password === null,
      hasHint: !!(user.hint && user.hint.length > 0 && user.password !== null),
    });
  });
}

// ---------- API: Login ----------
function handleLogin(req, res) {
  parseBody(req, ({ username, password }) => {
    username = (username || '').trim();
    password = (password || '').trim();
    if (!username) return jsonRes(res, 400, { ok: false, error: 'Username required.' });
    if (!users[username]) return jsonRes(res, 401, { ok: false, error: 'Invalid username or password.' });
    const u = users[username];
    // User exists but hasn't set a password yet — tell the client
    if (u.password === null) {
      return jsonRes(res, 200, { ok: false, needsPassword: true });
    }
    if (!password || u.password !== password) {
      return jsonRes(res, 401, {
        ok: false,
        error: 'Invalid username or password.',
        hasHint: !!(u.hint && u.hint.length > 0),
      });
    }
    jsonRes(res, 200, { ok: true, role: u.role });
  });
}

// ---------- API: Set password (first-time) ----------
function handleSetPassword(req, res) {
  parseBody(req, ({ username, password, hint }) => {
    username = (username || '').trim();
    password = (password || '').trim();
    hint = (hint || '').trim();
    if (!username || !password) return jsonRes(res, 400, { ok: false, error: 'Username and password required.' });
    if (!users[username]) return jsonRes(res, 404, { ok: false, error: 'User not found.' });
    if (users[username].password !== null) return jsonRes(res, 400, { ok: false, error: 'Password already set.' });
    if (password.length < 3) return jsonRes(res, 400, { ok: false, error: 'Password too short (min 3).' });
    users[username].password = password;
    users[username].hint = hint || '';
    console.log('[RyzOS] Password set for:', username);
    jsonRes(res, 200, { ok: true, role: users[username].role });
  });
}

// ---------- API: Get password hint ----------
function handleGetHint(req, res) {
  parseBody(req, ({ username }) => {
    username = (username || '').trim();
    if (!username || !users[username]) return jsonRes(res, 404, { ok: false, error: 'User not found.' });
    const hint = users[username].hint || '';
    if (!hint) return jsonRes(res, 200, { ok: true, hint: 'No hint set for this account.' });
    jsonRes(res, 200, { ok: true, hint });
  });
}

// ---------- API: Change own password (logged-in user) ----------
function handleChangePassword(req, res) {
  parseBody(req, ({ username, currentPassword, newPassword, hint }) => {
    username = (username || '').trim();
    currentPassword = (currentPassword || '').trim();
    newPassword = (newPassword || '').trim();
    if (!username || !currentPassword || !newPassword) return jsonRes(res, 400, { ok: false, error: 'All fields required.' });
    if (!users[username] || users[username].password !== currentPassword) return jsonRes(res, 401, { ok: false, error: 'Current password is incorrect.' });
    if (newPassword.length < 3) return jsonRes(res, 400, { ok: false, error: 'New password too short (min 3).' });
    users[username].password = newPassword;
    if (hint !== undefined) users[username].hint = (hint || '').trim();
    console.log('[RyzOS] Password changed for:', username);
    jsonRes(res, 200, { ok: true });
  });
}

// ---------- API: List all usernames (authenticated users) ----------
function handleListAllUsers(req, res) {
  parseBody(req, ({ username, password }) => {
    username = (username || '').trim();
    password = (password || '').trim();
    if (!username || !password || !users[username] || users[username].password !== password) {
      return jsonRes(res, 401, { ok: false, error: 'Auth required.' });
    }
    const online = getOnlineUsers();
    const list = Object.keys(users).map(u => ({
      username: u,
      online: online.includes(u),
    }));
    jsonRes(res, 200, { ok: true, users: list });
  });
}

// ---------- ADMIN API: Create user (admin/superuser only) ----------
function handleAdminCreateUser(req, res) {
  parseBody(req, (data) => {
    const caller = authCaller(data);
    if (!caller || (caller.role !== 'admin' && caller.role !== 'superuser')) {
      return jsonRes(res, 403, { ok: false, error: 'Admin access required.' });
    }
    const username = (data.username || '').trim();
    if (!username) return jsonRes(res, 400, { ok: false, error: 'Username required.' });
    if (username.length > 20) return jsonRes(res, 400, { ok: false, error: 'Username too long (max 20).' });
    if (users[username]) return jsonRes(res, 409, { ok: false, error: 'Username already taken.' });
    users[username] = { password: null, role: 'user', hint: '' };
    console.log('[RyzOS] User created by', data._caller + ':', username);
    jsonRes(res, 200, { ok: true });
  });
}

// ---------- ADMIN API: List users ----------
function handleAdminListUsers(req, res) {
  parseBody(req, (data) => {
    const caller = authCaller(data);
    if (!caller || (caller.role !== 'admin' && caller.role !== 'superuser')) {
      return jsonRes(res, 403, { ok: false, error: 'Admin access required.' });
    }
    const list = Object.entries(users).map(([name, u]) => ({
      username: name,
      role: u.role,
      hasPassword: u.password !== null,
    }));
    jsonRes(res, 200, { ok: true, users: list });
  });
}

// ---------- ADMIN API: Delete user (superuser only) ----------
function handleAdminDeleteUser(req, res) {
  parseBody(req, (data) => {
    const caller = authCaller(data);
    if (!caller || caller.role !== 'superuser') {
      return jsonRes(res, 403, { ok: false, error: 'Superuser access required.' });
    }
    const username = (data.username || '').trim();
    if (!username) return jsonRes(res, 400, { ok: false, error: 'Username required.' });
    if (username === SUPERUSER) return jsonRes(res, 400, { ok: false, error: 'Cannot delete superuser.' });
    if (!users[username]) return jsonRes(res, 404, { ok: false, error: 'User not found.' });
    delete users[username];
    // Disconnect their websocket sessions
    clients.forEach((info, ws) => {
      if (info.authenticated && info.username === username) ws.close();
    });
    console.log('[RyzOS] User deleted by', data._caller + ':', username);
    jsonRes(res, 200, { ok: true });
  });
}

// ---------- ADMIN API: Change user role (superuser only) ----------
function handleAdminChangeRole(req, res) {
  parseBody(req, (data) => {
    const caller = authCaller(data);
    if (!caller || caller.role !== 'superuser') {
      return jsonRes(res, 403, { ok: false, error: 'Superuser access required.' });
    }
    const username = (data.username || '').trim();
    const role = (data.role || '').trim();
    if (!username || !role) return jsonRes(res, 400, { ok: false, error: 'Username and role required.' });
    if (!['user', 'admin'].includes(role)) return jsonRes(res, 400, { ok: false, error: 'Role must be "user" or "admin".' });
    if (username === SUPERUSER) return jsonRes(res, 400, { ok: false, error: 'Cannot change superuser role.' });
    if (!users[username]) return jsonRes(res, 404, { ok: false, error: 'User not found.' });
    users[username].role = role;
    console.log('[RyzOS] Role changed by', data._caller + ':', username, '→', role);
    jsonRes(res, 200, { ok: true });
  });
}

// ---------- ADMIN API: Rename user (admin/superuser) ----------
function handleAdminRenameUser(req, res) {
  parseBody(req, (data) => {
    const caller = authCaller(data);
    if (!caller || (caller.role !== 'admin' && caller.role !== 'superuser')) {
      return jsonRes(res, 403, { ok: false, error: 'Admin access required.' });
    }
    const oldName = (data.oldName || '').trim();
    const newName = (data.newName || '').trim();
    if (!oldName || !newName) return jsonRes(res, 400, { ok: false, error: 'Both old and new names required.' });
    if (newName.length > 20) return jsonRes(res, 400, { ok: false, error: 'Username too long (max 20).' });
    if (oldName === SUPERUSER) return jsonRes(res, 400, { ok: false, error: 'Cannot rename superuser.' });
    if (!users[oldName]) return jsonRes(res, 404, { ok: false, error: 'User not found.' });
    if (users[newName]) return jsonRes(res, 409, { ok: false, error: 'New username already taken.' });
    users[newName] = users[oldName];
    delete users[oldName];
    // Update connected websocket sessions
    clients.forEach((info) => {
      if (info.authenticated && info.username === oldName) info.username = newName;
    });
    console.log('[RyzOS] User renamed by', data._caller + ':', oldName, '→', newName);
    jsonRes(res, 200, { ok: true });
  });
}

// ---------- ADMIN API: Reset user password (superuser only) ----------
function handleAdminResetPassword(req, res) {
  parseBody(req, (data) => {
    const caller = authCaller(data);
    if (!caller || caller.role !== 'superuser') {
      return jsonRes(res, 403, { ok: false, error: 'Superuser access required.' });
    }
    const username = (data.username || '').trim();
    if (!username) return jsonRes(res, 400, { ok: false, error: 'Username required.' });
    if (username === SUPERUSER) return jsonRes(res, 400, { ok: false, error: 'Cannot reset superuser password this way.' });
    if (!users[username]) return jsonRes(res, 404, { ok: false, error: 'User not found.' });
    users[username].password = null;
    users[username].hint = '';
    // Disconnect their sessions so they re-login
    clients.forEach((info, ws) => {
      if (info.authenticated && info.username === username) ws.close();
    });
    console.log('[RyzOS] Password reset by', data._caller + ':', username);
    jsonRes(res, 200, { ok: true });
  });
}

// ---------- WebSocket chat ----------
const wss = new WebSocketServer({ server });
const clients = new Map(); // ws -> { username, authenticated }

function getOnlineUsers() {
  const names = new Set();
  clients.forEach(info => { if (info.authenticated) names.add(info.username); });
  return [...names];
}

function broadcast(msg, exclude) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1 && c !== exclude) c.send(payload); });
}

function broadcastAll(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
}

function sendTo(username, msg) {
  const payload = JSON.stringify(msg);
  clients.forEach((info, ws) => {
    if (info.authenticated && info.username === username && ws.readyState === 1) {
      ws.send(payload);
    }
  });
}

wss.on('connection', ws => {
  const info = { username: null, authenticated: false };
  clients.set(ws, info);

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    // ---------- AUTH ----------
    if (!info.authenticated) {
      if (msg.type === 'auth') {
        const u = (msg.username || '').trim();
        const p = (msg.password || '').trim();
        if (!u || !p || !users[u] || users[u].password !== p) {
          ws.send(JSON.stringify({ type:'error', error:'Auth failed.' }));
          ws.close(); return;
        }
        info.authenticated = true;
        info.username = u;
        ws.send(JSON.stringify({ type:'auth-ok', user:u, role:users[u].role }));

        // Send channel history for default channels
        for (const ch of ['general', 'random', 'games']) {
          if (channelHistory[ch] && channelHistory[ch].length > 0) {
            ws.send(JSON.stringify({ type:'history', channel:ch, messages:channelHistory[ch] }));
          }
        }

        // Deliver any pending DMs
        if (pendingDMs[u] && pendingDMs[u].length > 0) {
          pendingDMs[u].forEach(dm => ws.send(JSON.stringify(dm)));
          delete pendingDMs[u];
        }

        broadcast({ type:'user-joined', username:u }, ws);
        broadcastAll({ type:'online-users', users:getOnlineUsers() });
        console.log('[RyzOS] Online:', getOnlineUsers().join(', '));
      }
      return;
    }

    // ---------- CHANNEL CHAT ----------
    if (msg.type === 'chat') {
      const text = (msg.text || '').slice(0, 2000);
      const channel = (msg.channel || 'general').slice(0, 50);
      if (!text) return;
      const time = msg.time || new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      const chatMsg = { type:'chat', channel, user:info.username, text, time };
      pushHistory(channel, { user:info.username, text, time });
      broadcastAll(chatMsg);
    }

    // ---------- DIRECT MESSAGE ----------
    if (msg.type === 'dm') {
      const to = (msg.to || '').trim();
      const text = (msg.text || '').slice(0, 2000);
      if (!to || !text || !users[to]) return;
      const payload = {
        type: 'dm',
        from: info.username,
        to,
        text,
        time: msg.time || new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
      };
      // Check if recipient is online
      const recipientOnline = getOnlineUsers().includes(to);
      if (recipientOnline) {
        sendTo(to, payload);
      } else {
        // Store for delivery when they come online
        if (!pendingDMs[to]) pendingDMs[to] = [];
        pendingDMs[to].push(payload);
        if (pendingDMs[to].length > MAX_HISTORY) pendingDMs[to].shift();
      }
      // Echo back to sender (so other tabs/devices see it)
      if (to !== info.username) {
        clients.forEach((ci, cws) => {
          if (ci.authenticated && ci.username === info.username && cws !== ws && cws.readyState === 1) {
            cws.send(JSON.stringify(payload));
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (info.authenticated) {
      broadcast({ type:'user-left', username:info.username });
      clients.delete(ws);
      broadcastAll({ type:'online-users', users:getOnlineUsers() });
      console.log('[RyzOS] Disconnected:', info.username, '| Online:', getOnlineUsers().join(', '));
    } else {
      clients.delete(ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[RyzOS] Server running at http://localhost:${PORT}`);
  console.log(`[RyzOS] Share your local IP + port with friends on the same network to chat!`);
});
