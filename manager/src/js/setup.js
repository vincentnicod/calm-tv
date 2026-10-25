function doSetup(force) {
  forceOffer = false;
  banner('Setting up\u2026 the screen blinks once while LG\u2019s system restarts', 'work');
  var flags =
    (setup.debloat ? '--debloat' : '--no-debloat') + ' ' + (setup.inputKey ? '--input-key' : '--no-input-key') + (force ? ' --force' : '');
  rootExec(
    'rm -f /media/developer/cytv-setup.log*; nohup sh ' +
      SVC +
      '/bootstrap.sh install ' +
      flags +
      ' > /media/developer/cytv-setup.log 2>&1 &'
  ).then(function (m) {
    var o = {};
    try {
      o = JSON.parse(m);
    } catch (e) {}
    if (o.returnValue === false) {
      banner(
        'Could not start the setup: ' + (o.errorText || 'no answer from the Homebrew Channel service (is it installed and up to date?)'),
        'err'
      );
      return;
    }
    waitUp(0);
  });
}
function logTail(cb) {
  rootExec('tail -n 3 /media/developer/cytv-setup.log 2>/dev/null').then(function (m) {
    var o = {};
    try {
      o = JSON.parse(m);
    } catch (e) {}
    cb(
      String(o.stdoutString || '')
        .replace(/\[cleanyourtv\] /g, '')
        .trim()
    );
  });
}
function waitUp(n) {
  api('/api/manager/status').then(
    function (s0) {
      offline = false;
      banner('');
      load();
      if (!(s0.keys && s0.keys.learned) && s0.options && s0.options.inputKey)
        setTimeout(function () {
          api('/api/manager/status').then(function (s) {
            st = s;
            openKeys('input');
          });
        }, 1500);
    },
    function () {
      logTail(function (t) {
        if (/ERROR|rolled back/.test(t)) {
          forceOffer = /looks different/.test(t);
          build();
          draw();
          banner(
            'Setup stopped: ' +
              t
                .split('\n')
                .pop()
                .replace(/^ERROR: /, ''),
            'err'
          );
          return;
        }
        if (n > 90) {
          banner('The service did not start. Log: /media/developer/cytv-setup.log on the TV. ' + t.split('\n').pop(), 'err');
          return;
        }
        if (t) banner('Setting up\u2026 ' + t.split('\n').pop(), 'work');
        setTimeout(function () {
          waitUp(n + 1);
        }, 2000);
      });
    }
  );
}
