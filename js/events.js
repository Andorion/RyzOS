// ============================================================
//  RyzOS — Global event listeners
// ============================================================
(function() {
  const { state, $ } = RyzOS._internal;

  document.addEventListener('keydown', e => {
    if ($('login-screen').style.display !== 'none' && e.key === 'Enter') RyzOS.login();
    if (e.key === 'Escape' && state.startOpen) RyzOS.closeStart();
  });

  document.addEventListener('click', e => {
    if (state.startOpen && !e.target.closest('#start-menu') && !e.target.closest('#start-btn')) RyzOS.closeStart();
    if (!e.target.closest('#ctx-menu')) $('ctx-menu').style.display = 'none';
  });

  document.addEventListener('contextmenu', e => RyzOS.showCtx(e));
})();
