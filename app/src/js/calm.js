/* ---------- Calm: the HDMI card, app looks (a name and a drawn icon in place of the app's own), the favourites the dock starts with,
   and the remote's number and colour keys. Everything here works with any theme. ---------- */
(function () {
  var add = {
    fr: {
      'All apps': 'Toutes les apps',
      'No HDMI inputs found': 'Aucune entrée HDMI trouvée',
      'Could not read the inputs': 'Impossible de lire les entrées',
      'Automatic (the device that is on)': 'Automatique (l’appareil allumé)',
      'Always': 'Toujours',
      'All inputs...': 'Toutes les entrées...',
      'Icon and name...': 'Icône et nom...',
      'The app’s own icon': 'L’icône de l’app',
      'Which input?': 'Quelle entrée ?',
      'Nothing connected': 'Rien de branché',
      'Style': 'Style',
      'Could not change the style': 'Impossible de changer de style',
      'It will open': 'Il ouvrira',
      'The first time, LG still does its own thing: then come back to Home.':
        'La première fois, LG fait encore son action : revenez ensuite à l’accueil.',
      'Done': 'C’est fait',
      'Give a button of the remote to an app or an input. It works everywhere, not only here.':
        'Donnez un bouton de la télécommande à une app ou à une entrée. Il fonctionne partout, pas seulement ici.',
      'The app buttons (Netflix, Prime Video...) are the obvious ones to give':
        'Les boutons des apps (Netflix, Prime Video…) sont tout indiqués',
      "The device's own name": 'Le nom de l’appareil',
      'Set-top box': 'Décodeur',
      'TV box': 'Box TV',
      'Game console': 'Console',
      'Name...': 'Nom...',
      'Idle screen': 'Écran de repos',
      'Night mode': 'Mode nuit',
      'Weather': 'Météo',
      'Enabled': 'Activé',
      'Disabled': 'Désactivé',
      'after 3 min': 'après 3 min',
      'after 10 min': 'après 10 min',
      'Clear': 'Dégagé',
      'Mostly clear': 'Plutôt dégagé',
      'Partly cloudy': 'Nuageux',
      'Overcast': 'Couvert',
      'Fog': 'Brouillard',
      'Drizzle': 'Bruine',
      'Rain': 'Pluie',
      'Snow': 'Neige',
      'Showers': 'Averses',
      'Snow showers': 'Averses de neige',
      'Thunderstorm': 'Orage',
      'Which city?': 'Quelle ville ?',
      'City': 'Ville',
      'None (fixed hours)': 'Aucune (heures fixes)',
      '22:00 to sunrise': '22:00–lever du soleil',
      'Remote buttons': 'Boutons de la télécommande',
      'Quick settings': 'Réglages rapides',
      'Picture, sound, sleep timer': 'Image, son, mise en veille',
      'Quick settings are not available': 'Réglages rapides indisponibles',
      'Teach a button...': 'Apprendre un bouton...',
      'Which app should it open?': 'Quelle app doit-il ouvrir ?',
      'Button': 'Bouton',
      'Open another app...': 'Ouvrir une autre app...',
      'Give it back to LG': 'Le rendre à LG',
      'The button does what LG intended again': 'Le bouton refait ce que LG prévoyait',
      'Could not save the button': 'Impossible d’enregistrer le bouton',
      'Could not read the remote buttons': 'Impossible de lire les boutons',
      'Press the button': 'Appuyez sur le bouton',
      'Waiting...': 'En attente...',
      'If an app opens, come back to Home': 'Si une app s’ouvre, revenez à l’accueil',
      'Cancel': 'Annuler',
      'The button now opens': 'Le bouton ouvre maintenant',
      'This button is kept for its own use: choose another one': 'Ce bouton garde son rôle : choisissez-en un autre',
      'No button was pressed': 'Aucun bouton n’a été pressé',
      'The remote cannot be read on this TV': 'La télécommande ne peut pas être lue sur ce téléviseur',
      'Twelve buttons are already taught': 'Douze boutons sont déjà appris',
    },
    de: {
      'All apps': 'Alle Apps',
      'No HDMI inputs found': 'Keine HDMI-Eingänge gefunden',
      'Could not read the inputs': 'Die Eingänge können nicht gelesen werden',
      'Automatic (the device that is on)': 'Automatisch (das eingeschaltete Gerät)',
      'Always': 'Immer',
      'All inputs...': 'Alle Eingänge...',
      'Icon and name...': 'Symbol und Name...',
      'The app’s own icon': 'Das Symbol der App',
      'Which input?': 'Welcher Eingang?',
      'Nothing connected': 'Nichts angeschlossen',
      'Style': 'Stil',
      'Could not change the style': 'Der Stil kann nicht geändert werden',
      'It will open': 'Sie öffnet',
      'The first time, LG still does its own thing: then come back to Home.':
        'Beim ersten Mal tut LG noch das Seine: dann zurück zum Home.',
      'Done': 'Fertig',
      'Give a button of the remote to an app or an input. It works everywhere, not only here.':
        'Gib eine Taste der Fernbedienung einer App oder einem Eingang. Sie wirkt überall, nicht nur hier.',
      'The app buttons (Netflix, Prime Video...) are the obvious ones to give': 'Die App-Tasten (Netflix, Prime Video…) bieten sich an',
      "The device's own name": 'Der Name des Geräts',
      'Set-top box': 'Set-Top-Box',
      'TV box': 'TV-Box',
      'Game console': 'Spielkonsole',
      'Name...': 'Name...',
      'Idle screen': 'Ruhebildschirm',
      'Night mode': 'Nachtmodus',
      'Weather': 'Wetter',
      'Enabled': 'An',
      'Disabled': 'Aus',
      'after 3 min': 'nach 3 Min.',
      'after 10 min': 'nach 10 Min.',
      'Clear': 'Klar',
      'Mostly clear': 'Überwiegend klar',
      'Partly cloudy': 'Teilweise bewölkt',
      'Overcast': 'Bedeckt',
      'Fog': 'Nebel',
      'Drizzle': 'Nieselregen',
      'Rain': 'Regen',
      'Snow': 'Schnee',
      'Showers': 'Schauer',
      'Snow showers': 'Schneeschauer',
      'Thunderstorm': 'Gewitter',
      'Which city?': 'Welche Stadt?',
      'City': 'Stadt',
      'None (fixed hours)': 'Keine (feste Zeiten)',
      '22:00 to sunrise': '22:00–Sonnenaufgang',
      'Remote buttons': 'Fernbedienungstasten',
      'Quick settings': 'Schnelleinstellungen',
      'Picture, sound, sleep timer': 'Bild, Ton, Sleep-Timer',
      'Quick settings are not available': 'Schnelleinstellungen nicht verfügbar',
      'Teach a button...': 'Taste anlernen...',
      'Which app should it open?': 'Welche App soll sie öffnen?',
      'Button': 'Taste',
      'Open another app...': 'Andere App öffnen...',
      'Give it back to LG': 'An LG zurückgeben',
      'The button does what LG intended again': 'Die Taste macht wieder, was LG vorsah',
      'Could not save the button': 'Die Taste kann nicht gespeichert werden',
      'Could not read the remote buttons': 'Die Tasten können nicht gelesen werden',
      'Press the button': 'Drücke die Taste',
      'Waiting...': 'Warten...',
      'If an app opens, come back to Home': 'Öffnet sich eine App, zurück zum Home',
      'Cancel': 'Abbrechen',
      'The button now opens': 'Die Taste öffnet jetzt',
      'This button is kept for its own use: choose another one': 'Diese Taste behält ihre Aufgabe: wähle eine andere',
      'No button was pressed': 'Keine Taste gedrückt',
      'The remote cannot be read on this TV': 'Die Fernbedienung kann auf diesem Fernseher nicht gelesen werden',
      'Twelve buttons are already taught': 'Zwölf Tasten sind schon angelernt',
    },
    nl: {
      'All apps': 'Alle apps',
      'No HDMI inputs found': 'Geen HDMI-ingangen gevonden',
      'Could not read the inputs': 'Kan de ingangen niet lezen',
      'Automatic (the device that is on)': 'Automatisch (het apparaat dat aan staat)',
      'Always': 'Altijd',
      'All inputs...': 'Alle ingangen...',
      'Icon and name...': 'Pictogram en naam...',
      'The app’s own icon': 'Het eigen pictogram van de app',
      'Which input?': 'Welke ingang?',
      'Nothing connected': 'Niets aangesloten',
      'Style': 'Stijl',
      'Could not change the style': 'Kan de stijl niet wijzigen',
      'It will open': 'Hij opent',
      'The first time, LG still does its own thing: then come back to Home.':
        'De eerste keer doet LG nog zijn eigen ding: ga daarna terug naar Home.',
      'Done': 'Klaar',
      'Give a button of the remote to an app or an input. It works everywhere, not only here.':
        'Geef een knop van de afstandsbediening aan een app of een ingang. Hij werkt overal, niet alleen hier.',
      'The app buttons (Netflix, Prime Video...) are the obvious ones to give':
        'De app-knoppen (Netflix, Prime Video…) liggen voor de hand',
      "The device's own name": 'De naam van het apparaat',
      'Set-top box': 'Settopbox',
      'TV box': 'Tv-box',
      'Game console': 'Spelconsole',
      'Name...': 'Naam...',
      'Idle screen': 'Rustscherm',
      'Night mode': 'Nachtmodus',
      'Weather': 'Weer',
      'Enabled': 'Aan',
      'Disabled': 'Uit',
      'after 3 min': 'na 3 min',
      'after 10 min': 'na 10 min',
      'Clear': 'Helder',
      'Mostly clear': 'Vrij helder',
      'Partly cloudy': 'Half bewolkt',
      'Overcast': 'Bewolkt',
      'Fog': 'Mist',
      'Drizzle': 'Motregen',
      'Rain': 'Regen',
      'Snow': 'Sneeuw',
      'Showers': 'Buien',
      'Snow showers': 'Sneeuwbuien',
      'Thunderstorm': 'Onweer',
      'Which city?': 'Welke stad?',
      'City': 'Stad',
      'None (fixed hours)': 'Geen (vaste tijden)',
      '22:00 to sunrise': '22:00–zonsopgang',
      'Remote buttons': 'Knoppen van de afstandsbediening',
      'Quick settings': 'Snelle instellingen',
      'Picture, sound, sleep timer': 'Beeld, geluid, slaaptimer',
      'Quick settings are not available': 'Snelle instellingen niet beschikbaar',
      'Teach a button...': 'Een knop aanleren...',
      'Which app should it open?': 'Welke app moet hij openen?',
      'Button': 'Knop',
      'Open another app...': 'Een andere app openen...',
      'Give it back to LG': 'Teruggeven aan LG',
      'The button does what LG intended again': 'De knop doet weer wat LG bedoelde',
      'Could not save the button': 'Kan de knop niet opslaan',
      'Could not read the remote buttons': 'Kan de knoppen niet lezen',
      'Press the button': 'Druk op de knop',
      'Waiting...': 'Wachten...',
      'If an app opens, come back to Home': 'Opent er een app, ga dan terug naar Home',
      'Cancel': 'Annuleren',
      'The button now opens': 'De knop opent nu',
      'This button is kept for its own use: choose another one': 'Deze knop houdt zijn eigen taak: kies een andere',
      'No button was pressed': 'Er is geen knop ingedrukt',
      'The remote cannot be read on this TV': 'De afstandsbediening kan op deze tv niet worden gelezen',
      'Twelve buttons are already taught': 'Er zijn al twaalf knoppen aangeleerd',
    },
    es: {
      'All apps': 'Todas las apps',
      'No HDMI inputs found': 'No se encontraron entradas HDMI',
      'Could not read the inputs': 'No se pueden leer las entradas',
      'Automatic (the device that is on)': 'Automático (el aparato encendido)',
      'Always': 'Siempre',
      'All inputs...': 'Todas las entradas...',
      'Icon and name...': 'Icono y nombre...',
      'The app’s own icon': 'El icono de la app',
      'Which input?': '¿Qué entrada?',
      'Nothing connected': 'Nada conectado',
      'Style': 'Estilo',
      'Could not change the style': 'No se puede cambiar el estilo',
      'It will open': 'Abrirá',
      'The first time, LG still does its own thing: then come back to Home.':
        'La primera vez, LG hace aún lo suyo: luego vuelve al inicio.',
      'Done': 'Hecho',
      'Give a button of the remote to an app or an input. It works everywhere, not only here.':
        'Da un botón del mando a una app o a una entrada. Funciona en todas partes, no solo aquí.',
      'The app buttons (Netflix, Prime Video...) are the obvious ones to give':
        'Los botones de apps (Netflix, Prime Video…) son los indicados',
      "The device's own name": 'El nombre del aparato',
      'Set-top box': 'Decodificador',
      'TV box': 'TV box',
      'Game console': 'Consola',
      'Name...': 'Nombre...',
      'Idle screen': 'Pantalla de reposo',
      'Night mode': 'Modo noche',
      'Weather': 'Tiempo',
      'Enabled': 'Activado',
      'Disabled': 'Desactivado',
      'after 3 min': 'tras 3 min',
      'after 10 min': 'tras 10 min',
      'Clear': 'Despejado',
      'Mostly clear': 'Mayormente despejado',
      'Partly cloudy': 'Parcialmente nublado',
      'Overcast': 'Cubierto',
      'Fog': 'Niebla',
      'Drizzle': 'Llovizna',
      'Rain': 'Lluvia',
      'Snow': 'Nieve',
      'Showers': 'Chubascos',
      'Snow showers': 'Chubascos de nieve',
      'Thunderstorm': 'Tormenta',
      'Which city?': '¿Qué ciudad?',
      'City': 'Ciudad',
      'None (fixed hours)': 'Ninguna (horas fijas)',
      '22:00 to sunrise': '22:00–amanecer',
      'Remote buttons': 'Botones del mando',
      'Quick settings': 'Ajustes rápidos',
      'Picture, sound, sleep timer': 'Imagen, sonido, temporizador',
      'Quick settings are not available': 'Ajustes rápidos no disponibles',
      'Teach a button...': 'Enseñar un botón...',
      'Which app should it open?': '¿Qué app debe abrir?',
      'Button': 'Botón',
      'Open another app...': 'Abrir otra app...',
      'Give it back to LG': 'Devolverlo a LG',
      'The button does what LG intended again': 'El botón vuelve a hacer lo que LG preveía',
      'Could not save the button': 'No se puede guardar el botón',
      'Could not read the remote buttons': 'No se pueden leer los botones',
      'Press the button': 'Pulsa el botón',
      'Waiting...': 'Esperando...',
      'If an app opens, come back to Home': 'Si se abre una app, vuelve al inicio',
      'Cancel': 'Cancelar',
      'The button now opens': 'El botón ahora abre',
      'This button is kept for its own use: choose another one': 'Este botón conserva su función: elige otro',
      'No button was pressed': 'No se pulsó ningún botón',
      'The remote cannot be read on this TV': 'El mando no se puede leer en este televisor',
      'Twelve buttons are already taught': 'Ya hay doce botones enseñados',
    },
  };
  for (var l in add) {
    TXL[l] = TXL[l] || {};
    for (var k in add[l]) TXL[l][k] = add[l][k];
  }
})();

/* ---------- drawn icons: b = the tile, c = the ambient glow, svg = a 64 x 64 drawing in currentColor (white on a colour) ----------
   The service keeps only these names (helper/apps.js, GLYPHS): add a name there too. */
var GLYPHS = {
  youtube: {
    name: 'YouTube',
    b: [255, 0, 51],
    c: [255, 0, 51],
    svg: '<path fill-rule="evenodd" fill="currentColor" d="M16 14h32a11 11 0 0 1 11 11v14a11 11 0 0 1-11 11H16A11 11 0 0 1 5 39V25a11 11 0 0 1 11-11zM27 23.5v17l14.5-8.5z"/>',
  },
  iptv: {
    name: 'IPTV',
    b: [84, 66, 230],
    c: [118, 92, 255],
    svg:
      '<circle cx="32" cy="32" r="5.5" fill="currentColor"/>' +
      '<path d="M21.5 21.5a15 15 0 0 0 0 21M42.5 21.5a15 15 0 0 1 0 21M14 14a25.5 25.5 0 0 0 0 36M50 14a25.5 25.5 0 0 1 0 36" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>',
  },
  tv: {
    name: 'TV',
    b: [20, 120, 255],
    c: [30, 130, 255],
    svg:
      '<rect x="6" y="11" width="52" height="35" rx="7" fill="none" stroke="currentColor" stroke-width="3.2"/>' +
      '<path d="M22 54h20" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M28 22v13l10.5-6.5z" fill="currentColor"/>',
  },
  hdmi: {
    name: 'HDMI',
    b: [48, 52, 62],
    c: [96, 108, 132],
    svg:
      '<path d="M7 21h50v13l-8 10H15L7 34z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M18 30h28" stroke="currentColor" stroke-width="3.6" stroke-dasharray="3 4" fill="none"/>',
  },
  film: {
    name: 'Films',
    b: [214, 38, 64],
    c: [226, 48, 74],
    svg:
      '<rect x="8" y="25" width="48" height="29" rx="5" fill="none" stroke="currentColor" stroke-width="3.2"/>' +
      '<path d="M7.5 22.5l45-11.5 2.2 8-45 11.5z" fill="currentColor"/><path d="M27 33v13l10.5-6.5z" fill="currentColor"/>',
  },
  music: {
    name: 'Music',
    b: [22, 170, 100],
    c: [31, 196, 110],
    svg:
      '<path d="M26 46V16l24-5v29" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<circle cx="20" cy="46" r="6.5" fill="currentColor"/><circle cx="44" cy="40" r="6.5" fill="currentColor"/>',
  },
  sport: {
    name: 'Sport',
    b: [255, 132, 0],
    c: [255, 140, 20],
    svg:
      '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3.2"/>' +
      '<path d="M32 22l9.5 6.9-3.6 11.1H26.1l-3.6-11.1z" fill="currentColor"/>',
  },
};
var GLYPH_MENU = ['youtube', 'iptv', 'tv', 'film', 'music', 'sport'];
function glyphSvg(g) {
  return '<svg class="glyph" viewBox="0 0 64 64">' + GLYPHS[g].svg + '</svg>';
}
/* a drawn tile: the class gives it a gradient (home.css), paint() the colours the glow and the fallback background use */
function glyphTile(d, face, g) {
  var gl = GLYPHS[g];
  d.classList.add('gl', 'gl-' + g);
  d._col = { c: gl.c, b: gl.b };
  paint(d, d._col);
  face.innerHTML = glyphSvg(g);
}

/* ---------- finding the user's apps by their names (ids differ between apps and countries) ---------- */
var IPTV_RE = /iptv|smarters|stb ?emu|siptv|ott ?(navigator|player)|televizo|tivimate|ibo ?player|stz/i,
  TVAPP_RE = /sunrise|yallo|swisscom|blue ?tv|salt ?tv|zattoo|teleboy|wilmaa|init7|tv7|quickline/i;
function findApp(re, not) {
  var m = apps
    .filter(function (a) {
      return a.id.charAt(0) !== '_' && a.id !== not && re.test(a.title || '');
    })
    .sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
  return m.length ? m[0].id : '';
}
function iptvId() {
  return findApp(IPTV_RE, '');
}
function tvAppId() {
  return findApp(TVAPP_RE, iptvId());
}
/* the dock before it is changed by hand: the HDMI card, the TV app, YouTube, an IPTV player, then the usual streaming apps */
function defaultDock() {
  var out = [];
  ['__hdmi', tvAppId(), 'youtube.leanback.v4', iptvId()].concat(DEFAULTS.dock).forEach(function (id) {
    if (id && out.indexOf(id) < 0) out.push(id);
  });
  return out;
}

/* the dock as it starts, with the automatic looks of its apps written out (YouTube, IPTV), so the picker shows the same */
function saveStartingDock() {
  var ids = dockIds(),
    all = {},
    k;
  for (k in cfg.tiles || {}) all[k] = cfg.tiles[k];
  apps.forEach(function (a) {
    if (ids.indexOf(a.id) < 0 || a.id.charAt(0) === '_' || all[a.id]) return;
    var au = autoLook(a),
      o = {};
    if (au.label) o.label = au.label;
    if (au.icon) o.icon = au.icon;
    if (o.label || o.icon) all[a.id] = o;
  });
  cfg.tiles = all;
  setDock(ids);
}

/* ---------- how an app looks: a name and a drawn icon chosen in the launcher (cfg.tiles), else a few automatic ones ---------- */
function autoLook(a) {
  if (a.id === '__hdmi') return { label: hdmiLabel(), icon: 'hdmi' };
  if (a.id === 'youtube.leanback.v4') return { label: 'YouTube', icon: a.title === 'YouTube' ? '' : 'youtube' }; /* YouTube AdFree */
  if (a.id.charAt(0) !== '_' && a.id === iptvId()) return { label: 'IPTV', icon: 'iptv' };
  return {};
}
function look(a) {
  var o = (cfg.tiles && cfg.tiles[a.id]) || {},
    au = autoLook(a),
    g = typeof o.icon === 'string' ? o.icon : au.icon || '';
  return { label: o.label || au.label || a.title, glyph: GLYPHS[g] ? g : '' };
}
function setLook(id, o) {
  var all = {};
  for (var k in cfg.tiles || {}) all[k] = cfg.tiles[k];
  all[id] = o;
  cfg.tiles = all;
  saveCfg();
}
function looksMenu(a) {
  var items = [
    {
      label: t('The app’s own icon'),
      fn: function () {
        setLook(a.id, { icon: '', label: a.title.slice(0, 40) });
      },
    },
  ];
  GLYPH_MENU.forEach(function (g) {
    items.push({
      label: GLYPHS[g].name,
      fn: function () {
        setLook(a.id, { icon: g, label: GLYPHS[g].name });
      },
    });
  });
  openMenu(t('Icon and name...').replace(/\.+$/, ''), items);
}

/* ---------- the HDMI card: OK goes straight to the device that is on ----------
   Which input: the one chosen in its menu (hold OK: "Always HDMI 2"), else the only input with a device plugged in and powered
   (hdmiPlugIn), else of those, the one opened last from here, then the only one with a picture (hdmiSignalExist), then the one the TV
   marks active; when that still leaves a choice, the list opens and the choice is remembered.
   On an LG C4 (webOS SDK 10.2.2) with three devices, read while an app was showing: hdmiPlugIn was true for a set-top box, a PS4 in rest
   mode and an unnamed device, hdmiSignalExist and activate false for all. So the list asks once there, and the card then remembers. */
var inputs = null,
  inputsAt = 0,
  hdmiBusy = false,
  HDMI_LAST = 'cytv.hdmi.last',
  HDMI_DEVS = 'cytv.hdmi.devs';
try {
  inputs = JSON.parse(localStorage.getItem(HDMI_DEVS) || 'null');
  if (!Array.isArray(inputs)) inputs = null;
} catch (e) {}
function hdmiDevs(x) {
  return ((x && x.devices) || []).filter(function (d) {
    return d && typeof d.appId === 'string' && /^[\w.\-]+$/.test(d.appId) && +d.port > 0;
  });
}
function portName(d) {
  return 'HDMI ' + +d.port;
}
/* the device's own name (HDMI-CEC, or renamed in LG's settings), else the port */
function devName(d) {
  var p = portName(d),
    l = typeof d.label === 'string' ? d.label.trim() : '';
  return l && l.replace(/\s+/g, '').toUpperCase() !== p.replace(/\s+/g, '') ? l : p;
}
/* on the card, LG's long names lose their second part: "UPC Boîtier décodeur /Box Internet" is "UPC Boîtier décodeur" */
function cardName(d) {
  var n = devName(d),
    cut = n.indexOf(' /');
  return cut > 0 ? n.slice(0, cut) : n;
}
function lastPort() {
  try {
    return +localStorage.getItem(HDMI_LAST) || 0;
  } catch (e) {
    return 0;
  }
}
function hdmiPin() {
  return cfg.hdmi && cfg.hdmi !== 'auto' ? +cfg.hdmi || 0 : 0;
}
function hdmiPick(devs) {
  var i,
    pin = hdmiPin(),
    last = lastPort();
  if (!devs || !devs.length) return null;
  if (pin) for (i = 0; i < devs.length; i++) if (+devs[i].port === pin) return devs[i];
  var on = devs.filter(function (d) {
    return !!d.hdmiPlugIn;
  });
  if (on.length === 1) return on[0];
  var pool = on.length ? on : devs;
  for (i = 0; i < pool.length; i++) if (+pool[i].port === last) return pool[i];
  var sig = on.filter(function (d) {
    return !!d.hdmiSignalExist;
  });
  if (sig.length === 1) return sig[0];
  var act = on.filter(function (d) {
    return !!d.activate;
  });
  if (act.length === 1) return act[0];
  return !on.length && devs.length === 1 ? devs[0] : null;
}
function hdmiLabel() {
  var d = inputs && hdmiPick(inputs);
  return hdmiName() || (d ? cardName(d) : t('HDMI'));
}
/* a name chosen for the card (hold OK > Name...), else the device's */
function hdmiName() {
  var o = cfg.tiles && cfg.tiles.__hdmi;
  return o && typeof o.label === 'string' ? o.label : '';
}
var HDMI_NAMES = ['Set-top box', 'TV box', 'Apple TV', 'PlayStation', 'Xbox', 'Game console', 'Chromecast'];
function hdmiNameMenu() {
  var cur = hdmiName(),
    items = [
      {
        label: t("The device's own name"),
        sub: cur ? '' : '\u2713',
        fn: function () {
          setHdmiName('');
        },
      },
    ];
  HDMI_NAMES.forEach(function (n) {
    items.push({
      label: t(n),
      sub: cur === t(n) ? '\u2713' : '',
      fn: function () {
        setHdmiName(t(n));
      },
    });
  });
  openMenu(t('Name...').replace(/\.+$/, ''), items);
}
function setHdmiName(n) {
  var all = {};
  for (var k in cfg.tiles || {}) if (k !== '__hdmi') all[k] = cfg.tiles[k];
  if (n) all.__hdmi = { label: n.slice(0, 40) };
  cfg.tiles = all;
  saveCfg();
  hdmiPaint();
}
function openInput(d) {
  try {
    localStorage.setItem(HDMI_LAST, String(+d.port));
  } catch (e) {}
  hdmiPaint(); /* the card takes the name of the input chosen */
  launch(d.appId);
}
function gotInputs(x) {
  var devs = hdmiDevs(x),
    s = JSON.stringify(devs);
  inputs = devs;
  try {
    if (localStorage.getItem(HDMI_DEVS) !== s) localStorage.setItem(HDMI_DEVS, s);
  } catch (e) {}
  hdmiPaint();
  return devs;
}
/* read when Home is shown, at most every two seconds: the card shows what is on before it is pressed */
function refreshInputs() {
  if (Date.now() - inputsAt < 2000) return;
  inputsAt = Date.now();
  api('/api/inputs').then(gotInputs, function () {});
}
function hdmiGo() {
  if (hdmiBusy) return;
  hdmiBusy = true;
  var free = setTimeout(function () {
    hdmiBusy = false;
  }, 5000); /* a request that never ends must not block the card */
  api('/api/inputs').then(
    function (x) {
      clearTimeout(free);
      hdmiBusy = false;
      inputsAt = Date.now();
      var devs = gotInputs(x);
      if (!devs.length) return toast(t('No HDMI inputs found'));
      var d = hdmiPick(devs);
      if (d) openInput(d);
      else showInputs(devs, t('Which input?'));
    },
    function () {
      clearTimeout(free);
      hdmiBusy = false;
      toast(t('Could not read the inputs'));
    }
  );
}
/* the card's name and its port chip with a dot that is green while the device is on. Elements are swapped, not rewritten (webOS 5). */
function hdmiPaint() {
  var d = tiles.__hdmi;
  if (!d) return;
  var dev = inputs && hdmiPick(inputs),
    lab = hdmiName() || (dev ? cardName(dev) : t('HDMI')),
    cap = d.querySelector('.cap'),
    old = d.querySelector('.chip');
  if (cap && cap.textContent !== lab) {
    var nc = document.createElement('div');
    nc.className = 'cap';
    nc.textContent = lab;
    d.replaceChild(nc, cap);
  }
  var chip = null;
  if (dev) {
    chip = document.createElement('div');
    chip.className = 'chip' + (dev.hdmiPlugIn ? ' on' : '');
    chip.innerHTML = '<i></i><span></span>';
    chip.lastChild.textContent = portName(dev);
  }
  if (old && chip && old.className === chip.className && old.textContent === chip.textContent) return nameIfFocused(d, lab);
  if (old) old.parentNode.removeChild(old);
  if (chip) d.appendChild(chip);
  nameIfFocused(d, lab);
}
function nameIfFocused(d, lab) {
  var n = $('name');
  if (rows[r] && rows[r][c] === d && n.textContent !== lab) n.textContent = lab;
}
function setHdmi(v) {
  cfg.hdmi = v;
  saveCfg();
  hdmiPaint();
}
function hdmiItems() {
  var pin = hdmiPin(),
    items = [
      {
        label: t('Automatic (the device that is on)'),
        sub: pin ? '' : '✓',
        fn: function () {
          setHdmi('auto');
        },
      },
    ];
  (inputs || []).forEach(function (d) {
    var nm = devName(d);
    items.push({
      label: t('Always') + ' ' + portName(d),
      sub: (+d.port === pin ? '✓  ' : '') + (nm !== portName(d) ? nm : d.hdmiPlugIn ? t('Connected') : t('Nothing connected')),
      fn: function () {
        setHdmi(String(+d.port));
      },
    });
  });
  items.push({ label: t('All inputs...'), stay: true, fn: inputsMenu });
  items.push({ label: t('Name...'), sub: hdmiName(), stay: true, fn: hdmiNameMenu });
  return items;
}
/* the Inputs list: devices that are on first */
function showInputs(devs, title) {
  if (!devs.length) return toast(t('No HDMI inputs found'));
  var list = devs.slice().sort(function (a, b) {
    return (b.hdmiPlugIn ? 1 : 0) - (a.hdmiPlugIn ? 1 : 0) || +a.port - +b.port;
  });
  openMenu(
    title || t('Inputs'),
    list.map(function (d) {
      var port = portName(d),
        named = devName(d) !== port,
        parts = [];
      if (named) parts.push(port);
      if (d.hdmiPlugIn) parts.push(t('Connected'));
      if (d.activate) parts.push(t('Active'));
      return {
        icon: 'hdmi',
        label: devName(d),
        sub: parts.join(' · '),
        dim: !d.hdmiPlugIn,
        fn: function () {
          openInput(d);
        },
      };
    })
  );
}

/* ---------- number keys 1-9 and the red, green, yellow and blue keys open the dock's apps in order ---------- */
function dockKey(k) {
  if (k >= 49 && k <= 57) return k - 48;
  if (k >= 97 && k <= 105) return k - 96;
  if (k >= 403 && k <= 406) return k - 402;
  return 0;
}
function openNth(n) {
  var id = dockIds()[n - 1],
    e = id && tiles[id],
    p = e && posOf(e);
  if (!id) return;
  if (p) {
    setFocus(p[0], p[1]);
    act(e);
  } else launch(id);
}

/* "All apps" under the dock, for themes where the grid waits below (push) */
(function () {
  var m = $('more');
  if (!m) return;
  m.innerHTML = '<span></span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  m.firstChild.textContent = t('All apps');
  m.addEventListener('click', function () {
    if (rows.length > 2) setFocus(2, 0);
  });
})();

/* ---------- white logos (dock.style "logo"): made once from each app's icon and remembered. The icon's plain background is taken away
   and the rest becomes white (and dark, for a focused pill of the accent colour). An icon that is a picture, or nothing but background,
   gets its name instead: a clean word is better than a blot. ---------- */
var MONO_KEY = 'cytv.mono.v1',
  monos = {},
  monoT = 0;
try {
  monos = JSON.parse(localStorage.getItem(MONO_KEY) || '{}') || {};
} catch (e) {}
function saveMonos() {
  clearTimeout(monoT);
  monoT = setTimeout(function () {
    try {
      localStorage.setItem(MONO_KEY, JSON.stringify(monos));
    } catch (e) {}
  }, 1500);
}
function monoTile(d) {
  var a = d._a;
  if (!a || a.sys || d._mono || d.classList.contains('gl')) return;
  d._mono = true;
  var box = document.createElement('div');
  box.className = 'mono';
  d.appendChild(box);
  if (monos[a.id]) return fillMono(d, box, monos[a.id]);
  var i = new Image();
  i.crossOrigin = 'anonymous';
  i.onload = function () {
    var m;
    try {
      m = makeMono(i);
    } catch (e) {
      m = { fail: 1 };
    }
    monos[a.id] = m;
    saveMonos();
    fillMono(d, box, m);
  };
  i.onerror = function () {
    fillMono(d, box, { fail: 1 }); /* not remembered: the icon can come back */
  };
  i.src = a.id === '__live' ? LIVE_ICON : API + '/icon/' + encodeURIComponent(a.id);
}
function fillMono(d, box, m) {
  if (m && m.w && m.k) {
    var w = new Image(),
      k = new Image();
    w.className = 'mw';
    k.className = 'mk';
    w.alt = k.alt = '';
    w.src = m.w;
    k.src = m.k;
    box.appendChild(w);
    box.appendChild(k);
    return;
  }
  var t = document.createElement('span');
  t.className = 'mt';
  t.textContent = look(d._a).label;
  box.appendChild(t);
}
/* the logo of an icon: { w: white PNG, k: dark PNG }, or { fail: 1 } */
function makeMono(img) {
  var S = 160,
    c = document.createElement('canvas');
  c.width = c.height = S;
  var g = c.getContext('2d'),
    iw = img.naturalWidth || S,
    ih = img.naturalHeight || S,
    sc = Math.min(S / iw, S / ih),
    dw = Math.round(iw * sc),
    dh = Math.round(ih * sc);
  g.drawImage(img, (S - dw) >> 1, (S - dh) >> 1, dw, dh);
  var px = g.getImageData(0, 0, S, S).data,
    x,
    y,
    j,
    x0 = S,
    y0 = S,
    x1 = -1,
    y1 = -1;
  for (y = 0; y < S; y++)
    for (x = 0; x < S; x++)
      if (px[(y * S + x) * 4 + 3] > 200) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { fail: 1 };
  /* the border of the opaque part: when it is opaque and even, that colour is the background (an icon on a plain tile) */
  var ring = [];
  for (x = x0; x <= x1; x++) ring.push((y0 * S + x) * 4, (y1 * S + x) * 4);
  for (y = y0; y <= y1; y++) ring.push((y * S + x0) * 4, (y * S + x1) * 4);
  var op = 0,
    bg = [0, 0, 0];
  ring.forEach(function (p) {
    if (px[p + 3] > 200) {
      op++;
      bg[0] += px[p];
      bg[1] += px[p + 1];
      bg[2] += px[p + 2];
    }
  });
  var plain = op > ring.length * 0.8;
  if (plain) {
    bg = [bg[0] / op, bg[1] / op, bg[2] / op];
    var spread = 0;
    ring.forEach(function (p) {
      if (px[p + 3] > 200) spread += dist(px, p, bg);
    });
    if (spread / op > 40) return { fail: 1 }; /* a picture, not a logo on a plain background */
  }
  var m = [],
    cov = 0,
    X0 = S,
    Y0 = S,
    X1 = -1,
    Y1 = -1;
  for (y = 0; y < S; y++)
    for (x = 0; x < S; x++) {
      j = (y * S + x) * 4;
      var a = px[j + 3] / 255,
        v = plain ? a * Math.min(1, Math.max(0, (dist(px, j, bg) - 34) / 60)) : a;
      m.push(v);
      if (v > 0.5) {
        cov++;
        if (x < X0) X0 = x;
        if (x > X1) X1 = x;
        if (y < Y0) Y0 = y;
        if (y > Y1) Y1 = y;
      }
    }
  var area = plain ? (x1 - x0 + 1) * (y1 - y0 + 1) : S * S;
  if (X1 < 0 || cov < area * 0.01 || cov > area * 0.55) return { fail: 1 };
  X0 = Math.max(0, X0 - 2);
  Y0 = Math.max(0, Y0 - 2);
  X1 = Math.min(S - 1, X1 + 2);
  Y1 = Math.min(S - 1, Y1 + 2);
  return { w: maskPng(m, S, X0, Y0, X1, Y1, [255, 255, 255]), k: maskPng(m, S, X0, Y0, X1, Y1, [20, 22, 28]) };
}
function dist(px, p, c) {
  var r = px[p] - c[0],
    g = px[p + 1] - c[1],
    b = px[p + 2] - c[2];
  return Math.sqrt(r * r + g * g + b * b);
}
function maskPng(m, S, X0, Y0, X1, Y1, rgb) {
  var w = X1 - X0 + 1,
    h = Y1 - Y0 + 1,
    c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  var g = c.getContext('2d'),
    id = g.createImageData(w, h),
    d = id.data;
  for (var y = 0; y < h; y++)
    for (var x = 0; x < w; x++) {
      var o = (y * w + x) * 4;
      d[o] = rgb[0];
      d[o + 1] = rgb[1];
      d[o + 2] = rgb[2];
      d[o + 3] = Math.round(m[(Y0 + y) * S + X0 + x] * 255);
    }
  g.putImageData(id, 0, 0);
  return c.toDataURL('image/png');
}

/* ---------- Style (Customise): the built-in looks, switched at once ---------- */
var STYLES = [
  { id: 'classic', name: 'Paysage' },
  { id: 'verre', name: 'Verre' },
  { id: 'editorial', name: '\u00c9ditorial' },
  { id: 'lin', name: 'Lin' },
  { id: 'aurore', name: 'Aurore' },
  { id: 'calm', name: 'Calm' },
  { id: 'original', name: 'Original' },
];
function styleMenu() {
  var cur = (cfg.theme && cfg.theme.id) || 'classic';
  openMenu(
    t('Style'),
    STYLES.map(function (st) {
      return {
        label: st.name,
        sub: st.id === cur ? '✓' : '',
        fn: function () {
          setStyle(st.id);
        },
      };
    })
  );
}
function setStyle(id) {
  api('/api/theme/set', { id: id, quick: true }).then(
    function (x) {
      if (!x || x.error) return toast(t('Could not change the style'));
      lastSig = '';
      load();
    },
    function () {
      toast(t('Could not change the style'));
    }
  );
}

/* ---------- glass tiles: each shows the blurred scene that lies behind it (read once per rebuild, never animated) ---------- */
function glassAlign(list, on) {
  list.forEach(function (t) {
    if (!on) {
      if (t.style.backgroundPosition) t.style.backgroundPosition = '';
      return;
    }
    var b = t.getBoundingClientRect();
    t.style.backgroundPosition = '0 0, ' + -Math.round(b.left) + 'px ' + -Math.round(b.top) + 'px';
  });
}

/* ---------- Quick settings: the panel over the screen (the Inputs picker app, helper/quick.js). The service opens it, as it does for a remote
   button given to Quick settings ---------- */
function openQuick() {
  api('/api/quick', { open: 'quick' }).then(
    function (x) {
      if (!x || !x.ok) toast(t('Quick settings are not available'));
    },
    function () {
      toast(t('Quick settings are not available'));
    }
  );
}

/* ---------- Remote buttons (Customise): a button of the remote opens an app or an HDMI input, from anywhere. The service binds it in
   LG's input service (inputkey.js, /api/remap) and waits for the press itself: the button still does its own thing that once, and
   Home may be gone by then ---------- */
function appName(id) {
  var m = /^com\.webos\.app\.hdmi(\d)$/.exec(id),
    d;
  if (id === '__quick') return t('Quick settings');
  if (!m) return title(id);
  d = (inputs || []).filter(function (x) {
    return +x.port === +m[1];
  })[0];
  return d && devName(d) !== portName(d) ? cardName(d) + ' · HDMI ' + m[1] : 'HDMI ' + m[1];
}
function buttonMenu(b) {
  openMenu(appName(b.app), [
    {
      label: t('Open another app...'),
      stay: true,
      fn: function () {
        targetMenu(t('Which app should it open?'), function (id) {
          remapPost({ code: b.code, app: id }, t('The button now opens') + ' ' + appName(id));
        });
      },
    },
    {
      label: t('Give it back to LG'),
      stay: true,
      fn: function () {
        remapPost({ code: b.code, remove: true }, t('The button does what LG intended again'));
      },
    },
  ]);
}
function remapPost(body, done) {
  api('/api/remap', body).then(
    function (x) {
      if (!x || x.error) return toast(t('Could not save the button'));
      toast(done);
      closeMenus();
      RB.refresh();
    },
    function () {
      toast(t('Could not save the button'));
    }
  );
}
/* what a button can open: Quick settings, the dock's apps, the HDMI inputs by their device, then every app A to Z */
function targetMenu(heading, cb) {
  var seen = {},
    items = [];
  function add(id, label, sub) {
    if (seen[id]) return;
    seen[id] = 1;
    items.push({
      label: label,
      sub: sub || '',
      stay: true,
      fn: function () {
        cb(id);
      },
    });
  }
  add('__quick', t('Quick settings'), t('Picture, sound, sleep timer'));
  dockIds().forEach(function (id) {
    if (id.charAt(0) !== '_') add(id, title(id));
  });
  (inputs || []).forEach(function (d) {
    add(d.appId, devName(d) !== portName(d) ? cardName(d) : portName(d), portName(d));
  });
  apps
    .filter(function (a) {
      return a.id.charAt(0) !== '_';
    })
    .sort(function (a, b) {
      return title(a.id).localeCompare(title(b.id));
    })
    .forEach(function (a) {
      add(a.id, title(a.id));
    });
  openMenu(heading, items);
}
/* ---------- idle screen: after a few minutes without a key on Home, everything but the background and a dim clock fades away and the
   clock moves a little each minute, so no picture stays lit on the OLED. The first key only wakes it. ---------- */
var idleAt = Date.now(),
  idleOn = false,
  idleTicks = 0;
function idleMinutes() {
  return cfg.idle === 'off' ? 0 : cfg.idle === '10' ? 10 : 3;
}
function wake() {
  idleAt = Date.now();
  if (!idleOn) return false;
  idleOn = false;
  document.body.classList.remove('idle');
  $('top').style.transform = '';
  return true;
}
function idleCheck() {
  var m = idleMinutes();
  if (idleOn) {
    if (++idleTicks % 3 === 0)
      $('top').style.transform =
        'translate(' + (Math.round(Math.random() * 28) - 14) + 'px,' + (Math.round(Math.random() * 18) - 9) + 'px)';
    return;
  }
  if (!m || document.hidden || stack.length || LIVE.on || (window.RB && RB.on)) return;
  if (Date.now() - idleAt > m * 60000) {
    idleOn = true;
    idleTicks = 0;
    document.body.classList.add('idle');
  }
}
document.addEventListener(
  'keydown',
  function (e) {
    if (wake()) {
      e.stopImmediatePropagation(); /* the key that wakes Home does nothing else */
      e.preventDefault();
    }
  },
  true
);
document.addEventListener('mousemove', wake, true);
document.addEventListener('visibilitychange', wake);

/* ---------- night mode: from 22:00 to 6:00 Home is a little darker and warmer; with a city, until sunrise when that is later ---------- */
function nightEnd(d) {
  var s = sunToday(d),
    r = s && new Date(s.rise);
  return r ? Math.max(360, r.getHours() * 60 + r.getMinutes()) : 360;
}
function nightCheck() {
  var d = new Date(),
    h = d.getHours();
  document.body.classList.toggle('night', cfg.night !== 'off' && (h >= 22 || h * 60 + d.getMinutes() < nightEnd(d)));
}
setInterval(function () {
  idleCheck();
  nightCheck();
  sceneCheck();
}, 20000);

/* ---------- the city (Customise > City): the sun's times, and the weather's city when the weather is on. [id, name, latitude, longitude], the
   same places as the service's weather.js (a test keeps them equal) ---------- */
var CITIES = [
  ['geneve', 'Genève', 46.2044, 6.1432],
  ['lausanne', 'Lausanne', 46.5197, 6.6323],
  ['neuchatel', 'Neuchâtel', 46.99, 6.9293],
  ['fribourg', 'Fribourg', 46.8065, 7.162],
  ['sion', 'Sion', 46.2331, 7.3606],
  ['berne', 'Berne', 46.948, 7.4474],
  ['bale', 'Bâle', 47.5596, 7.5886],
  ['lucerne', 'Lucerne', 47.0502, 8.3093],
  ['zurich', 'Zurich', 47.3769, 8.5417],
  ['lugano', 'Lugano', 46.0037, 8.9511],
];
function city(id) {
  for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0] === id) return CITIES[i];
  return null;
}
/* the chosen city; before there was a City row, the weather's city was the only one */
function placeId() {
  return city(cfg.place) ? cfg.place : cfg.place === 'none' ? '' : city(cfg.weather) ? cfg.weather : '';
}
/* Sunrise and sunset (ms) of a calendar day (the UTC date of ms) at a latitude and longitude: the sunrise equation (NOAA's simplified
   form, within three minutes in Switzerland), worked out on the TV; nothing is asked of the network. null on a day without both (polar day
   or night) */
function sunTimes(ms, lat, lon) {
  var rad = Math.PI / 180,
    n = Math.floor(ms / 86400000) - 10957 /* days from 1 January 2000 */,
    j = n - lon / 360,
    m = (357.5291 + 0.98560028 * j) % 360,
    c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad),
    l = (m + c + 282.9372) % 360,
    transit = 2451545 + j + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * l * rad),
    sd = Math.sin(l * rad) * Math.sin(23.4397 * rad),
    cw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sd) / (Math.cos(lat * rad) * Math.cos(Math.asin(sd)));
  if (!(cw >= -1 && cw <= 1)) return null;
  var w = Math.acos(cw) / rad / 360;
  return { rise: (transit - w - 2440587.5) * 86400000, set: (transit + w - 2440587.5) * 86400000 };
}
/* today's sun at the chosen city (kept for the day), or null without a city */
var sunKept = { key: '', v: null };
function sunToday(d) {
  var c = city(placeId());
  if (!c || !d || !d.getFullYear) return null;
  var key = c[0] + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  if (sunKept.key !== key) sunKept = { key: key, v: sunTimes(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), c[2], c[3]) };
  return sunKept.v;
}
function hhmm(ms) {
  var d = new Date(ms);
  return d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}

/* ---------- weather beside the date (Customise > Weather): the service asks Open-Meteo for the chosen city ---------- */
var weatherNow = null,
  weatherAt = 0;
function cityName(id) {
  var c = city(id);
  return c ? c[1] : '';
}
function refreshWeather(force) {
  var c = cfg.weather;
  if (!c || c === 'off' || !cityName(c)) {
    if (weatherNow) {
      weatherNow = null;
      tick();
    }
    return;
  }
  if (!force && Date.now() - weatherAt < 10 * 60000 && weatherNow && weatherNow.city === c) return;
  weatherAt = Date.now();
  api('/api/weather?city=' + c).then(
    function (x) {
      weatherNow = x && typeof x.temp === 'number' ? x : null;
      tick();
    },
    function () {}
  );
}
/* WMO weather codes in words */
function skyWords(code) {
  if (code === 0) return t('Clear');
  if (code === 1) return t('Mostly clear');
  if (code === 2) return t('Partly cloudy');
  if (code === 3) return t('Overcast');
  if (code === 45 || code === 48) return t('Fog');
  if (code >= 51 && code <= 57) return t('Drizzle');
  if ((code >= 61 && code <= 67) || code === 80 || code === 81 || code === 82) return code >= 80 ? t('Showers') : t('Rain');
  if (code >= 71 && code <= 77) return t('Snow');
  if (code === 85 || code === 86) return t('Snow showers');
  if (code >= 95) return t('Thunderstorm');
  return '';
}
function weatherText() {
  if (!weatherNow || weatherNow.city !== cfg.weather) return '';
  var w = skyWords(weatherNow.code);
  return ' · ' + weatherNow.temp + '°' + (w ? ' ' + w.toLowerCase() : '');
}

/* ---------- Customise: idle screen, night mode, weather ---------- */
function idleItem() {
  return {
    label: t('Idle screen'),
    sub: cfg.idle === 'off' ? t('Disabled') : cfg.idle === '10' ? t('after 10 min') : t('after 3 min'),
    stay: true,
    fn: function () {
      cfg.idle = cfg.idle === 'off' ? '3' : cfg.idle === '10' ? 'off' : '10';
      saveCfg();
      refreshCustomise();
    },
  };
}
/* the Customise menu again, with the focus on the row just changed */
function refreshCustomise() {
  var keep = stack.length ? stack[stack.length - 1].idx : 0;
  closeMenus();
  customizeMenu();
  stack[0].idx = keep;
  drawMenu();
}
function nightItem() {
  return {
    label: t('Night mode'),
    sub: cfg.night === 'off' ? t('Disabled') : placeId() ? t('22:00 to sunrise') : '22:00–6:00',
    stay: true,
    fn: function () {
      cfg.night = cfg.night === 'off' ? 'on' : 'off';
      saveCfg();
      nightCheck();
      refreshCustomise();
    },
  };
}
/* City: where the sun's times are worked out for, and the weather's city. Choosing one keeps the weather on that city if it is on */
function placeMenu(then) {
  var items = [
    {
      label: t('None (fixed hours)'),
      sub: placeId() ? '' : '✓',
      fn: function () {
        cfg.place = 'none';
        saveCfg();
        sunChanged();
      },
    },
  ];
  CITIES.forEach(function (c) {
    items.push({
      label: c[1],
      sub: placeId() === c[0] ? '✓' : '',
      fn: function () {
        cfg.place = c[0];
        if (city(cfg.weather) || then === 'weather') cfg.weather = c[0];
        saveCfg();
        refreshWeather(true);
        sunChanged();
      },
    });
  });
  openMenu(t('Which city?'), items);
}
/* the scenes and night mode follow a new city at once */
function sunChanged() {
  sunKept.key = '';
  nightCheck();
  sceneCheck();
}
function placeItem() {
  var s = sunToday(new Date());
  return {
    label: t('City'),
    sub: placeId() ? cityName(placeId()) + (s ? ' · ☀ ' + hhmm(s.rise) + '–' + hhmm(s.set) : '') : t('None (fixed hours)'),
    stay: true,
    fn: function () {
      placeMenu();
    },
  };
}
/* Weather: on (for the city) or off; without a city, turning it on asks for one */
function weatherItem() {
  return {
    label: t('Weather'),
    sub: city(cfg.weather) ? t('Enabled') : t('Disabled'),
    stay: true,
    fn: function () {
      if (city(cfg.weather)) cfg.weather = 'off';
      else if (placeId()) cfg.weather = placeId();
      else return placeMenu('weather');
      saveCfg();
      refreshWeather(true);
      refreshCustomise();
    },
  };
}

/* ---------- the scene of the style (theme.js), at the time of day when the style asks for it ---------- */
var scene = { name: '', glass: '', daily: false, period: '' };
/* With a city the light follows the sun: dawn from 40 minutes before sunrise, day from 80 minutes after, dusk (the scene itself, '') from
   90 minutes before sunset to 40 minutes after, then night. Without one: dawn 6:00, day 9:00, dusk 17:00, night 21:00 */
function dayPeriod() {
  var d = new Date(),
    s = sunToday(d),
    M = 60000,
    now = d.getTime(),
    h = d.getHours();
  if (s)
    return now >= s.rise - 40 * M && now < s.rise + 80 * M
      ? 'aube'
      : now >= s.rise + 80 * M && now < s.set - 90 * M
        ? 'jour'
        : now >= s.set - 90 * M && now < s.set + 40 * M
          ? ''
          : 'nuit';
  return h >= 6 && h < 9 ? 'aube' : h >= 9 && h < 17 ? 'jour' : h >= 17 && h < 21 ? '' : 'nuit'; /* '' is dusk, the scene itself */
}
function sceneApply() {
  var st = document.documentElement.style,
    p = scene.daily ? dayPeriod() : '',
    suffix = p ? '-' + p : '';
  scene.period = p;
  if (scene.name) {
    st.setProperty('--wall', 'url("scene-' + scene.name + suffix + '.jpg")');
    if (themeKeys.indexOf('--wall') < 0) themeKeys.push('--wall');
  }
  if (scene.glass) {
    st.setProperty('--glass', 'url("scene-' + scene.glass + (scene.glass === scene.name ? suffix : '') + '-glass.jpg")');
    if (themeKeys.indexOf('--glass') < 0) themeKeys.push('--glass');
  }
}
function sceneCheck() {
  if (scene.daily && dayPeriod() !== scene.period) sceneApply();
}

/* ---------- the Remote buttons screen (Customise): the taught buttons as cards beside a drawing of the remote; teaching a button is a
   step of its own, with the remote's app buttons pulsing, and ends on a confirmation ---------- */
var REMOTE_SVG =
  '<svg class="rb-remote" viewBox="0 0 300 820"><defs><linearGradient id="rbg" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#3b3e47"/><stop offset="1" stop-color="#15171c"/></linearGradient></defs>' +
  '<rect x="40" y="10" width="220" height="800" rx="110" fill="url(#rbg)" stroke="rgba(255,255,255,.18)" stroke-width="2"/>' +
  '<circle cx="150" cy="80" r="16" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3"/>' +
  '<path d="M150 66v14" stroke="rgba(255,255,255,.5)" stroke-width="3" stroke-linecap="round"/>' +
  [140, 180, 220, 260]
    .map(function (y) {
      return [105, 150, 195]
        .map(function (x) {
          return '<circle cx="' + x + '" cy="' + y + '" r="11" fill="rgba(255,255,255,.14)"/>';
        })
        .join('');
    })
    .join('') +
  '<circle cx="150" cy="384" r="76" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>' +
  '<circle cx="150" cy="384" r="34" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.3)" stroke-width="2"/>' +
  '<circle cx="95" cy="496" r="16" fill="rgba(255,255,255,.12)"/><circle cx="150" cy="496" r="16" fill="rgba(255,255,255,.12)"/>' +
  '<circle cx="205" cy="496" r="16" fill="rgba(255,255,255,.12)"/>' +
  '<rect x="78" y="536" width="36" height="96" rx="18" fill="rgba(255,255,255,.12)"/>' +
  '<rect x="186" y="536" width="36" height="96" rx="18" fill="rgba(255,255,255,.12)"/>' +
  '<rect x="82" y="664" width="60" height="34" rx="10" fill="rgba(255,255,255,.2)"/>' +
  '<rect x="158" y="664" width="60" height="34" rx="10" fill="rgba(255,255,255,.2)"/>' +
  '<rect x="82" y="710" width="60" height="34" rx="10" fill="rgba(255,255,255,.2)"/>' +
  '<rect x="158" y="710" width="60" height="34" rx="10" fill="rgba(255,255,255,.2)"/>' +
  '<rect class="rb-hot" x="68" y="650" width="164" height="108" rx="22" fill="none" stroke-width="3"/></svg>';
var RB = { on: false, mode: 'list', idx: 0, buttons: [], app: '', el: null, poll: 0, back: 0, attached: true };
function rbEl(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function rbApp(id) {
  for (var i = 0; i < apps.length; i++) if (apps[i].id === id) return apps[i];
  return { id: id, title: id };
}
/* an app's mark: its drawn icon, the HDMI mark for an input, or its own icon on its colour; no id is the "+" of Teach a button */
function rbBadge(id, big) {
  var b = rbEl('div', 'rb-badge' + (big ? ' big' : '')),
    g = !id ? 'plus' : /^com\.webos\.app\.hdmi\d$/.test(id) ? 'hdmi' : look(rbApp(id)).glyph;
  if (g === 'plus') {
    b.className += ' plus';
    b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  } else if (g) {
    b.style.background = 'rgb(' + GLYPHS[g].b.join(',') + ')';
    b.innerHTML = glyphSvg(g);
  } else {
    var i = new Image();
    i.alt = '';
    i.src = API + '/icon/' + encodeURIComponent(id);
    if (colors[id]) b.style.background = 'rgb(' + colors[id].b.join(',') + ')';
    b.appendChild(i);
  }
  return b;
}
function rbCard(id, name, sub, n, bare) {
  var c = rbEl('div', 'rb-card' + (n === RB.idx ? ' f' : '')),
    tx = rbEl('div', 'rb-tx');
  if (!bare) c.appendChild(rbBadge(id));
  tx.appendChild(rbEl('div', 'rb-name', name));
  if (sub) tx.appendChild(rbEl('div', 'rb-sub', sub));
  c.appendChild(tx);
  c.addEventListener('click', function () {
    RB.idx = n;
    RB.act();
  });
  return c;
}
RB.open = function () {
  closeMenus();
  RB.on = true;
  RB.mode = 'list';
  RB.idx = 0;
  if (!RB.el) {
    RB.el = rbEl('div');
    RB.el.id = 'rb';
    RB.el.innerHTML = '<div class="rb-l"></div><div class="rb-r">' + REMOTE_SVG + '<div class="rb-note"></div></div>';
    RB.el.querySelector('.rb-note').textContent = t('The app buttons (Netflix, Prime Video...) are the obvious ones to give');
    document.body.appendChild(RB.el);
  }
  RB.draw();
  RB.refresh();
};
RB.close = function () {
  if (RB.mode === 'teach') api('/api/remap', { cancel: true }).catch(function () {});
  RB.on = false;
  clearInterval(RB.poll);
  clearTimeout(RB.back);
  if (RB.el) RB.el.parentNode.removeChild(RB.el);
  RB.el = null;
};
RB.refresh = function () {
  api('/api/remap').then(
    function (x) {
      RB.buttons = (x && x.buttons) || [];
      RB.attached = !x || x.attached !== false;
      if (RB.on && RB.mode === 'list') {
        RB.idx = Math.min(RB.idx, RB.buttons.length);
        RB.draw();
      }
    },
    function () {
      toast(t('Could not read the remote buttons'));
    }
  );
};
/* the left side is built anew and swapped in (webOS 5 keeps old text when content is rewritten) */
RB.draw = function () {
  if (!RB.el) return;
  var l = rbEl('div', 'rb-l');
  if (RB.mode === 'list') {
    l.appendChild(rbEl('div', 'rb-eyebrow', t('Customise')));
    l.appendChild(rbEl('h2', '', t('Remote buttons')));
    l.appendChild(
      rbEl(
        'p',
        'rb-p',
        RB.attached
          ? t('Give a button of the remote to an app or an input. It works everywhere, not only here.')
          : t('The remote cannot be read on this TV')
      )
    );
    var list = rbEl('div', 'rb-list');
    RB.buttons.forEach(function (b, i) {
      list.appendChild(rbCard(b.app, appName(b.app), t('Button') + ' ' + (i + 1), i));
    });
    list.appendChild(rbCard('', t('Teach a button...'), '', RB.buttons.length));
    l.appendChild(list);
  } else {
    l.appendChild(rbBadge(RB.app, true));
    if (RB.mode === 'teach') {
      l.appendChild(rbEl('h2', '', t('Press the button')));
      l.appendChild(rbEl('p', 'rb-p', t('It will open') + ' ' + appName(RB.app) + '.'));
      l.appendChild(rbEl('p', 'rb-p rb-small', t('The first time, LG still does its own thing: then come back to Home.')));
      var cancel = rbEl('div', 'rb-list');
      cancel.appendChild(rbCard('', t('Cancel'), '', 0, true));
      l.appendChild(cancel);
    } else {
      l.appendChild(rbEl('h2', '', t('Done')));
      l.appendChild(rbEl('p', 'rb-p', t('The button now opens') + ' ' + appName(RB.app) + '.'));
    }
  }
  RB.el.replaceChild(l, RB.el.firstChild);
  RB.el.className = RB.mode;
};
RB.count = function () {
  return RB.mode === 'list' ? RB.buttons.length + 1 : RB.mode === 'teach' ? 1 : 0;
};
RB.act = function () {
  if (RB.mode === 'teach') return RB.stopTeach();
  if (RB.mode !== 'list') return;
  var b = RB.buttons[RB.idx];
  if (b) return buttonMenu(b);
  targetMenu(t('Which app should it open?'), function (id) {
    closeMenus();
    RB.teach(id);
  });
};
RB.key = function (k, rep) {
  if (k === 38 && RB.idx > 0) RB.idx--;
  else if (k === 40 && RB.idx < RB.count() - 1) RB.idx++;
  else if (k === 13) {
    if (!rep) RB.act();
    return;
  } else if (k === 461 || k === 27 || k === 8) {
    if (RB.mode === 'list') return RB.close();
    if (RB.mode === 'teach') return RB.stopTeach();
    RB.mode = 'list';
    RB.idx = 0;
  } else return;
  RB.draw();
};
RB.teach = function (id) {
  api('/api/remap', { learn: id }).then(
    function (x) {
      if (x && x.error === 'unsupported') return toast(t('The remote cannot be read on this TV'));
      if (x && x.error === 'full') return toast(t('Twelve buttons are already taught'));
      if (!x || x.error) return toast(t('Could not save the button'));
      RB.mode = 'teach';
      RB.app = id;
      RB.idx = 0;
      RB.draw();
      clearInterval(RB.poll);
      RB.poll = setInterval(RB.check, 700);
    },
    function () {
      toast(t('Could not save the button'));
    }
  );
};
RB.stopTeach = function () {
  clearInterval(RB.poll);
  api('/api/remap', { cancel: true }).catch(function () {});
  RB.mode = 'list';
  RB.idx = RB.buttons.length;
  RB.draw();
};
/* the result also arrives after a trip through the app the button opened */
RB.check = function () {
  api('/api/remap').then(
    function (x) {
      var l = x && x.learning;
      if (!l || l.state === 'waiting' || RB.mode !== 'teach') return;
      clearInterval(RB.poll);
      RB.buttons = (x && x.buttons) || RB.buttons;
      if (l.state === 'saved') {
        RB.mode = 'done';
        RB.app = l.app;
        RB.draw();
        clearTimeout(RB.back);
        RB.back = setTimeout(function () {
          if (RB.on && RB.mode === 'done') {
            RB.mode = 'list';
            RB.idx = 0;
            RB.draw();
          }
        }, 2600);
        return;
      }
      if (l.state === 'taken') toast(t('This button is kept for its own use: choose another one'));
      else if (l.state === 'timeout') toast(t('No button was pressed'));
      else if (l.state === 'unsupported') toast(t('The remote cannot be read on this TV'));
      RB.mode = 'list';
      RB.draw();
    },
    function () {}
  );
};
