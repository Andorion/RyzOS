// ============================================================
//  App: Weather
// ============================================================
(function() {
  RyzOS.registerApp({
    id: 'weather',
    name: 'Weather',
    icon: '🌤️',
    w: 360, h: 360,
    desktop: false,
    init(body) {
      const conds = [
        {icon:'☀️',temp:72,desc:'Sunny',hum:35,wind:8},
        {icon:'⛅',temp:65,desc:'Partly Cloudy',hum:55,wind:12},
        {icon:'🌧️',temp:58,desc:'Rainy',hum:80,wind:18},
        {icon:'❄️',temp:28,desc:'Snowy',hum:70,wind:15},
        {icon:'🌤️',temp:78,desc:'Clear Skies',hum:30,wind:5},
      ];
      const w = conds[Math.random()*conds.length|0];
      body.innerHTML = `<div class="weather-app">
        <div class="weather-icon">${w.icon}</div>
        <div class="weather-temp">${w.temp}°F</div>
        <div class="weather-desc">${w.desc}</div>
        <div class="weather-loc">RyzCity, RC</div>
        <div class="weather-details">
          <div class="wd-item"><div class="wd-label">Humidity</div><div class="wd-value">${w.hum}%</div></div>
          <div class="wd-item"><div class="wd-label">Wind</div><div class="wd-value">${w.wind} mph</div></div>
          <div class="wd-item"><div class="wd-label">Feels Like</div><div class="wd-value">${w.temp-2}°F</div></div>
        </div>
      </div>`;
    }
  });
})();
