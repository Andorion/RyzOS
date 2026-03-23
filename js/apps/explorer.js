// ============================================================
//  App: File Explorer
// ============================================================
(function() {
  const { $, esc, getNode } = RyzOS._internal;
  let explorerPath = '~';

  RyzOS.registerApp({
    id: 'explorer',
    name: 'Files',
    icon: '📁',
    w: 520, h: 400,
    init(body) {
      explorerPath = '~';
      renderExplorer(body);
    }
  });

  function renderExplorer(body) {
    if (!body) body = $('body-explorer');
    if (!body) return;
    const node = getNode(explorerPath);
    const items = [];
    if (explorerPath !== '~') items.push({ icon:'📁', name:'..', type:'up' });
    if (node && node.t === 'd') {
      Object.keys(node.c).sort((a,b) => {
        if (node.c[a].t !== node.c[b].t) return node.c[a].t === 'd' ? -1 : 1;
        return a.localeCompare(b);
      }).forEach(name => {
        const child = node.c[name];
        items.push({
          icon: child.t === 'd' ? '📁' : '📄',
          name,
          type: child.t === 'd' ? 'folder' : 'file',
          size: child.t === 'f' ? (child.data||'').length + ' B' : '',
        });
      });
    }
    const count = items.filter(i=>i.type!=='up').length;
    body.innerHTML = `<div class="explorer">
      <div class="explorer-toolbar">
        <button onclick="RyzOS._explorerUp()">⬆️</button>
        <button onclick="RyzOS._explorerRefresh()">🔄</button>
        <input class="explorer-path" value="${esc(explorerPath)}" readonly>
      </div>
      <div class="explorer-list" id="explorer-list"></div>
      <div class="explorer-status">${count} item${count!==1?'s':''}</div>
    </div>`;
    const list = $('explorer-list');
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'explorer-item';
      d.innerHTML = `<span class="ei-icon">${it.icon}</span><span class="ei-name">${esc(it.name)}</span><span class="ei-size">${it.size||''}</span>`;
      d.ondblclick = () => {
        if (it.type === 'up') { explorerUp(); }
        else if (it.type === 'folder') {
          explorerPath = explorerPath === '~' ? '~/'+it.name : explorerPath+'/'+it.name;
          renderExplorer();
        }
      };
      list.appendChild(d);
    });
  }

  function explorerUp() {
    if (explorerPath === '~') return;
    const parts = explorerPath.split('/'); parts.pop();
    explorerPath = parts.join('/') || '~';
    renderExplorer();
  }

  RyzOS._explorerUp = explorerUp;
  RyzOS._explorerRefresh = function() { renderExplorer(); };
})();
