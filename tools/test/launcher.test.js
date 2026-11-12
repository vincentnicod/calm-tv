// Launcher logic that CI checks without a browser (app/src/js/calm.js run with stand-ins): the weather over the scene, its pause under Live
// TV and while Home is hidden, its refresh while Home stays on screen, and the hidden System panel (0 three times, what its rows say).
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

run(async () => {
  const timers = [],
    attrs = {},
    classes = {},
    layers = {};
  const box = {
    setAttribute: (k, v) => (attrs[k] = v),
    getAttribute: k => attrs[k],
    classList: { toggle: (c, on) => (classes[c] = !!on) },
    querySelector: s => layers[s] || (layers[s] = { style: {} }),
  };
  const c = {
    TXL: {},
    t: k => k,
    $: id => (id === 'wx' ? box : null),
    document: { addEventListener() {}, hidden: false, body: { classList: { toggle() {} } } },
    setInterval: fn => timers.push(fn),
    window: {},
    cfg: { weather: 'lausanne' },
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', 'js', 'calm.js'), 'utf8'), c);

  // the weather codes (WMO) and their looks
  const kinds = [0, 1, 2, 3, 45, 48, 51, 57, 61, 67, 80, 82, 71, 77, 85, 86, 95, 99].map(c.weatherKind).join();
  ok(
    kinds === ',,partly,cloudy,fog,fog,drizzle,drizzle,rain,rain,rain,rain,snow,snow,snow,snow,storm,storm',
    'each weather code has its look: ' + kinds
  );

  // the scene shows the look; the textures come from the page's own drawing (here: ready-made)
  c.wxTex = { cloudy: 'url(c)', partly: 'url(p)', rain: 'url(r)', snow: 'url(s)', drizzle: 'url(d)', storm: 'url(t)' };
  c.scene.name = 'lac';
  c.weatherNow = { city: 'lausanne', temp: 6, code: 63, day: true };
  c.weatherScene();
  ok(attrs['data-wx'] === 'rain' && layers['.wx-fall'].style.backgroundImage === 'url(r)', 'rain: the falling layer gets the rain');
  ok(classes.off === false, 'the weather is shown while Home is on screen');
  c.LIVE = { on: true };
  c.window.LIVE = c.LIVE;
  c.weatherShown();
  ok(classes.off === true, 'nothing is drawn while Live TV plays over the scene');
  c.LIVE.on = false;
  c.document.hidden = true;
  c.weatherShown();
  ok(classes.off === true, 'nor while Home is not on screen');
  c.document.hidden = false;
  c.cfg.weather = 'off';
  c.weatherScene();
  ok(attrs['data-wx'] === '', 'nothing over the scene when the weather is off');
  c.cfg.weather = 'lausanne';
  c.scene.name = '';
  c.weatherScene();
  ok(attrs['data-wx'] === '', 'nor in a style without a scene');

  // Home left on screen asks for the weather on its 20-second timer (refreshWeather keeps to once every 10 minutes itself)
  let asked = 0;
  c.refreshWeather = () => asked++;
  c.idleCheck = c.nightCheck = c.sceneCheck = () => {};
  timers.forEach(fn => fn());
  ok(asked === 1, 'the weather is checked again while Home stays on screen');
  c.document.hidden = true;
  timers.forEach(fn => fn());
  ok(asked === 1, 'but not while Home is hidden');

  // the hidden System panel: 0 three times
  let opened = 0;
  c.systemPanel = () => opened++;
  ok(c.zeroKey(48) && c.zeroKey(96) && opened === 0, 'one or two presses of 0 do nothing');
  c.zeroKey(48);
  ok(opened === 1 && c.zeroKey(49) === false, 'the third opens the System panel; other keys are left to the dock');
  const rows = c
    .systemRows({
      mem: { total: 2030392, used: 1582332, available: 448060 },
      swap: { total: 0, used: 0 },
      cpu: { use: 13, cores: 3 },
      load: [],
      uptime: 18336,
      top: [{ name: 'com.webos.app.inputcommon', kb: 274432, cpu: 0, count: 5 }],
    })
    .map(r => r.label + ': ' + r.sub);
  ok(
    rows.join(' | ') ===
      'Memory used: 1.51 GB of 1.94 GB · 78 % | Free for apps: 438 MB | Swap: none | Processor: 13 % · 3 cores | Up for: 5 h 5 min | ' +
        'com.webos.app.inputcommon ×5: 268 MB',
    'the rows of the System panel: ' + rows.join(' | ')
  );
  const hw = c
    .systemRows({
      mem: { total: 1, used: 1, available: 0 },
      swap: { total: 0, used: 0 },
      cpu: { use: 1, cores: 4 },
      load: [],
      uptime: 60,
      top: [],
      temp: 47,
      wifi: { signal: -54, quality: 80 },
      net: { iface: 'wlan0', down: 2048, up: 90 },
      storage: { free: 4194304, total: 6291456 },
      flash: 20,
      panel: { hours: 4769, refreshIn: 1231, failures: 0 },
    })
    .slice(5)
    .map(r => r.label + ': ' + r.sub);
  ok(
    hw.join(' | ') ===
      'Chip temperature: 47 °C | Network: Wi-Fi -54 dBm · ↓ 2.0 MB/s · ↑ 90 kB/s | Storage: 4.00 GB free · wear ≤ 20 % | ' +
        'Panel: 4769 h · Pixel Refresher in 1231 h',
    'the hardware rows, where the TV gives them: ' + hw.join(' | ')
  );
});
