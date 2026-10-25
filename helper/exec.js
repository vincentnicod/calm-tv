// The one way the service starts other programs. Node 8 (webOS 5 and 6) can abort with "uv_close: Assertion
// !uv__is_closing(handle)" when its own `timeout` option kills a child, so the time limit is kept by diag.execFile instead, and
// every start is noted for the report after an abnormal exit (see diag.js).
const cp = require('child_process');
const diag = require('./diag'),
  P = require('./paths');

// run a program; resolves {ok, code, out, err, error} and never rejects
function run(cmd, args, opts) {
  const o = Object.assign({ env: P.ENV, timeout: 60000, maxBuffer: 8 << 20 }, opts || {});
  return new Promise(resolve =>
    diag.execFile(cmd, args || [], o, (e, out, err) =>
      resolve({ ok: !e, code: e ? e.code : 0, out: String(out || ''), err: String(err || ''), error: e ? String(e.message || e) : '' })
    )
  );
}
// run a shell command line
const sh = (script, ms) => run('/bin/sh', ['-c', script], { timeout: ms || 60000 });
// the callback form, for code that streams or needs the child
const execFile = (cmd, args, opts, cb) => diag.execFile(cmd, args, Object.assign({ env: P.ENV }, opts || {}), cb);
// a shell command line that keeps running after this process (restarts, uninstall)
function detached(script) {
  diag.note('exec', 'detached ' + script.slice(0, 100));
  const c = cp.spawn('/bin/sh', ['-c', script], { env: P.ENV, detached: true, stdio: 'ignore' });
  c.unref();
  return c;
}
// for the standalone tools (sharelog.js) that collect a report step by step; spawnSync keeps its own time limit safely
function shSync(script, ms) {
  const r = cp.spawnSync('/bin/sh', ['-c', script], {
    env: P.ENV,
    timeout: ms || 8000,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.error) return '(failed: ' + String(r.error.message).split('\n')[0] + ')';
  return (r.stdout || '') + (r.status === 0 ? '' : r.stderr || '');
}

module.exports = { run, sh, execFile, detached, shSync };
