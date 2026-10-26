/* ---------- tiles (built once per app, reused across rebuilds) ---------- */
/* A tile is the picture (.face, which crops a picture that fills it) and its name under it (.cap). A tile is rebuilt when its name or
   drawn icon changes (calm.js, look); the HDMI card's name follows the inputs and is updated in place (hdmiPaint). */
function tile(a) {
  var lk = look(a),
    sig = lk.glyph + '|' + (a.id === '__hdmi' ? '' : lk.label);
  /* a kept tile takes the app's latest details: the first paint comes from the saved list, which can be older (no removable) */
  if (tiles[a.id] && tiles[a.id]._sig === sig) {
    tiles[a.id]._a = a;
    return tiles[a.id];
  }
  var d = document.createElement('div'),
    tint = document.createElement('div'),
    face = document.createElement('div'),
    cap = document.createElement('div');
  d.className = 'tile' + (a.sys ? ' sys' : '');
  d._a = a;
  d._sig = sig;
  tiles[a.id] = d;
  hit(d);
  tint.className = 'tint'; /* the app's colour on a focused card (dock.style card) */
  face.className = 'face';
  cap.className = 'cap';
  cap.textContent = lk.label;
  d.appendChild(tint);
  d.appendChild(face);
  d.appendChild(cap);
  if (a.sys) {
    face.innerHTML = svg(a.icon) + '<div class="slab">' + 'LG Home' + '</div>';
    return d;
  }
  if (lk.glyph) {
    glyphTile(d, face, lk.glyph);
    if (a.id === '__hdmi') hdmiPaint();
    return d;
  }
  var known = colors[a.id];
  if (known) {
    paint(d, known);
    d._col = known;
  }
  var i = new Image();
  i.alt = '';
  i.decoding = 'async';
  d._i = i;
  if (!known) i.crossOrigin = 'anonymous';
  i.onload = function () {
    if (!colors[a.id]) {
      var col = iconColor(i, a.id);
      d._col = col;
      paint(d, col);
      fit(d, !!(d.parentNode && d.parentNode.id === 'dock'));
      if (!col.t) {
        colors[a.id] = col;
        storeSoon();
      }
      if (rows[r] && rows[r][c] === d) glowNow(d);
    }
  };
  i.onerror = function () {
    i.remove();
    var t = document.createElement('div');
    t.className = 't';
    t.textContent = lk.label;
    face.appendChild(t);
    if (!colors[a.id]) {
      var f = hsl2rgb(hashHue(a.id), 0.42, 0.42);
      paint(d, { c: f, b: hsl2rgb(hashHue(a.id), 0.4, 0.2) });
    }
  }; /* not remembered: a failed load must not pin a made-up colour */
  i.src = a.id === '__live' ? LIVE_ICON : API + '/icon/' + encodeURIComponent(a.id);
  face.appendChild(i);
  if (i.decode) i.decode().catch(function () {});
  return d;
}

/* ---------- ambient glow: two layers cross-fade, updated only once focus settles ---------- */
function glowNow(e) {
  var col = TH.glow || e.style.getPropertyValue('--c') || '74,84,112';
  if (col === gColor) return;
  gColor = col;
  var on = gSide ? $('gB') : $('gA'),
    off = gSide ? $('gA') : $('gB');
  gSide ^= 1;
  on.style.setProperty('--c', col);
  on.classList.add('on');
  off.classList.remove('on');
}
function glowSoon(e) {
  clearTimeout(gT);
  gT = setTimeout(function () {
    glowNow(e);
  }, 110);
}
