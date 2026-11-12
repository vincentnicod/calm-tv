// The hidden System panel's readings (system.js): memory, processor and the processes that use the most, from a stand-in for /proc
// written in the formats of an LG C4 (webOS 25).
const fs = require('fs'),
  path = require('path');
const { ok, call, req, run } = require('./lib');

run(async () => {
  const proc = process.env.CYTV_PROC;
  const write = (f, s) => {
    const p = path.join(proc, f);
    path
      .relative(proc, path.dirname(p))
      .split(path.sep)
      .filter(Boolean)
      .reduce((d, part) => {
        const n = path.join(d, part);
        if (!fs.existsSync(n)) fs.mkdirSync(n);
        return n;
      }, proc);
    fs.writeFileSync(p, s);
  };
  write(
    'meminfo',
    'MemTotal:        2030392 kB\nMemFree:           38500 kB\nMemAvailable:     448060 kB\nSwapTotal:        614396 kB\nSwapFree:         255224 kB\n'
  );
  write('loadavg', '1.21 0.98 0.80 2/411 9999\n');
  write('uptime', '7319.48 100.00\n');
  const stat = (busy, idle) => 'cpu  ' + busy + ' 0 0 ' + idle + ' 0 0 0 0 0 0\ncpu0 1 0 0 1 0 0 0 0 0 0\ncpu1 1 0 0 1 0 0 0 0 0 0\n';
  const pstat = (pid, comm, u, s) => pid + ' (' + comm + ') S 1 1 1 0 -1 0 0 0 0 0 ' + u + ' ' + s + ' 0 0 20 0 11 0 2613 0 0\n';
  write('stat', stat(1000, 9000));
  write('100/stat', pstat(100, 'node', 50, 50));
  write('100/statm', '41826 8105 2775 5072 0 24646 0\n');
  write('100/cmdline', 'node\0/media/developer/cleanyourtv/helper.js\0');
  write('200/stat', pstat(200, 'WebAppMgr', 300, 100));
  write('200/statm', '90000 35000 0 0 0 0 0\n');
  write('200/cmdline', '/usr/bin/WebAppMgr\0--type=renderer\0--webos-appid\0app-id=youtube.leanback.v4\0');
  write('210/stat', pstat(210, 'com.webos.app.i', 10, 0));
  write('210/statm', '1000 20000 0 0 0 0 0\n');
  write('210/cmdline', '/usr/bin/com.webos.app.inputcommon\0{"event":"launch"}\0');
  write('211/stat', pstat(211, 'com.webos.app.i', 10, 0));
  write('211/statm', '1000 10000 0 0 0 0 0\n');
  write('211/cmdline', '/usr/bin/com.webos.app.inputcommon\0{"event":"launch"}\0');
  write('300/stat', pstat(300, 'kworker/0:1', 5, 5));
  write('300/statm', '0 0 0 0 0 0 0\n');
  write('300/cmdline', '');

  const apps = { apps: async () => [{ id: 'youtube.leanback.v4', title: 'YouTube' }] };
  // the hardware readings: a TV without their sources gives none of them
  let dfOut = '';
  const sys0 = req('system').create({ feature: () => null, run: async () => ({ out: dfOut }) });
  let r0 = (await call(sys0, '/api/system')).j;
  ok(
    r0.temp === undefined &&
      r0.wifi === undefined &&
      r0.net === undefined &&
      r0.storage === undefined &&
      r0.flash === undefined &&
      r0.panel === undefined,
    'a TV without the hardware sources: no temperature, network, storage or panel readings, and no error'
  );
  write('lg/pm/temperature', '47\n');
  write(
    'net/wireless',
    'Inter-| sta-|   Quality        |   Discarded packets\n face | tus | link level noise |  nwid\n wlan0: 0000   56.  -54.  -256        0\n'
  );
  const dev = (rx, tx) =>
    'Inter-|   Receive  |  Transmit\n face |bytes\n    lo: 500 5 0 0 0 0 0 0 500 5 0 0 0 0 0 0\n wlan0: ' +
    rx +
    ' 9 0 0 0 0 0 0 ' +
    tx +
    ' 9 0 0 0 0 0 0\n';
  write('net/dev', dev(1000000, 500000));
  const sysDir = path.join(path.dirname(proc), 'sys'),
    pn = path.join(path.dirname(proc), 'pnwash');
  process.env.CYTV_SYS = sysDir;
  process.env.CYTV_PNWASH = pn;
  for (const d of [sysDir, sysDir + '/block', sysDir + '/block/mmcblk0', sysDir + '/block/mmcblk0/device', pn]) fs.mkdirSync(d);
  fs.writeFileSync(sysDir + '/block/mmcblk0/device/life_time', '0x01 0x02\n');
  const pw = {
    autoOffRsLastTime: '4767',
    autoJbLastTime: '4000',
    autoJbInterval: '2000 ok',
    completedOffRsCount: '812',
    completedJbCount: '2',
    failAlertCount: '0',
  };
  Object.keys(pw).forEach(k => fs.writeFileSync(pn + '/' + k, pw[k] + '\n'));
  delete require.cache[require.resolve(path.join(__dirname, '..', '..', 'helper', 'paths.js'))];
  delete require.cache[require.resolve(path.join(__dirname, '..', '..', 'helper', 'oled.js'))];
  delete require.cache[require.resolve(path.join(__dirname, '..', '..', 'helper', 'system.js'))];
  let lunaAsked = 0;
  const oled = req('oled').create({ luna: async () => (lunaAsked++, { returnValue: true, panelUsageTime: 28614 }) });
  dfOut = 'Filesystem 1K-blocks Used Available Use% Mounted on\n/dev/mmcblk0p59 6291456 2097152 4194304 33% /mnt/lg/appstore\n';
  const sys1 = req('system').create({ feature: n => (n === 'oled' ? oled : null), run: async () => ({ out: dfOut }) });
  r0 = (await call(sys1, '/api/system')).j;
  ok(r0.temp === 47 && r0.wifi.signal === -54 && r0.wifi.quality === 80, "the chip's temperature in degrees, the Wi-Fi signal in dBm");
  ok(
    r0.storage.free === 4194304 && r0.storage.total === 6291456 && r0.flash === 20,
    'free storage, and the worse of the two flash wear steps as a percentage'
  );
  ok(
    r0.panel.hours === 4769 &&
      r0.panel.refreshIn === 2000 - 769 &&
      r0.panel.shortCount === 812 &&
      r0.panel.refreshCount === 2 &&
      r0.panel.failures === 0,
    'the panel: hours from the 10-minute counter, hours left before the next Pixel Refresher, the cycles done'
  );
  ok(r0.net === undefined, 'no network speed from a single reading');
  write('net/dev', dev(1000000 + 2048000, 500000 + 102400));
  await new Promise(res => setTimeout(res, 1000));
  r0 = (await call(sys1, '/api/system')).j;
  ok(
    r0.net.iface === 'wlan0' && r0.net.down > 1000 && r0.net.down <= 2000 && r0.net.up > 50 && r0.net.up <= 100,
    'the speed since the last reading, in kB/s'
  );
  ok(lunaAsked === 1, 'the panel counters are asked at most once a minute');
  const om = req('oled');
  ok(Object.keys(om.figures(null, {})).length === 0, 'an LCD TV: no panel readings');
  ok(
    om.figures(600, { autoJbLastTime: 500, autoJbInterval: 2000 }).refreshIn === undefined,
    'a counter behind its last run gives no countdown'
  );
  const sm0 = req('system');
  ok(
    sm0.temperature('') === null && sm0.temperature('0') === null && sm0.flashWear('0x00 0x00') === null && sm0.wireless('') === null,
    'unreadable sources give nothing'
  );
  for (const f of ['lg/pm/temperature', 'net/wireless', 'net/dev']) fs.unlinkSync(path.join(proc, f));

  const sys = req('system').create({ feature: n => (n === 'apps' ? apps : null), run: async () => ({ out: '' }) });
  let r = await call(sys, '/api/system');
  ok(
    r.j.mem.total === 2030392 && r.j.mem.available === 448060 && r.j.mem.used === 2030392 - 448060,
    'memory: used is what is not available to apps (MemAvailable), in kB'
  );
  ok(r.j.swap.total === 614396 && r.j.swap.used === 614396 - 255224, 'swap: total and used');
  ok(
    r.j.cpu.cores === 2 && r.j.cpu.use === 0 && r.j.load.join() === '1.21,0.98,0.8' && r.j.uptime === 7319,
    'cores, load average and uptime'
  );
  ok(
    r.j.top.map(p => p.name + ' ' + p.kb + ' x' + p.count).join() ===
      'YouTube 140000 x1,com.webos.app.inputcommon 120000 x2,Calm TV service 32420 x1',
    'the processes by memory: a web app by its name, a cut name by its program, one name together, no kernel threads'
  );

  // a second reading soon after: the shares of the processor since the first
  write('stat', stat(1000 + 300, 9000 + 700));
  write('200/stat', pstat(200, 'WebAppMgr', 300 + 150, 100 + 50));
  write('100/stat', pstat(100, 'node', 50 + 10, 50));
  r = await call(sys, '/api/system');
  const yt = r.j.top.filter(p => p.name === 'YouTube')[0],
    svc = r.j.top.filter(p => p.name === 'Calm TV service')[0];
  ok(r.j.cpu.use === 30 && yt.cpu === 20 && svc.cpu === 1, 'the processor: 30 % in use, YouTube 20 %, the service 1 %');

  const sm = req('system');
  ok(sm.procName('flutter-client', 'flutter-client -i com.webos.app.home').app === 'com.webos.app.home', 'a Flutter app by its id');
  ok(sm.procName('LunaExecutable', '/usr/palm/applications/airplay/LunaExecutable {}').app === 'airplay', 'a native app by its folder');
  ok(sm.cpuTimes('').total === 0 && sm.cpuTimes('').cores === 1, 'an unreadable /proc/stat gives no share rather than an error');
  ok(
    sm.procName('node', '/usr/bin/node /media/developer/apps/x/init/nospy-dns-filter.js --port 53').name === 'nospy-dns-filter (node)' &&
      sm.procName('node', 'node /media/developer/cleanyourtv/helper.js').name === 'Calm TV service',
    'another Node program by its script, the service by its name'
  );
  // a process that ends between two readings leaves the list, and a new one is named
  fs.writeFileSync(path.join(proc, '211', 'stat'), '');
  write('400/stat', pstat(400, 'node', 1, 1));
  write('400/statm', '100 5000 0 0 0 0 0\n');
  write('400/cmdline', 'node\0/home/root/tool.js\0');
  r = await call(sys, '/api/system');
  ok(
    r.j.top.some(p => p.name === 'tool (node)') && r.j.top.filter(p => p.name === 'com.webos.app.inputcommon')[0].count === 1,
    'a process that ended leaves the list, a new one comes in by its name'
  );
});
