// ============================================================
//  App: Calculator
// ============================================================
(function() {
  const { $ } = RyzOS._internal;
  let calcDisp = '0', calcPrev = null, calcOp = null, calcReset = false;

  function upd() { const e = $('calc-disp'); if (e) e.textContent = calcDisp; }

  RyzOS.registerApp({
    id: 'calculator',
    name: 'Calculator',
    icon: '🧮',
    w: 320, h: 460,
    init(body) {
      body.innerHTML = `<div class="calc-display" id="calc-disp">${calcDisp}</div>
        <div class="calc-grid">
          <button class="calc-btn clear" onclick="RyzOS._calcClear()">C</button>
          <button class="calc-btn op" onclick="RyzOS._calcIn('±')">±</button>
          <button class="calc-btn op" onclick="RyzOS._calcIn('%')">%</button>
          <button class="calc-btn op" onclick="RyzOS._calcOp('/')">÷</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('7')">7</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('8')">8</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('9')">9</button>
          <button class="calc-btn op" onclick="RyzOS._calcOp('*')">×</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('4')">4</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('5')">5</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('6')">6</button>
          <button class="calc-btn op" onclick="RyzOS._calcOp('-')">−</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('1')">1</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('2')">2</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('3')">3</button>
          <button class="calc-btn op" onclick="RyzOS._calcOp('+')">+</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('0')" style="grid-column:span 2">0</button>
          <button class="calc-btn" onclick="RyzOS._calcIn('.')">.</button>
          <button class="calc-btn eq" onclick="RyzOS._calcEq()">=</button>
        </div>`;
    }
  });

  RyzOS._calcClear = function() { calcDisp='0'; calcPrev=null; calcOp=null; calcReset=false; upd(); };
  RyzOS._calcIn = function(v) {
    if (v==='±') { calcDisp = String(-parseFloat(calcDisp)); upd(); return; }
    if (v==='%') { calcDisp = String(parseFloat(calcDisp)/100); upd(); return; }
    if (calcReset) { calcDisp='0'; calcReset=false; }
    if (v==='.' && calcDisp.includes('.')) return;
    calcDisp = calcDisp==='0' && v!=='.' ? v : calcDisp+v;
    upd();
  };
  RyzOS._calcOp = function(op) { calcPrev = parseFloat(calcDisp); calcOp = op; calcReset = true; };
  RyzOS._calcEq = function() {
    if (calcOp===null||calcPrev===null) return;
    const c = parseFloat(calcDisp); let r;
    switch(calcOp) {
      case '+': r=calcPrev+c; break; case '-': r=calcPrev-c; break;
      case '*': r=calcPrev*c; break; case '/': r=c===0?'Error':calcPrev/c; break;
    }
    calcDisp=String(r); calcOp=null; calcPrev=null; calcReset=true; upd();
  };
})();
