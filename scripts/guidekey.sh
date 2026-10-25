#!/bin/sh
# Run by the inputhook when the Guide button is pressed (and Live TV is on): open the Live TV channel guide over whatever is running.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch '{"id":"com.webos.app.home","params":{"live":true,"guide":true}}' </dev/null >/dev/null 2>&1
