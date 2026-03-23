// ============================================================
//  App: Terminal
// ============================================================
(function() {
  const { state, $, getNode, fs } = RyzOS._internal;
  let termCwd = '~';

  RyzOS.registerApp({
    id: 'terminal',
    name: 'Terminal',
    icon: '⬛',
    w: 560, h: 380,
    init(body) {
      body.innerHTML = `<div class="terminal">
        <div class="term-output" id="term-out">RyzOS Terminal v1.0\nType "help" for commands.\n\n</div>
        <div class="term-input-row">
          <span class="term-prompt" id="term-prompt">${state.user}@ryzos:${termCwd}$ </span>
          <input class="term-input" id="term-input" autocomplete="off" spellcheck="false">
        </div>
      </div>`;
      const inp = $('term-input');
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); termExec(); }
      });
      body.addEventListener('click', () => inp.focus());
      setTimeout(() => inp.focus(), 100);
    }
  });

  function termPrint(t) { const o=$('term-out'); if(o){o.textContent+=t+'\n'; o.scrollTop=o.scrollHeight;} }

  function termExec() {
    const inp = $('term-input'); if(!inp) return;
    const cmd = inp.value; inp.value = '';
    termPrint(`${state.user}@ryzos:${termCwd}$ ${cmd}`);
    if (!cmd.trim()) return;
    const parts = cmd.trim().split(/\s+/);
    const c = parts[0].toLowerCase(), args = parts.slice(1);
    switch(c) {
      case 'help': termPrint('Commands: help, echo, clear, ls, cd, cat, mkdir, touch, rm, pwd, date, whoami, uname, cowsay, fortune, neofetch, matrix'); break;
      case 'echo': termPrint(args.join(' ')); break;
      case 'clear': $('term-out').textContent = ''; break;
      case 'pwd': termPrint(termCwd); break;
      case 'whoami': termPrint(state.user); break;
      case 'date': termPrint(new Date().toString()); break;
      case 'uname': termPrint(`RyzOS ${RyzOS._internal.version.version} x86_64 RyzKernel`); break;
      case 'ls': {
        const n = getNode(termCwd);
        if (n&&n.t==='d') { const k=Object.keys(n.c); termPrint(k.length ? k.map(x => n.c[x].t==='d' ? x+'/' : x).join('  ') : '(empty)'); }
        else termPrint('Not a directory');
        break;
      }
      case 'cd': {
        const tgt = args[0]||'~';
        if (tgt==='~') { termCwd='~'; }
        else if (tgt==='..') { const p=termCwd.split('/'); if(p.length>1){p.pop();termCwd=p.join('/')||'~';} }
        else { const n=getNode(termCwd); if(n&&n.t==='d'&&n.c[tgt]&&n.c[tgt].t==='d') termCwd=termCwd==='~'?'~/'+tgt:termCwd+'/'+tgt; else termPrint(`cd: ${tgt}: No such directory`); }
        $('term-prompt').textContent = `${state.user}@ryzos:${termCwd}$ `;
        break;
      }
      case 'cat': {
        if(!args[0]){termPrint('cat: missing file');break;}
        const n=getNode(termCwd);
        if(n&&n.t==='d'&&n.c[args[0]]&&n.c[args[0]].t==='f') termPrint(n.c[args[0]].data);
        else termPrint(`cat: ${args[0]}: No such file`);
        break;
      }
      case 'mkdir': {
        if(!args[0]){termPrint('mkdir: missing name');break;}
        const n=getNode(termCwd);
        if(n&&n.t==='d') { if(n.c[args[0]]) termPrint(`mkdir: ${args[0]}: Already exists`); else { n.c[args[0]]={t:'d',c:{}}; termPrint(`Created directory: ${args[0]}`); } }
        break;
      }
      case 'touch': {
        if(!args[0]){termPrint('touch: missing name');break;}
        const n=getNode(termCwd);
        if(n&&n.t==='d') { if(!n.c[args[0]]) n.c[args[0]]={t:'f',data:''}; termPrint(`Touched: ${args[0]}`); }
        break;
      }
      case 'rm': {
        if(!args[0]){termPrint('rm: missing name');break;}
        const n=getNode(termCwd);
        if(n&&n.t==='d'&&n.c[args[0]]) { delete n.c[args[0]]; termPrint(`Removed: ${args[0]}`); }
        else termPrint(`rm: ${args[0]}: No such file`);
        break;
      }
      case 'cowsay': {
        const msg=args.join(' ')||'Moo!'; const b='-'.repeat(msg.length+2);
        termPrint(` ${b}\n< ${msg} >\n ${b}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`);
        break;
      }
      case 'fortune': {
        const f=['You will have a great day!','Your code will compile on the first try.','A bug will reveal itself soon.','Today is a good day to try something new.','The cake is a lie.','There are 10 types of people in the world.'];
        termPrint(f[Math.random()*f.length|0]);
        break;
      }
      case 'neofetch':
        termPrint(`  💠 RyzOS ${RyzOS._internal.version.version} (build ${RyzOS._internal.version.build})\n  ━━━━━━━━━━━━━━━\n  User: ${state.user}\n  Shell: RyzTerm 1.0\n  Resolution: ${innerWidth}x${innerHeight}\n  Theme: ${document.body.classList.contains('light-mode')?'Light':'Dark'}\n  Uptime: Since login`);
        break;
      case 'matrix': {
        termPrint('Entering the Matrix...');
        let lines=10;
        const iv=setInterval(()=>{
          if(lines--<=0){clearInterval(iv);termPrint('...exited.');return;}
          let l='';for(let i=0;i<40;i++)l+=String.fromCharCode(0x30A0+Math.random()*96);
          termPrint(l);
        },150);
        break;
      }
      default: termPrint(`${c}: command not found. Type "help" for commands.`);
    }
  }
})();
