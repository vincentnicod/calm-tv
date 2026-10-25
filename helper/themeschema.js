// The theme schema: every setting a theme can make (SCHEMA), how a value is checked and clamped (normalize), and how a theme turns into
// what the launcher applies (resolve: CSS variables, a few attributes and numbers). No files are fetched here; theme.js does that.
// docs/themes.md is generated from SCHEMA (tools/theme-docs.js).
const fs = require('fs'),
  path = require('path');

// where downloaded themes are kept: themes/<id>/ next to this file (D/themes on the TV)
const dir = () => process.env.CYTV_THEMES || path.join(__dirname, 'themes');
const DEFAULT_ID = 'classic',
  MAX_WALLPAPER = 1.5 * 1024 * 1024,
  MAX_PREVIEW = 600 * 1024,
  MAX_THEME = 32 * 1024,
  MAX_INDEX = 128 * 1024;
const HEX = /^#[0-9a-f]{6}$/i,
  FILE = /^[\w-]{1,40}\.(?:jpg|png|webp)$/,
  ID = /^[a-z0-9-]{1,30}$/,
  PREVIEW_PATH = /^([a-z0-9-]{1,30})\/preview\.(?:jpg|png|webp)$/;
const ACCENTS = [
  ['Theme default', ''],
  ['White', '#f5f6f8'],
  ['Blue', '#4c8dff'],
  ['Teal', '#2ec4b6'],
  ['Green', '#46c37b'],
  ['Yellow', '#f2c94c'],
  ['Orange', '#ff8a3d'],
  ['Red', '#ff5a5f'],
  ['Pink', '#ff6fb5'],
  ['Purple', '#a77bff'],
];
const POS = ['left', 'center', 'right'],
  TOPBOT = ['top', 'bottom'];

// [key, type, range or choices, default, what it does]. Types: color (#rrggbb), color? (a colour, or null for "the accent"), num, int
// (range [lo, hi]), enum (choices), bool, auto (an int range, or null for "worked out from the other values"), file (a wallpaper file name).
const SCHEMA = [
  ['colors.night', 'color', null, '#07080b', 'Page background.'],
  ['colors.panel', 'color', null, '#14161b', 'Toast background; menu rows are a lighter mix of it.'],
  ['colors.ink', 'color', null, '#f5f6f8', 'Text.'],
  [
    'colors.accent',
    'color',
    null,
    '#f5f6f8',
    'Highlight: the focused button and menu row and, unless `colors.focus` is set, the focus ring.',
  ],
  ['colors.focus', 'color?', null, null, 'Focus ring colour; empty uses the accent.'],
  ['colors.pill', 'color', null, '#ffffff', 'Colour of the translucent top buttons, with `surface.pillAlpha`.'],
  ['surface.pillAlpha', 'num', [0, 0.6], 0.09, 'Opacity of the top buttons.'],
  ['surface.pillRing', 'num', [0, 0.8], 0.1, 'Opacity of the thin outline of the top buttons.'],
  ['surface.pillRadius', 'int', [0, 60], 32, 'Corner radius of the top buttons (pill style only).'],
  ['surface.menuAlpha', 'num', [0.5, 1], 0.97, 'Opacity of the dark layer behind menus.'],
  ['surface.rowRadius', 'int', [0, 50], 30, 'Corner radius of menu rows.'],
  [
    'type.font',
    'enum',
    ['default', 'serif', 'mono', 'manrope', 'geist', 'instrument', 'hanken', 'sora'],
    'default',
    "The typeface: the TV's own, a serif, a monospace, or one shipped with the launcher (Manrope, Geist, Instrument Sans, Hanken Grotesk, Sora).",
  ],
  [
    'type.display',
    'enum',
    ['', 'instrument-serif'],
    '',
    'A second typeface for the time and the names of a `word` dock; empty uses `type.font`. `instrument-serif`: Instrument Serif.',
  ],
  ['type.scale', 'num', [0.8, 1.3], 1, 'Scale of the text of buttons, menus and tiles.'],
  ['clock.show', 'bool', null, true, 'Show the clock.'],
  ['clock.date', 'bool', null, true, 'Show the date beside or under the time.'],
  ['clock.layout', 'enum', ['inline', 'stack'], 'inline', '`inline`: the date beside the time; `stack`: under it.'],
  ['clock.anchor', 'enum', TOPBOT, 'top', 'Which screen edge `clock.y` counts from.'],
  ['clock.align', 'enum', POS, 'left', 'Which side `clock.x` counts from; `center` centres it.'],
  ['clock.x', 'int', [0, 900], 96, 'Distance from that side, in px (on a 1920 x 1080 canvas).'],
  ['clock.y', 'int', [0, 900], 54, 'Distance from the top or bottom edge, in px.'],
  ['clock.scale', 'num', [0.6, 4.5], 1, 'Scale of the time.'],
  ['clock.dateCase', 'enum', ['normal', 'caps'], 'normal', '`caps`: the date in spaced capitals.'],
  ['clock.dateScale', 'num', [0.6, 2], 1, 'Scale of the date.'],
  ['clock.tracking', 'num', [-0.1, 0.1], -0.02, 'Letter spacing of the time, in em: below 0 is tighter.'],
  [
    'clock.weight',
    'int',
    [100, 800],
    600,
    'Weight of the time: 100 is hairline, 300 light, 600 semibold (a weight the typeface lacks shows the nearest).',
  ],
  ['bar.show', 'bool', null, true, 'Show the top buttons (Inputs, Settings, Customise, ...).'],
  [
    'bar.style',
    'enum',
    ['pill', 'round', 'flat', 'text', 'caps'],
    'pill',
    '`pill`: icon and label on a rounded button; `round`: icon only in a circle; `flat`: no background; `text`: the label alone, in a pill when focused; `caps`: the same in small spaced capitals.',
  ],
  ['bar.labels', 'enum', ['auto', 'show', 'hide'], 'auto', 'Button labels: `auto` shows them except in the `round` style.'],
  ['bar.anchor', 'enum', TOPBOT, 'top', 'Which screen edge `bar.y` counts from.'],
  ['bar.align', 'enum', POS, 'right', 'Which side `bar.x` counts from.'],
  ['bar.x', 'int', [0, 900], 96, 'Distance from that side, in px.'],
  ['bar.y', 'int', [0, 900], 54, 'Distance from the top or bottom edge, in px.'],
  ['bar.size', 'int', [40, 100], 64, 'Height of a button, in px.'],
  ['bar.gap', 'int', [4, 40], 16, 'Space between buttons, in px.'],
  ['shelf.show', 'bool', null, true, 'Show the large name of the focused app.'],
  ['shelf.align', 'enum', POS, 'left', 'Text alignment of the name.'],
  ['shelf.x', 'int', [0, 900], 96, 'Margin on both sides, in px.'],
  ['shelf.y', 'int', [0, 900], 150, 'Distance from the top edge, in px.'],
  ['shelf.scale', 'num', [0.4, 1.6], 1, 'Scale of the name.'],
  ['dock.anchor', 'enum', TOPBOT, 'top', 'Which screen edge `dock.y` counts from.'],
  ['dock.align', 'enum', POS, 'left', 'Which side `dock.x` counts from; `center` centres the dock.'],
  ['dock.x', 'int', [0, 900], 96, 'Distance from that side, in px.'],
  ['dock.y', 'auto', [0, 1000], null, 'Distance from the top or bottom edge, in px. Empty: 360 from the top, 68 from the bottom.'],
  ['dock.count', 'int', [3, 8], 4, 'Apps in the dock.'],
  ['dock.w', 'int', [120, 500], 408, 'Width of a dock tile, in px.'],
  ['dock.h', 'int', [60, 300], 230, 'Height of a dock tile, in px.'],
  ['dock.gap', 'int', [8, 60], 32, 'Space between dock tiles, in px.'],
  ['dock.radius', 'int', [0, 80], 36, 'Corner radius of dock tiles.'],
  ['dock.panel', 'num', [0, 0.6], 0, 'Opacity of a translucent panel behind the dock tiles; 0 for none.'],
  ['dock.panelPad', 'int', [0, 60], 24, 'Space between the panel and the tiles, in px.'],
  ['dock.lift', 'int', [0, 40], 10, 'How far the focused dock tile rises, in px.'],
  ['dock.focusScale', 'num', [1, 1.3], 1.05, 'Scale of the focused dock tile.'],
  [
    'dock.style',
    'enum',
    ['tile', 'card', 'logo', 'glass', 'paper', 'word'],
    'tile',
    "`tile`: the icon in the middle of a tile in its colour; `card`: a dark card tinted with the app's colour, the icon small in the top corner and the name inside; `logo`: the app's logo alone in white (made from its icon, or its name when that fails), with no tile; `glass`: that logo on frosted glass (needs a scene with a glass copy: `brume`, `aurore`); `paper`: that logo, in the ink colour, on a card of the panel colour; `word`: the app's name alone, set in the display typeface, with no icon.",
  ],
  [
    'dock.focus',
    'enum',
    ['ring', 'fill', 'lift'],
    'ring',
    '`ring`: a ring around the focused tile; `fill`: the focused tile filled with the accent colour (for `logo`, `glass` and `paper`); `lift`: the focused tile brighter, with no ring (for `glass`).',
  ],
  ['dock.dim', 'num', [0.3, 1], 1, 'Opacity of the dock tiles that do not have the focus; below 1 the focused one stands out.'],
  [
    'grid.mode',
    'enum',
    ['below', 'push', 'overlay'],
    'below',
    '`below`: the grid sits under the dock and scrolls (a dock at the bottom behaves as `push`); `push`: the grid sits under the dock out of sight, and when the focus moves down into it the dock moves up to `grid.dockUp` and the grid appears below it; `overlay`: the grid opens over the screen above the dock.',
  ],
  [
    'grid.dockUp',
    'int',
    [0, 700],
    220,
    '`push` mode: where the dock stops, counted from the top of the screen, while the grid has the focus, in px.',
  ],
  ['grid.align', 'enum', ['left', 'center'], 'left', '`center` centres every row of tiles, also a last row that is not full.'],
  ['grid.cols', 'int', [4, 14], 10, 'Columns.'],
  ['grid.tileH', 'int', [80, 240], 151, 'Height of a tile, in px; the width follows from the columns.'],
  ['grid.gapX', 'int', [6, 60], 24, 'Horizontal space between tiles, in px.'],
  ['grid.gapY', 'int', [6, 60], 26, 'Vertical space between tiles, in px.'],
  ['grid.radius', 'int', [0, 100], 34, 'Corner radius of tiles.'],
  ['grid.x', 'int', [0, 900], 96, 'Distance of the grid from the left edge, in px.'],
  ['grid.width', 'int', [600, 1920], 1728, 'Width of the grid, in px.'],
  ['grid.y', 'auto', [0, 1000], null, 'Distance of the grid from the top edge, in px. Empty: under the dock, or 290 for an overlay.'],
  ['grid.clipTop', 'int', [0, 600], 300, 'Where scrolled rows disappear at the top, in px (`below` mode).'],
  ['grid.focusScale', 'num', [1, 1.4], 1.12, 'Scale of the focused tile.'],
  ['grid.overlayDim', 'num', [0, 1], 0.95, 'Opacity of the layer behind the overlay grid.'],
  ['grid.overlayH', 'int', [200, 900], 510, 'Visible height of the overlay grid before it scrolls, in px.'],
  ['tile.gloss', 'num', [0, 1], 0, 'A light highlight on every tile.'],
  ['tile.border', 'num', [0, 0.6], 0, 'Opacity of a thin outline on every tile.'],
  ['tile.ringWidth', 'int', [0, 10], 4, 'Width of the focus ring, in px; 0 for none.'],
  ['tile.ringOffset', 'int', [0, 14], 4, 'Space between a tile and its focus ring, in px.'],
  ['effects.glow', 'num', [0, 1], 1, 'Strength of the ambient glow at the top.'],
  ['effects.glowColor', 'enum', ['app', 'accent'], 'app', '`app`: taken from the focused icon; `accent`: the accent colour.'],
  ['effects.speed', 'num', [0, 2], 1, 'Animation speed multiplier; 0 switches the animations off.'],
  [
    'effects.wallpaper',
    'file',
    null,
    '',
    'A file name in `themes/wallpapers/`: `.jpg`, `.png` or `.webp`, at most 1.5 MB; drawn at 1920 x 1080.',
  ],
  ['effects.wallpaperDim', 'num', [0, 0.9], 0.4, 'How far the wallpaper is darkened with the background colour.'],
  [
    'effects.scene',
    'enum',
    ['', 'lac', 'brume', 'ardoise', 'lin', 'aurore'],
    '',
    'A background shipped with the launcher, used when there is no wallpaper: `lac` a lake at dusk, `brume` Alpine peaks at blue hour, `ardoise` warm slate, `lin` warm linen, `aurore` a soft aurora.',
  ],
  [
    'effects.timeOfDay',
    'bool',
    null,
    false,
    'The scene follows the time of day: dawn from 6:00, day from 9:00, dusk from 17:00, night from 21:00 (`lac` and `brume`).',
  ],
];
const DEFAULTS = {};
for (const r of SCHEMA) DEFAULTS[r[0]] = r[3];

const hex = v => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : undefined);
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => '#' + c.map(x => ('0' + Math.round(Math.min(255, Math.max(0, x))).toString(16)).slice(-2)).join('');
const mix = (a, b, t) => {
  const x = rgb(a),
    y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const lum = h => {
  const c = rgb(h).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const getPath = (o, p) => p.split('.').reduce((x, k) => (x && typeof x === 'object' ? x[k] : undefined), o);
// the checked value for a row, or undefined when the raw value is missing or invalid
function check(row, v) {
  const type = row[1],
    spec = row[2];
  if (v === undefined) return undefined;
  if (type === 'color') return hex(v);
  if (type === 'color?') return v === '' || v === null ? null : hex(v);
  if (type === 'bool') return typeof v === 'boolean' ? v : undefined;
  if (type === 'enum') return spec.indexOf(v) >= 0 ? v : undefined;
  if (type === 'num' || type === 'int' || type === 'auto') {
    if (type === 'auto' && (v === null || v === '')) return null;
    if (typeof v !== 'number' || !isFinite(v)) return undefined;
    const c = Math.min(spec[1], Math.max(spec[0], v));
    return type === 'num' ? c : Math.round(c);
  }
  return undefined;
}
// is this buffer an image of the type its file name says?
function imageOk(b, name, max) {
  if (!b || b.length < 12 || b.length > max) return false;
  return (
    (/\.jpg$/.test(name) && b[0] === 0xff && b[1] === 0xd8) ||
    (/\.png$/.test(name) && b.slice(1, 4).toString() === 'PNG') ||
    (/\.webp$/.test(name) && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP')
  );
}
const imageType = n => (/\.jpg$/.test(n) ? 'image/jpeg' : /\.png$/.test(n) ? 'image/png' : 'image/webp');
const sniff = b =>
  b.length > 12 && b[0] === 0xff && b[1] === 0xd8
    ? 'jpg'
    : b.length > 12 && b.slice(1, 4).toString() === 'PNG'
      ? 'png'
      : b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP'
        ? 'webp'
        : '';

// A theme: its description and a flat map of every SCHEMA key; `base` is the values of the theme it extends (or the defaults). A wallpaper
// is accepted when the file is in `wallDir` (default: the theme's folder on the TV) and is an image of the right type.
function normalize(raw, id, base, wallDir) {
  if (!raw || typeof raw !== 'object' || !ID.test(id)) return null;
  const v = Object.assign({}, base || DEFAULTS);
  for (const row of SCHEMA) {
    if (row[1] === 'file') continue;
    const c = check(row, getPath(raw, row[0]));
    if (c !== undefined) v[/** @type {string} */ (row[0])] = c;
  }
  const w = getPath(raw, 'effects.wallpaper');
  if (typeof w === 'string' && FILE.test(w)) {
    try {
      const b = fs.readFileSync(path.join(wallDir || path.join(dir(), id), w));
      if (imageOk(b, w, MAX_WALLPAPER)) v['effects.wallpaper'] = w;
    } catch (_) {}
  } else if (w === '') v['effects.wallpaper'] = '';
  return {
    id,
    name: String(raw.name || id).slice(0, 40),
    author: String(raw.author || '').slice(0, 60),
    description: String(raw.description || '').slice(0, 160),
    v,
  };
}

// What the launcher applies: CSS variables, attributes for the few layouts that need more than a variable, and the numbers its scrolling needs.
const px = n => n + 'px';
function place(anchor, align, x, y) {
  // the four edges and the transform of a box anchored to a side, a corner or the centre
  const o = { l: 'auto', r: 'auto', t: 'auto', b: 'auto', tx: 'none' };
  if (align === 'left') o.l = px(x);
  else if (align === 'right') o.r = px(x);
  else {
    o.l = 'calc(50% + ' + x + 'px)';
    o.tx = 'translateX(-50%)';
  }
  if (anchor === 'top') o.t = px(y);
  else o.b = px(y);
  return o;
}
function resolve(t, accent) {
  const v = t.v,
    A = hex(accent) || v['colors.accent'],
    night = rgb(v['colors.night']),
    ink = rgb(v['colors.ink']),
    pill = rgb(v['colors.pill']);
  const dockBottom = v['dock.anchor'] === 'bottom',
    mode = v['grid.mode'] === 'overlay' ? 'overlay' : v['grid.mode'] === 'push' || dockBottom ? 'push' : 'below',
    overlay = mode === 'overlay',
    push = mode === 'push';
  const panel = v['dock.panel'] > 0,
    pad = panel ? v['dock.panelPad'] : 0,
    dockH = v['dock.h'] + 2 * pad;
  const dockY = v['dock.y'] !== null ? v['dock.y'] : dockBottom ? 68 : 360;
  const dockTop = dockBottom ? 1080 - dockY - dockH : dockY; // where the dock's top is when the grid has no focus
  const viewTop = overlay ? 0 : Math.min(v['grid.clipTop'], push ? Math.min(dockTop, v['grid.dockUp']) : dockY);
  const gridY = v['grid.y'] !== null ? v['grid.y'] : overlay ? 290 : dockTop + dockH + 60;
  const dock =
    dockBottom && overlay
      ? place('bottom', v['dock.align'], v['dock.x'], dockY)
      : place('top', v['dock.align'], v['dock.x'], dockTop - viewTop);
  const clock = place(v['clock.anchor'], v['clock.align'], v['clock.x'], v['clock.y']),
    bar = place(v['bar.anchor'], v['bar.align'], v['bar.x'], v['bar.y']);
  const labels = v['bar.labels'] === 'auto' ? (v['bar.style'] === 'round' ? 'hide' : 'show') : v['bar.labels'];
  const FONT = {
    default: '"LG Smart UI","Helvetica Neue",Helvetica,Arial,sans-serif',
    serif: 'Georgia,"Times New Roman",Times,serif',
    mono: 'Menlo,Consolas,"DejaVu Sans Mono",monospace',
    manrope: '"Calm Manrope","LG Smart UI","Helvetica Neue",Helvetica,Arial,sans-serif',
    geist: '"Calm Geist","LG Smart UI","Helvetica Neue",Helvetica,Arial,sans-serif',
    instrument: '"Calm Instrument Sans","LG Smart UI","Helvetica Neue",Helvetica,Arial,sans-serif',
    hanken: '"Calm Hanken Grotesk","LG Smart UI","Helvetica Neue",Helvetica,Arial,sans-serif',
    sora: '"Calm Sora","LG Smart UI","Helvetica Neue",Helvetica,Arial,sans-serif',
  };
  const vars = {
    '--night': v['colors.night'],
    '--night-rgb': night.join(','),
    '--panel': v['colors.panel'],
    '--panel2': mix(v['colors.panel'], v['colors.ink'], 0.06),
    '--ink': v['colors.ink'],
    '--ink2': 'rgba(' + ink.join(',') + ',.62)',
    '--acc': A,
    '--acc-ink': lum(A) > 0.35 ? '#0b0c10' : '#ffffff',
    '--focus': v['colors.focus'] || A,
    '--font': FONT[v['type.font']],
    '--font-d': v['type.display'] === 'instrument-serif' ? '"Calm Instrument Serif",Georgia,"Times New Roman",serif' : FONT[v['type.font']],
    '--date-ink': 'rgba(' + ink.join(',') + ',.78)',
    '--fs': String(v['type.scale']),
    '--pill-bg': 'rgba(' + pill.join(',') + ',' + v['surface.pillAlpha'] + ')',
    '--pill-ring': 'rgba(' + pill.join(',') + ',' + v['surface.pillRing'] + ')',
    '--pill-r': v['bar.style'] === 'round' ? '50%' : px(v['surface.pillRadius']),
    '--pill-h': px(v['bar.size']),
    '--bar-gap': px(v['bar.gap']),
    '--menu-bg': 'rgba(' + night.join(',') + ',' + v['surface.menuAlpha'] + ')',
    '--row-r': px(v['surface.rowRadius']),
    '--clock-l': clock.l,
    '--clock-r': clock.r,
    '--clock-t': clock.t,
    '--clock-b': clock.b,
    '--clock-tx': clock.tx,
    '--clock-ai': { left: 'flex-start', center: 'center', right: 'flex-end' }[v['clock.align']],
    '--clock-s': String(v['clock.scale']),
    '--clock-w': String(v['clock.weight']),
    '--clock-ls': v['clock.tracking'] + 'em',
    '--date-s': String(v['clock.dateScale']),
    '--clock-d': v['clock.show'] ? 'flex' : 'none',
    '--date-d': v['clock.date'] ? 'block' : 'none',
    '--bar-l': bar.l,
    '--bar-r': bar.r,
    '--bar-t': bar.t,
    '--bar-b': bar.b,
    '--bar-tx': bar.tx,
    '--bar-d': v['bar.show'] ? 'flex' : 'none',
    '--name-d': v['shelf.show'] ? 'block' : 'none',
    '--name-x': px(v['shelf.x']),
    '--name-y': px(v['shelf.y']),
    '--name-a': v['shelf.align'],
    '--name-s': String(v['shelf.scale']),
    '--view-top': px(viewTop),
    '--dock-l': dock.l,
    '--dock-r': dock.r,
    '--dock-t': dock.t,
    '--dock-b': dock.b,
    '--dock-tx': dock.tx,
    '--dock-w': px(v['dock.w']),
    '--dock-h': px(v['dock.h']),
    '--dock-gap': px(v['dock.gap']),
    '--dock-rad': px(v['dock.radius']),
    '--dock-panel': String(v['dock.panel']),
    '--dock-pad': px(pad),
    '--dock-lift': px(-v['dock.lift']),
    '--dock-fs': String(v['dock.focusScale']),
    '--dock-dim': String(v['dock.dim']),
    '--cols': String(v['grid.cols']),
    '--tile-h': px(v['grid.tileH']),
    '--gap-x': px(v['grid.gapX']),
    '--gap-y': px(v['grid.gapY']),
    '--tile-r': px(v['grid.radius']),
    '--grid-l': px(v['grid.x']),
    '--grid-w': px(v['grid.width']),
    '--grid-t': px(gridY - viewTop),
    '--tile-w': px(Math.floor((v['grid.width'] - (v['grid.cols'] - 1) * v['grid.gapX']) / v['grid.cols'])),
    '--grid-fs': String(v['grid.focusScale']),
    '--ov-dim': String(v['grid.overlayDim']),
    '--gloss': String(v['tile.gloss']),
    '--tile-border': String(v['tile.border']),
    '--ring-w': px(v['tile.ringWidth']),
    '--ring-off': px(v['tile.ringOffset']),
    '--glow-op': String(v['effects.glow']),
    '--spd': String(v['effects.speed']),
  };
  const w = v['effects.wallpaper'];
  return {
    id: t.id,
    name: t.name,
    vars,
    attrs: {
      bar: v['bar.style'],
      labels,
      clock: v['clock.layout'],
      grid: mode,
      galign: v['grid.align'],
      dock: dockBottom ? 'bottom' : 'top',
      shelf: v['shelf.show'] ? 'show' : 'hide',
      dockstyle: v['dock.style'],
      clockpos: v['clock.anchor'],
      datecase: v['clock.dateCase'],
      dockfocus: v['dock.focus'],
      inkmode: lum(v['colors.ink']) > 0.35 ? 'light' : 'dark',
      accmode: lum(A) > 0.35 ? 'dark' : 'light',
    },
    cols: v['grid.cols'],
    tileH: v['grid.tileH'],
    gapY: v['grid.gapY'],
    gt: gridY - viewTop,
    viewH: 1080 - viewTop,
    dockN: v['dock.count'],
    overlay,
    push: push ? { up: Math.max(0, dockTop - v['grid.dockUp']), gridTop: gridY } : null,
    overlayH: v['grid.overlayH'],
    glowRgb: v['effects.glowColor'] === 'accent' ? rgb(A).join(',') : '',
    nightRgb: night.join(','),
    wallpaper: w ? { id: t.id, file: w, dim: v['effects.wallpaperDim'] } : null,
    scene: v['effects.scene'],
    glass: v['effects.scene'] === 'brume' || v['effects.scene'] === 'aurore' ? v['effects.scene'] : '',
    daily: !!v['effects.timeOfDay'] && (v['effects.scene'] === 'lac' || v['effects.scene'] === 'brume'),
  };
}

module.exports = {
  ACCENTS,
  DEFAULTS,
  DEFAULT_ID,
  FILE,
  HEX,
  ID,
  MAX_INDEX,
  MAX_PREVIEW,
  MAX_THEME,
  MAX_WALLPAPER,
  POS,
  PREVIEW_PATH,
  SCHEMA,
  TOPBOT,
  check,
  dir,
  getPath,
  hex,
  imageOk,
  imageType,
  lum,
  mix,
  normalize,
  place,
  px,
  resolve,
  rgb,
  sniff,
  toHex,
};
