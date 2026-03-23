// ============================================================
//  App: Snake
// ============================================================
(function() {
  const { $ } = RyzOS._internal;
  let snakeInterval = null, snakeState = null;

  RyzOS.registerApp({
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    w: 380, h: 440,
    init(body) {
      body.innerHTML = `<div class="game-center">
        <div class="snake-score" id="snake-score">Score: 0</div>
        <canvas id="snake-canvas" width="300" height="300" style="border:2px solid rgba(255,255,255,.2);border-radius:4px;background:#111;"></canvas>
        <div class="snake-hint">Arrow keys or WASD to move</div>
        <button class="game-btn" onclick="RyzOS._startSnake()">Start Game</button>
      </div>`;
    }
  });

  // Cleanup on close
  RyzOS._onAppClose = (function(prev) {
    return function(id) {
      if (prev) prev(id);
      if (id === 'snake' && snakeInterval) { clearInterval(snakeInterval); snakeInterval = null; }
    };
  })(RyzOS._onAppClose);

  RyzOS._startSnake = function() {
    if (snakeInterval) clearInterval(snakeInterval);
    const canvas=$('snake-canvas'); if(!canvas) return;
    const ctx=canvas.getContext('2d'), gs=15, cols=canvas.width/gs, rows=canvas.height/gs;
    snakeState = { snake:[{x:10,y:10},{x:9,y:10},{x:8,y:10}], dir:{x:1,y:0}, nextDir:{x:1,y:0},
      food:{x:Math.random()*cols|0,y:Math.random()*rows|0}, score:0, alive:true };
    if (canvas._kh) document.removeEventListener('keydown', canvas._kh);
    const kh = e => {
      if (!snakeState||!snakeState.alive) return;
      const s=snakeState;
      switch(e.key) {
        case 'ArrowUp':case 'w':case 'W': if(s.dir.y!==1)s.nextDir={x:0,y:-1}; e.preventDefault(); break;
        case 'ArrowDown':case 's':case 'S': if(s.dir.y!==-1)s.nextDir={x:0,y:1}; e.preventDefault(); break;
        case 'ArrowLeft':case 'a':case 'A': if(s.dir.x!==1)s.nextDir={x:-1,y:0}; e.preventDefault(); break;
        case 'ArrowRight':case 'd':case 'D': if(s.dir.x!==-1)s.nextDir={x:1,y:0}; e.preventDefault(); break;
      }
    };
    canvas._kh = kh; document.addEventListener('keydown', kh);
    snakeInterval = setInterval(() => {
      if(!snakeState||!snakeState.alive){clearInterval(snakeInterval);return;}
      const s=snakeState; s.dir=s.nextDir;
      const head={x:s.snake[0].x+s.dir.x,y:s.snake[0].y+s.dir.y};
      if(head.x<0||head.x>=cols||head.y<0||head.y>=rows) s.alive=false;
      if(s.snake.some(p=>p.x===head.x&&p.y===head.y)) s.alive=false;
      if(!s.alive){document.removeEventListener('keydown',kh);drawSnake(ctx,s,gs,cols,rows);$('snake-score').textContent=`Game Over! Score: ${s.score}`;return;}
      s.snake.unshift(head);
      if(head.x===s.food.x&&head.y===s.food.y){s.score+=10;s.food={x:Math.random()*cols|0,y:Math.random()*rows|0};}else s.snake.pop();
      drawSnake(ctx,s,gs,cols,rows);
      $('snake-score').textContent = `Score: ${s.score}`;
    }, 120);
  };

  function drawSnake(ctx,s,gs,cols,rows) {
    ctx.fillStyle='#111';ctx.fillRect(0,0,cols*gs,rows*gs);
    ctx.fillStyle='#ff4757';ctx.beginPath();ctx.arc(s.food.x*gs+gs/2,s.food.y*gs+gs/2,gs/2-1,0,Math.PI*2);ctx.fill();
    s.snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#2ed573':'#7bed9f';ctx.fillRect(p.x*gs+1,p.y*gs+1,gs-2,gs-2);});
  }
})();
