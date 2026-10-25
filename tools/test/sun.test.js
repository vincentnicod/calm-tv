// The sun in the launcher (calm.js): sunrise and sunset worked out on the TV for the chosen city, the scenes' time of day and the end of
// night mode that follow them. The reference times come from NOAA's full solar calculator (the spreadsheet formulas), in UTC.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { ok, root, req, run } = require('./lib');

run(async () => {
  let NOW = Date.UTC(2026, 9, 25, 12);
  class FakeDate extends Date {
    constructor(...a) {
      if (a.length) super(...a);
      else super(NOW);
    }
    static now() {
      return NOW;
    }
  }
  const page = { TXL: {}, $: () => null, document: { addEventListener() {} }, setInterval() {}, window: {}, Date: FakeDate, cfg: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app', 'src', 'js', 'calm.js'), 'utf8'), page);

  // [city, date, sunrise, sunset] in UTC
  const REF = [
    ['lausanne', '2026-03-20', '05:37', '17:46'],
    ['lausanne', '2026-06-21', '03:40', '19:30'],
    ['lausanne', '2026-10-25', '06:05', '16:30'],
    ['lausanne', '2026-12-21', '07:14', '15:49'],
    ['zurich', '2026-06-21', '03:29', '19:26'],
    ['zurich', '2026-12-21', '07:10', '15:38'],
    ['lugano', '2026-03-20', '05:28', '17:37'],
    ['lugano', '2026-10-25', '05:55', '16:21'],
  ];
  // compared as moments, so a time on the wrong day fails; any moment of the day gives that day's times
  const moment = (day, hm) => Date.parse(day + 'T' + hm + ':00Z');
  const off = [];
  REF.forEach(r => {
    const c = page.city(r[0]);
    ['00:00', '12:00', '23:59'].forEach(hm => {
      const s = page.sunTimes(moment(r[1], hm), c[2], c[3]);
      off.push(Math.abs(s.rise - moment(r[1], r[2])) / 60000, Math.abs(s.set - moment(r[1], r[3])) / 60000);
    });
  });
  const worst = Math.max.apply(null, off);
  ok(
    worst <= 3,
    'sunrise and sunset of that very day within 3 minutes of NOAA, in every season (largest gap ' + worst.toFixed(1) + ' min)'
  );
  ok(page.sunTimes(Date.UTC(2026, 5, 21, 12), 78.2, 15.6) === null, 'a day without sunset (Svalbard in June): no times, not made-up ones');

  const W = req('weather').CITIES;
  ok(
    page.CITIES.length === Object.keys(W).length && page.CITIES.every(c => W[c[0]] && W[c[0]][0] === c[2] && W[c[0]][1] === c[3]),
    "the launcher's cities are the service's, with the same coordinates"
  );

  // the time of day of the scenes
  page.cfg = { place: 'lausanne' };
  const today = page.sunToday(new FakeDate());
  const at = (ms, fn) => {
    NOW = ms;
    return fn();
  };
  const M = 60000;
  const periods = [-50, -30, 100]
    .map(m => at(today.rise + m * M, page.dayPeriod))
    .concat([-100, -60, 30, 50].map(m => at(today.set + m * M, page.dayPeriod)));
  ok(
    periods.join() === 'nuit,aube,jour,jour,,,nuit',
    "with a city the scenes follow the sun: dawn around sunrise, day, dusk around sunset, night (got '" + periods.join() + "')"
  );
  page.cfg = { place: 'none', weather: 'lausanne' };
  const local = (h, m) => new Date(2026, 9, 25, h, m || 0).getTime();
  ok(
    [7, 12, 18, 22].map(h => at(local(h), page.dayPeriod)).join() === 'aube,jour,,nuit',
    'with no city (None chosen): the fixed hours, even when the weather has a city'
  );
  page.cfg = { weather: 'zurich' };
  ok(page.placeId() === 'zurich', "before the City row existed, the weather's city is the city");

  // night mode ends at sunrise when that is later than 6:00
  page.cfg = { place: 'lausanne' };
  const end = d => at(d, () => page.nightEnd(new FakeDate()));
  const dec = page.sunTimes(Date.UTC(2026, 11, 21), 46.5197, 6.6323).rise,
    decRise = new Date(dec).getHours() * 60 + new Date(dec).getMinutes();
  ok(
    end(new Date(2026, 11, 21, 3).getTime()) === Math.max(360, decRise) && end(new Date(2026, 5, 21, 3).getTime()) >= 360,
    'night mode lasts until sunrise in winter, and at least until 6:00'
  );
  page.cfg = {};
  ok(end(new Date(2026, 11, 21, 3).getTime()) === 360, 'with no city it ends at 6:00');

  // the service keeps only a known city
  const conf = req('config').memory({});
  const apps = req('apps').create({
    config: conf,
    luna: async () => ({ returnValue: true, apps: [] }),
    version: '1.8.0',
    feature: () => null,
  });
  const post = b =>
    apps.handle({ method: 'POST', url: '/api/config' }, { writeHead() {}, setHeader() {}, end() {} }, '/api/config', async () => b);
  await post({ place: 'lugano' });
  const kept = conf.get().place;
  await post({ place: 'none' });
  const none = conf.get().place;
  await post({ place: 'paris' });
  ok(kept === 'lugano' && none === 'none' && conf.get().place === undefined, 'the city is kept only when it is one of the list, or none');
});
