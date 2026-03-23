// ============================================================
//  App: Notes
// ============================================================
(function() {
  const { $, esc } = RyzOS._internal;
  let notesContent = '';

  RyzOS.registerApp({
    id: 'notes',
    name: 'Notes',
    icon: '📝',
    w: 450, h: 380,
    init(body) {
      body.innerHTML = `<div class="notes-app">
        <div class="notes-toolbar">
          <button onclick="RyzOS._notesSave()">💾 Save</button>
          <button onclick="RyzOS._notesClear()">🗑️ Clear</button>
        </div>
        <textarea id="notes-area" placeholder="Start typing your notes...">${esc(notesContent)}</textarea>
      </div>`;
      $('notes-area').addEventListener('input', function() { notesContent = this.value; });
    }
  });

  RyzOS._notesSave = function() {
    const t = $('notes-area')?.value || '';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t],{type:'text/plain'}));
    a.download = 'notes.txt'; a.click();
  };
  RyzOS._notesClear = function() {
    const a = $('notes-area'); if (a) { a.value = ''; notesContent = ''; }
  };
})();
