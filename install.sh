#!/bin/sh
# Consent Buttons — guided installer for macOS and Linux.
#
# Chromium browsers (Chrome / Edge / Brave / …) deliberately block silent
# extension installs, so no script can do the last two clicks for you.
# This script lists the browsers it finds, opens the extensions page in the
# one you pick, and walks you through the finish.
#
# Usage:  sh install.sh        (or double-click install.command on macOS)
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$DIR/manifest.json" ]; then
  echo "ERROR: manifest.json not found next to install.sh."
  echo "Run this script from inside the extracted consent-buttons folder."
  exit 1
fi

N=0
add() { N=$((N+1)); eval "NAME_$N=\"\$1\"; OPEN_$N=\"\$2\"; PAGE_$N=\"\$3\""; }

OS="$(uname)"
if [ "$OS" = "Darwin" ]; then
  [ -d "/Applications/Google Chrome.app" ]  && add "Google Chrome"  'open -a "Google Chrome"'  "chrome://extensions"
  [ -d "/Applications/Brave Browser.app" ]  && add "Brave"          'open -a "Brave Browser"'   "brave://extensions"
  [ -d "/Applications/Microsoft Edge.app" ] && add "Microsoft Edge" 'open -a "Microsoft Edge"'  "edge://extensions"
  [ -d "/Applications/Arc.app" ]             && add "Arc"            'open -a "Arc"'             "arc://extensions"
  [ -d "/Applications/Firefox.app" ]         && add "Firefox"        'open -a "Firefox"'        "about:debugging#/runtime/this-firefox"
else
  command -v google-chrome >/dev/null 2>&1 && add "Google Chrome"  "google-chrome"  "chrome://extensions"
  command -v brave-browser >/dev/null 2>&1 && add "Brave"          "brave-browser"  "brave://extensions"
  command -v microsoft-edge >/dev/null 2>&1 && add "Microsoft Edge" "microsoft-edge" "microsoft-edge://extensions"
  command -v chromium >/dev/null 2>&1      && add "Chromium"       "chromium"       "chrome://extensions"
  command -v firefox >/dev/null 2>&1       && add "Firefox"        "firefox"        "about:debugging#/runtime/this-firefox"
fi

echo "🍪  Consent Buttons installer"
echo "=============================="
if [ "$N" -eq 0 ]; then
  echo "No supported browser found."
  echo "Install Chrome, Edge, Brave or Firefox, then re-run this script."
  exit 1
fi

if [ "$N" -eq 1 ]; then
  CH=1
else
  echo "Found $N browsers:"
  i=1
  while [ $i -le "$N" ]; do eval "echo \"  \$i) \$NAME_$i\""; i=$((i+1)); done
  printf "Install into which one? [1-%s]: " "$N"
  read -r CH
  case "$CH" in ''|*[!0-9]*) CH=1 ;; esac
  if [ "$CH" -lt 1 ] || [ "$CH" -gt "$N" ]; then CH=1; fi
fi
eval "BROWSER=\"\$NAME_$CH\"; OPEN_CMD=\"\$OPEN_$CH\"; EXT_PAGE=\"\$PAGE_$CH\""

echo ""
echo "Using: $BROWSER"
echo "Opening the extensions page…"
eval "$OPEN_CMD \"$EXT_PAGE\"" >/dev/null 2>&1 &
sleep 1

if [ "$BROWSER" = "Firefox" ]; then
  echo ""
  echo "Finish in Firefox (2 clicks):"
  echo "  1. Click \"Load Temporary Add-on…\""
  echo "  2. Select this file:"
  echo "       $DIR/manifest.json"
  echo ""
  echo "(Temporary add-ons unload when Firefox restarts; a permanent install"
  echo " needs the extension signed at addons.mozilla.org.)"
else
  echo ""
  echo "Finish in $BROWSER (3 clicks):"
  echo "  1. Turn ON \"Developer mode\" (toggle, top right)"
  echo "  2. Click \"Load unpacked\" and select this folder:"
  echo "       $DIR"
  echo "  3. Pin the 🍪 icon to the toolbar"
fi
echo ""
echo "Tip: if you already loaded the extension before, skip the steps —"
echo "just pin the 🍪 icon to the toolbar."
echo "Done — enjoy one-click cookie choices."
