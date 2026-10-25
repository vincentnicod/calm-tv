# Third-party components

CleanYourTV for LG webOS is MIT licensed (see `LICENSE`). The package also contains the following unmodified
third-party files. They are separate programs that our service starts; none of our code is linked with them.

## inputhook (Input key)

The files in `third-party/inputhook/` (installed to `/media/developer/cleanyourtv/inputhook/` on the TV) are taken
unchanged from the release `org.webosbrew.inputhook` 1.5.1 of
[Simon34545/lginputhook](https://github.com/Simon34545/lginputhook) (package SHA-256
`604d556a932ec60cee1f041b144aa03d3b49043212568d4cc5bd5854c7ac88ec`). They inject a small hook into LG's input
process so a remote button can run a command; we use it for the Input button.

| File | What it is | License | Source |
|---|---|---|---|
| `ezinject` | process injector | Zlib (`LICENSE-ezinject-Zlib.txt`) | [smx-smx/ezinject](https://github.com/smx-smx/ezinject) |
| `libinputhookpp.so` | the hook library (it statically contains frida-gum) | GPL-3.0 (`LICENSE-inputhookpp-GPL-3.0.txt`) | [sundermann/inputhookpp](https://github.com/sundermann/inputhookpp) |
| lginputhook (the app is not shipped; its key ids and config format are used) | button remapper | BSD-3-Clause (`LICENSE-lginputhook-BSD-3-Clause.txt`) | [Simon34545/lginputhook](https://github.com/Simon34545/lginputhook) |

File hashes are in `third-party/inputhook/SHA256SUMS`.

**GPL-3.0 notice for `libinputhookpp.so`.** The file is distributed here unmodified, in the form it has in the
inputhook 1.5.1 release. Its corresponding source code is the `inputhookpp` project linked above (with frida-gum, whose
license is in the frida-gum project). Anyone who received this package can ask for that source from this repository's
issue tracker, and we will provide it. The GPL-3.0 text is in `LICENSE-inputhookpp-GPL-3.0.txt`. This applies to
that library only, not to the rest of this project.

## Voice (optional download)

Nothing below is shipped in the package; the manager app downloads it on request (see the Voice page of the documentation) and
`voice/cytv-asr` (MIT, source in `voice/asr.c`) is built against the Moonshine C header.

| Component | License | Source |
|---|---|---|
| Moonshine speech engine and models (`moonshine-voice` 0.1.5) | MIT | [moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine) |
| ONNX Runtime (inside the `moonshine-voice` package) | MIT | [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) |
| 64-bit GNU C library, libstdc++, libgcc (from `ubuntu-base` 22.04.5) | LGPL-2.1 / GPL-3.0 with runtime library exception | Ubuntu source packages `glibc` and `gcc-12` |

## qrcode-generator (QR code for sharing the log)

`third-party/qrcode-generator/qrcode.js` is [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 by
Kazuhiko Arase, unmodified (npm package `qrcode-generator@1.4.4`, SHA-256 of the file
`18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780`), licensed under the MIT license (the notice is in
the file header). The manager app loads it to draw the QR code.

## Design

The home-screen design follows the Android TV project [CleanYourTV](https://github.com/Gathin23/cleanyourtv) (MIT).
No code from it is used.

## Typefaces

SIL Open Font License 1.1, each licence next to its font in `app/`:

- `app/font-manrope.woff2`: Manrope by The Manrope Project Authors (Paysage).
- `app/font-geist.woff2`: Geist by The Geist Project Authors (Verre).
- `app/font-instrument-serif.woff2`, `app/font-instrument-serif-italic.woff2`: Instrument Serif by The Instrument Serif Project Authors (Éditorial).
- `app/font-instrument-sans.woff2`: Instrument Sans by The Instrument Sans Project Authors (Éditorial).
- `app/font-hanken.woff2`: Hanken Grotesk by The Hanken Grotesk Project Authors (Lin).
- `app/font-sora.woff2`: Sora by The Sora Project Authors (Aurore).
