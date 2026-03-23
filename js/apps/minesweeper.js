// ============================================================
//  App: Minesweeper
// ============================================================
(function() {
  const { $ } = RyzOS._internal;
  let minesState = null;

  RyzOS.registerApp({
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    w: 380, h: 460,
    init(body) {
      body.innerHTML = `<div class="game-center">
        <div class="mines-header">
          <span id="mines-flags">💣 10</span>
          <button class="game-btn" onclick="RyzOS._startMines()" style="padding:4px 14px;font-size:12px">New Game</button>
          <span id="mines-status">Click to start</span>
        </div>
        <div class="mines-grid" id="mines-grid"></div>
        <div class="mines-hint">Left click: reveal | Right click: flag</div>
      </div>`;
      startMines();
    }
  });

  function startMines() {
    const R=10,C=10,M=10, grid=[];
    for(let r=0;r<R;r++){grid[r]=[];for(let c=0;c<C;c++)grid[r][c]={mine:false,rev:false,flag:false,cnt:0};}
    let placed=0;while(placed<M){const r=Math.random()*R|0,c=Math.random()*C|0;if(!grid[r][c].mine){grid[r][c].mine=true;placed++;}}
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){if(grid[r][c].mine)continue;let n=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<R&&nc>=0&&nc<C&&grid[nr][nc].mine)n++;}grid[r][c].cnt=n;}
    minesState={grid,R,C,M,flags:0,over:false,won:false};
    renderMines();
  }

  function renderMines() {
    const s=minesState, g=$('mines-grid'); if(!g) return;
    g.style.gridTemplateColumns = `repeat(${s.C},28px)`;
    g.innerHTML = '';
    for(let r=0;r<s.R;r++)for(let c=0;c<s.C;c++){
      const cell=s.grid[r][c], btn=document.createElement('button');
      btn.className='mine-cell';
      if(cell.rev){btn.classList.add('revealed');if(cell.mine){btn.classList.add('mine');btn.textContent='💣';}
        else if(cell.cnt>0){btn.textContent=cell.cnt;btn.style.color=['','#5ea8ff','#2ed573','#ff4757','#a29bfe','#fd79a8','#00cec9','#636e72','#2d3436'][cell.cnt]||'#fff';}}
      else if(cell.flag){btn.classList.add('flagged');btn.textContent='🚩';}
      btn.onclick=()=>minesReveal(r,c);
      btn.oncontextmenu=e=>{e.preventDefault();minesFlag(r,c);};
      g.appendChild(btn);
    }
    const fl=$('mines-flags');if(fl)fl.textContent=`💣 ${s.M-s.flags}`;
    const st=$('mines-status');if(st){if(s.over)st.textContent=s.won?'🎉 You Win!':'💥 Game Over!';else st.textContent='Playing...';}
  }

  function minesReveal(r,c) {
    const s=minesState;if(!s||s.over)return;const cell=s.grid[r][c];if(cell.rev||cell.flag)return;cell.rev=true;
    if(cell.mine){s.over=true;s.won=false;for(let rr=0;rr<s.R;rr++)for(let cc=0;cc<s.C;cc++)if(s.grid[rr][cc].mine)s.grid[rr][cc].rev=true;renderMines();return;}
    if(cell.cnt===0)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<s.R&&nc>=0&&nc<s.C)minesReveal(nr,nc);}
    let unrev=0;for(let rr=0;rr<s.R;rr++)for(let cc=0;cc<s.C;cc++)if(!s.grid[rr][cc].rev)unrev++;
    if(unrev===s.M){s.over=true;s.won=true;}
    renderMines();
  }

  function minesFlag(r,c) {
    const s=minesState;if(!s||s.over)return;const cell=s.grid[r][c];if(cell.rev)return;
    cell.flag=!cell.flag;s.flags+=cell.flag?1:-1;renderMines();
  }

  RyzOS._startMines = startMines;
})();
