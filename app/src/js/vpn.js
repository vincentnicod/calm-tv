/* ---------- the VPN (Customise > VPN): the service's WireGuard tunnel (helper/vpn.js). Servers are added from a phone (a provider's
   WireGuard file, such as Proton VPN's); the date line says "· VPN" while it is connected; an app's menu can pause it while that app is open
   ---------- */
(function () {
  var add = {
    fr: {
      'Turn on': 'Activer',
      'Turn off': 'Désactiver',
      Connected: 'Connecté',
      'Connecting...': 'Connexion...',
      'Not connected': 'Non connecté',
      'Paused while %s is open': 'En pause pendant %s',
      'Add a server': 'Ajouter un serveur',
      Server: 'Serveur',
      'Add a server...': 'Ajouter un serveur...',
      'Remove a server...': 'Retirer un serveur...',
      'Remove this server?': 'Retirer ce serveur ?',
      'Yes, remove': 'Oui, retirer',
      'Block the internet if the VPN drops': 'Bloquer internet si le VPN tombe',
      'Pause for apps': 'Pause pour des apps',
      'hold OK on an app': 'maintenir OK sur une app',
      'Hold OK on an app to pause the VPN while it is open': 'Maintenez OK sur une app pour mettre le VPN en pause quand elle est ouverte',
      'Pause the VPN while open': 'VPN en pause quand ouverte',
      'Add a VPN server': 'Ajouter un serveur VPN',
      'open this on your phone or computer': 'ouvrez ceci sur votre téléphone ou ordinateur',
      'then enter this code and the WireGuard file': 'puis entrez ce code et le fichier WireGuard',
      'Proton VPN: account.proton.me › Downloads › WireGuard': 'Proton VPN : account.proton.me › Téléchargements › WireGuard',
      Done: 'Terminé',
      'Server added': 'Serveur ajouté',
      'Could not read the VPN': 'Impossible de lire le VPN',
      'Could not change the VPN': 'Impossible de modifier le VPN',
      'VPN paused': 'VPN en pause',
      'VPN not connected': 'VPN non connecté',
    },
    de: {
      'Turn on': 'Einschalten',
      'Turn off': 'Ausschalten',
      Connected: 'Verbunden',
      'Connecting...': 'Verbinde...',
      'Not connected': 'Nicht verbunden',
      'Paused while %s is open': 'Pausiert, solange %s offen ist',
      'Add a server': 'Server hinzufügen',
      Server: 'Server',
      'Add a server...': 'Server hinzufügen...',
      'Remove a server...': 'Server entfernen...',
      'Remove this server?': 'Diesen Server entfernen?',
      'Yes, remove': 'Ja, entfernen',
      'Block the internet if the VPN drops': 'Internet sperren, wenn das VPN ausfällt',
      'Pause for apps': 'Pause für Apps',
      'hold OK on an app': 'OK auf einer App halten',
      'Hold OK on an app to pause the VPN while it is open': 'Halten Sie OK auf einer App, um das VPN zu pausieren, solange sie offen ist',
      'Pause the VPN while open': 'VPN pausieren, solange offen',
      'Add a VPN server': 'VPN-Server hinzufügen',
      'open this on your phone or computer': 'auf dem Handy oder Computer öffnen',
      'then enter this code and the WireGuard file': 'dann diesen Code und die WireGuard-Datei eingeben',
      'Proton VPN: account.proton.me › Downloads › WireGuard': 'Proton VPN: account.proton.me › Downloads › WireGuard',
      Done: 'Fertig',
      'Server added': 'Server hinzugefügt',
      'Could not read the VPN': 'VPN konnte nicht gelesen werden',
      'Could not change the VPN': 'VPN konnte nicht geändert werden',
      'VPN paused': 'VPN pausiert',
      'VPN not connected': 'VPN nicht verbunden',
    },
    nl: {
      'Turn on': 'Aanzetten',
      'Turn off': 'Uitzetten',
      Connected: 'Verbonden',
      'Connecting...': 'Verbinden...',
      'Not connected': 'Niet verbonden',
      'Paused while %s is open': 'Gepauzeerd zolang %s open is',
      'Add a server': 'Server toevoegen',
      Server: 'Server',
      'Add a server...': 'Server toevoegen...',
      'Remove a server...': 'Server verwijderen...',
      'Remove this server?': 'Deze server verwijderen?',
      'Yes, remove': 'Ja, verwijderen',
      'Block the internet if the VPN drops': 'Internet blokkeren als de VPN wegvalt',
      'Pause for apps': 'Pauze voor apps',
      'hold OK on an app': 'houd OK op een app',
      'Hold OK on an app to pause the VPN while it is open': 'Houd OK op een app om de VPN te pauzeren zolang die open is',
      'Pause the VPN while open': 'VPN pauzeren zolang open',
      'Add a VPN server': 'VPN-server toevoegen',
      'open this on your phone or computer': 'open dit op je telefoon of computer',
      'then enter this code and the WireGuard file': 'voer dan deze code en het WireGuard-bestand in',
      'Proton VPN: account.proton.me › Downloads › WireGuard': 'Proton VPN: account.proton.me › Downloads › WireGuard',
      Done: 'Klaar',
      'Server added': 'Server toegevoegd',
      'Could not read the VPN': 'Kon de VPN niet lezen',
      'Could not change the VPN': 'Kon de VPN niet wijzigen',
      'VPN paused': 'VPN gepauzeerd',
      'VPN not connected': 'VPN niet verbonden',
    },
    es: {
      'Turn on': 'Activar',
      'Turn off': 'Desactivar',
      Connected: 'Conectado',
      'Connecting...': 'Conectando...',
      'Not connected': 'No conectado',
      'Paused while %s is open': 'En pausa mientras %s está abierta',
      'Add a server': 'Añadir un servidor',
      Server: 'Servidor',
      'Add a server...': 'Añadir un servidor...',
      'Remove a server...': 'Quitar un servidor...',
      'Remove this server?': '¿Quitar este servidor?',
      'Yes, remove': 'Sí, quitar',
      'Block the internet if the VPN drops': 'Bloquear internet si el VPN cae',
      'Pause for apps': 'Pausa para apps',
      'hold OK on an app': 'mantén OK en una app',
      'Hold OK on an app to pause the VPN while it is open': 'Mantén OK en una app para pausar el VPN mientras esté abierta',
      'Pause the VPN while open': 'Pausar el VPN mientras esté abierta',
      'Add a VPN server': 'Añadir un servidor VPN',
      'open this on your phone or computer': 'abre esto en tu teléfono u ordenador',
      'then enter this code and the WireGuard file': 'luego introduce este código y el archivo WireGuard',
      'Proton VPN: account.proton.me › Downloads › WireGuard': 'Proton VPN: account.proton.me › Descargas › WireGuard',
      Done: 'Listo',
      'Server added': 'Servidor añadido',
      'Could not read the VPN': 'No se pudo leer el VPN',
      'Could not change the VPN': 'No se pudo cambiar el VPN',
      'VPN paused': 'VPN en pausa',
      'VPN not connected': 'VPN no conectado',
    },
  };
  for (var l in add) {
    TXL[l] = TXL[l] || {};
    for (var k in add[l]) TXL[l][k] = add[l][k];
  }
})();

var vpnNow = null;
function refreshVpn() {
  api('/api/vpn').then(
    function (x) {
      var was = vpnText();
      vpnNow = x && x.state ? x : null;
      if (vpnText() !== was) tick();
    },
    function () {}
  );
}
/* after the date (input.js tick): nothing while the VPN is off */
function vpnText() {
  if (!vpnNow || !vpnNow.on) return '';
  var s = vpnNow.state;
  if (s === 'connected') return ' · VPN';
  if (s === 'paused') return ' · ' + t('VPN paused');
  if (s === 'error') return ' · ' + t('VPN not connected');
  return ' · VPN…';
}
function vpnAppTitle(id) {
  var a = apps.filter(function (b) {
    return b.id === id;
  })[0];
  return a ? look(a).label : id;
}
function vpnWords(x) {
  if (!x.servers.length) return t('Add a server');
  if (x.state === 'connected') return t('Connected');
  if (x.state === 'starting' || x.state === 'waiting') return t('Connecting...');
  if (x.state === 'paused') return t('Paused while %s is open').replace('%s', vpnAppTitle(x.paused));
  if (x.state === 'error') return x.error || t('Not connected');
  return t('Disabled');
}
function vpnServerName(x, id) {
  var s = x.servers.filter(function (v) {
    return v.id === id;
  })[0];
  return s ? s.name : '';
}
function vpnItem() {
  return {
    label: 'VPN',
    sub: vpnNow ? vpnWords(vpnNow) : '',
    stay: true,
    fn: vpnMenu,
  };
}
function vpnMenu() {
  api('/api/vpn').then(
    function (x) {
      vpnNow = x;
      tick();
      if (!x.servers.length) return vpnAddMenu();
      openMenu('VPN', vpnRows(x));
      stack[stack.length - 1].vpn = true;
    },
    function () {
      toast(t('Could not read the VPN'));
    }
  );
}
function vpnRows(x) {
  return [
    {
      label: x.on ? t('Turn off') : t('Turn on'),
      sub: vpnWords(x),
      stay: true,
      fn: function () {
        if (!x.on) toast(t('Connecting...'));
        vpnSet({ on: !x.on });
      },
    },
    { label: t('Server'), sub: vpnServerName(x, x.server), stay: true, fn: vpnServerMenu },
    {
      label: t('Block the internet if the VPN drops'),
      sub: x.kill ? t('Enabled') : t('Disabled'),
      stay: true,
      fn: function () {
        vpnSet({ kill: !x.kill });
      },
    },
    {
      label: t('Pause for apps'),
      sub: x.pauseFor.length ? x.pauseFor.map(vpnAppTitle).join(', ') : t('hold OK on an app'),
      stay: true,
      fn: function () {
        toast(t('Hold OK on an app to pause the VPN while it is open'));
      },
    },
    { label: t('Add a server...'), stay: true, fn: vpnAddMenu },
    { label: t('Remove a server...'), stay: true, fn: vpnRemoveMenu },
  ];
}
/* the VPN menu drawn again with what the service says now, the focus kept */
function vpnRedraw(x) {
  vpnNow = x;
  tick();
  for (var i = stack.length - 1; i >= 0; i--)
    if (stack[i].vpn) {
      stack.length = i + 1;
      stack[i].items = vpnRows(x);
      return drawMenu();
    }
}
function vpnSet(b) {
  api('/api/vpn', b).then(
    function (x) {
      if (!x || x.error === 'add a server first' || !x.servers) return toast(t('Could not change the VPN'));
      vpnRedraw(x);
      if (x.state === 'error') toast(x.error);
      /* the first handshake takes a moment: ask again shortly */
      if (x.on && x.state !== 'connected')
        setTimeout(function () {
          api('/api/vpn').then(function (y) {
            if (stack.length && stack[stack.length - 1].vpn) vpnRedraw(y);
            else vpnNow = y;
            tick();
          });
        }, 3000);
    },
    function () {
      toast(t('Could not change the VPN'));
    }
  );
}
function vpnServerMenu() {
  var x = vpnNow;
  openMenu(
    t('Server'),
    x.servers.map(function (s) {
      return {
        label: s.name,
        sub: (s.cc ? s.cc + ' ' : '') + (s.id === x.server ? '✓' : ''),
        stay: true,
        fn: function () {
          stack.pop();
          vpnSet({ server: s.id });
        },
      };
    })
  );
}
function vpnRemoveMenu() {
  var x = vpnNow;
  openMenu(
    t('Remove a server...'),
    x.servers.map(function (s) {
      return {
        label: s.name,
        stay: true,
        fn: function () {
          openMenu(t('Remove this server?'), [
            { label: t('Cancel'), stay: true, fn: backMenu },
            {
              label: t('Yes, remove'),
              sub: s.name,
              stay: true,
              fn: function () {
                api('/api/vpn/remove', { id: s.id }).then(
                  function (y) {
                    if (!y || !y.servers) return toast(t('Could not change the VPN'));
                    vpnNow = y;
                    tick();
                    if (!y.servers.length) return closeMenus();
                    vpnRedraw(y);
                  },
                  function () {
                    toast(t('Could not change the VPN'));
                  }
                );
              },
            },
          ]);
        },
      };
    })
  );
}
/* the address and code of the service's page on the home network; the menu closes by itself once a server came in */
function vpnAddMenu() {
  var before = vpnNow ? vpnNow.servers.length : 0;
  api('/api/vpn/pair', {}).then(
    function (p) {
      openMenu(t('Add a VPN server'), [
        { label: p.url, sub: t('open this on your phone or computer') },
        { label: p.code, sub: t('then enter this code and the WireGuard file') },
        { label: t('Proton VPN: account.proton.me › Downloads › WireGuard'), dim: true },
        {
          label: t('Done'),
          fn: function () {
            api('/api/vpn/pair/stop', {});
          },
        },
      ]);
      var m = stack[stack.length - 1];
      m.idx = 3;
      drawMenu();
      var poll = setInterval(function () {
        if (stack[stack.length - 1] !== m) return clearInterval(poll);
        api('/api/vpn').then(function (x) {
          if (stack[stack.length - 1] !== m || !x || !x.servers || x.servers.length <= before) return;
          clearInterval(poll);
          toast(t('Server added'));
          stack.pop();
          vpnNow = x;
          if (stack.length && stack[stack.length - 1].vpn) vpnRedraw(x);
          else {
            openMenu('VPN', vpnRows(x));
            stack[stack.length - 1].vpn = true;
          }
        });
      }, 2500);
    },
    function () {
      toast(t('Could not change the VPN'));
    }
  );
}
/* in an app's menu (hold OK): pause the VPN while this app is in front */
function vpnAppItem(a) {
  if (!vpnNow || !vpnNow.servers || !vpnNow.servers.length || a.input || a.id.charAt(0) === '_') return null;
  var on = vpnNow.pauseFor.indexOf(a.id) >= 0;
  return {
    label: t('Pause the VPN while open'),
    sub: on ? '✓' : '',
    fn: function () {
      api('/api/vpn/pause-for', { id: a.id, on: !on }).then(
        function (x) {
          if (!x || x.returnValue !== true) return toast(t('Could not change the VPN'));
          vpnNow.pauseFor = x.pauseFor;
          toast(look(a).label + ': ' + (on ? t('Disabled') : t('Pause the VPN while open')));
        },
        function () {
          toast(t('Could not change the VPN'));
        }
      );
    },
  };
}
/* Home asks once at start, then while the VPN is on (every 20 seconds while Home is on screen) and each time Home comes back */
refreshVpn();
setInterval(function () {
  if (!document.hidden && vpnNow && vpnNow.on) refreshVpn();
}, 20000);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) refreshVpn();
});
