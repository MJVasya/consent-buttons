#!/bin/sh
# Consent Buttons — guided installer for macOS and Linux.
#
# Chromium browsers (Chrome / Edge / Brave / …) deliberately block silent
# extension installs, so no script can do the last two clicks for you.
# This script automates everything else: it finds your browser, opens the
# extensions page, and walks you through the finish.
#
# Usage:  sh install.sh        (or double-click install.command on macOS)
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$DIR/manifest.json" ]; then
  echo "ERROR: manifest.json not found next to install.sh."
  echo "Run this script from inside the extracted consent-buttons folder."
  exit 1
fi

OS="$(uname)"
BROWSER=""; OPEN_CMD=""; EXT_PAGE=""

if [ "$OS" = "Darwin" ]; then
  if [ -d "/Applications/Google Chrome.app" ]; then
    BROWSER="Google Chrome"; OPEN_CMD='open -a "Google Chrome"'; EXT_PAGE="chrome://extensions"
  elif [ -d "/Applications/Brave Browser.app" ]; then
    BROWSER="Brave"; OPEN_CMD='open -a "Brave Browser"'; EXT_PAGE="brave://extensions"
  elif [ -d "/Applications/Microsoft Edge.app" ]; then
    BROWSER="Microsoft Edge"; OPEN_CMD='open -a "Microsoft Edge"'; EXT_PAGE="edge://extensions"
  elif [ -d "/Applications/Arc.app" ]; then
    BROWSER="Arc"; OPEN_CMD='open -a "Arc"'; EXT_PAGE="arc://extensions"
  elif [ -d "/Applications/Firefox.app" ]; then
    BROWSER="Firefox"; OPEN_CMD='open -a "Firefox"'; EXT_PAGE="about:debugging#/runtime/this-firefox"
  fi
else
  if command -v google-chrome >/dev/null 2>&1; then
    BROWSER="Google Chrome"; OPEN_CMD='google-chrome'; EXT_PAGE="chrome://extensions"
  elif command -v brave-browser >/dev/null 2>&1; then
    BROWSER="Brave"; OPEN_CMD='brave-browser'; EXT_PAGE="brave://extensions"
  elif command -v microsoft-edge >/dev/null 2>&1; then
    BROWSER="Microsoft Edge"; OPEN_CMD='microsoft-edge'; EXT_PAGE="microsoft-edge://extensions"
  elif command -v chromium >/dev/null 2>&1; then
    BROWSER="Chromium"; OPEN_CMD='chromium'; EXT_PAGE="chrome://extensions"
  elif command -v firefox >/dev/null 2>&1; then
    BROWSER="Firefox"; OPEN_CMD='firefox'; EXT_PAGE="about:debugging#/runtime/this-firefox"
  fi
fi

echo "🍪  Consent Buttons installer"
echo "=============================="
if [ -z "$BROWSER" ]; then
  echo "No supported browser found."
  echo "Install Chrome, Edge, Brave or Firefox, then re-run this script."
  exit 1
fi
echo "Found: $BROWSER"
echo ""
echo "Opening the extensions page…"
# shellcheck disable=SC2086
eval $OPEN_CMD "\"$EXT_PAGE\"" >/dev/null 2>&1 &
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
echo "Done — enjoy one-click cookie choices."
