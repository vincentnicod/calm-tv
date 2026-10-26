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
      rm['com.cleanyourtv.manager'] === false,
    'the app list says which apps can be uninstalled: not system apps, the Homebrew Channel or ours'
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
});
