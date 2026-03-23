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
const users = {}; // username -> { password }
const MAX_HISTORY = 100;
const channelHistory = {}; // channel -> [{user, text, time}]

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
  if (req.method === 'GET'  && req.url === '/api/version')     return jsonRes(res, 200, versionInfo);
  if (req.method === 'POST' && req.url === '/api/create-user') return handleCreateUser(req, res);
  if (req.method === 'POST' && req.url === '/api/login')       return handleLogin(req, res);

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

function handleCreateUser(req, res) {
  parseBody(req, ({ username, password }) => {
    username = (username || '').trim();
    password = (password || '').trim();
    if (!username || !password)   return jsonRes(res, 400, { ok:false, error:'Username and password required.' });
    if (username.length > 20)     return jsonRes(res, 400, { ok:false, error:'Username too long (max 20).' });
    if (password.length < 3)      return jsonRes(res, 400, { ok:false, error:'Password too short (min 3).' });
    if (users[username])          return jsonRes(res, 409, { ok:false, error:'Username already taken.' });
    users[username] = { password };
    console.log('[RyzOS] User created:', username);
    jsonRes(res, 200, { ok:true });
  });
}

function handleLogin(req, res) {
  parseBody(req, ({ username, password }) => {
    username = (username || '').trim();
    password = (password || '').trim();
    if (!username || !password || !users[username] || users[username].password !== password) {
      return jsonRes(res, 401, { ok:false, error:'Invalid username or password.' });
    }
    jsonRes(res, 200, { ok:true });
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
        ws.send(JSON.stringify({ type:'auth-ok', user:u }));

        // Send channel history for default channels
        for (const ch of ['general', 'random', 'games']) {
          if (channelHistory[ch] && channelHistory[ch].length > 0) {
            ws.send(JSON.stringify({ type:'history', channel:ch, messages:channelHistory[ch] }));
          }
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
      // Send to recipient
      sendTo(to, payload);
      // Echo back to sender (so other tabs/devices see it)
      // Only if sender !== recipient
      if (to !== info.username) {
        // Sender already added it locally, but other sender tabs need it
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
