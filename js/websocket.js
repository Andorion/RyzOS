// ============================================================
//  RyzOS — WebSocket client & chat logic
// ============================================================
(function() {
  const { state, $, esc } = RyzOS._internal;

  // Fetch all system users (online + offline) from server
  async function fetchAllUsers() {
    try {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: state.user, password: state.pass }),
      });
      const d = await r.json();
      if (d.ok) {
        state.allUsers = d.users || [];
        chatUI_updateUsers();
      }
    } catch {}
  }

  function connectWS() {
    const loc = location;
    state.ws = new WebSocket((loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host);
    state.ws.onopen = () => {
      state.ws.send(JSON.stringify({ type:'auth', username:state.user, password:state.pass }));
    };
    state.ws.onclose = () => {
      state.wsAuthed = false;
      if (state.user) setTimeout(connectWS, 3000);
    };
    state.ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'auth-ok')      { state.wsAuthed = true; fetchAllUsers(); chatUI_updateStatus(); return; }
      if (m.type === 'online-users') { state.onlineUsers = m.users || []; fetchAllUsers(); return; }
      if (m.type === 'user-joined')  { pushChatMsg('general', { sys:true, text: m.username + ' joined' }); chatUI_render(); return; }
      if (m.type === 'user-left')    { pushChatMsg('general', { sys:true, text: m.username + ' left' }); chatUI_render(); return; }
      if (m.type === 'history')      {
        const ch = m.channel || 'general';
        if (!state.chatMessages[ch]) state.chatMessages[ch] = [];
        (m.messages || []).forEach(msg => {
          state.chatMessages[ch].push({ user:msg.user, text:msg.text, time:msg.time, self:msg.user===state.user, sys:msg.sys });
        });
        chatUI_render();
        return;
      }
      if (m.type === 'chat') {
        const ch = m.channel||'general';
        pushChatMsg(ch, { user:m.user, text:m.text, time:m.time, self: m.user===state.user });
        if (m.user !== state.user) notifyMsg(ch, m.user, m.text);
        chatUI_render();
        return;
      }
      if (m.type === 'dm') {
        const ch = 'dm:' + (m.from === state.user ? m.to : m.from);
        pushChatMsg(ch, { user:m.from, text:m.text, time:m.time, self: m.from===state.user });
        if (m.from !== state.user) notifyMsg(ch, m.from, m.text);
        chatUI_render();
        return;
      }
    };
  }

  function pushChatMsg(ch, msg) {
    if (!state.chatMessages[ch]) state.chatMessages[ch] = [];
    state.chatMessages[ch].push(msg);
    if (state.chatMessages[ch].length > 500) state.chatMessages[ch].shift();
  }

  // ---------- NOTIFICATIONS ----------
  function notifyMsg(channel, fromUser, text) {
    if (channel !== state.chatChannel || !state.wins.messages || state.wins.messages.style.display === 'none') {
      state.chatUnread[channel] = (state.chatUnread[channel] || 0) + 1;
      updateNotifBadges();
      showToast(fromUser, text.length > 60 ? text.slice(0, 60) + '...' : text, () => {
        RyzOS.openApp('messages');
        switchChannel(channel);
      });
    }
  }

  function updateNotifBadges() {
    // Taskbar badge
    const tbBtn = $('tb-messages');
    if (tbBtn) {
      let old = tbBtn.querySelector('.notif-badge');
      if (old) old.remove();
      const total = Object.values(state.chatUnread).reduce((a, b) => a + b, 0);
      if (total > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.textContent = total > 99 ? '99+' : total;
        tbBtn.appendChild(badge);
      }
    }
    // Sidebar channel badges
    document.querySelectorAll('.chat-ch').forEach(el => {
      let old = el.querySelector('.notif-badge');
      if (old) old.remove();
      const ch = el.dataset.ch;
      if (state.chatUnread[ch] && state.chatUnread[ch] > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.style.position = 'static';
        badge.style.marginLeft = 'auto';
        badge.textContent = state.chatUnread[ch];
        el.appendChild(badge);
      }
    });
    // DM badges
    document.querySelectorAll('.chat-dm').forEach(el => {
      let old = el.querySelector('.notif-badge');
      if (old) old.remove();
      const uname = el.dataset.user || el.textContent.trim();
      const ch = 'dm:' + uname;
      if (state.chatUnread[ch] && state.chatUnread[ch] > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.style.position = 'static';
        badge.style.marginLeft = 'auto';
        badge.textContent = state.chatUnread[ch];
        el.appendChild(badge);
      }
    });
  }

  let toastTimer = null;
  function showToast(title, body, onclick) {
    let t = document.querySelector('.notif-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.className = 'notif-toast';
    t.innerHTML = `<div class="nt-title">${esc(title)}</div><div class="nt-body">${esc(body)}</div>`;
    t.onclick = () => { t.remove(); if (onclick) onclick(); };
    document.body.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (t.parentNode) t.remove(); }, 4000);
  }

  function sendChat() {
    const inp = $('chat-input'); if (!inp) return;
    const text = inp.value.trim(); if (!text) return;
    inp.value = '';
    inp.focus();

    // Handle commands
    if (text.startsWith('/')) {
      handleChatCommand(text);
      return;
    }

    if (!state.ws || !state.wsAuthed) { pushChatMsg(state.chatChannel, { sys:true, text:'Not connected to server.' }); chatUI_render(); return; }
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    if (state.chatChannel.startsWith('dm:')) {
      const to = state.chatChannel.slice(3);
      state.ws.send(JSON.stringify({ type:'dm', to, text, time }));
      pushChatMsg(state.chatChannel, { user:state.user, text, time, self:true });
      chatUI_render();
    } else {
      state.ws.send(JSON.stringify({ type:'chat', channel:state.chatChannel, text, time }));
    }
  }

  function handleChatCommand(text) {
    const parts = text.slice(1).split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        pushChatMsg(state.chatChannel, { sys:true, text:'__HELP__' });
        break;
      case 'channels':
      case 'list':
        pushChatMsg(state.chatChannel, { sys:true, text:'Available channels: ' + [...state.joinedChannels].map(c => '#' + c).join(', ') });
        break;
      case 'join': {
        const ch = (args[0] || '').replace(/^#/, '').toLowerCase();
        if (!ch) { pushChatMsg(state.chatChannel, { sys:true, text:'Usage: /join <channel>' }); break; }
        if (ch.length > 30) { pushChatMsg(state.chatChannel, { sys:true, text:'Channel name too long.' }); break; }
        state.joinedChannels.add(ch);
        switchChannel(ch);
        chatUI_rebuildSidebar();
        pushChatMsg(ch, { sys:true, text:'Joined #' + ch });
        break;
      }
      case 'leave': {
        const ch = (args[0] || '').replace(/^#/, '').toLowerCase() || state.chatChannel;
        if (ch === 'general') { pushChatMsg(state.chatChannel, { sys:true, text:'Cannot leave #general.' }); break; }
        if (ch.startsWith('dm:')) { pushChatMsg(state.chatChannel, { sys:true, text:'Use this for channels, not DMs.' }); break; }
        state.joinedChannels.delete(ch);
        if (state.chatChannel === ch) switchChannel('general');
        chatUI_rebuildSidebar();
        pushChatMsg(state.chatChannel, { sys:true, text:'Left #' + ch });
        break;
      }
      case 'dm': case 'msg': case 'whisper': {
        const to = args[0];
        const msg = args.slice(1).join(' ');
        if (!to || !msg) { pushChatMsg(state.chatChannel, { sys:true, text:'Usage: /dm <user> <message>' }); break; }
        const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        state.ws.send(JSON.stringify({ type:'dm', to, text:msg, time }));
        const ch = 'dm:' + to;
        pushChatMsg(ch, { user:state.user, text:msg, time, self:true });
        switchChannel(ch);
        break;
      }
      case 'online': case 'users': case 'who':
        pushChatMsg(state.chatChannel, { sys:true, text:'Online: ' + (state.onlineUsers.length ? state.onlineUsers.join(', ') : 'No one else online') });
        break;
      case 'clear':
        state.chatMessages[state.chatChannel] = [];
        break;
      case 'nick':
        pushChatMsg(state.chatChannel, { sys:true, text:'Nicknames not supported. Your username is: ' + state.user });
        break;
      default:
        pushChatMsg(state.chatChannel, { sys:true, text:'Unknown command: /' + cmd + '. Type /help for a list of commands.' });
    }
    chatUI_render();
  }

  function switchChannel(ch) {
    state.chatChannel = ch;
    state.chatUnread[ch] = 0;
    updateNotifBadges();
    chatUI_render();
    chatUI_updateSidebar();
    setTimeout(() => { const inp = $('chat-input'); if (inp) inp.focus(); }, 50);
  }

  // ---------- CHAT UI HELPERS ----------
  function chatUI_updateStatus() {
    const el = $('chat-status'); if (!el) return;
    el.textContent = state.wsAuthed ? '● Connected' : '○ Connecting...';
    el.style.color = state.wsAuthed ? 'var(--success)' : 'var(--text-muted)';
  }

  function chatUI_updateUsers() {
    const list = $('chat-user-list'); if (!list) return;
    list.innerHTML = '';
    const allUsers = state.allUsers || [];
    const onlineSet = new Set(state.onlineUsers || []);
    // Sort: online first, then alphabetical
    const sorted = allUsers
      .filter(u => u.username !== state.user)
      .sort((a, b) => {
        const aOn = onlineSet.has(a.username) ? 0 : 1;
        const bOn = onlineSet.has(b.username) ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        return a.username.localeCompare(b.username);
      });
    sorted.forEach(u => {
      const isOnline = onlineSet.has(u.username);
      const d = document.createElement('div');
      d.className = 'chat-dm' + (state.chatChannel === 'dm:'+u.username ? ' active' : '');
      d.dataset.user = u.username;
      d.innerHTML = `<span class="dm-dot${isOnline ? ' online' : ''}"></span>${esc(u.username)}`;
      d.onclick = () => switchChannel('dm:'+u.username);
      list.appendChild(d);
    });
  }

  function chatUI_updateSidebar() {
    document.querySelectorAll('.chat-ch').forEach(el => {
      el.classList.toggle('active', el.dataset.ch === state.chatChannel);
    });
    document.querySelectorAll('.chat-dm').forEach(el => {
      const u = el.dataset.user || el.textContent.trim();
      el.classList.toggle('active', state.chatChannel === 'dm:'+u);
    });
    const hdr = $('chat-ch-header');
    if (hdr) {
      if (state.chatChannel.startsWith('dm:')) hdr.textContent = '💬 ' + state.chatChannel.slice(3);
      else hdr.textContent = '# ' + state.chatChannel;
    }
  }

  function chatUI_render() {
    const log = $('chat-log'); if (!log) return;
    const msgs = state.chatMessages[state.chatChannel] || [];
    log.innerHTML = '';
    msgs.forEach(m => {
      if (m.sys) {
        if (m.text === '__HELP__') {
          const d = document.createElement('div');
          d.className = 'chat-help';
          d.innerHTML = `<b>Chat Commands</b><br>
            <b>/help</b> — Show this help<br>
            <b>/channels</b> — List your channels<br>
            <b>/join #name</b> — Join or create a channel<br>
            <b>/leave #name</b> — Leave a channel<br>
            <b>/dm user message</b> — Send a direct message<br>
            <b>/online</b> — List online users<br>
            <b>/clear</b> — Clear chat history in current view`;
          log.appendChild(d);
        } else {
          const d = document.createElement('div');
          d.className = 'chat-sys'; d.textContent = m.text;
          log.appendChild(d);
        }
      } else {
        const d = document.createElement('div');
        d.className = 'chat-msg ' + (m.self ? 'self' : 'other');
        d.innerHTML = (m.self ? '' : `<div class="msg-author">${esc(m.user||'')}</div>`) +
          esc(m.text||'') + `<div class="msg-time">${esc(m.time||'')}</div>`;
        log.appendChild(d);
      }
    });
    log.scrollTop = log.scrollHeight;
    chatUI_updateSidebar();
    chatUI_updateUsers();
    chatUI_updateStatus();
  }

  function chatUI_rebuildSidebar() {
    const list = document.querySelector('.chat-channel-list'); if (!list) return;
    list.innerHTML = '';
    state.joinedChannels.forEach(ch => {
      const d = document.createElement('div');
      d.className = 'chat-ch' + (state.chatChannel === ch ? ' active' : '');
      d.dataset.ch = ch;
      d.onclick = () => switchChannel(ch);
      d.innerHTML = `<span class="ch-hash">#</span> ${esc(ch)}`;
      list.appendChild(d);
    });
    updateNotifBadges();
  }

  // Expose public API
  RyzOS.connectWS = connectWS;
  RyzOS.sendChat = sendChat;
  RyzOS.switchChannel = switchChannel;
})();
