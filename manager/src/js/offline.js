/* setting up again (after an update by script, or when the service stopped) starts from the choices already saved, not from the defaults
   (issues 6 and 7: the Input key came back on) */
function setupDefaults() {
  rootExec('cat /media/developer/cleanyourtv/config.json 2>/dev/null').then(function (m) {
    var o = null;
    try {
      o = JSON.parse(execOut(m).out).options;
    } catch (x) {}
    if (!o) return;
    if (o.debloat === false) setup.debloat = false;
    if (o.inputKey === false) setup.inputKey = false;
    if (offline) {
      build();
      draw();
    }
  });
}
/* before the setup (or when it failed) the service is not running: update the package through the root service instead */
function execOut(m) {
  var o = {};
  try {
    o = JSON.parse(m);
  } catch (e) {}
  return { ok: o.returnValue !== false, out: String(o.stdoutString || ''), err: String(o.stderrString || o.errorText || '') };
}
function offlineCheck() {
  banner('Checking for updates\u2026', 'work');
  rootExec('node ' + SVC + '/helper/selfupdate.js check').then(function (m) {
    var e = execOut(m),
      r = null;
    try {
      r = JSON.parse(e.out);
    } catch (x) {}
    if (!r || r.error) {
      banner('Could not check: ' + ((r && r.error) || e.err || 'no answer'), 'err');
      return;
    }
    upd = r.updateTo ? r : null;
    build();
    if (upd) idx = updIdx;
    draw();
    banner(
      r.updateTo ? 'Version ' + r.updateTo + ' is available; this one is ' + r.installed + '.' : 'Up to date (' + r.installed + ').',
      r.updateTo ? 'ok' : ''
    );
  });
}
function offlineUpdate() {
  if (!upd) return;
  banner('Updating to ' + upd.updateTo + '\u2026', 'work');
  rootExec('rm -f /tmp/cytv-selfupdate.log; nohup node ' + SVC + '/helper/selfupdate.js install > /tmp/cytv-selfupdate.log 2>&1 &').then(
    function () {
      pollUpdate(0);
    }
  );
}
function pollUpdate(n) {
  rootExec('tail -n 3 /tmp/cytv-selfupdate.log 2>/dev/null').then(function (m) {
    var t = execOut(m).out.trim(),
      last = t.split('\n').pop();
    if (/^DONE/.test(last)) {
      upd = null;
      banner(last.replace(/^DONE /, ''), 'ok');
      build();
      draw();
      return;
    }
    if (/^ERROR/.test(last)) {
      banner('Update failed: ' + last.replace(/^ERROR /, ''), 'err');
      return;
    }
    if (n > 120) {
      banner('The update is taking too long. Log: /tmp/cytv-selfupdate.log on the TV.', 'err');
      return;
    }
    if (last) banner('Updating\u2026 ' + last, 'work');
    setTimeout(function () {
      pollUpdate(n + 1);
    }, 2000);
  });
}
