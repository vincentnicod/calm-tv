/* ---------- layout ---------- */
function rebuild() {
  var by = {};
  apps.forEach(function (a) {
    by[a.id] = a;
  });
  var di = dockIds(),
    dock = di.map(function (i) {
      return by[i];
    });
  var rest = apps
    .filter(function (a) {
      return !isHidden(a.id) && di.indexOf(a.id) < 0;
    })
    .sort(byOrder);
  var oldE = rows[r] && rows[r][c],
    keep = oldE && oldE._a ? oldE._a.id : null;
  if (oldE) oldE.classList.remove('f');
  var dk = $('dock'),
    gd = $('grid'),
    bar = $('bar');
  dk.textContent = '';
  gd.textContent = '';
  bar.textContent = '';
  var d = dock.map(function (a) {
    var t = tile(a);
    dk.appendChild(t);
    fit(t, true);
    return t;
  });
  var g = rest.map(function (a) {
    var t = tile(a);
    gd.appendChild(t);
    fit(t, false);
    return t;
  });
  document.body.classList.toggle('has-grid', g.length > 0);
  var ds = document.body.getAttribute('data-dockstyle');
  if (ds === 'logo' || ds === 'glass' || ds === 'paper') d.forEach(monoTile);
  glassAlign(g, false); /* a tile that left a glass dock for the grid loses its glass position */
  glassAlign(d, ds === 'glass');
  var tb = shownBar()
    .concat([{ label: 'Customise', icon: 'edit', action: 'customize', fixed: true }])
    .map(function (o) {
      var p = document.createElement('div');
      p.className = 'pill';
      p._o = o;
      p.innerHTML = svg(o.icon) + '<span></span>';
      p.lastChild.textContent = barLabel(o);
      p.setAttribute('data-label', barLabel(o)); /* shown under a round button when it has the focus */
      hit(p);
      bar.appendChild(p);
      return p;
    });
  rows = [tb, d.length ? d : tb];
  for (var i = 0; i < g.length; i += TH.cols) rows.push(g.slice(i, i + TH.cols));
  var nr = Math.min(r, rows.length - 1),
    nc = c;
  if (keep && tiles[keep]) {
    var p = posOf(tiles[keep]);
    if (p) {
      nr = p[0];
      nc = p[1];
    }
  }
  setFocus(nr, nc, true);
}

function load() {
  api('/api/apps')
    .then(function (x) {
      refreshInputs();
      setTimeout(refreshWeather, 0); /* after cfg is read below */
      if (x.version && oldSvc(x.version) && !warned) {
        warned = true;
        toast('The service (' + x.version + ') is older than this launcher needs: update it in the CleanYourTV manager');
      }
      usage = x.usage || {};
      var rank = Object.keys(usage).sort(function (a, b) {
        return usage[b] - usage[a];
      });
      var sig = JSON.stringify([
        x.apps.map(function (a) {
          return a.input ? [a.id, a.title, a.off] : a.id;
        }),
        x.config,
        rank,
      ]);
      retryTileIcons();
      if (sig === lastSig) return;
      lastSig = sig;
      apps = x.apps.map(function (a) {
        return a.input
          ? { id: a.id, title: a.title, input: a.input, off: !!a.off }
          : { id: a.id, title: a.title, removable: a.removable === true };
      });
      cfg = x.config || {};
      applyTheme(cfg.theme);
      apps.push({ id: '__hdmi', title: 'HDMI' });
      if (liveOn()) apps.push({ id: '__live', title: t('Live TV') });
      store();
      rebuild();
      /* the favourites the dock starts with, and their automatic looks, are saved once: the Input key's picker reads them */
      if (!cfg.dock && dockIds().length) saveStartingDock();
      if (!perfReady) {
        perfReady = true;
        perfMark('launcher ready ' + Math.round(performance.now()));
      }
    })
    .catch(function () {
      toast(t('Helper not reachable, retrying...'));
      setTimeout(load, 3000);
    });
}
