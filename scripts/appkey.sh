#!/bin/sh
# Run by the inputhook when a remote button that was given to an app is pressed (Customise > Remote buttons on Home): open that app, or
# that HDMI input (an input is an app: com.webos.app.hdmi1). The service writes the app id into keybinds.json; it is checked again here.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
case "$1" in '' | *[!A-Za-z0-9._-]*) exit 1 ;; esac
luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch "{\"id\":\"$1\"}" </dev/null >/dev/null 2>&1
