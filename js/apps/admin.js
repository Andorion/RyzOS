// ============================================================
//  App: Admin Panel — role-based account & user management
// ============================================================
(function() {
  const { state, $, esc } = RyzOS._internal;

  RyzOS.registerApp({
    id: 'admin',
    name: 'Admin',
    icon: '🛡️',
    w: 500, h: 480,
    desktop: true,
    init(body) {
      const role = state.role || 'user';
      const isAdmin = role === 'admin' || role === 'superuser';
      const isSuper = role === 'superuser';

      let html = `<div class="admin-app"><div class="admin-tabs">`;
      html += `<button class="admin-tab active" onclick="RyzOS._adminTab('account')">My Account</button>`;
      if (isAdmin) html += `<button class="admin-tab" onclick="RyzOS._adminTab('users')">User Management</button>`;
      html += `</div>`;

      // --- Tab: My Account (all users) ---
      html += `<div class="admin-panel" id="admin-panel-account">
        <h3>Change Password</h3>
        <div class="admin-field"><label>Current Password</label><input type="password" id="admin-cur-pass"></div>
        <div class="admin-field"><label>New Password</label><input type="password" id="admin-new-pass"></div>
        <div class="admin-field"><label>Confirm New Password</label><input type="password" id="admin-new-pass2"></div>
        <div class="admin-field"><label>Password Hint (optional)</label><input type="text" id="admin-new-hint"></div>
        <button class="admin-btn" onclick="RyzOS._adminChangePass()">Update Password</button>
        <div id="admin-pass-msg" class="admin-msg"></div>
        <div class="admin-info">
          <span class="admin-role-badge admin-role-${role}">${role}</span>
          Logged in as <strong>${esc(state.user)}</strong>
        </div>
      </div>`;

      // --- Tab: User Management (admin + superuser) ---
      if (isAdmin) {
        html += `<div class="admin-panel" id="admin-panel-users" style="display:none">
          <div class="admin-toolbar">
            <h3>Users</h3>
            <button class="admin-btn admin-btn-sm" onclick="RyzOS._adminShowCreate()">+ New User</button>
          </div>
          <div id="admin-create-row" class="admin-create-row" style="display:none">
            <input type="text" id="admin-create-name" placeholder="Username" class="admin-inline-input">
            <button class="admin-btn admin-btn-sm" onclick="RyzOS._adminCreateUser()">Create</button>
            <button class="admin-btn-ghost" onclick="document.getElementById('admin-create-row').style.display='none'">Cancel</button>
            <div id="admin-create-msg" class="admin-msg"></div>
          </div>
          <div id="admin-user-list" class="admin-user-list">Loading...</div>
        </div>`;
      }

      html += `</div>`;
      body.innerHTML = html;

      if (isAdmin) RyzOS._adminLoadUsers();
    }
  });

  // --- Tab switching ---
  RyzOS._adminTab = function(tab) {
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    const panel = $('admin-panel-' + tab);
    if (panel) panel.style.display = 'block';
    const tabs = document.querySelectorAll('.admin-tab');
    const tabNames = ['account', 'users'];
    const idx = tabNames.indexOf(tab);
    if (tabs[idx]) tabs[idx].classList.add('active');
    if (tab === 'users') RyzOS._adminLoadUsers();
  };

  // --- Change password ---
  RyzOS._adminChangePass = async function() {
    const cur = $('admin-cur-pass').value.trim();
    const np = $('admin-new-pass').value.trim();
    const np2 = $('admin-new-pass2').value.trim();
    const hint = $('admin-new-hint').value.trim();
    const msg = $('admin-pass-msg');
    if (!cur || !np) { msg.textContent = 'Fill in all fields.'; msg.className = 'admin-msg err'; return; }
    if (np.length < 3) { msg.textContent = 'New password too short (min 3).'; msg.className = 'admin-msg err'; return; }
    if (np !== np2) { msg.textContent = 'Passwords don\'t match.'; msg.className = 'admin-msg err'; return; }
    try {
      const r = await fetch('/api/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:state.user,currentPassword:cur,newPassword:np,hint}) });
      const d = await r.json();
      if (d.ok) {
        state.pass = np;
        msg.textContent = 'Password updated!'; msg.className = 'admin-msg ok';
        $('admin-cur-pass').value = ''; $('admin-new-pass').value = ''; $('admin-new-pass2').value = ''; $('admin-new-hint').value = '';
      } else { msg.textContent = d.error || 'Failed.'; msg.className = 'admin-msg err'; }
    } catch { msg.textContent = 'Server error.'; msg.className = 'admin-msg err'; }
  };

  // --- API helper ---
  function adminApi(url, data) {
    data._caller = state.user;
    data._callerPass = state.pass;
    return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(r => r.json());
  }

  // --- Show create user row ---
  RyzOS._adminShowCreate = function() {
    const row = $('admin-create-row');
    row.style.display = 'flex';
    $('admin-create-name').value = '';
    $('admin-create-msg').textContent = '';
    setTimeout(() => {
      const inp = $('admin-create-name');
      inp.focus();
      // Enter key to create
      if (!inp._hasKeyHandler) {
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); RyzOS._adminCreateUser(); } });
        inp._hasKeyHandler = true;
      }
    }, 50);
  };

  // --- Create user ---
  RyzOS._adminCreateUser = async function() {
    const inp = $('admin-create-name');
    const name = inp.value.trim();
    const msg = $('admin-create-msg');
    if (!name) { msg.textContent = 'Username required.'; msg.className = 'admin-msg err'; return; }
    try {
      const d = await adminApi('/api/admin/create-user', { username: name });
      if (d.ok) {
        msg.textContent = `"${name}" created!`; msg.className = 'admin-msg ok';
        inp.value = '';
        inp.focus();
        RyzOS._adminLoadUsers();
      } else { msg.textContent = d.error || 'Failed.'; msg.className = 'admin-msg err'; }
    } catch { msg.textContent = 'Server error.'; msg.className = 'admin-msg err'; }
  };

  // --- Load user list ---
  RyzOS._adminLoadUsers = async function() {
    const list = $('admin-user-list');
    if (!list) return;
    const isSuper = state.role === 'superuser';
    try {
      const d = await adminApi('/api/admin/list-users', {});
      if (!d.ok) { list.innerHTML = `<div class="admin-msg err">${esc(d.error||'Failed')}</div>`; return; }
      if (!d.users.length) { list.innerHTML = '<em>No users.</em>'; return; }
      list.innerHTML = d.users.map(u => {
        const isSelf = u.username === state.user;
        const badge = `<span class="admin-role-badge admin-role-${u.role}">${u.role}</span>`;
        const pwStatus = u.hasPassword ? '🔒' : '<span class="admin-pw-pending">awaiting setup</span>';
        const canEdit = !isSelf && u.role !== 'superuser';
        let actions = '';
        if (canEdit) {
          if (isSuper) {
            const nextRole = u.role === 'admin' ? 'user' : 'admin';
            actions += `<button class="admin-sm-btn" onclick="RyzOS._adminToggleRole('${esc(u.username)}','${u.role}')" title="Make ${nextRole}">👑</button>`;
            actions += `<button class="admin-sm-btn" onclick="RyzOS._adminResetPw('${esc(u.username)}')" title="Reset password">🔄</button>`;
          }
          actions += `<button class="admin-sm-btn" onclick="RyzOS._adminStartRename('${esc(u.username)}')" title="Rename">✏️</button>`;
          if (isSuper) {
            actions += `<button class="admin-sm-btn danger" onclick="RyzOS._adminDeleteUser('${esc(u.username)}')" title="Delete">🗑️</button>`;
          }
        }
        return `<div class="admin-user-row" id="admin-row-${esc(u.username)}">
          <div class="admin-user-info">
            <strong>${esc(u.username)}</strong> ${badge} <span class="admin-pw-status">${pwStatus}</span>
          </div>
          <div class="admin-user-actions">${actions}</div>
        </div>`;
      }).join('');
    } catch { list.innerHTML = '<div class="admin-msg err">Server error.</div>'; }
  };

  // --- Inline rename ---
  RyzOS._adminStartRename = function(username) {
    const row = $('admin-row-' + username);
    if (!row) return;
    row.innerHTML = `
      <div class="admin-rename-inline">
        <input type="text" id="admin-rename-input" class="admin-inline-input" value="${esc(username)}" placeholder="New name">
        <button class="admin-btn admin-btn-sm" onclick="RyzOS._adminDoRename('${esc(username)}')">Save</button>
        <button class="admin-btn-ghost" onclick="RyzOS._adminLoadUsers()">Cancel</button>
      </div>
    `;
    const inp = $('admin-rename-input');
    inp.focus();
    inp.select();
  };

  RyzOS._adminDoRename = async function(oldName) {
    const newName = ($('admin-rename-input') || {}).value?.trim();
    if (!newName || newName === oldName) { RyzOS._adminLoadUsers(); return; }
    try {
      const d = await adminApi('/api/admin/rename-user', { oldName, newName });
      if (!d.ok) alert(d.error || 'Rename failed.');
      RyzOS._adminLoadUsers();
    } catch { alert('Server error.'); }
  };

  // --- Toggle role (superuser) ---
  RyzOS._adminToggleRole = async function(username, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await adminApi('/api/admin/change-role', { username, role: newRole });
      RyzOS._adminLoadUsers();
    } catch {}
  };

  // --- Reset password (superuser) ---
  RyzOS._adminResetPw = async function(username) {
    if (!confirm(`Reset password for "${username}"? They will need to set a new password on next login.`)) return;
    try {
      await adminApi('/api/admin/reset-password', { username });
      RyzOS._adminLoadUsers();
    } catch {}
  };

  // --- Delete user (superuser) ---
  RyzOS._adminDeleteUser = async function(username) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await adminApi('/api/admin/delete-user', { username });
      RyzOS._adminLoadUsers();
    } catch {}
  };
})();
