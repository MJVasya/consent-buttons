# Consent Buttons — guided installer for Windows (PowerShell).
#
# Chromium browsers (Chrome / Edge / Brave) deliberately block silent extension
# installs, so no script can do the last two clicks for you. This script finds
# your browser, opens the extensions page, and walks you through the finish.
#
# Usage: right-click install.ps1 -> "Run with PowerShell"

$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $dir "manifest.json"))) {
  Write-Host "ERROR: manifest.json not found next to install.ps1." -ForegroundColor Red
  Write-Host "Run this script from inside the extracted consent-buttons folder."
  exit 1
}

$candidates = @(
  @{ Name = "Google Chrome";  Paths = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
                                       "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe");
                               Page = "chrome://extensions" },
  @{ Name = "Brave";           Paths = @("$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
                                       "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe");
                               Page = "brave://extensions" },
  @{ Name = "Microsoft Edge";  Paths = @("$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
                                       "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe");
                               Page = "edge://extensions" }
)
$found = @()
foreach ($c in $candidates) {
  foreach ($p in $c.Paths) {
    if (Test-Path $p) {
      $found += [pscustomobject]@{ Name = $c.Name; Exe = $p; Page = $c.Page }
      break
    }
  }
}
$firefox = "$env:ProgramFiles\Mozilla Firefox\firefox.exe"
if (Test-Path $firefox) {
  $found += [pscustomobject]@{ Name = "Firefox"; Exe = $firefox; Page = "about:debugging#/runtime/this-firefox" }
}

Write-Host "`n🍪  Consent Buttons installer" -ForegroundColor Green
Write-Host "=============================="
if ($found.Count -eq 0) {
  Write-Host "No supported browser found." -ForegroundColor Red
  Write-Host "Install Chrome, Edge, Brave or Firefox, then re-run this script."
  exit 1
}

if ($found.Count -eq 1) {
  $sel = $found[0]
} else {
  Write-Host "Found $($found.Count) browsers:"
  for ($i = 0; $i -lt $found.Count; $i++) {
    Write-Host "  $($i + 1)) $($found[$i].Name)"
  }
  $ch = Read-Host "Install into which one? [1-$($found.Count)]"
  if ($ch -notmatch '^\d+$' -or [int]$ch -lt 1 -or [int]$ch -gt $found.Count) { $ch = 1 }
  $sel = $found[[int]$ch - 1]
}
$browser = $sel.Name; $exe = $sel.Exe; $extPage = $sel.Page
Write-Host "Found: $browser`n"
Write-Host "Opening the extensions page…"
Start-Process $exe $extPage
Start-Sleep 1

if ($browser -eq "Firefox") {
  Write-Host @"

Finish in Firefox (2 clicks):
  1. Click "Load Temporary Add-on…"
  2. Select this file:
       $dir\manifest.json

(Temporary add-ons unload when Firefox restarts; a permanent install
 needs the extension signed at addons.mozilla.org.)
"@
} else {
  Write-Host @"

Finish in $browser (3 clicks):
  1. Turn ON "Developer mode" (toggle, top right)
  2. Click "Load unpacked" and select this folder:
       $dir
  3. Pin the cookie icon to the toolbar
"@
}
Write-Host "Done - enjoy one-click cookie choices.`n"
Write-Host "Tip: if you already loaded the extension before, skip the steps -"
Write-Host "just pin the cookie icon to the toolbar."
