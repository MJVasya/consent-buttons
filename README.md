# Consent Buttons 🍪

A universal browser extension (Manifest V3) that gives you one-click cookie choices
on any website. Source: https://github.com/MJVasya/consent-buttons (MIT).

- **Accept all** — clicks the site's own "accept all" button.
- **Essential only** — clicks "reject all"; if the site offers no reject button it
  opens the preferences dialog, switches off every optional category (analytics,
  marketing, …) while leaving strictly-necessary ones alone, and saves.

A small floating pill appears automatically whenever a cookie banner is detected.
The toolbar popup offers the same two buttons for the current tab.

## Works in

- **Chrome / Brave / Microsoft Edge / Arc / …** — any Chromium browser: load unpacked.
- **Firefox** — load temporarily (or sign it for permanent install).
- **Safari 15.4+** — convert with Apple's tool, then build in Xcode (one command, below).

No background service worker, no special APIs — just a content script and a popup,
so the same code runs everywhere.

## Install

### Guided installer (easiest)
Unzip, then run the installer for your OS — it finds your browser, opens the
extensions page, and walks you through the final clicks (Chrome/Edge/Brave
deliberately block fully silent installs, so 2–3 clicks remain yours):

- macOS / Linux: `sh install.sh`
- Windows: right-click `install.ps1` → Run with PowerShell

### Manual

### Chrome / Edge / Brave (Chromium)
1. Unzip `cookie-consent-buttons.zip` (keep the folder).
2. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Enable **Developer mode** (top right).
4. **Load unpacked** → select the unzipped folder. Pin the 🍪 icon to the toolbar.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on…** → pick `manifest.json` inside the folder.
   (Temporary add-ons unload when Firefox restarts; for a permanent install the
   extension must be signed via addons.mozilla.org.)

### Safari (macOS)
1. Install Xcode (free, App Store) and its command-line tools.
2. Convert once:
   ```sh
   xcrun safari-web-extension-converter /path/to/cookie-consent-buttons \
     --project-location ~/Projects --app-name "Consent Buttons"
   ```
3. Open the generated Xcode project, build & run (⌘R).
4. Safari → Settings → Extensions → enable **Consent Buttons**.

## How it works

1. **Detection** — the content script watches the page for known consent-manager
   banners (OneTrust, Cookiebot, Quantcast, Didomi, Usercentrics, Osano,
   Complianz, Google Funding Choices, Sourcepoint, …) or, failing that, buttons
   whose labels match accept/reject phrases in 20+ languages inside a
   cookie-consent context.
2. **Accept all** — clicks the site's accept button (known selector first, then
   best text match).
3. **Essential only** — tries the site's reject button first; otherwise opens
   "manage preferences", clicks any in-dialog reject, or unchecks every optional
   toggle (skipping anything labelled necessary/essential/required) and saves.

It runs in all frames, so consent dialogs rendered inside iframes are handled too.
The floating pill only shows in the top frame.

## Privacy

- No network requests, no analytics, no data collection — everything runs locally
  in your browser. The extension cannot see your browsing outside the tab's page
  content it needs to find the buttons.
- It only *clicks the buttons the site itself provides* — the same as you clicking
  them by hand.

## Limitations

- A few exotic consent walls may need a manual click; the pill dismisses itself
  per tab if you close it.
- Sites can change their markup at any time; the multilingual text fallback covers
  most cases when a known selector breaks.
- Button labels are matched in 20+ languages (EN, DE, FR, ES, IT, NL, PT, PL,
  SV, DA, NO, FI, RU, TR, EL, HU, CS, RO, ZH, JA, KO). Tell me if yours is missing.

## Files

- `manifest.json` — MV3 manifest (no background page needed)
- `content.js` — detection, click automation, floating pill
- `popup.html` / `popup.css` / `popup.js` — toolbar popup
- `icons/` — cookie icons
- `test/cmps.html` — fake OneTrust/Cookiebot/generic/prefs-only banners for QA
