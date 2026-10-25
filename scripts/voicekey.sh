#!/bin/sh
# Run by the inputhook when the voice button is pressed: start listening (the service shows the cards).
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
curl -s -m 5 -X POST http://127.0.0.1:8765/api/voice/listen >/dev/null 2>&1
