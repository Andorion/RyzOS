// ============================================================
//  App: 2048
// ============================================================
(function() {
  const { $ } = RyzOS._internal;
  let g2048 = null;

  RyzOS.registerApp({
    id: 'game2048',
    name: '2048',
    icon: '🔢',
    w: 340, h: 420,
    init(body) {
      body.innerHTML = `<div class="game-center" tabindex="0" id="g2048-wrap">
        <div class="g2048-score" id="g2048-score">Score: 0</div>
        <div class="g2048-grid" id="g2048-grid"></div>
        <button class="game-btn" onclick="RyzOS._start2048()">New Game</button>
        <div class="g2048-hint">Arrow keys to play</div>
      </div>`;
      start2048();
      const wrap=$('g2048-wrap');
      wrap.addEventListener('keydown', handle2048);
      wrap.focus();
    }
  });

  // Cleanup on close
  RyzOS._onAppClose = (function(prev) {
    return function(id) {
      if (prev) prev(id);
      if (id === 'game2048') g2048 = null;
    };
  })(RyzOS._onAppClose);

  function start2048(){g2048={grid:Array.from({length:4},()=>Array(4).fill(0)),score:0};addTile();addTile();render();}
  function addTile(){const e=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(g2048.grid[r][c]===0)e.push([r,c]);if(!e.length)return;const[r,c]=e[Math.random()*e.length|0];g2048.grid[r][c]=Math.random()<.9?2:4;}
  function render(){
    if(!g2048)return;const el=$('g2048-grid');if(!el)return;el.innerHTML='';
    const colors={0:'rgba(255,255,255,.04)',2:'#3d3d5c',4:'#4a4a6a',8:'#e2885a',16:'#e87040',32:'#ea5a3a',64:'#ea3a1a',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){const v=g2048.grid[r][c];const d=document.createElement('div');d.className='g2048-cell';d.style.background=colors[v]||'#3c3a32';d.style.color=v<=4?'rgba(255,255,255,.5)':'#fff';d.textContent=v||'';el.appendChild(d);}
    $('g2048-score').textContent=`Score: ${g2048.score}`;
  }
  function handle2048(e){
    if(!g2048)return;let moved=false;
    switch(e.key){case 'ArrowUp':moved=move('up');break;case 'ArrowDown':moved=move('down');break;case 'ArrowLeft':moved=move('left');break;case 'ArrowRight':moved=move('right');break;default:return;}
    e.preventDefault();
    if(moved){addTile();render();if(isOver())$('g2048-score').textContent=`Game Over! Score: ${g2048.score}`;}
  }
  function move(dir){
    const gr=g2048.grid;let moved=false;
    function slide(a){let f=a.filter(v=>v);for(let i=0;i<f.length-1;i++)if(f[i]===f[i+1]){f[i]*=2;g2048.score+=f[i];f.splice(i+1,1);}while(f.length<4)f.push(0);return f;}
    if(dir==='left')for(let r=0;r<4;r++){const row=slide(gr[r]);if(row.join()!==gr[r].join())moved=true;gr[r]=row;}
    else if(dir==='right')for(let r=0;r<4;r++){const row=slide([...gr[r]].reverse()).reverse();if(row.join()!==gr[r].join())moved=true;gr[r]=row;}
    else if(dir==='up')for(let c=0;c<4;c++){let col=[gr[0][c],gr[1][c],gr[2][c],gr[3][c]];const nc=slide(col);if(nc.join()!==col.join())moved=true;for(let r=0;r<4;r++)gr[r][c]=nc[r];}
    else if(dir==='down')for(let c=0;c<4;c++){let col=[gr[0][c],gr[1][c],gr[2][c],gr[3][c]].reverse();const nc=slide(col).reverse();const orig=[gr[0][c],gr[1][c],gr[2][c],gr[3][c]];if(nc.join()!==orig.join())moved=true;for(let r=0;r<4;r++)gr[r][c]=nc[r];}
    return moved;
  }
  function isOver(){const g=g2048.grid;for(let r=0;r<4;r++)for(let c=0;c<4;c++){if(g[r][c]===0)return false;if(c<3&&g[r][c]===g[r][c+1])return false;if(r<3&&g[r][c]===g[r+1][c])return false;}return true;}

  RyzOS._start2048 = start2048;
})();
