// ============================================================
//  RyzOS — Login, boot, logout
//
//  Two-phase login flow:
//
//  PHASE 1 — Username only:
//    User enters username, clicks Next. Client calls /api/check-user.
//    No password <input> in the DOM yet, so Chrome can't autofill it.
//
//  PHASE 2a — Password (existing user):
//    Password <input> is injected into the form. Chrome may now
//    autofill if it recognizes the username — that's fine.
//    User clicks Sign In → /api/login.
//
//  PHASE 2b — Set password (first-time user):
//    Login form removed, fresh set-password form created dynamically.
//    Chrome sees autocomplete=new-password and offers to save.
// ============================================================
(function() {
  const { state, $ } = RyzOS._internal;
  let pendingUsername = null;
  let setpassForm = null; // dynamically created form element
  let phase = 1; // 1 = username, 2 = password

  function setErr(m) { $('login-error').textContent = m || ''; }

  // ---- Form submit: route based on current phase ----
  RyzOS._loginFormSubmit = function(e) {
    e.preventDefault();
    if (phase === 1) checkUser();
    else doLogin();
    return false;
  };

  // ---- Phase 1: check if user exists and what they need ----
  async function checkUser() {
    const u = $('login-user').value.trim();
    if (!u) { setErr('Please enter a username.'); return; }
    try {
      const r = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      });
      const d = await r.json();

      if (!d.exists) {
        setErr('User not found.');
        return;
      }

      pendingUsername = u;

      // User exists but has no password — go to set-password flow
      if (d.needsPassword) {
        showSetPasswordForm(u);
        return;
      }

      // User exists and has a password — show password field
      showPasswordField(d.hasHint);
    } catch { setErr('Server not reachable.'); }
  }

  // ---- Transition to phase 2: inject password field ----
  function showPasswordField(hasHint) {
    phase = 2;
    const form = $('login-form');
    const btn = $('login-submit-btn');

    // Lock the username field
    const userInput = $('login-user');
    userInput.readOnly = true;
    userInput.classList.add('locked');

    // Create and inject password input before the button
    const passInput = document.createElement('input');
    passInput.id = 'login-pass';
    passInput.name = 'password';
    passInput.type = 'password';
    passInput.autocomplete = 'current-password';
    passInput.placeholder = 'Password';
    passInput.className = 'login-phase2-reveal';
    form.insertBefore(passInput, btn);

    // Change button text
    btn.textContent = 'Sign In';

    // Show hint link if available
    if (hasHint) $('login-hint-link').style.display = 'inline';

    // Add back link
    let backLink = $('login-back-link');
    if (!backLink) {
      backLink = document.createElement('a');
      backLink.id = 'login-back-link';
      backLink.href = '#';
      backLink.textContent = 'Back';
      backLink.onclick = function() { resetToUsername(); return false; };
      $('login-links').appendChild(backLink);
    }

    setErr('');
    // Focus after brief delay so the animation plays and Chrome can process
    setTimeout(() => passInput.focus(), 80);
  }

  // ---- Phase 2: submit login with username + password ----
  async function doLogin() {
    const u = $('login-user').value.trim();
    const p = $('login-pass').value;
    if (!u) { setErr('Please enter a username.'); return; }
    if (!p) { setErr('Please enter your password.'); return; }
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await r.json();

      if (!d.ok) {
        setErr(d.error || 'Login failed.');
        if (d.hasHint) $('login-hint-link').style.display = 'inline';
        pendingUsername = u;
        return;
      }

      // Success — let Chrome process the form submit before navigating away
      state.user = u;
      state.pass = p;
      state.role = d.role;
      setTimeout(() => boot(), 80);
    } catch { setErr('Server not reachable.'); }
  }

  // ---- Show dynamically-created set-password form ----
  function showSetPasswordForm(username) {
    const box = $('login-box');

    // 1. Clear login form values so Chrome can't read them
    $('login-user').value = '';

    // 2. Remove login form from DOM entirely
    const loginForm = $('login-form');
    loginForm.remove();

    // 3. Create fresh set-password form
    setpassForm = document.createElement('form');
    setpassForm.id = 'login-setpass-form';
    setpassForm.action = '/api/set-password';
    setpassForm.method = 'POST';
    setpassForm.className = 'login-setpass-form';
    setpassForm.addEventListener('submit', (e) => {
      e.preventDefault();
      setNewPassword();
    });

    setpassForm.innerHTML = `
      <div class="login-subtitle">Welcome, ${username}!</div>
      <div class="login-info">Set up your password to get started.</div>
      <input name="username" type="text" autocomplete="username" value="${username}" readonly class="locked" tabindex="-1">
      <input id="login-newpass" name="password" type="password" autocomplete="new-password" placeholder="Choose a password">
      <input id="login-newpass2" type="password" autocomplete="new-password" placeholder="Confirm password">
      <input id="login-hint" type="text" autocomplete="off" placeholder="Password hint (optional)">
      <button type="submit" class="btn-login btn-full">Create Password</button>
      <div class="login-links">
        <a href="#" onclick="RyzOS.loginBack();return false">Back</a>
      </div>
    `;

    // 4. Insert before error div
    box.insertBefore(setpassForm, $('login-error'));
    setErr('');

    // 5. Focus the first password field after a delay (let Chrome scan the new form)
    setTimeout(() => $('login-newpass').focus(), 150);
  }

  // ---- Set password (first-time user) ----
  async function setNewPassword() {
    const p1 = $('login-newpass').value.trim();
    const p2 = $('login-newpass2').value.trim();
    const hint = $('login-hint').value.trim();
    if (!p1) { setErr('Please choose a password.'); return; }
    if (p1.length < 3) { setErr('Password too short (min 3 characters).'); return; }
    if (p1 !== p2) { setErr('Passwords don\'t match.'); return; }
    try {
      const r = await fetch('/api/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pendingUsername, password: p1, hint }),
      });
      const d = await r.json();
      if (!d.ok) { setErr(d.error || 'Failed.'); return; }
      state.user = pendingUsername;
      state.pass = p1;
      state.role = d.role;
      // Small delay so Chrome processes the submit and prompts to save
      setTimeout(() => boot(), 80);
    } catch { setErr('Server not reachable.'); }
  }

  // ---- Show password hint ----
  RyzOS.loginShowHint = async function() {
    try {
      const r = await fetch('/api/get-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pendingUsername }),
      });
      const d = await r.json();
      const box = $('login-hint-box');
      box.textContent = d.hint || 'No hint available.';
      box.classList.add('visible');
    } catch { setErr('Server not reachable.'); }
  };

  // ---- Back / reset to username step ----
  function resetToUsername() {
    pendingUsername = null;
    phase = 1;
    const box = $('login-box');
    const errDiv = $('login-error');

    // Remove dynamic set-password form if it exists
    if (setpassForm) {
      setpassForm.remove();
      setpassForm = null;
    }

    // Re-create login form if it was removed
    if (!$('login-form')) {
      const form = document.createElement('form');
      form.id = 'login-form';
      form.action = '/api/login';
      form.method = 'POST';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        RyzOS._loginFormSubmit(e);
      });
      form.innerHTML = `
        <div class="login-subtitle" id="login-subtitle">Sign In</div>
        <input id="login-user" name="username" type="text" autocomplete="username" placeholder="Username" autofocus>
        <button type="submit" class="btn-login btn-full" id="login-submit-btn">Next</button>
        <div id="login-links" class="login-links">
          <a href="#" id="login-hint-link" onclick="RyzOS.loginShowHint();return false">Forgot password?</a>
        </div>
        <div id="login-hint-box" class="login-hint"></div>
      `;
      box.insertBefore(form, errDiv);
    } else {
      // Form exists but may be in phase 2 — remove password field, unlock username
      const passInput = $('login-pass');
      if (passInput) passInput.remove();

      const userInput = $('login-user');
      userInput.readOnly = false;
      userInput.classList.remove('locked');

      $('login-submit-btn').textContent = 'Next';
      $('login-hint-link').style.display = 'none';

      const backLink = $('login-back-link');
      if (backLink) backLink.remove();
    }

    // Reset state
    $('login-user').value = '';
    $('login-hint-link').style.display = 'none';
    const hintBox = $('login-hint-box');
    if (hintBox) hintBox.classList.remove('visible');
    setErr('');
    setTimeout(() => $('login-user').focus(), 50);
  }

  RyzOS.loginBack = resetToUsername;

  // ---- Boot sequence ----
  function boot() {
    $('login-screen').style.display = 'none';
    const b = $('boot-screen');
    b.style.display = 'flex';
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

  // ---- Logout ----
  function logout() {
    if (state.ws) state.ws.close();
    state.ws = null; state.wsAuthed = false;
    state.user = null; state.pass = null; state.role = null;
    Object.keys(state.wins).forEach(RyzOS.closeApp);
    $('taskbar-apps').innerHTML = '';
    $('desktop').style.display = 'none';
    $('taskbar').style.display = 'none';
    RyzOS.closeStart();
    $('login-screen').style.display = 'flex';
    resetToUsername();
    state.chatChannel = 'general';
    Object.keys(state.chatMessages).forEach(k => delete state.chatMessages[k]);
    state.onlineUsers = [];
    state.allUsers = [];
  }

  // Expose public API
  RyzOS.loginCheckUser = checkUser;
  RyzOS.loginSubmit = doLogin;
  RyzOS.loginSetPassword = setNewPassword;
  RyzOS.login = checkUser;
  RyzOS.logout = logout;
})();
