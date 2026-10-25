#!/bin/sh
# Builds voice/cytv-asr (64-bit ARM, Linux) from asr.c on any computer with zig (https://ziglang.org, tested with 0.15.2).
# It needs libmoonshine.so and moonshine-c-api.h from the moonshine-voice 0.1.5 release; the script fetches both.
set -e
cd "$(dirname "$0")"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
URL=https://files.pythonhosted.org/packages/23/1c/cb821747b2a7b40216dd576a62d1ebc77d04fab97064efc97fa460f137ed/moonshine_voice-0.1.5-py3-none-manylinux_2_31_aarch64.whl
curl -fsSL "$URL" -o "$T/mv.whl"
[ "$(shasum -a 256 "$T/mv.whl" | cut -d' ' -f1)" = 605300afe33eb7920301e73f11e0ea7493770eb655f389ba65be4aa1db8dedd6 ] || { echo "wheel checksum mismatch" >&2; exit 1; }
unzip -qo "$T/mv.whl" moonshine_voice/libmoonshine.so -d "$T"
curl -fsSL https://raw.githubusercontent.com/moonshine-ai/moonshine/v0.1.5/core/moonshine-c-api.h -o "$T/moonshine-c-api.h"
zig cc -target aarch64-linux-gnu.2.31 -O2 -s -I"$T" asr.c "$T/moonshine_voice/libmoonshine.so" -o cytv-asr
ls -l cytv-asr
