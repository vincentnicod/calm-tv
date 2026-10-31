// Icons that failed before the service was up (tiles.js, retryTileIcons): the text stays until a picture loads, a few tries, no doubles.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

function element() {
  return {
    children: [],
    parentNode: null,
    classList: { toggle() {}, contains: () => false, add() {}, remove() {} },
    appendChild(child) {
      child.remove();
      this.children.push(child);
      child.parentNode = this;
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
      this.parentNode = null;
    },
  };
}
function image() {
  const i = element();
  i.asked = [];
  Object.defineProperty(i, 'src', {
    set(v) {
      this.asked.push(v);
    },
    get() {
      return this.asked[this.asked.length - 1];
    },
  });
  return i;
}

run(async () => {
  const monoTiles = [];
  const c = {
    tiles: {},
    colors: { demo: {}, missing: {}, __live: {} },
    API: 'http://service',
    LIVE_ICON: 'data:image/svg+xml;base64,AA==',
    Image: image,
    document: { createElement: element },
    look: a => ({ label: a.title, glyph: '' }),
    hit() {},
    paint() {},
    fit() {},
    retryMono: d => monoTiles.push(d),
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', 'js', 'tiles.js'), 'utf8'), c);
  const d = c.tile({ id: 'demo', title: 'Demo' }),
    icon = d._i,
    face = d.children[1];
  icon.onerror();
  ok(d._iconFailed && !!d._iconText && !icon.parentNode, 'an icon that fails leaves the name on the tile');
  c.retryTileIcons();
  ok(
    icon.asked.length === 2 && /retry=1$/.test(icon.src) && !!d._iconText,
    'once the service answers it is asked again, the name stays meanwhile'
  );
  c.retryTileIcons();
  ok(icon.asked.length === 2, 'a request on its way is not doubled');
  icon.onload();
  ok(!d._iconFailed && !d._iconText && icon.parentNode === face, 'the picture takes the place of the name');
  const gone = c.tile({ id: 'missing', title: 'Missing' });
  for (let n = 0; n < 10; n++) {
    gone._i.onerror();
    c.retryTileIcons();
  }
  ok(
    gone._i.asked.length === 3 && gone.children[1].children.length === 1,
    'an icon that does not exist is asked for twice more, with one name'
  );
  const live = c.tile({ id: '__live', title: 'Live' });
  live._i.onerror();
  c.retryTileIcons();
  ok(live._i.asked.length === 1, 'the Live TV picture is part of the page: it is not asked of the service');
  ok(monoTiles.indexOf(d) >= 0 && monoTiles.indexOf(live) < 0, "the dock's white logos get their retry too");
  const layout = fs.readFileSync(path.join(root, 'app', 'src', 'js', 'layout.js'), 'utf8');
  ok(
    layout.indexOf('retryTileIcons();') > 0 && layout.indexOf('retryTileIcons();') < layout.indexOf('if (sig === lastSig)'),
    'an unchanged app list retries too'
  );
});
