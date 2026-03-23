// ============================================================
//  App: Paint
// ============================================================
(function() {
  const { $ } = RyzOS._internal;
  let paintDrawing = false, paintColor = '#ffffff', paintSize = 4, paintTool = 'brush';

  RyzOS.registerApp({
    id: 'paint',
    name: 'Paint',
    icon: '🎨',
    w: 640, h: 480,
    init(body) {
      body.innerHTML = `<div class="paint-app">
        <div class="paint-toolbar">
          <button class="active" id="pb-brush" onclick="RyzOS._setPaintTool('brush',this)">🖌️ Brush</button>
          <button id="pb-eraser" onclick="RyzOS._setPaintTool('eraser',this)">🧹 Eraser</button>
          <label>Color:</label><input type="color" value="#ffffff" onchange="RyzOS._setPaintColor(this.value)">
          <label>Size:</label><input type="range" min="1" max="30" value="4" oninput="RyzOS._setPaintSize(+this.value)">
          <button onclick="RyzOS._paintClear()">🗑️ Clear</button>
          <button onclick="RyzOS._paintSave()">💾 Save</button>
        </div>
        <div class="paint-canvas-wrap"><canvas id="paint-canvas"></canvas></div>
      </div>`;
      resizePaintCanvas();
      const canvas = $('paint-canvas');
      canvas.addEventListener('mousedown', e => { paintDrawing=true; paintDraw(e); });
      canvas.addEventListener('mousemove', e => { if(paintDrawing) paintDraw(e); });
      canvas.addEventListener('mouseup', () => { paintDrawing=false; canvas.getContext('2d').beginPath(); });
      canvas.addEventListener('mouseleave', () => { paintDrawing=false; canvas.getContext('2d').beginPath(); });
    }
  });

  function resizePaintCanvas() {
    const canvas = $('paint-canvas'); if (!canvas) return;
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      const old = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,w,h);
      ctx.putImageData(old,0,0);
    }
  }

  function paintDraw(e) {
    const c=$('paint-canvas'); if(!c) return;
    const ctx=c.getContext('2d'), r=c.getBoundingClientRect();
    const x=(e.clientX-r.left)*(c.width/r.width), y=(e.clientY-r.top)*(c.height/r.height);
    ctx.lineWidth=paintSize; ctx.lineCap='round';
    ctx.strokeStyle = paintTool==='eraser' ? '#1a1a2e' : paintColor;
    ctx.lineTo(x,y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x,y);
  }

  // Expose for window resize callback and toolbar buttons
  RyzOS._resizePaintCanvas = resizePaintCanvas;
  RyzOS._setPaintTool = function(t,btn) { paintTool=t; document.querySelectorAll('.paint-toolbar button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); };
  RyzOS._setPaintColor = function(c) { paintColor=c; };
  RyzOS._setPaintSize = function(s) { paintSize=s; };
  RyzOS._paintClear = function() { const c=$('paint-canvas'); if(!c) return; const ctx=c.getContext('2d'); ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,c.width,c.height); };
  RyzOS._paintSave = function() { const c=$('paint-canvas'); if(!c) return; const a=document.createElement('a'); a.download='painting.png'; a.href=c.toDataURL(); a.click(); };
})();
