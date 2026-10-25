# Calm TV

An épuré home screen for rooted LG webOS TVs: a calm picture, a clock, and the few things you watch, one press away.

Based on CleanYourTV for LG webOS by lasharor (MIT licence). The service underneath, the RAM-only takeover of Home, the rollback and the
manager app come from that project; see [LICENSE](LICENSE) and [THIRD-PARTY.md](THIRD-PARTY.md).

![Paysage, the default style](docs/screenshots/calm-home.jpg)

> [!NOTE]
> **LG's system files are not modified.** The launcher takes over Home with a mount that exists only in RAM, so a reboot without the boot
> scripts brings LG's Home back. Everything is stored in `/media/developer/cleanyourtv`, and the uninstall removes it.

## What it is

**Seven styles**, switched at once in Customise › Style, with nothing to download:

| Style | |
|---|---|
| **Paysage** (default) | A lake at dusk, a thin clock on the water, one line of white logos; the focused one in a white pill. |
| **Verre** | Alpine peaks at blue hour and frosted-glass tiles; the focused tile grows and brightens. |
| **Éditorial** | Warm slate, a large serif clock, and the apps set as words, with no icons. |
| **Lin** | Warm linen, black type and paper cards. Bright in a dark room. |
| **Aurore** | A soft aurora that takes on the focused app's colour, a thin clock in the centre, glass pills. |
| **Calm** | Near-black, a large light clock and four dark cards lit in their app's colour. |
| **Original** | The original CleanYourTV layout. |

Paysage and Verre follow the time of day (dawn, day, dusk, night): the real sunrise and sunset once you choose your city. The white logos are made once from each app's own icon; an icon that
does not separate cleanly shows the app's name instead.

**What it does**

- **The HDMI card.** OK goes straight to the device that is on; with several, it asks once and remembers. Hold OK for *Always HDMI n*, all
  inputs, or a name (Décodeur, Box TV, ...).
- **Your apps first.** YouTube AdFree is shown as YouTube, an IPTV player (STZ Player, Smart IPTV, ...) as IPTV, and the dock starts with
  the HDMI card, your TV app (Sunrise TV, Zattoo, blue TV, ...), YouTube and IPTV, found by their names.
- **Quick settings.** Picture mode, sound mode, a sleep timer (with a card a minute before: *20 more minutes*) and screen off, in a
  panel over whatever is playing: from Home, or from a remote button given to it.
- **Remote buttons.** Customise › Remote buttons gives any button (Netflix, Prime Video, ...) to an app, an HDMI input or Quick
  settings, from anywhere.
- **Keys.** 1 to 9 and the red, green, yellow and blue keys open the dock's apps in order.
- **The sun.** Choose your city and Paysage's lake and Verre's peaks follow that day's real sunrise and sunset, worked out on the TV.
- **Idle screen** (fades to a dim, drifting clock after 3 minutes, for the OLED), **night mode** (22:00 until 6:00 or sunrise), **weather** beside the
  date (Open-Meteo, off until you turn it on).
- From CleanYourTV: the Inputs list on the remote's Input key, Live TV from your own playlist, picture notifications, optional voice,
  an optional debloat of LG's ads and telemetry, and a manager app that sets up, updates and removes everything.

Menus follow the TV's language: English, French, German, Dutch and Spanish.

## Before you install

- **The TV must be rooted** with the [Homebrew Channel](https://webosbrew.org) ([rootmy.tv](https://rootmy.tv), or the method for your
  firmware). Developer Mode alone is not enough. webOS 5 (2020) or newer.
- **YouTube AdFree** is the `youtube-webos` app from the Homebrew Channel.
- Turn on **SIMPLINK (HDMI-CEC)** in LG's settings: the HDMI card then shows the device's name and can wake it.

## Install

On your computer, with your TV's address:

```sh
ssh root@192.168.1.50 'curl -fsSL https://raw.githubusercontent.com/vincentnicod/calm-tv/main/install.sh | CYTV_BRANCH=main sh'
```

Then on the TV, open **CleanYourTV** in the app list and choose **Set up now**. It takes about a minute and the screen blinks once. The
details are in [docs/install.md](docs/install.md).

## Updating

Every push to `main` runs every check (the tests under Node 8.12, the pages in Chromium 68 and 79, the engines of older TVs) and, if they
pass, publishes a pre-release named `test-main`. The manager app on the TV offers it under **Launcher** and **Service**.

## Going back

| To | How |
|---|---|
| LG's Home | Manager app › **CleanYourTV as Home** off, or `sh /media/developer/cleanyourtv/undo-home.sh` |
| The original layout | Customise › **Style** › **Original** |
| Nothing at all | Manager app › **Uninstall** |

A failed boot: the Homebrew Channel's failsafe mode skips all boot scripts; reboot again.

## Checks

```sh
node tools/test.js              # the tests (sh tools/check.sh also runs them under Node 8.12 and checks the built pages)
node tools/lint.js              # types, lint, the pages as ES5, formatting (npm ci once)
node tools/calm-check.mjs       # the launcher in a browser, with the remote's keys
node tools/render-calm.mjs      # screenshots of every screen (--theme <id>)
python3 ipk/build.py            # the package and the launcher bundle, in dist/
```

The launcher's sources are in `app/src` (built into `app/index.html` by `node tools/build-pages.js`); the styles are in `helper/theme.js`;
the backgrounds are painted by `design/scenes/bake.mjs`. [AGENTS.md](AGENTS.md) is the map of the code.

## Licence

MIT. See [LICENSE](LICENSE). The package also contains third-party files, listed with their licences in [THIRD-PARTY.md](THIRD-PARTY.md),
including the typefaces (SIL Open Font License).

CleanYourTV is an independent project and so is Calm TV: neither is affiliated with, endorsed by or supported by LG Electronics. LG and
webOS are trademarks of LG Electronics. This modifies a running TV with root access; use it at your own risk.
