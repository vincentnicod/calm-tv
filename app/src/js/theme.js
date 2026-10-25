/* ---------- theme: the service resolves the chosen theme (manager > Theme) into CSS variables and a few numbers ---------- */
var TH0 = { cols: 10, tileH: 151, gapY: 26, gt: 350, viewH: 780, dockN: 4, overlay: false, push: null, overlayH: 510, glow: '' },
  TH = TH0,
  themeKeys = [],
  themeAttrs = [
    'data-bar',
    'data-labels',
    'data-clock',
    'data-grid',
    'data-galign',
    'data-dock',
    'data-shelf',
    'data-dockstyle',
    'data-clockpos',
    'data-datecase',
    'data-dockfocus',
    'data-inkmode',
    'data-accmode',
  ];
function applyTheme(t) {
  var st = document.documentElement.style,
    b = document.body,
    k;
  for (k = 0; k < themeKeys.length; k++) st.removeProperty(themeKeys[k]);
  themeKeys = [];
  for (k = 0; k < themeAttrs.length; k++) b.removeAttribute(themeAttrs[k]);
  b.classList.remove('grid-open');
  if (!t || !t.vars) {
    TH = TH0;
    return;
  }
  for (k in t.vars) {
    st.setProperty(k, t.vars[k]);
    themeKeys.push(k);
  }
  var w = t.wallpaper;
  /* a scene shipped with the launcher, next to this page, and its blurred copy for glass tiles; calm.js picks the time of day */
  scene = {
    name: !w && t.scene && /^[a-z]{1,20}$/.test(t.scene) ? t.scene : '',
    glass: t.glass && /^[a-z]{1,20}$/.test(t.glass) ? t.glass : '',
    daily: !!t.daily,
    period: '',
  };
  sceneApply();
  if (w) {
    var d = 'rgba(' + t.nightRgb + ',' + w.dim + ')';
    st.setProperty('--wall', 'linear-gradient(' + d + ',' + d + '),url("' + API + '/api/theme/wallpaper/' + w.id + '/' + w.file + '")');
    themeKeys.push('--wall');
  }
  for (k in t.attrs) b.setAttribute('data-' + k, t.attrs[k]);
  TH = {
    cols: t.cols || 10,
    tileH: t.tileH || 151,
    gapY: t.gapY || 26,
    gt: t.gt || 350,
    viewH: t.viewH || 780,
    dockN: t.dockN || 4,
    overlay: !!t.overlay,
    push: t.push || null,
    overlayH: t.overlayH || 510,
    glow: t.glowRgb || '',
  };
}

function setFocus(nr, nc, first) {
  var old = rows[r] && rows[r][c];
  if (old) old.classList.remove('f');
  r = nr;
  c = Math.min(nc, rows[r].length - 1);
  var e = rows[r][c];
  e.classList.add('f');
  var a = e._a,
    nm = a ? look(a).label : e._o ? barLabel(e._o) : '',
    n = $('name');
  if (n.textContent !== nm) n.textContent = nm;
  if (first) glowNow(e);
  else glowSoon(e);
  var sh = 0;
  if (TH.push) {
    /* the grid sits under the dock: focusing it scrolls everything up (the dock stops at its 'up' position) and the grid fades in */
    document.body.classList.toggle('grid-open', r >= 2);
    var ps = 0;
    if (r >= 2) {
      var bot = TH.push.gridTop - TH.push.up + (r - 2) * (TH.tileH + TH.gapY) + TH.tileH,
        ex = Math.max(0, bot - (1080 - 60));
      ps = -(TH.push.up + ex);
    }
    $('scroll').style.transform = ps ? 'translateY(' + ps + 'px)' : '';
    $('grid').style.transform = '';
    return;
  }
  if (TH.overlay) {
    /* the grid is an overlay above the dock: it opens when the focus goes down into it and scrolls on its own */
    document.body.classList.toggle('grid-open', r >= 2);
    var gs = 0;
    if (r >= 2) gs = Math.min(0, TH.overlayH - ((r - 2) * (TH.tileH + TH.gapY) + TH.tileH + 24));
    $('grid').style.transform = gs ? 'translateY(' + gs + 'px)' : '';
    $('scroll').style.transform = '';
    return;
  }
  $('grid').style.transform = '';
  if (r >= 2) {
    var gr = rows.length - 2,
      gt = TH.gt;
    sh = Math.min(0, Math.max(50 - (gt + (r - 2) * (TH.tileH + TH.gapY)), TH.viewH - 54 - (gt + gr * TH.tileH + (gr - 1) * TH.gapY)));
  } /* row height + gap from the theme: no layout reads */
  $('scroll').style.transform = sh ? 'translateY(' + sh + 'px)' : '';
}
function mapCol(from, to, col) {
  return from > 1 ? Math.round((col * (to - 1)) / (from - 1)) : 0;
}
function posOf(e) {
  for (var i = 0; i < rows.length; i++) {
    var j = rows[i].indexOf(e);
    if (j >= 0) return [i, j];
  }
  return null;
}
