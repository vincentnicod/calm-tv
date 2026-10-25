var listY = 0;
/* the list can be taller than the screen: keep the focused row in view and show a fade where more rows are hidden */
function scrollList() {
  var wrap = $('listwrap'),
    list = $('list'),
    el = list.children[idx],
    wh = wrap.clientHeight,
    lh = list.scrollHeight;
  if (el && wh) {
    var top = el.offsetTop,
      bot = top + el.offsetHeight;
    if (top - 50 < listY) listY = Math.max(0, top - 50);
    else if (bot + 50 > listY + wh) listY = bot + 50 - wh;
    listY = Math.max(0, Math.min(listY, Math.max(0, lh - wh)));
  } else listY = 0;
  list.style.transform = listY ? 'translateY(' + -listY + 'px)' : '';
  wrap.classList.toggle('mu', listY > 0);
  wrap.classList.toggle('md', listY + wh < lh - 2);
}
function draw() {
  var h = '';
  rows.forEach(function (r, i) {
    h += r.sep
      ? '<div class="sep"></div>'
      : '<div class="row' +
        (i === idx ? ' f' : '') +
        (r.dim ? ' dim' : '') +
        '" data-i="' +
        i +
        '"><span class="lb"></span>' +
        (r.sub ? '<span class="st"></span>' : '') +
        '</div>';
  });
  $('list').innerHTML = h;
  scrollList();
  var el = $('list').children;
  rows.forEach(function (r, i) {
    if (r.sep) return;
    el[i].querySelector('.lb').textContent = r.label;
    if (r.sub) el[i].querySelector('.st').textContent = r.sub;
  });
  var pvEl = $('pv'),
    pvId = rows[idx] && rows[idx].pv;
  if (pvId) {
    var pu = API + '/api/theme/preview/' + pvId;
    if (pvEl.getAttribute('data-id') !== pvId) {
      pvEl.setAttribute('data-id', pvId);
      pvEl.src = pu;
    }
    pvEl.style.display = 'block';
  } else {
    pvEl.style.display = 'none';
    pvEl.removeAttribute('data-id');
  }
  var inf = infoFor(rows[idx]),
    ie = $('info');
  ie.textContent = '';
  $('sub').style.wordBreak = '';
  if (view === 'notifyhow' || view === 'voicehow') {
    $('sub').textContent = kText;
    $('sub').style.whiteSpace = 'pre-line';
    $('sub').style.wordBreak = 'break-all';
    return;
  }
  if (view === 'notifyapi') {
    $('sub').textContent = 'Network notifications';
    return;
  }
  if (view === 'models') {
    $('sub').textContent = 'Choose the model that answers';
    return;
  }
  if (view === 'agents') {
    $('sub').textContent = 'Choose the Home Assistant agent';
    return;
  }
  if (view === 'channel') {
    $('sub').textContent = 'Where updates come from';
    return;
  }
  if (view === 'livetv') {
    $('sub').textContent = 'Live TV: your own playlist';
    return;
  }
  if (view === 'confirm-live-reset') {
    $('sub').textContent = 'Remove the playlist?';
    return;
  }
  if (view === 'themeopts') {
    $('sub').textContent = 'Theme options';
    return;
  }
  if (view === 'theme') {
    $('sub').textContent = 'Choose how Home looks. The change shows the next time you open Home.';
    return;
  }
  if (view === 'accent') {
    $('sub').textContent = 'The colour of the focus ring and highlights';
    return;
  }
  if (view === 'voice') {
    var vv = vo || {},
      ls = vv.last
        ? vv.last.text
          ? 'Last heard: \u201C' +
            vv.last.text +
            '\u201D' +
            (vv.last.ms ? ' (' + (vv.last.ms / 1000).toFixed(1) + ' s)' : '') +
            (vv.last.error ? '\nNot sent: ' + vv.last.error : '')
          : 'Last try: ' + vv.last.state + (vv.last.error ? '\n' + vv.last.error : '')
        : '';
    $('sub').textContent = 'Voice \u00B7 ' + (vv.engine || '') + (ls ? '\n' + ls : '');
    $('sub').style.whiteSpace = 'pre-line';
    if (inf) {
      var b2 = document.createElement('b');
      b2.textContent = inf.t;
      ie.appendChild(b2);
      ie.appendChild(document.createTextNode(inf.d));
    }
    return;
  }
  if (view === 'keys') {
    $('sub').textContent = kText;
    $('sub').style.whiteSpace = 'pre-line';
    return;
  }
  if (inf) {
    var b = document.createElement('b');
    b.textContent = inf.t;
    ie.appendChild(b);
    ie.appendChild(document.createTextNode(inf.d));
  }
  if (view === 'inputkey') {
    $('sub').textContent = 'Input key';
    return;
  }
  if (view === 'confirm-home' || view === 'confirm-uninstall') {
    $('sub').textContent = view === 'confirm-uninstall' ? 'Remove CleanYourTV?' : 'Switch Home?';
    return;
  }
  if (!offline && st) {
    var m = [];
    m.push('Launcher ' + st.frontend.version + ' · service ' + st.service.version);
    if (st.checkError) m.push('Updates: ' + st.checkError);
    else if (st.release) m.push('Latest release ' + st.release.version);
    $('sub').textContent = m.join('\n');
    $('sub').style.whiteSpace = 'pre-line';
  } else
    $('sub').textContent = offline
      ? 'The service is not running. Set it up to replace LG’s Home, take over the Input key and keep everything up to date.'
      : '';
}
function next(dir) {
  var n = rows.length,
    i = idx;
  do {
    i = (i + dir + n) % n;
  } while (rows[i].sep);
  idx = i;
  draw();
}
function act() {
  var r = rows[idx];
  if (r && r.fn && !(st && st.job && st.job.state === 'working' && r.dim)) r.fn();
}
