// ============================================================
//  RyzOS — System clock
// ============================================================
(function() {
  const { $ } = RyzOS._internal;

  function tickClock() {
    const el = $('sys-clock');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    setTimeout(tickClock, 10000);
  }

  RyzOS.tickClock = tickClock;
})();
