#!/bin/sh
xset s off -dpms
openbox &
python3 /usr/share/nsk/server.py &
until curl -s http://127.0.0.1:8080/ >/dev/null; do sleep 0.3; done
exec chromium --no-sandbox --kiosk --app=http://127.0.0.1:8080/ \
  --user-data-dir=/tmp/nsk-ui --no-first-run --noerrdialogs --disable-infobars \
  --disable-translate --force-device-scale-factor=1 --autoplay-policy=no-user-gesture-required
