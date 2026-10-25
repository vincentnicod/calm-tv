# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of one rooted LG OLED (OLED65G26LA, webOS 25), who uses it every day from the couch with the LG remote (arrows, OK, Back, magic pointer; no keyboard). A second audience is other rooted LG TV owners who install it from the public GitHub repository with one command. They are comfortable with SSH, and want a Home screen that is faster and calmer than LG's.

## Product Purpose

Replace LG's slow, ad-heavy Home with a fast launcher that has a guaranteed way back, and add functions LG does not provide. It runs the user's apps, switches inputs, plays their own M3U/IPTV playlist with a guide, shows picture notifications over any app, and can stop LG's ad and telemetry services. Success: the user opens it every day, never needs LG's Home, and can always return to it in one press or one SSH command.

## Positioning

A fast alternative to LG's cumbersome interface, made possible by root: it replaces Home itself (not a separate app), takes over Home with a RAM-only mount (its files are stored in the writable partition and removed by the uninstall), restores LG's Home from the grid, over SSH or on its own if it stops responding, and carries features LG's Home does not have (Live TV from any playlist, notifications with pictures, usage-sorted apps).

## Operating Context

LG webOS 25 on a 65 inch OLED, viewed from about 3 m. The launcher is a plain web page (1920x1080) mounted over `com.webos.app.home` at boot by the Homebrew Channel's init scripts, backed by a small Node helper running as root on `127.0.0.1:8765`. Installed and updated over SSH. The TV's GPU is weak, and the TV can be in standby or unreachable at any time.

## Capabilities and Constraints

- Home screen with a dock of four apps, a top shelf for the focused app, an app grid sorted by use (or A to Z), top buttons for Inputs, Live TV, Settings and Customise.
- Customisation happens in the launcher with the remote (hold OK on an app, the Customise button); no config file is required.
- Live TV: user-supplied M3U and XMLTV guide, HLS playback in the TV's own player, channel list and guide, number entry. No recording, pause or favourites yet.
- Picture notifications: a transparent `topui` overlay app, triggered through the helper's API; it must never take the remote.
- Debloat: stops LG ad and telemetry services; it must lift itself when LG's Home is restored, because LG's Home does not start without those services.
- Menus and dates follow the TV's language (en, nl, de, fr, es translated).
- Must stay RAM-only and reversible: nothing under `/usr`, `/etc` or the firmware is changed, and a reboot without the boot scripts restores LG's Home.
- Remote only, readable from 3 m.
- No private data in the repository: playlist addresses, access keys, IP addresses and the owner's name stay out.
- Fast on the TV's weak GPU: only transform and opacity animate; no blur, masks or filters; the last layout is cached for an instant first paint.
- Undecided: other TV models and firmware (only the G2 on webOS 25 is tested); favourites and recording for Live TV; a first-run hint for hold-OK (the owner removed the earlier hint because it felt noisy).

## Brand Commitments

Public name: "CleanYourTV for LG webOS". The home-screen design follows the Android TV project CleanYourTV (MIT licensed), which is credited in the README and the documentation. The repository is MIT licensed.

## Evidence on Hand

- Screenshots of the real launcher in `docs/screenshots/` (home, grid, options, customise, inputs, Live TV guide).
- A tested install on the owner's TV, a working Live TV player on the owner's playlist (about 1,050 channels, XMLTV guide), picture notifications verified over Plex, Prime Video (DRM) and an HDMI input.
- A critique of the layout (score 25/40) saved in `.impeccable/critique/` (local, not for the repository).
- Absent: usage data from other users, feedback from other owners, tests on any other TV model.

## Product Principles

1. **Always a way out.** Every change can be undone from the TV or over SSH, and a failed install rolls itself back.
2. **Fast before pretty.** Anything that costs frame time on this GPU is rejected or reworked.
3. **Operated from a couch.** Everything works with arrows, OK, Back and a pointer, and reads from 3 m.
4. **Configured where it is used.** Choices are made in the launcher with the remote, not in files.
5. **Nothing private leaves the TV.** Settings, playlists and keys stay on the device.

## Accessibility & Inclusion

Readable from about 3 m, remote-only operation, focus visible against any app colour. Menus follow the TV's language. No product-specific accessibility standard has been set; low-vision users (large text, high contrast) are a known gap.
