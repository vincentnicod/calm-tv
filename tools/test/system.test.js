// The hidden System panel's readings (system.js): memory, processor and the processes that use the most, from a stand-in for /proc
// written in the formats of an LG C4 (webOS 25).
const fs = require('fs'),
  path = require('path');
const { ok, call, req, run } = require('./lib');

run(async () => {
  const proc = process.env.CYTV_PROC;
  const write = (f, s) => {
    const p = path.join(proc, f);
    if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p));
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
  const sys = req('system').create({ feature: n => (n === 'apps' ? apps : null) });
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
});
