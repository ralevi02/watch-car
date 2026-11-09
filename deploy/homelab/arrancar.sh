#!/bin/sh
set -e
Xvfb :99 -screen 0 1366x960x24 -nolisten tcp &
websockify --web /usr/share/novnc 0.0.0.0:6080 localhost:5900 > /dev/null 2>&1 &
exec pnpm casa
