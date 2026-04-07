#!/bin/zsh
set -euo pipefail

capture() {
  local url="$1"
  local file="$2"
  osascript -e 'tell application "Google Chrome" to activate' \
            -e 'tell application "Google Chrome" to set bounds of front window to {80, 60, 1480, 980}' \
            -e "tell application \"Google Chrome\" to set URL of active tab of front window to \"$url\""
  sleep 3
  python3 -c "from PIL import ImageGrab; ImageGrab.grab(bbox=(80,60,1480,980)).save('$file')"
  echo "saved $file"
}

mkdir -p docs/screenshots
capture 'http://127.0.0.1:4174/' 'docs/screenshots/dashboard.png'
capture 'http://127.0.0.1:4174/traffic' 'docs/screenshots/traffic.png'
capture 'http://127.0.0.1:4174/performance' 'docs/screenshots/performance.png'
capture 'http://127.0.0.1:4174/integrations' 'docs/screenshots/integrations.png'
capture 'http://127.0.0.1:4174/settings' 'docs/screenshots/settings.png'
