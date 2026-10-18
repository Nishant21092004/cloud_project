# START.ps1 - run BloomNest straight from a fresh GitHub clone.
#
# Handles the four things that break a first run:
#   1. a clone has no .env (secrets are not committed) -> creates one with random values
#   2. port 80 is often held by another checkout       -> picks a free port
#   3. docker-compose.yml pins "name: bloomnest", so every folder would share ONE
#      database volume (and then fail with "password authentication failed")
#                                                       -> gives this folder its own project
#   4. "container is up" is not "site works"            -> waits for the real API, then seeds
#
# Usage, from inside the cloned folder:
#   powershell -ExecutionPolicy Bypass -File .\START.ps1
#   powershell -ExecutionPolicy Bypass -File .\START.ps1 -Port 8080
#   powershell -ExecutionPolicy Bypass -File .\START.ps1 -NoSeed
#   powershell -ExecutionPolicy Bypass -File .\START.ps1 -SkipBuild
#
# Nothing in here deletes data. This file is pure ASCII on purpose: Windows
# PowerShell 5.1 reads .ps1 files as ANSI unless they carry a UTF-8 BOM, so a
# single em-dash or curly quote silently breaks string parsing.

[CmdletBinding()]
param(
  [int]$Port = 0,
  [switch]$NoSeed,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$ProjectArgs = @()

function Step([string]$Message) { Write-Host ""; Write-Host ("==> " + $Message) -ForegroundColor Green }
function Warn([string]$Message) { Write-Host ("!!! " + $Message) -ForegroundColor Yellow }
function Say([string]$Message)  { Write-Host ("    " + $Message) -ForegroundColor DarkGray }

# Windows PowerShell 5.1 turns a native command's stderr into an error record while
# $ErrorActionPreference is Stop. Docker Desktop writes harmless notes to stderr
# ("WARNING: No blkio throttle.read_bps_device support"), so every docker call runs
# with the preference relaxed and is judged by its exit code instead of by what it
# printed. Without this the whole script dies on a perfectly healthy Docker.
function Run-Tool {
  param([string[]]$ToolArgs, [switch]$Capture)
  $previous = $ErrorActionPreference
  $script:ToolExit = 0
  $script:ToolOut = ""
  try {
    $ErrorActionPreference = "Continue"
    if ($Capture) {
      $script:ToolOut = ((& docker @ToolArgs 2>$null) -join "`n")
    } else {
      & docker @ToolArgs
    }
    $script:ToolExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
}
function Run-Compose {
  param([string[]]$ComposeArgs)
  $cmd = @("compose") + @($ProjectArgs) + @($ComposeArgs)
  Run-Tool -ToolArgs $cmd
  if ($script:ToolExit -ne 0) { throw ("docker " + ($cmd -join " ") + " failed (exit " + $script:ToolExit + ")") }
}

function New-HexSecret([int]$Bytes) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  $builder = New-Object System.Text.StringBuilder
  foreach ($b in $buffer) { $null = $builder.Append($b.ToString("x2")) }
  return $builder.ToString()
}

function Set-EnvValue([string]$Name, [string]$Value) {
  $lines = Get-Content .env
  $found = $false
  $out = @()
  foreach ($line in $lines) {
    if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=')) {
      $out += ($Name + "=" + $Value)
      $found = $true
    } else {
      $out += $line
    }
  }
  if (-not $found) { $out += ($Name + "=" + $Value) }
  Set-Content .env -Value $out -Encoding ASCII
}

function Get-EnvValue([string]$Name) {
  foreach ($line in (Get-Content .env)) {
    if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) { return $matches[1].Trim() }
  }
  return ""
}

function Test-PortBusy([int]$Number) {
  try {
    $listener = Get-NetTCPConnection -LocalPort $Number -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return [bool]$listener
  } catch {
    return $false
  }
}

Step "Checking Docker"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Warn "docker is not on PATH. Install Docker Desktop, start it, then run this script again."
  exit 1
}
Run-Tool -ToolArgs @("info", "-f", "Docker engine {{.ServerVersion}}")
if ($script:ToolExit -ne 0) {
  Warn "Docker is installed but the daemon is not answering. Start Docker Desktop and wait until it says 'Docker Desktop is running'."
  exit 1
}

Step "Environment file"
if (-not (Test-Path .env)) {
  if (-not (Test-Path .env.example)) { throw ".env.example is missing - this does not look like a complete checkout." }
  Copy-Item .env.example .env
  $dbPassword = New-HexSecret 16
  $jwtSecret = New-HexSecret 32
  Set-EnvValue "POSTGRES_PASSWORD" $dbPassword
  Set-EnvValue "JWT_SECRET" $jwtSecret
  $dbUser = Get-EnvValue "POSTGRES_USER"
  $dbName = Get-EnvValue "POSTGRES_DB"
  if (-not $dbUser) { $dbUser = "bloomnest" }
  if (-not $dbName) { $dbName = "bloomnest" }
  Set-EnvValue "DATABASE_URL" ("postgresql://" + $dbUser + ":" + $dbPassword + "@db:5432/" + $dbName)
  Say ".env created with a random database password and JWT secret. Never commit .env."
} else {
  Say ".env already exists and was left alone (your database password and Razorpay keys stay as they are)"
}

Step "Choosing the compose project for this folder"
$pinned = "bloomnest"
if (Test-Path docker-compose.yml) {
  foreach ($line in (Get-Content docker-compose.yml)) {
    if ($line -match '^name:\s*(\S+)') { $pinned = $matches[1]; break }
  }
}
$projectName = Get-EnvValue "COMPOSE_PROJECT_NAME"
Run-Tool -ToolArgs (@("volume", "ls", "-q", "-f", ('name=^' + $pinned + '_db_data$'))) -Capture
$otherVolume = @($script:ToolOut -split "`n" | Where-Object { $_ }) | Select-Object -First 1

# Does another *folder* already run the pinned stack? docker compose ls reports each
# running project's compose file, which tells us whether that volume is ours or a
# neighbour's. Falling back to the volume check keeps this working on old Docker.
function Normalize-Path([string]$Value) {
  if (-not $Value) { return "" }
  return ($Value -replace "[\\/]", "").ToLower()
}
$mine = Normalize-Path $PSScriptRoot
$foreignStack = $false
Run-Tool -ToolArgs @("compose", "ls", "--format", "json") -Capture
$listed = $script:ToolOut
if ($listed) {
  try {
    foreach ($running in ($listed | ConvertFrom-Json)) {
      if ($running.Name -eq $pinned -and -not ((Normalize-Path $running.ConfigFiles).Contains($mine))) { $foreignStack = $true }
    }
  } catch {
    if ($otherVolume) { $foreignStack = $true }
  }
} elseif ($otherVolume) {
  $foreignStack = $true
}

if (-not $projectName) {
  if ($foreignStack) {
    $leaf = (Split-Path -Leaf $PSScriptRoot).ToLower()
    $leaf = ($leaf -replace '[^a-z0-9_-]', '')
    if (-not $leaf -or $leaf -notmatch '^[a-z0-9]') { $leaf = "clone" }
    $projectName = $pinned + "_" + $leaf
    Add-Content .env "`n# written by START.ps1 so this folder does not fight another checkout for the same volumes"
    Set-EnvValue "COMPOSE_PROJECT_NAME" $projectName
    Warn ("Another checkout already runs project '" + $pinned + "'. This folder now uses '" + $projectName + "' - its own database, nothing deleted.")
    Say "To reuse the old database instead: delete the COMPOSE_PROJECT_NAME line from .env and use the same POSTGRES_PASSWORD as that folder's .env"
  } else {
    $projectName = $pinned
    Add-Content .env "`n# written by START.ps1 so this folder always talks to its own volumes"
    Set-EnvValue "COMPOSE_PROJECT_NAME" $projectName
    Say ("No competing stack found - using the default project '" + $pinned + "' (remembered in .env)")
  }
} else {
  Say ("Project '" + $projectName + "' from .env - reusing this folder's own volumes and data")
}
$ProjectArgs = @("-p", $projectName)

Step "Picking a host port"
$envPort = 80
$raw = Get-EnvValue "WEB_PORT"
if ($raw -match '^\d+$') { $envPort = [int]$raw }
$target = $envPort
if ($Port -gt 0) { $target = $Port }
if (Test-PortBusy $target) {
  $alt = $target + 1
  if ($target -eq 80) { $alt = 8080 }
  while (Test-PortBusy $alt) { $alt = $alt + 1 }
  Warn ("Port " + $target + " is busy (probably the other checkout's stack). Using " + $alt + " instead.")
  $target = $alt
  Set-EnvValue "WEB_PORT" ([string]$target)
} else {
  Set-EnvValue "WEB_PORT" ([string]$target)
}
$baseUrl = "http://localhost:" + $target
Say ("web port " + $target)

if ($SkipBuild) {
  Step "Starting the stack (build skipped)"
  Run-Compose -ComposeArgs @("up", "-d")
} else {
  Step "Building the images - the first run also pulls base images, expect 3 to 8 minutes"
  Run-Compose -ComposeArgs @("build")
  Step "Starting db + backend + web"
  Run-Compose -ComposeArgs @("up", "-d")
}

Step "Waiting for the API to answer through Nginx"
$apiUp = $false
for ($try = 1; $try -le 60; $try++) {
  try {
    $probe = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/flowers") -TimeoutSec 5
    if ($null -ne $probe.meta) { $apiUp = $true; break }
  } catch {
    # 502 from Nginx while the API is still booting is expected here
  }
  if (-not $apiUp) { Start-Sleep -Seconds 4 }
}
if (-not $apiUp) {
  Warn "The API did not answer in 4 minutes. Read the log, fix, then re-run this script:"
  Say ("docker compose -p " + $projectName + " logs --tail=100 backend")
  Say ("docker compose -p " + $projectName + " ps")
  exit 1
}
Say "API is serving the catalogue"

if (-not $NoSeed) {
  Step "Seeding flowers, plants, bouquets, slots and PIN codes"
  Run-Compose -ComposeArgs @("exec", "-T", "backend", "npm", "run", "seed")
}

Step "What the shop is serving right now"
$flowers = 0
$plants = 0
$bouquets = 0
$pins = 0
try {
  $f = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/flowers") -TimeoutSec 15
  $p = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/plants") -TimeoutSec 15
  $b = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/bouquets") -TimeoutSec 15
  $c = Invoke-RestMethod -Uri ($baseUrl + "/api/catalog/delivery-coverage") -TimeoutSec 15
  if ($f.meta.total) { $flowers = $f.meta.total }
  if ($p.meta.total) { $plants = $p.meta.total }
  if ($b.meta.total) { $bouquets = $b.meta.total }
  if ($c.configuredPincodes) { $pins = @($c.configuredPincodes).Count }
  Say ("flowers=" + $flowers + "  plants=" + $plants + "  bouquets=" + $bouquets + "  configured-PINs=" + $pins)
  if ($flowers -lt 100 -and -not $NoSeed) {
    Warn ("fewer than 100 flowers - the seed may not have run. Try: docker compose -p " + $projectName + " exec backend npm run seed")
  }
} catch {
  Say ("could not read the counts: " + $_.Exception.Message)
}

Step "Open it"
Write-Host ("    store     " + $baseUrl + "/flowers") -ForegroundColor Cyan
Write-Host ("    delivery  " + $baseUrl + "/delivery") -ForegroundColor Cyan
Write-Host ("    builder   " + $baseUrl + "/build") -ForegroundColor Cyan
Write-Host ("    admin     " + $baseUrl + "/admin    admin@bloomnest.test / Admin@1234") -ForegroundColor Cyan
Write-Host ("    customer  " + $baseUrl + "/login    demo@bloomnest.test / Demo@1234") -ForegroundColor Cyan
Write-Host ""
Say "Hard-refresh the browser once (Ctrl+Shift+R) so the new bundle is used."
Say "Product photos are fetched by the browser from Wikimedia Commons, so this window needs internet."
Say ("Stop without deleting data:  docker compose -p " + $projectName + " down")
Say "Never run 'down -v' unless you want the database gone."
Say ("After a git pull:             powershell -ExecutionPolicy Bypass -File .\\REBUILD.ps1 -Seed")
