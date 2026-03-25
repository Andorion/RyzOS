// ============================================================
//  App: Messages (chat client)
// ============================================================
(function() {
  const { $, esc } = RyzOS._internal;

  RyzOS.registerApp({
    id: 'messages',
    name: 'Messages',
    icon: '💬',
    w: 580, h: 440,
    init(body) {
      body.innerHTML = `<div class="chat-app">
        <div class="chat-sidebar">
          <h4>Channels</h4>
          <div class="chat-channel-list">
            <div class="chat-ch active" data-ch="general" onclick="RyzOS.switchChannel('general')"><span class="ch-hash">#</span> general</div>
            <div class="chat-ch" data-ch="random" onclick="RyzOS.switchChannel('random')"><span class="ch-hash">#</span> random</div>
            <div class="chat-ch" data-ch="games" onclick="RyzOS.switchChannel('games')"><span class="ch-hash">#</span> games</div>
          </div>
          <h4>Users</h4>
          <div class="chat-user-list" id="chat-user-list"></div>
        </div>
        <div class="chat-main">
          <div class="chat-header"><span id="chat-ch-header"># general</span><span id="chat-status" style="margin-left:auto;font-size:11px;"></span></div>
          <div class="chat-messages" id="chat-log"></div>
          <div class="chat-input-row">
            <input id="chat-input" placeholder="Type a message..." autocomplete="off">
            <button onclick="RyzOS.sendChat()">Send</button>
          </div>
        </div>
      </div>`;
      $('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); RyzOS.sendChat(); } });
      // Trigger UI refresh
      RyzOS.switchChannel(RyzOS._internal.state.chatChannel);
    }
  });
})();
