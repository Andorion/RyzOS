// ============================================================
//  RyzOS — Start menu
// ============================================================
(function() {
  const { state, $, APPS } = RyzOS._internal;

  function buildStartMenu() {
    const g = $('start-grid'); g.innerHTML = '';
    APPS.forEach(a => {
      const d = document.createElement('div');
      d.className = 'start-app'; d.dataset.name = a.name.toLowerCase();
      d.onclick = () => { RyzOS.openApp(a.id); closeStart(); };
      d.innerHTML = `<div class="sa-icon">${a.icon}</div><div class="sa-label">${a.name}</div>`;
      g.appendChild(d);
    });
  }

  function toggleStart() { state.startOpen ? closeStart() : openStart(); }

  function openStart() {
    $('start-menu').style.display = 'flex';
    state.startOpen = true;
    $('start-search').value = '';
    filterStart('');
    $('start-search').focus();
  }

  function closeStart() {
    $('start-menu').style.display = 'none';
    state.startOpen = false;
  }

  function filterStart(q) {
    q = q.toLowerCase();
    document.querySelectorAll('.start-app').forEach(el => {
      el.style.display = el.dataset.name.includes(q) ? '' : 'none';
    });
  }

  RyzOS.buildStartMenu = buildStartMenu;
  RyzOS.toggleStart = toggleStart;
  RyzOS.openStart = openStart;
  RyzOS.closeStart = closeStart;
  RyzOS.filterStart = filterStart;
})();
