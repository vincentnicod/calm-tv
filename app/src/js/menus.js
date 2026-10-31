/* ---------- menus ---------- */
var stack = [],
  ovEl = null;
/* webOS 5's Chromium (68) can leave the old text in the compositor tile when an element's content is replaced, so menu and list text shows
   twice (issue 4). There the element is swapped for a fresh one instead of rewriting its content; newer engines just set innerHTML. */
var OLDGPU = (function () {
  var m = /Chrome\/(\d+)/.exec(navigator.userAgent || '');
  return !!m && +m[1] < 79;
})();
function setHtml(el, h) {
  if (!OLDGPU || !el.parentNode) {
    el.innerHTML = h;
    return el;
  }
  var n = el.cloneNode(false);
  n.innerHTML = h;
  el.parentNode.replaceChild(n, el);
  return n;
}
function openMenu(title, items) {
  stack.push({ title: title, items: items, idx: 0 });
  drawMenu();
}
function closeMenus() {
  stack = [];
  if (ovEl) {
    ovEl.remove();
    ovEl = null;
  }
}
function backMenu() {
  stack.pop();
  if (stack.length) drawMenu();
  else closeMenus();
}
function drawMenu() {
  var m = stack[stack.length - 1],
    N = 8,
    start = Math.max(0, Math.min(m.idx - 3, m.items.length - N));
  if (!ovEl) {
    ovEl = document.createElement('div');
    ovEl.id = 'ov';
    document.body.appendChild(ovEl);
  }
  var h = '<div class="panel"><h2></h2><div class="more">' + (start > 0 ? '▲' : '') + '</div>';
  for (var i = start; i < Math.min(m.items.length, start + N); i++) {
    var it = m.items[i];
    h +=
      '<div class="row' +
      (i === m.idx ? ' f' : '') +
      (it.dim ? ' dim' : '') +
      '" data-i="' +
      i +
      '">' +
      (it.icon ? svg(it.icon) : '') +
      '<span class="lb"></span>' +
      (it.sub ? '<span class="st"></span>' : '') +
      '</div>';
  }
  h += '<div class="more">' + (start + N < m.items.length ? '▼' : '') + '</div></div>';
  ovEl = setHtml(ovEl, h);
  ovEl.querySelector('h2').textContent = m.title;
  [].forEach.call(ovEl.querySelectorAll('.row'), function (row) {
    var it = m.items[+row.getAttribute('data-i')];
    row.querySelector('.lb').textContent = it.label;
    if (it.sub) row.querySelector('.st').textContent = it.sub;
    var pressT = 0,
      rowHeld = false;
    if (it.hold) {
      row.addEventListener('mousedown', function () {
        rowHeld = false;
        clearTimeout(pressT);
        pressT = setTimeout(function () {
          rowHeld = true;
          it.hold();
        }, 650);
      });
      row.addEventListener('mouseup', function () {
        clearTimeout(pressT);
      });
    }
    row.addEventListener('click', function () {
      if (rowHeld) {
        rowHeld = false;
        return;
      }
      m.idx = +row.getAttribute('data-i');
      pickMenu();
    });
  });
}
function pickMenu() {
  var m = stack[stack.length - 1],
    it = m.items[m.idx];
  if (it && it.fn) {
    var n = stack.length;
    it.fn();
    if (stack.length === n && !it.stay) closeMenus();
  }
}
function menuKey(k) {
  var m = stack[stack.length - 1];
  if (k === 38 && m.idx > 0) {
    m.idx--;
    drawMenu();
  } else if (k === 40 && m.idx < m.items.length - 1) {
    m.idx++;
    drawMenu();
  } else if (k === 13) pickMenu();
  else if (k === 461 || k === 27 || k === 8) backMenu();
  else return false;
  return true;
}

/* Back on the home screen lists the running apps to close them, as LG's Home does with its Recents on a second Back (issue 16) */
function runningMenu() {
  api('/api/running').then(
    function (x) {
      if (x.error) return toast(t('Could not read the running apps'));
      openMenu(t('Running apps'), runningItems(x.apps || []));
      stack[stack.length - 1].running = true;
    },
    function () {
      toast(t('Could not read the running apps'));
    }
  );
}
/* the list is only true for the moment it was read: it goes when Home is left, so it is never shown out of date */
function closeRunningMenu() {
  if (
    stack.some(function (m) {
      return m.running;
    })
  )
    closeMenus();
}
function runningItems(list) {
  if (!list.length) return [{ label: t('No apps are running'), dim: true }];
  var items = list.map(function (a) {
    return {
      label: a.title,
      sub: t('Close'),
      stay: true,
      fn: function () {
        closeRunning(list, [a.id]);
      },
    };
  });
  if (list.length > 1)
    items.push({
      label: t('Close all'),
      stay: true,
      fn: function () {
        closeRunning(
          list,
          list.map(function (a) {
            return a.id;
          })
        );
      },
    });
  return items;
}
/* the app manager's running list lags by seconds after a close, so the rows go at once instead of after a new reading */
function closeRunning(list, ids) {
  var m = stack[stack.length - 1],
    left = list.filter(function (a) {
      return ids.indexOf(a.id) < 0;
    });
  api('/api/running/close', ids.length > 1 ? { all: true } : { id: ids[0] }).then(
    function (x) {
      if (!x || x.returnValue !== true) toast(t('Could not close'));
    },
    function () {
      toast(t('Could not close'));
    }
  );
  m.items = runningItems(left);
  m.idx = Math.min(m.idx, m.items.length - 1);
  drawMenu();
}

/* the inputs, devices that are on first (calm.js); the one opened is remembered for the HDMI card */
function inputsMenu() {
  api('/api/inputs').then(
    function (x) {
      showInputs(gotInputs(x));
    },
    function () {
      toast(t('Could not read the inputs'));
    }
  );
}

function appMenu(a) {
  var di = dockIds(),
    pos = di.indexOf(a.id),
    items = [
      {
        label: t('Open'),
        fn: function () {
          launch(a.id);
        },
      },
    ];
  if (a.id === '__hdmi') items = items.concat(hdmiItems());
  if (pos >= 0) {
    if (pos > 0)
      items.push({
        label: t('Move left in dock'),
        fn: function () {
          var d = di.slice();
          d.splice(pos, 1);
          d.splice(pos - 1, 0, a.id);
          setDock(d);
        },
      });
    if (pos < di.length - 1)
      items.push({
        label: t('Move right in dock'),
        fn: function () {
          var d = di.slice();
          d.splice(pos, 1);
          d.splice(pos + 1, 0, a.id);
          setDock(d);
        },
      });
    items.push({
      label: t('Remove from dock'),
      fn: function () {
        setDock(
          di.filter(function (i) {
            return i !== a.id;
          })
        );
      },
    });
  } else if (di.length < TH.dockN)
    items.push({
      label: t('Add to dock'),
      fn: function () {
        setDock(di.concat(a.id));
      },
    });
  else
    items.push({
      label: t('Add to dock...'),
      stay: true,
      fn: function () {
        openMenu(
          t('Replace which app?'),
          di.map(function (id, i) {
            return {
              label: title(id),
              fn: function () {
                var d = di.slice();
                d[i] = a.id;
                setDock(d);
              },
            };
          })
        );
      },
    });
  if (a.id.charAt(0) !== '_')
    items.push({
      label: t('Icon and name...'),
      stay: true,
      fn: function () {
        looksMenu(a);
      },
    });
  if (a.input)
    items.push({
      label: t('Remove from Home'),
      fn: function () {
        pinInput(a.id, look(a).label, false);
      },
    });
  else
    items.push({
      label: t('Hide app'),
      fn: function () {
        hideApp(a.id);
      },
    });
  if (a.removable === true)
    items.push({
      label: t('Uninstall...'),
      stay: true,
      fn: function () {
        uninstallMenu(a);
      },
    });
  openMenu(look(a).label, items);
}

/* LG's own uninstall, through the service; Cancel comes first so a second OK does nothing harmful */
(function () {
  var add = {
    fr: {
      'Uninstall...': 'Désinstaller...',
      'Uninstall this app?': 'Désinstaller cette app ?',
      'Yes, uninstall': 'Oui, désinstaller',
      'Uninstalling...': 'Désinstallation...',
      'Uninstalled': 'Désinstallée',
      'Could not uninstall': 'Impossible de désinstaller',
      'Switch to LG Home?': 'Passer à LG Home ?',
      'Power off': 'Éteindre',
      'Power off completely?': 'Éteindre complètement ?',
      'Yes, power off': 'Oui, éteindre',
      'The next start is slower, and Wake-on-LAN will not wake the TV.':
        'Le prochain démarrage est plus lent, et Wake-on-LAN ne réveillera pas le téléviseur.',
      'Powering off...': 'Extinction...',
      'Could not power off': 'Impossible d’éteindre',
      'Add to Home': 'Ajouter à l’accueil',
      'Remove from Home': 'Retirer de l’accueil',
      'Inputs on Home': 'Entrées sur l’accueil',
      '%s added to Home': '%s ajouté à l’accueil',
      '%s removed from Home': '%s retiré de l’accueil',
      'Could not change Home': 'Impossible de modifier l’accueil',
      'for now, without a restart': 'pour l’instant, sans redémarrer',
      'Switch now': 'Passer maintenant',
      'about a minute': 'environ une minute',
      'Switching to LG Home... Come back with the CleanYourTV app or a restart.':
        'Passage à LG Home… Revenez avec l’app CleanYourTV ou en redémarrant.',
      'Could not switch': 'Impossible de basculer',
    },
    de: {
      'Uninstall...': 'Deinstallieren...',
      'Uninstall this app?': 'Diese App deinstallieren?',
      'Yes, uninstall': 'Ja, deinstallieren',
      'Uninstalling...': 'Wird deinstalliert...',
      'Uninstalled': 'Deinstalliert',
      'Could not uninstall': 'Deinstallieren nicht möglich',
      'Switch to LG Home?': 'Zu LG Home wechseln?',
      'Power off': 'Ausschalten',
      'Power off completely?': 'Ganz ausschalten?',
      'Yes, power off': 'Ja, ausschalten',
      'The next start is slower, and Wake-on-LAN will not wake the TV.':
        'Der nächste Start dauert länger, und Wake-on-LAN weckt den Fernseher nicht.',
      'Powering off...': 'Wird ausgeschaltet...',
      'Could not power off': 'Ausschalten nicht möglich',
      'Add to Home': 'Zu Home hinzufügen',
      'Remove from Home': 'Von Home entfernen',
      'Inputs on Home': 'Eingänge auf Home',
      '%s added to Home': '%s zu Home hinzugefügt',
      '%s removed from Home': '%s von Home entfernt',
      'Could not change Home': 'Home konnte nicht geändert werden',
      'for now, without a restart': 'vorübergehend, ohne Neustart',
      'Switch now': 'Jetzt wechseln',
      'about a minute': 'etwa eine Minute',
      'Switching to LG Home... Come back with the CleanYourTV app or a restart.':
        'Wechsel zu LG Home… Zurück mit der App CleanYourTV oder einem Neustart.',
      'Could not switch': 'Wechseln nicht möglich',
    },
    nl: {
      'Uninstall...': 'Verwijderen...',
      'Uninstall this app?': 'Deze app verwijderen?',
      'Yes, uninstall': 'Ja, verwijderen',
      'Uninstalling...': 'Bezig met verwijderen...',
      'Uninstalled': 'Verwijderd',
      'Could not uninstall': 'Verwijderen mislukt',
      'Switch to LG Home?': 'Naar LG Home?',
      'Power off': 'Uitschakelen',
      'Power off completely?': 'Helemaal uitschakelen?',
      'Yes, power off': 'Ja, uitschakelen',
      'The next start is slower, and Wake-on-LAN will not wake the TV.': 'De volgende start duurt langer, en Wake-on-LAN wekt de tv niet.',
      'Powering off...': 'Uitschakelen...',
      'Could not power off': 'Uitschakelen mislukt',
      'Add to Home': 'Aan Home toevoegen',
      'Remove from Home': 'Van Home verwijderen',
      'Inputs on Home': 'Ingangen op Home',
      '%s added to Home': '%s is aan Home toegevoegd',
      '%s removed from Home': '%s is van Home verwijderd',
      'Could not change Home': 'Kan Home niet aanpassen',
      'for now, without a restart': 'tijdelijk, zonder herstart',
      'Switch now': 'Nu wisselen',
      'about a minute': 'ongeveer een minuut',
      'Switching to LG Home... Come back with the CleanYourTV app or a restart.':
        'Naar LG Home… Terug met de app CleanYourTV of een herstart.',
      'Could not switch': 'Wisselen mislukt',
    },
    es: {
      'Uninstall...': 'Desinstalar...',
      'Uninstall this app?': '¿Desinstalar esta app?',
      'Yes, uninstall': 'Sí, desinstalar',
      'Uninstalling...': 'Desinstalando...',
      'Uninstalled': 'Desinstalada',
      'Could not uninstall': 'No se pudo desinstalar',
      'Switch to LG Home?': '¿Cambiar a LG Home?',
      'Power off': 'Apagar',
      'Power off completely?': '¿Apagar por completo?',
      'Yes, power off': 'Sí, apagar',
      'The next start is slower, and Wake-on-LAN will not wake the TV.':
        'El próximo inicio será más lento y Wake-on-LAN no despertará el televisor.',
      'Powering off...': 'Apagando...',
      'Could not power off': 'No se pudo apagar',
      'Add to Home': 'Añadir a Inicio',
      'Remove from Home': 'Quitar de Inicio',
      'Inputs on Home': 'Entradas en Inicio',
      '%s added to Home': '%s añadido a Inicio',
      '%s removed from Home': '%s quitado de Inicio',
      'Could not change Home': 'No se pudo cambiar Inicio',
      'for now, without a restart': 'por ahora, sin reiniciar',
      'Switch now': 'Cambiar ahora',
      'about a minute': 'un minuto aprox.',
      'Switching to LG Home... Come back with the CleanYourTV app or a restart.':
        'Cambiando a LG Home… Vuelva con la app CleanYourTV o reiniciando.',
      'Could not switch': 'No se pudo cambiar',
    },
  };
  for (var l in add) {
    TXL[l] = TXL[l] || {};
    for (var k in add[l]) TXL[l][k] = add[l][k];
  }
})();
function uninstallMenu(a) {
  var name = look(a).label;
  openMenu(t('Uninstall this app?'), [
    { label: t('Cancel'), fn: function () {} },
    {
      label: t('Yes, uninstall'),
      sub: name,
      fn: function () {
        toast(t('Uninstalling...') + ' ' + name);
        api('/api/uninstall', { id: a.id }).then(
          function (x) {
            if (!x || x.returnValue !== true) return toast(t('Could not uninstall') + ' ' + name);
            apps = apps.filter(function (b) {
              return b.id !== a.id;
            });
            store();
            rebuild();
            toast(t('Uninstalled') + ': ' + name);
          },
          function () {
            toast(t('Could not uninstall') + ' ' + name);
          }
        );
      },
    },
  ]);
}

/* the TV off completely, unlike the remote's power key (Quick Start+ standby): asked first, Cancel focused */
function powerOffMenu() {
  openMenu(t('Power off completely?'), [
    { label: t('Cancel'), fn: function () {} },
    {
      label: t('Yes, power off'),
      sub: t('The next start is slower, and Wake-on-LAN will not wake the TV.'),
      fn: function () {
        toast(t('Powering off...'));
        api('/api/power/off', {}).then(
          function (x) {
            if (x && x.error) toast(t('Could not power off'));
          },
          function () {}
        );
      },
    },
  ]);
}

/* an input on Home: the service keeps it and lists it with the apps (helper/apps.js) */
function pinInput(id, name, on) {
  api('/api/inputs/pin', { id: id, on: on }).then(
    function (x) {
      if (!x || x.returnValue !== true) return toast(t('Could not change Home'));
      toast((on ? t('%s added to Home') : t('%s removed from Home')).replace('%s', name));
      lastSig = '';
      load();
    },
    function () {
      toast(t('Could not change Home'));
    }
  );
}
function isPinned(id) {
  return apps.some(function (a) {
    return a.id === id && a.input;
  });
}
/* Customise > Inputs on Home: every input, OK puts it on Home or takes it off */
function pinMenu() {
  api('/api/inputs').then(
    function (x) {
      var devs = gotInputs(x);
      if (!devs.length) return toast(t('No HDMI inputs found'));
      openMenu(
        t('Inputs on Home'),
        devs.map(function (d) {
          var on = isPinned(d.appId);
          return {
            icon: 'hdmi',
            label: devName(d),
            sub: on ? '✓' : '',
            fn: function () {
              pinInput(d.appId, devName(d), !on);
            },
          };
        })
      );
    },
    function () {
      toast(t('Could not read the inputs'));
    }
  );
}

/* LG's Home until the manager app's "Back to CleanYourTV" or the next restart; CleanYourTV stays the Home the TV starts with */
function lgHomeMenu() {
  openMenu(t('Switch to LG Home?'), [
    { label: t('Cancel'), fn: function () {} },
    {
      label: t('Switch now'),
      sub: t('about a minute'),
      fn: function () {
        api('/api/lg-home', {}).then(
          function (x) {
            toast(
              x && x.returnValue === true
                ? t('Switching to LG Home... Come back with the CleanYourTV app or a restart.')
                : t('Could not switch')
            );
          },
          function () {
            toast(t('Could not switch'));
          }
        );
      },
    },
  ]);
}

function removeButton(o) {
  cfg.topbar = topbar().filter(function (b) {
    return b !== o;
  });
  saveCfg();
}
function barMenu(o) {
  openMenu(barLabel(o), [
    {
      label: t('Remove this button'),
      fn: function () {
        removeButton(o);
      },
    },
  ]);
}

function customizeMenu() {
  openMenu(t('Customise'), [
    {
      label: t('Style'),
      sub: (cfg.theme && cfg.theme.name) || '',
      stay: true,
      fn: styleMenu,
    },
    { label: t('Remote buttons'), stay: true, fn: RB.open },
    { label: 'LG Home', sub: t('for now, without a restart'), stay: true, fn: lgHomeMenu },
    { label: t('Inputs on Home'), stay: true, fn: pinMenu },
    idleItem(),
    nightItem(),
    placeItem(),
    weatherItem(),
    {
      label: 'Dock',
      sub: t('hold OK on an app'),
      stay: true,
      fn: function () {
        toast(t('Hold OK on any app to change the dock'));
      },
    },
    { label: t('Top buttons'), stay: true, fn: topButtonsMenu },
    { label: t('Hidden apps'), stay: true, fn: hiddenMenu },
    {
      label: t('App order'),
      sub: cfg.sort === 'alpha' ? t('A to Z') : t('Most used first'),
      fn: function () {
        cfg.sort = cfg.sort === 'alpha' ? 'usage' : 'alpha';
        saveCfg();
      },
    },
    {
      label: t('Clock'),
      sub: cfg.clock === '24' ? t('24-hour') : cfg.clock === '12' ? t('12-hour') : t('Automatic'),
      fn: function () {
        cfg.clock = cfg.clock === '24' ? '12' : cfg.clock === '12' ? 'auto' : '24';
        saveCfg();
        tick();
      },
    },
    {
      label: t('Reset customisation'),
      fn: function () {
        cfg = {};
        saveCfg();
      },
    },
  ]);
}
function topButtonsMenu() {
  var items = shownBar().map(function (o) {
    return {
      label: barLabel(o),
      sub: t('OK to remove'),
      fn: function () {
        removeButton(o);
      },
    };
  });
  items.push({ label: t('Add a button...'), stay: true, fn: addButtonMenu });
  openMenu(t('Top buttons'), items);
}
function addButtonMenu() {
  var items = PRESETS.filter(function (p) {
    return liveOn() || p.action !== 'live';
  }).map(function (p) {
    return {
      icon: p.icon,
      label: barLabel(p),
      fn: function () {
        cfg.topbar = topbar().concat([p]);
        saveCfg();
      },
    };
  });
  items.push({
    label: t('An app...'),
    stay: true,
    fn: function () {
      openMenu(
        t('Pick an app'),
        apps
          .slice()
          .sort(function (a, b) {
            return a.title.localeCompare(b.title);
          })
          .map(function (a) {
            return {
              label: a.title,
              fn: function () {
                cfg.topbar = topbar().concat([{ label: a.title, icon: 'grid', app: a.id }]);
                saveCfg();
              },
            };
          })
      );
    },
  });
  openMenu(t('Add a button'), items);
}
function hiddenMenu() {
  var h = (cfg.hidden || []).filter(function (id) {
    return apps.some(function (a) {
      return a.id === id;
    });
  });
  if (!h.length) return toast(t('No hidden apps'));
  openMenu(
    t('Hidden apps (OK to show again)'),
    h.map(function (id) {
      return {
        label: title(id),
        fn: function () {
          unhideApp(id);
        },
      };
    })
  );
}
