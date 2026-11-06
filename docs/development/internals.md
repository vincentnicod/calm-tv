# Internals

## The pieces

| Piece | Runs as | Notes |
|---|---|---|
| The **service** (`helper.js` and modules) | Node.js, root, started by the boot script | Listens on `127.0.0.1:8765`; bridges the web pages to `luna-send` (LG's service bus), serves app icons, runs Live TV, notifications, voice, the manager API and the input hook. |
| The **launcher** (`app/index.html`) | A web app in LG's web runtime, mounted as LG's Home | Reads apps and settings from the service. |
| **Manager**, **picker**, **notify** | Web apps installed from the package | The picker and notify apps are hidden; the service starts them. |
| The **input hook** | Injected into LG's input processes | Runs a command when a bound remote key is pressed. |

## The service

`helper/helper.js` only wires the parts together. Each part is a module with `create(ctx)` that returns its name, the paths it answers
(`paths` or a `prefix`), `handle(req, res, path, body)` and an optional `start()`. A part that fails to load is left out and listed at
`GET /api/service`; the others keep working.

| Module | What it is |
|---|---|
| `paths.js` | Every place on the TV the service reads or writes; the tests move them with environment variables. |
| `config.js` | The settings in `config.json`. `config.update(source, fn)` reads, changes and writes in one step, so two parts never overwrite each other's settings; every change of an option, a learned key or the Input-key mode is logged with its source (`config: options.inputKey true -> false (manager)`), which shows up in Share log. |
| `tvprofile.js` | Everything that differs between TVs: the Input key's default mode, the notification window type, whether the firmware is in `compat.json`, whether LG's Home is a supported kind. The service saves it in `tv.json` (`GET /api/tv`); the setup script asks the same rules (`node tvprofile.js get notifyWindow --sdk 10.2.2`). |
| `exec.js`, `luna.js`, `fetch.js` | The one way to start a program (time limits without Node's own `timeout` option, which can abort Node 8), to call `luna-send`, and to download (redirects, gzip, size and time limits, dropped connections). |
| `server.js`, `web.js` | The HTTP server with the origin rules, and small reply helpers. |
| `apps.js`, `running.js` | The app list, icons, usage, launching and the launcher's own settings; the running apps to close (Back on Home). |
| `inputkey.js`, `inputhook.js`, `picker.js` | The Input key: the hook in LG's input processes, the key binds, the Inputs picker. |
| `quick.js` | Quick settings: LG's picture mode, sound mode and sleep timer through LG's settings service, screen off, and the sleep timer's warning a minute before. The panel is the picker app's (`picker/app`, launch parameter `panel`). |
| `manager.js`, `updates.js`, `debloat.js` | The manager's API, updates from GitHub releases with rollback, switching the debloat. |
| `live.js`, `notify.js`, `notifyapi.js` | One feature each. |
| `theme.js`, `themeschema.js` | Themes: `themeschema.js` holds every setting a theme can make, the checks and how a theme becomes CSS variables; `theme.js` reads themes from GitHub and keeps them on the TV. |
| `voice.js`, `answers.js` | Voice: the microphone, the recogniser, the phone setup page; `answers.js` asks Home Assistant, a language model or your server. |
| `selfupdate.js`, `sharelog.js` | Programs the manager runs when the service is not running. |

## The pages

The launcher and the manager are built from source files: `app/src` and `manager/src` hold `index.html` with `@include` lines and the
CSS and script files they name. `node tools/build-pages.js` writes `app/index.html` and `manager/app/index.html`, the single files
the TV loads; the built files are committed, so an update and the theme preview read them as before. The picker and the notification
card are small and stay single files.

## How the launcher becomes Home

1. `10-cleanyourtv-home` runs at boot and starts the service.
2. `stage-home.sh` builds a directory holding the launcher plus an `appinfo.json` derived from this TV's own stock Home (saved in
   `backup/home-appinfo.orig.json` the first time), switched to the web type.
3. The script **bind-mounts** that directory over `/usr/palm/applications/com.webos.app.home`, restarts the system app manager
   (`sam`) so it reads the new Home, and launches Home again.
4. A **watchdog** (`scripts/watchdog.sh`, one per boot, also while LG's Home shows) checks every 10 seconds that the service answers. It
   starts a stopped service again, less often when it keeps stopping, and keeps the log of the run that ended. If our Home stays
   unreachable for about a minute, it restores LG's Home until the next restart.

Nothing is written under `/usr`: the mount disappears at reboot. `DISABLE` in `/media/developer/cleanyourtv` makes the script skip it.

## Updates and rollback

- **Launcher.** The manager downloads `frontend-<version>.tgz` and its `.sha256`, checks the list of files in the archive (only
  `app/...`), unpacks, checks `version.json`, swaps it in (the old one becomes `app.prev`), reloads Home and waits up to 40 seconds
  for the new launcher to report that it started. If it does not, the previous launcher is swapped back.
- **Service.** The manager downloads the package, installs it with the system's app installer and runs `bootstrap.sh update`,
  which keeps the running files in `backup/service-prev.tgz`, copies the new ones, restarts the service and waits for it to answer
  with the new version. If it does not, the previous files are restored.
- **Test builds.** Same flows, from a pre-release; the commit in a `BUILD` file is how two builds with one version number are told apart.

## Older webOS versions

webOS 5 and 6 ship Node.js 8, and webOS 6 has Chromium 79.

- `helper/netcompat.js` supplies `URL`, `URLSearchParams`, `crypto.randomInt`, `mkdir -p` and the `http(s).get(url, options)` form.
- What differs between versions is decided in `helper/tvprofile.js`: the picker is started on demand and the notification window is an
  `overlay` before webOS 25 (SDK 10).
- The pages do not use flex `gap`, which Chromium before 84 ignores: spacing between flex children is a sibling margin
  (`.row > * + * { margin-left: 22px; }`). Grid `gap` is fine from Chromium 66. The focus ring of a tile is a `::before` with its own
  radius, because Chromium before 94 draws an `outline` as a rectangle.
- The service accepts the `file://<appId>-webos` origin that webOS 6 apps send, for our own apps and the Home slot only.
- `scripts/reload-home.sh` restarts `webapp-mgr` on webOS 6, where a relaunch alone keeps the old page.

!!! note "Not yet tried on a webOS 5 or 6 TV"
    These changes follow a community fork for webOS 6 and a report from a webOS 5.6.2 TV. The service is tested under Node 8.12.0
    (`sh tools/check.sh`) and the pages in a current Chrome with the detection switched off, but not on a TV of those versions.

## Things that were tried

!!! info "A native launcher"
    A launcher written in C with SDL2 (so it draws on the GPU without the web runtime) was built and run as LG's Home on a
    webOS 25 TV. It worked, started quickly and used about as much memory and CPU as the web launcher, but LG's compositor shows
    "Do you want to exit the app?" when Back is pressed in a native app, and setting a key mask on the window did not stop it. It
    is kept on the `native-launcher` branch for reference and is not part of the project.
