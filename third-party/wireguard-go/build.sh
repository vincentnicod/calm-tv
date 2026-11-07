#!/bin/sh
# Builds third-party/wireguard-go/wireguard-go (32-bit ARM, Linux: the TV's userland) from the official source of wireguard-go
# 0.0.20250522 (MIT), unmodified. Needs Go (any version: GOTOOLCHAIN fetches the pinned one, checked against Go's checksum database).
# The build is reproducible: the same source and Go version give the same file, whose SHA-256 is in SHA256SUMS.
set -e
cd "$(dirname "$0")"
TAG=0.0.20250522
COMMIT=f333402bd9cbe0f3eeb02507bd14e23d7d639280
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
git clone -q --depth 1 --branch "$TAG" https://git.zx2c4.com/wireguard-go "$T/src" 2>/dev/null
[ "$(git -C "$T/src" rev-parse HEAD)" = "$COMMIT" ] || { echo "wireguard-go $TAG is not commit $COMMIT" >&2; exit 1; }
cd "$T/src"
GOTOOLCHAIN=go1.27.3 GOFLAGS=-mod=readonly CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=7 \
  go build -trimpath -buildvcs=false -ldflags='-s -w -buildid=' -o "$OLDPWD/wireguard-go" .
cp LICENSE "$OLDPWD/LICENSE-wireguard-go-MIT.txt"
cd "$OLDPWD"
shasum -a 256 wireguard-go LICENSE-wireguard-go-MIT.txt > SHA256SUMS
ls -l wireguard-go
