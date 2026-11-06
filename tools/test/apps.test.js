// The launcher's app list (apps.js): the first answer is waited for, later ones come from memory while the list is asked again.
const { ok, call, req, memoryConfig, run } = require('./lib');

run(async () => {
  let asked = 0,
    title = 'One';
  const luna = async uri => {
    if (/listApps/.test(uri)) {
      asked++;
      await new Promise(r => setTimeout(r, 50));
      return {
        returnValue: true,
        apps: [
          { id: 'a.one', title, folderPath: '/x', icon: 'i.png' },
          { id: 'com.webos.app.home', title: 'Home' },
        ],
      };
    }
    return { returnValue: true };
  };
  const apps = req('apps').create({ config: memoryConfig({ dock: ['a.one'] }), luna, version: '1.6.0', feature: () => null });
  let r = await call(apps, '/api/apps');
  ok(
    asked === 1 && r.j.apps.length === 1 && r.j.apps[0].title === 'One' && r.j.config.dock[0] === 'a.one',
    'the first list is asked from the app manager, without LG Home'
  );
  title = 'Two';
  const t0 = Date.now();
  r = await call(apps, '/api/apps');
  ok(asked === 1 && r.j.apps[0].title === 'One' && Date.now() - t0 < 40, 'opened again soon: the list comes from memory at once');
  r = await call(apps, '/api/launch', 'POST', { id: 'bad id' });
  ok(r.code === 400, 'a bad app id is refused');

  // the looks of apps (a name and a drawn icon) and the HDMI card's input are kept; anything else in them is dropped
  const conf = memoryConfig({ dock: ['a.one'], options: { liveTv: false }, theme: { id: 'x' } });
  const a2 = req('apps').create({ config: conf, luna, version: '1.7.0', feature: () => null });
  await call(a2, '/api/config', 'POST', {
    dock: ['__hdmi', 'a.one'],
    tiles: {
      'youtube.leanback.v4': { label: 'YouTube', icon: 'youtube' },
      'tv.app': { label: '  IPTV  ', icon: 'iptv', junk: 1 },
      'own.icon': { icon: '' },
      'bad id!': { label: 'x' },
      'bad.icon': { icon: '<svg onload=1>' },
      'empty.one': { label: '   ' },
      'long.one': { label: 'A'.repeat(60) },
      'not.object': 'x',
    },
    hdmi: '2',
  });
  let c = conf.get();
  ok(
    JSON.stringify(c.tiles) ===
      JSON.stringify({
        'youtube.leanback.v4': { label: 'YouTube', icon: 'youtube' },
        'tv.app': { label: 'IPTV', icon: 'iptv' },
        'own.icon': { icon: '' },
        'long.one': { label: 'A'.repeat(40) },
      }) &&
      c.hdmi === '2' &&
      c.dock.join() === '__hdmi,a.one',
    'app looks keep a trimmed name of at most 40 characters and a known icon; bad ids and unknown icons are dropped; the HDMI port is kept'
  );
  ok(c.options.liveTv === false && c.theme.id === 'x', 'saving the launcher settings leaves the options and the theme alone');
  await call(a2, '/api/config', 'POST', { dock: ['a.one'], hdmi: '9', tiles: ['x'] });
  c = conf.get();
  ok(c.hdmi === undefined && c.tiles === undefined, 'an unknown HDMI port and looks that are not an object are dropped');
  await call(a2, '/api/config', 'POST', { hdmi: 'auto' });
  ok(conf.get().hdmi === 'auto', 'the HDMI card can go back to automatic');

  // uninstalling: only what the TV marks removable, never the Homebrew Channel or our own apps; dev apps go through dev/remove
  const removed = [];
  let refuse = false;
  const luna3 = async (uri, p, o) => {
    if (/listApps/.test(uri))
      return {
        returnValue: true,
        apps: [
          { id: 'netflix', title: 'Netflix', folderPath: '/media/cryptofs/apps/usr/palm/applications/netflix', removable: true },
          { id: 'youtube.leanback.v4', title: 'YouTube', folderPath: '/media/developer/apps/usr/palm/applications/yt', removable: true },
          { id: 'com.webos.app.browser', title: 'Browser', folderPath: '/usr/palm/applications/b', removable: false, systemApp: true },
          { id: 'old.firmware', title: 'Old', folderPath: '/media/cryptofs/apps/o' },
          { id: 'org.webosbrew.hbchannel', title: 'Homebrew Channel', folderPath: '/media/developer/apps/h', removable: true },
          { id: 'com.cleanyourtv.manager', title: 'CleanYourTV', folderPath: '/media/developer/apps/c', removable: true },
          { id: 'org.webosbrew.safeupdate', title: 'Safe Update', folderPath: '/media/developer/apps/s', removable: true },
          { id: 'org.webosbrew.appupdateblocker', title: 'Blocker', folderPath: '/media/developer/apps/b', removable: true },
        ],
      };
    if (/appInstallService/.test(uri)) {
      removed.push(uri.replace('luna://com.webos.appInstallService/', '') + ' ' + p.id + ' ' + o.wait);
      return refuse ? { returnValue: false, errorText: 'busy' } : { returnValue: true };
    }
    return { returnValue: true };
  };
  const a3 = req('apps').create({ config: memoryConfig({}), luna: luna3, version: '1.9.0', feature: () => null });
  r = await call(a3, '/api/apps');
  const rm = {};
  r.j.apps.forEach(a => (rm[a.id] = a.removable));
  ok(
    rm.netflix === true &&
      rm['youtube.leanback.v4'] === true &&
      rm['com.webos.app.browser'] === false &&
      rm['old.firmware'] === false &&
      rm['org.webosbrew.hbchannel'] === false &&
      rm['com.cleanyourtv.manager'] === false &&
      rm['org.webosbrew.safeupdate'] === false &&
      rm['org.webosbrew.appupdateblocker'] === false,
    'the app list says which apps can be uninstalled: not system apps, the Homebrew Channel, the update blockers or ours'
  );
  const codes = [];
  for (const id of ['com.webos.app.browser', 'org.webosbrew.hbchannel', 'com.cleanyourtv.manager', 'not.there', 'bad id'])
    codes.push((await call(a3, '/api/uninstall', 'POST', { id })).code);
  ok(codes.join() === '403,403,403,404,400' && removed.length === 0, 'apps that cannot be removed are refused without asking the TV');
  refuse = true;
  r = await call(a3, '/api/uninstall', 'POST', { id: 'netflix' });
  ok(r.code === 502 && r.j.error === 'busy', 'a refusal from the TV is passed on');
  refuse = false;
  r = await call(a3, '/api/uninstall', 'POST', { id: 'netflix' });
  const r2 = await call(a3, '/api/uninstall', 'POST', { id: 'youtube.leanback.v4' });
  ok(
    r.j.returnValue === true &&
      r2.j.returnValue === true &&
      removed.slice(1).join() === 'remove netflix 20000,dev/remove youtube.leanback.v4 20000',
    'a store app is removed with remove, a developer-mode app with dev/remove'
  );
  r = await call(a3, '/api/apps');
  ok(
    !r.j.apps.some(a => a.id === 'netflix' || a.id === 'youtube.leanback.v4'),
    'an uninstalled app leaves the list at once, before the app manager catches up'
  );

  // Power off: LG's full power-off, on POST only; a TV going down may never answer, a refusal is passed on
  const power = [];
  let powerReply = { returnValue: false, errorText: 'bad json' };
  const a4 = req('apps').create({
    config: memoryConfig({}),
    luna: async (uri, p) => (power.push(uri.split('/').pop() + ' ' + p.reason), powerReply),
    version: '1.9.0',
    feature: () => null,
  });
  r = await call(a4, '/api/power/off', 'GET');
  ok(power.length === 0, 'a GET does not power the TV off');
  r = await call(a4, '/api/power/off', 'POST');
  ok(r.j.returnValue === true && power.join() === 'shutDown remoteKey', 'Power off asks for the full shut-down; no answer is not an error');
  powerReply = { returnValue: false, errorCode: -1, errorText: 'denied' };
  r = await call(a4, '/api/power/off', 'POST');
  ok(r.code === 502 && r.j.error === 'denied', 'a refusal of the TV is passed on');

  // inputs on Home: kept by the service, listed with the apps under the input app's id, with what the TV reports now
  let inputAsks = 0;
  const luna5 = async uri => {
    if (/listApps/.test(uri)) return { returnValue: true, apps: [{ id: 'a.one', title: 'One', folderPath: '/x', icon: 'i.png' }] };
    if (/getAllInputStatus/.test(uri)) {
      inputAsks++;
      return {
        returnValue: true,
        devices: [
          { appId: 'com.webos.app.hdmi1', port: 1, label: 'UPC', hdmiPlugIn: true },
          { appId: 'com.webos.app.hdmi3', port: 3, label: 'HDMI 3', hdmiPlugIn: false },
        ],
      };
    }
    return { returnValue: true };
  };
  const conf5 = memoryConfig({ dock: ['a.one'] }),
    a5 = req('apps').create({ config: conf5, luna: luna5, version: '1.9.0', feature: () => null });
  await call(a5, '/api/apps');
  ok(inputAsks === 0, 'nothing is asked of the inputs while none is on Home');
  r = await call(a5, '/api/inputs/pin', 'POST', { id: 'com.webos.app.hdmi9', on: true });
  ok(r.code === 404 && !conf5.get().pinnedInputs, 'an input the TV does not have is not added');
  await call(a5, '/api/inputs/pin', 'POST', { id: 'com.webos.app.hdmi1', on: true });
  r = await call(a5, '/api/inputs/pin', 'POST', { id: 'com.webos.app.hdmi3', on: true });
  r = await call(a5, '/api/apps');
  const pins = r.j.apps.filter(a => a.input);
  ok(
    r.j.apps.length === 3 && pins[0].title === 'UPC' && pins[0].input === 1 && pins[0].off === false && pins[1].off === true,
    "inputs on Home are listed with the apps: the TV's name, the port and whether something is connected"
  );
  ok((await a5.apps()).length === 1, 'the running-apps list still sees installed apps only');
  r = await call(a5, '/api/uninstall', 'POST', { id: 'com.webos.app.hdmi1' });
  ok(r.code === 403, 'an input cannot be uninstalled');
  await call(a5, '/api/config', 'POST', { dock: ['a.one', 'com.webos.app.hdmi1'], sort: 'alpha' });
  ok(conf5.get().pinnedInputs.length === 2, "saving the launcher's settings keeps the inputs on Home");
  r = await call(a5, '/api/inputs/pin', 'POST', { id: 'com.webos.app.hdmi1', on: false });
  ok(
    r.j.pinned === false && conf5.get().pinnedInputs.length === 1 && conf5.get().dock.join() === 'a.one',
    'an input taken off Home leaves the dock too'
  );
});
