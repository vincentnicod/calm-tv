#!/bin/sh
# Run by the inputhook when a remote button that was given to an app is pressed (Customise > Remote buttons on Home): open that app, or
# that HDMI input (an input is an app: com.webos.app.hdmi1), or with __quick the Quick settings panel over what is playing (the service
# opens it: helper/quick.js). The service writes the app id into keybinds.json; it is checked again here.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
case "$1" in '' | *[!A-Za-z0-9._-]*) exit 1 ;; esac
if [ "$1" = __quick ]; then
  curl -s -m 4 -X POST -H 'content-type: application/json' -d '{"open":"quick"}' http://127.0.0.1:8765/api/quick </dev/null >/dev/null 2>&1
  exit 0
fi
luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch "{\"id\":\"$1\"}" </dev/null >/dev/null 2>&1
