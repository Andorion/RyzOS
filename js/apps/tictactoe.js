// ============================================================
//  App: Tic-Tac-Toe
// ============================================================
(function() {
  const { $ } = RyzOS._internal;
  let tttBoard = null, tttOver = false;

  RyzOS.registerApp({
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    icon: '⭕',
    w: 320, h: 400,
    init(body) {
      tttBoard=Array(9).fill('');tttOver=false;
      body.innerHTML = `<div class="game-center">
        <div class="ttt-status" id="ttt-status">Your turn (X)</div>
        <div class="ttt-grid" id="ttt-grid"></div>
        <button class="game-btn" onclick="RyzOS._initTTT()">New Game</button>
      </div>`;
      renderTTT();
    }
  });

  function renderTTT() {
    const g=$('ttt-grid');if(!g)return;g.innerHTML='';
    tttBoard.forEach((v,i)=>{const b=document.createElement('button');b.className='ttt-cell';b.textContent=v;b.style.color=v==='X'?'#5ea8ff':'#ff6b6b';b.onclick=()=>tttPlay(i);g.appendChild(b);});
  }

  function tttPlay(i) {
    if(tttOver||tttBoard[i])return;tttBoard[i]='X';
    if(tttWin('X')){tttEnd('You win! 🎉');return;}if(tttBoard.every(c=>c)){tttEnd("Draw!");return;}
    const empty=tttBoard.map((v,i)=>v===''?i:-1).filter(i=>i>=0);let ai=-1;
    for(const e of empty){tttBoard[e]='O';if(tttWin('O'))ai=e;tttBoard[e]='';if(ai>=0)break;}
    if(ai<0)for(const e of empty){tttBoard[e]='X';if(tttWin('X'))ai=e;tttBoard[e]='';if(ai>=0)break;}
    if(ai<0&&tttBoard[4]==='')ai=4;
    if(ai<0)ai=empty[Math.random()*empty.length|0];
    tttBoard[ai]='O';
    if(tttWin('O')){tttEnd('Computer wins! 💻');return;}if(tttBoard.every(c=>c)){tttEnd("Draw!");return;}
    renderTTT();$('ttt-status').textContent='Your turn (X)';
  }

  function tttWin(p){return[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(([a,b,c])=>tttBoard[a]===p&&tttBoard[b]===p&&tttBoard[c]===p);}
  function tttEnd(msg){tttOver=true;renderTTT();$('ttt-status').textContent=msg;}

  RyzOS._initTTT = function() { tttBoard=Array(9).fill('');tttOver=false;$('ttt-status').textContent='Your turn (X)';renderTTT(); };
})();
