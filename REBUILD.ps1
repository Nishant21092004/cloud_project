# REBUILD.ps1 - pick up code or catalogue changes in an existing checkout.
#
#   powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1             # build + restart
#   powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed       # ...and re-seed
#   powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -SeedOnly   # just re-seed
#   powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Full       # --no-cache, slowest
#
# Why this exists: the usual "I changed it but the site is the same" is either a
# stale image or a seed that never ran. This does build -> restart -> wait for the
# API -> seed -> print what is actually in the database, in that order.
#
# Pure ASCII on purpose: Windows PowerShell 5.1 reads .ps1 as ANSI without a UTF-8
# BOM, so an em-dash or a curly quote in this file would break string parsing.

[CmdletBinding()]
param(
  [switch]$Seed,
  [switch]$SeedOnly,
  [switch]$Full
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$ProjectArgs = @()

function Step([string]$Message) { Write-Host ""; Write-Host ("==> " + $Message) -ForegroundColor Green }
function Warn([string]$Message) { Write-Host ("!!! " + $Message) -ForegroundColor Yellow }
function Say([string]$Message)  { Write-Host ("    " + $Message) -ForegroundColor DarkGray }

function Get-EnvValue([string]$Name) {
  if (-not (Test-Path .env)) { return "" }
  foreach ($line in (Get-Content .env)) {
    if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) { return $matches[1].Trim() }
  }
  return ""
}

function Run-Compose {
  param([string[]]$ComposeArgs)
  $cmd = @("compose") + @($ProjectArgs) + @($ComposeArgs)
  & docker @cmd
  if ($LASTEXITCODE -ne 0) { throw ("docker " + ($cmd -join " ") + " failed (exit " + $LASTEXITCODE + ")") }
}

# A folder may pin its own compose project (START.ps1 writes that line when several
# checkouts share one machine); -p is what definitively wins over "name:" in the file.
$projectName = Get-EnvValue "COMPOSE_PROJECT_NAME"
if ($projectName) {
  $ProjectArgs = @("-p", $projectName)
  Say ("compose project: " + $projectName)
}

$webPort = 80
$rawPort = Get-EnvValue "WEB_PORT"
if ($rawPort -match '^\d+$') { $webPort = [int]$rawPort }
$baseUrl = "http://localhost:" + $webPort

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Warn "Docker was not found on PATH. Start Docker Desktop, then run this script again."
  exit 1
}

if ($SeedOnly) {
  Step "Re-seeding the catalogue (no image rebuild)"
  Run-Compose -ComposeArgs @("exec", "-T", "backend", "npm", "run", "seed")
  Step "Done - hard-refresh the browser (Ctrl+Shift+R)"
  exit 0
}

if ($Full) {
  Step "Full rebuild with --no-cache (reinstalls dependencies, be patient)"
  Run-Compose -ComposeArgs @("build", "--no-cache")
} else {
  Step "Building the images"
  Run-Compose -ComposeArgs @("build")
}

Step "Restarting the stack"
Run-Compose -ComposeArgs @("down")
Run-Compose -ComposeArgs @("up", "-d")

Step "Waiting for the API to answer through Nginx"
$apiUp = $false
for ($try = 1; $try -le 60; $try++) {
  try {
    $probe = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/flowers") -TimeoutSec 5
    if ($null -ne $probe.meta) { $apiUp = $true; break }
  } catch {
    # 502 while the backend container is still starting is normal
  }
  Start-Sleep -Seconds 4
}
if (-not $apiUp) {
  $projectFlag = ""
  if ($projectName) { $projectFlag = "-p " + $projectName + " " }
  Warn "The API did not answer in time. Check the log, then re-run:"
  Say ("docker compose " + $projectFlag + "logs --tail=100 backend")
  exit 1
}
Say "API is serving the catalogue"

if ($Seed -or $Full) {
  Step "Seeding flowers, plants, bouquets and PIN codes"
  Run-Compose -ComposeArgs @("exec", "-T", "backend", "npm", "run", "seed")
} else {
  Step "Note"
  Say "seeding skipped - after editing backend/prisma/data run: .\REBUILD.ps1 -SeedOnly"
}

Step "What the shop is serving right now"
try {
  $f = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/flowers") -TimeoutSec 15
  $p = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/plants") -TimeoutSec 15
  $b = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/bouquets") -TimeoutSec 15
  $c = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/delivery-coverage") -TimeoutSec 15
  $pins = 0
  if ($c.configuredPincodes) { $pins = @($c.configuredPincodes).Count }
  Write-Host ("    flowers=" + $f.meta.total + "  plants=" + $p.meta.total + "  bouquets=" + $b.meta.total + "  configured-PINs=" + $pins)
} catch {
  Say ("could not read the counts: " + $_.Exception.Message)
}

Step "Done"
Write-Host ("    store     " + $baseUrl + "/flowers      (hover a card for the photo strip)") -ForegroundColor Cyan
Write-Host ("    out-stock " + $baseUrl + "/flowers?q=unicorn+daisy") -ForegroundColor Cyan
Write-Host ("    delivery  " + $baseUrl + "/delivery") -ForegroundColor Cyan
Write-Host ("    admin     " + $baseUrl + "/admin") -ForegroundColor Cyan
Say "Hard-refresh the browser once (Ctrl+Shift+R)."
Say "Photos come from Wikimedia Commons at view time, so the browser needs internet."
Say "Test logins: demo@bloomnest.test / Demo@1234   and   admin@bloomnest.test / Admin@1234"
