// The TV's memory and processor for the launcher's hidden System panel (0 three times on Home). Read from /proc only when the panel
// asks, every 2 seconds while it is open; nothing runs in between.
//   GET /api/system  ->  {mem: {total, used, available} (kB), swap: {total, used}, cpu: {use (%), cores}, load, uptime (s),
//                        top: [{name, kb, cpu, count}]: the processes that use the most memory, those of one name together, with their
//                        share of the processor since the last call}
// The processor shares need two readings: a call that finds no recent one reads twice, 400 ms apart.
const fs = require('fs');
const P = require('./paths'),
  web = require('./web');

const PAGE_KB = 4; // the TV's memory page (getconf PAGESIZE: 4096)
const read = f => {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch (_) {
    return '';
  }
};
// the per-process files are read without blocking, a few processes at a time, so the service keeps answering meanwhile
const readAsync = f => new Promise(res => fs.readFile(f, 'utf8', (e, t) => res(e ? '' : t)));
const BATCH = 24;

// /proc/meminfo in kB
function meminfo(text) {
  const m = {};
  for (const line of text.split('\n')) {
    const x = /^(\w+):\s+(\d+)/.exec(line);
    if (x) m[x[1]] = +x[2];
  }
  return m;
}
// the processor's time so far, all cores together: [busy, total] in clock ticks, and the number of cores
function cpuTimes(text) {
  const lines = text.split('\n'),
    f = (lines[0] || '').trim().split(/\s+/).slice(1).map(Number),
    idle = (f[3] || 0) + (f[4] || 0),
    total = f.slice(0, 8).reduce((a, b) => a + (b || 0), 0);
  return { busy: total - idle, total, cores: lines.filter(l => /^cpu\d/.test(l)).length || 1 };
}
// what the TV calls a process: the app it runs where it is an app (web pages run in WebAppMgr, Flutter apps in flutter-client, native apps
// from their folder), else its program. The kernel cuts process names at 15 characters (com.webos.app.i), so the program's own path wins
function procName(comm, cmdline) {
  const argv0 = cmdline.split(' ')[0],
    app = /app-id=([\w.\-]+)/.exec(cmdline) || /flutter-client -i ([\w.\-]+)/.exec(cmdline) || /\/applications\/([\w.\-]+)\//.exec(argv0);
  if (app) return { app: app[1] };
  if (/cleanyourtv\/helper\.js/.test(cmdline)) return { name: 'Calm TV service' };
  const prog = argv0.indexOf('/') >= 0 ? argv0.slice(argv0.lastIndexOf('/') + 1) || comm : argv0 || comm;
  // a Node program by its script (several Homebrew services are written in Node)
  const js = prog === 'node' && /\S*\.js\b/.exec(cmdline.slice(argv0.length));
  if (js) return { name: js[0].slice(js[0].lastIndexOf('/') + 1).replace(/\.js$/, '') + ' (node)' };
  return { name: prog };
}
// every process: its name, memory (kB) and processor ticks so far. A name is read once per process and kept while the process lives
// (names: pid -> {start, name}; the start time tells a reused pid apart)
async function processes(proc, names) {
  const out = [],
    seen = {};
  let pids = [];
  try {
    pids = fs.readdirSync(proc).filter(d => /^\d+$/.test(d));
  } catch (_) {}
  const one = async pid => {
    const files = await Promise.all([readAsync(proc + '/' + pid + '/stat'), readAsync(proc + '/' + pid + '/statm')]),
      stat = files[0];
    if (!stat) return;
    const comm = stat.slice(stat.indexOf('(') + 1, stat.lastIndexOf(')')),
      rest = stat.slice(stat.lastIndexOf(')') + 2).split(' '),
      ticks = (+rest[11] || 0) + (+rest[12] || 0),
      start = rest[19] || '',
      kb = +(files[1].split(' ')[1] || 0) * PAGE_KB;
    if (!kb) return; // kernel threads
    seen[pid] = true;
    let n = names[pid];
    if (!n || n.start !== start) {
      const cmdline = (await readAsync(proc + '/' + pid + '/cmdline')).replace(/\0/g, ' ').trim();
      n = names[pid] = { start, name: procName(comm, cmdline) };
    }
    out.push(Object.assign({ pid, kb, ticks }, n.name));
  };
  for (let i = 0; i < pids.length; i += BATCH) await Promise.all(pids.slice(i, i + BATCH).map(one));
  for (const pid of Object.keys(names)) if (!seen[pid]) delete names[pid];
  return out;
}
async function reading(proc, names) {
  const cpu = cpuTimes(read(proc + '/stat'));
  return { at: Date.now(), cpu, procs: await processes(proc, names) };
}
// the shares between two readings
function summary(proc, before, now) {
  const m = meminfo(read(proc + '/meminfo')),
    dt = now.cpu.total - before.cpu.total || 1,
    was = {};
  for (const p of before.procs) was[p.pid] = p.ticks;
  const available = m.MemAvailable !== undefined ? m.MemAvailable : (m.MemFree || 0) + (m.Cached || 0),
    load = read(proc + '/loadavg')
      .split(' ')
      .slice(0, 3)
      .map(Number);
  return {
    mem: { total: m.MemTotal || 0, used: (m.MemTotal || 0) - available, available },
    swap: { total: m.SwapTotal || 0, used: (m.SwapTotal || 0) - (m.SwapFree || 0) },
    cpu: { use: Math.max(0, Math.min(100, Math.round(((now.cpu.busy - before.cpu.busy) / dt) * 100))), cores: now.cpu.cores },
    load: load.length === 3 && load.every(x => x === x) ? load : [],
    uptime: Math.round(+read(proc + '/uptime').split(' ')[0] || 0),
    procs: now.procs.map(p => ({
      app: p.app,
      name: p.name,
      kb: p.kb,
      cpu: was[p.pid] === undefined ? 0 : ((p.ticks - was[p.pid]) / dt) * 100,
    })),
  };
}
// processes of the same name together (LG runs several input apps, the web engine several pages), most memory first
function group(procs, titles) {
  const by = {};
  for (const p of procs) {
    const name = p.app ? titles[p.app] || (p.app === 'com.webos.app.home' ? 'Home' : p.app) : p.name,
      g = by[name] || (by[name] = { name, kb: 0, cpu: 0, count: 0 });
    g.kb += p.kb;
    g.cpu += p.cpu;
    g.count++;
  }
  return Object.keys(by)
    .map(k => by[k])
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 10)
    .map(g => ({ name: g.name, kb: g.kb, cpu: Math.round(g.cpu * 10) / 10, count: g.count }));
}

function create(ctx) {
  let last = null;
  const names = {};
  async function system() {
    const proc = P.PROC;
    let before = last;
    if (!before || Date.now() - before.at > 10000) {
      before = await reading(proc, names);
      await new Promise(r => setTimeout(r, 400));
    }
    const now = await reading(proc, names);
    last = now;
    const s = summary(proc, before, now);
    // an app's own name where the launcher knows it
    const apps = ctx.feature && ctx.feature('apps'),
      titles = {};
    if (apps) for (const a of await apps.apps()) titles[a.id] = a.title;
    s.top = group(s.procs, titles);
    delete s.procs;
    return s;
  }
  return {
    name: 'system',
    paths: ['/api/system'],
    handle: async (req, res) => web.json(res, await system()),
  };
}

module.exports = { create, meminfo, cpuTimes, procName, summary, group };
