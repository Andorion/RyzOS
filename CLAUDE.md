# RyzOS — Claude Code Project Guide

## What is this?
RyzOS is a web-based desktop operating system built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools. It runs in a browser and provides a complete desktop experience with apps, games, and real-time multi-user chat.

## How to run
```bash
node server.js
# Then open http://localhost:8080
```

## Architecture

### No build tools
Everything is plain HTML, CSS, and JS loaded via `<script>` and `<link>` tags in `index.html`. No webpack, no bundler, no transpiler.

### File structure
```
index.html          — HTML shell + script/link tags (no inline code)
server.js           — Node.js backend (HTTP + WebSocket)
css/                — Stylesheets split by concern
  reset.css         — Box-sizing, font reset
  theme.css         — CSS variables for dark/light mode
  login.css         — Login screen
  boot.css          — Boot animation
  desktop.css       — Desktop & icons
  taskbar.css       — Taskbar & system tray
  start-menu.css    — Start menu
  context-menu.css  — Right-click menu
  window.css        — Window chrome (header, controls, resize)
  notifications.css — Toast notifications & badges
  scrollbar.css     — Custom scrollbar
  apps/             — Per-app styles
js/
  core.js           — RyzOS namespace, shared state, helpers, app registry, filesystem
  auth.js           — Login, boot, logout
  desktop.js        — Desktop icons, wallpaper
  start-menu.js     — Start menu build/toggle/filter
  window-manager.js — Open/close/focus windows, drag/resize
  context-menu.js   — Right-click context menu
  clock.js          — System clock
  websocket.js      — WebSocket client, chat logic, notifications
  events.js         — Global keyboard/click event listeners
  apps/             — One file per app (self-registering)
```

### Key pattern: Self-registering apps
Every app file calls `RyzOS.registerApp()` to add itself to the OS. Example:

```javascript
// js/apps/myapp.js
(function() {
  const { $, esc } = RyzOS._internal;

  RyzOS.registerApp({
    id: 'myapp',
    name: 'My App',
    icon: '🌈',
    w: 400, h: 300,
    desktop: true,        // show on desktop (default: true)
    init(body) {
      body.innerHTML = `<h1>Hello!</h1>`;
    }
  });

  // Expose onclick handlers as RyzOS._myappDoThing = function() { ... };
})();
```

To add a new app:
1. Create `css/apps/myapp.css` for styles
2. Create `js/apps/myapp.js` with the registerApp call
3. Add `<link>` and `<script>` tags to `index.html`

### Shared state & helpers
All shared state lives in `RyzOS._internal.state`. Key properties:
- `state.user` / `state.pass` — Current user credentials
- `state.ws` / `state.wsAuthed` — WebSocket connection
- `state.wins` — Map of open windows (appId → DOM element)
- `state.chatChannel`, `state.chatMessages`, `state.onlineUsers` — Chat state

Helpers available via `RyzOS._internal`:
- `$(id)` — `document.getElementById`
- `esc(s)` — HTML-escape a string
- `getNode(path)` — Navigate virtual filesystem
- `fs` — The virtual filesystem tree
- `APPS` — Array of registered app definitions
- `DESKTOP_IDS` — Array of app IDs shown on desktop

### Loading order
`core.js` must load first. Then OS modules (they attach to `RyzOS`). Then app files (order doesn't matter).

### Server
`server.js` is a simple HTTP + WebSocket server:
- Serves static files from project root
- REST: `POST /api/create-user`, `POST /api/login`
- WebSocket: auth, channel chat, direct messages
- All data is in-memory (no database)

## Conventions
- All app state is private (closure variables inside IIFEs)
- Public functions attached to `RyzOS` object (e.g., `RyzOS.openApp`)
- App-internal functions prefixed with underscore (e.g., `RyzOS._calcClear`)
- HTML templates use inline onclick handlers referencing `RyzOS.*`
- CSS classes are app-namespaced (e.g., `.calc-display`, `.snake-score`)
