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
});
