<#
  START.ps1 — run BloomNest straight from a fresh git clone.

  Does everything a first run needs, in the right order:
    1. creates .env from .env.example with a random DB password + JWT secret
       (a clone never contains .env — secrets are not committed)
    2. picks a free host port if 80 is already taken by another stack
    3. builds and starts db + backend + web
    4. waits until the API really answers /health/ready (not just "container up")
    5. seeds flowers / plants / bouquets / PIN codes and prints the counts

  Usage, from inside the cloned folder:
    powershell -ExecutionPolicy Bypass -File .\START.ps1
    powershell -ExecutionPolicy Bypass -File .\START.ps1 -Port 8080
    powershell -ExecutionPolicy Bypass -File .\START.ps1 -NoSeed     # start only

  Nothing here deletes data. `-NoSeed` plus the compose commands below is all you
  need day to day; see REBUILD.ps1 when you pull new code.
#>
[CmdletBinding()]
param(
  [int]$Port = 0,
  [switch]$NoSeed,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "!!! $msg" -ForegroundColor Yellow }
function Say($msg)  { Write-Host "    $msg" -ForegroundColor DarkGray }

# $script:ProjectArgs is filled once the compose project is known; `-p` beats both
# the `name:` key in docker-compose.yml and COMPOSE_PROJECT_NAME, so there is no
# ambiguity about which volumes a folder owns.
$script:ProjectArgs = @()
function Invoke-Compose([string[]]$ComposeArgs) {
  & docker compose @script:ProjectArgs @ComposeArgs
  if ($LASTEXITCODE -ne 0) { throw "docker compose $($ComposeArgs -join ' ') failed (exit $LASTEXITCODE)" }
}
function Invoke-ComposeQuiet([string[]]$ComposeArgs) {
  & docker compose @script:ProjectArgs @ComposeArgs 2>$null | Out-Null
  return $LASTEXITCODE
}

function New-Secret([int]$bytes) {
  $buf = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
  -join ($buf | ForEach-Object { $_.ToString("x2") })
}

Step "Checking Docker"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Warn "Docker is not on PATH. Install Docker Desktop from docker.com, start it, then run this script again."
  exit 1
}
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Warn "Docker is installed but the daemon is not running — start Docker Desktop and wait for 'Docker Desktop is running'."
  exit 1
}
Say "docker $(docker --version)"

Step "Environment file"
if (-not (Test-Path .env)) {
  if (-not (Test-Path .env.example)) { throw ".env.example is missing — this does not look like a complete checkout." }
  Copy-Item .env.example .env
  $pg  = New-Secret 16
  $jwt = New-Secret 32
  $text = Get-Content .env -Raw
  $text = $text -replace '(?m)^POSTGRES_PASSWORD=.*$', "POSTGRES_PASSWORD=$pg"
  $text = $text -replace '(?m)^DATABASE_URL=postgresql://bloomnest:[^@]*@', "DATABASE_URL=postgresql://bloomnest:$pg@"
  $text = $text -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$jwt"
  Set-Content .env -Value $text -Encoding ascii
  Say ".env created with a random database password + JWT secret. Never commit this file."
} else {
  Say ".env already exists — left untouched (existing database password and Razorpay keys stay as they are)"
}

# docker-compose.yml pins `name: bloomnest`, so *any* folder would otherwise share
# the same volumes: a fresh clone would either inherit the old database or die with
# "password authentication failed" (new random password, data directory written by
# the old .env). Give this checkout its own compose project when a stack already exists.
Step "Picking this folder's compose project"
$composeText = if (Test-Path docker-compose.yml) { Get-Content docker-compose.yml -Raw } else { "" }
$pinnedName = if ($composeText -match '(?m)^name:\s*(\S+)') { $matches[1] } else { "bloomnest" }
$envText = Get-Content .env -Raw
$projectName = if ($envText -match '(?m)^COMPOSE_PROJECT_NAME=(.*)$') { $matches[1].Trim() } else { "" }
$oldVolume = & docker volume ls -q -f "name=^${pinnedName}_db_data$" 2>$null | Select-Object -First 1
if (-not $projectName) {
  if ($oldVolume) {
    $leaf = (Split-Path -Leaf $PSScriptRoot).ToLower() -replace '[^a-z0-9_-]', ''
    if (-not $leaf -or $leaf -notmatch '^[a-z0-9]') { $leaf = "clone" }
    $projectName = "${pinnedName}_$leaf"
    Add-Content .env -Value "`n# Written by START.ps1: keeps this folder off the volumes D:\cc_project is using.`nCOMPOSE_PROJECT_NAME=$projectName"
    Warn "A '$pinnedName' stack already exists ($oldVolume). This folder now uses project '$projectName' — its own database, old data untouched."
    Say "To reuse the OLD database instead: delete the COMPOSE_PROJECT_NAME line from .env and set the same POSTGRES_PASSWORD as D:\cc_project\.env"
  } else {
    $projectName = $pinnedName
    Say "No other BloomNest volumes on this machine — using the default project '$pinnedName'"
  }
} else {
  Say "Project '$projectName' (from .env) — reusing this folder's existing volumes and data"
}
$script:ProjectArgs = @("-p", $projectName)

# Port: honour -Port, else keep whatever .env says, else find a free one.
$envMap = @{}
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $envMap[$matches[1]] = $matches[2].Trim() }
}
$currentPort = if ($envMap["WEB_PORT"]) { [int]$envMap["WEB_PORT"] } else { 80 }
$wanted = if ($Port -gt 0) { $Port } else { $currentPort }

function Test-PortBusy([int]$p) {
  try { return [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1) }
  catch { return $false }
}

if (Test-PortBusy $wanted) {
  $alt = if ($wanted -eq 80) { 8080 } else { $wanted + 1 }
  while (Test-PortBusy $alt) { $alt++ }
  Warn "Port $wanted is already in use (probably your old D:\cc_project stack is still running). Using $alt instead."
  $text = (Get-Content .env -Raw) -replace '(?m)^WEB_PORT=.*$', "WEB_PORT=$alt"
  Set-Content .env -Value $text -Encoding ascii
  $wanted = $alt
  Say "To free port 80 later:  cd D:\cc_project ; docker compose down"
} else {
  $text = (Get-Content .env -Raw) -replace '(?m)^WEB_PORT=.*$', "WEB_PORT=$wanted"
  Set-Content .env -Value $text -Encoding ascii
}
Say "web port: $wanted"

if ($SkipBuild) {
  Step "Starting the stack (build skipped)"
  Invoke-Compose @("up", "-d")
} else {
  Step "Building the images — first run downloads base images, expect 3-8 minutes"
  Invoke-Compose @("build")
  Step "Starting db + backend + web"
  Invoke-Compose @("up", "-d")
}

Step "Waiting for the API to report ready"
$ready = $false
$deadline = (Get-Date).AddSeconds(240)
while ((Get-Date) -lt $deadline) {
  if ((Invoke-ComposeQuiet @("exec", "-T", "backend", "node", "-e", "fetch('http://localhost:4000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))")) -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 4
}
if (-not $ready) {
  Warn "The API did not become ready in time. Read the log, then re-run:  docker compose logs --tail=100 backend"
  exit 1
}
Say "API healthy"
$usedVolumes = & docker volume ls -q --filter "name=${projectName}_db_data" 2>$null
if ($usedVolumes) { Say "this folder owns: $(($usedVolumes | ForEach-Object { $_.Trim() }) -join ', ')" }
else { Say "no ${projectName}_db_data volume yet — it is created on first start" }

if (-not $NoSeed) {
  Step "Seeding the catalogue"
  Invoke-Compose @("exec", "-T", "backend", "npm", "run", "seed")
}

Step "What is in the database now"
& docker compose @script:ProjectArgs exec -T backend node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();Promise.all([p.flower.count(),p.plant.count(),p.plantVariant.count(),p.bouquet.count(),p.serviceablePincode.count()]).then(r=>{console.log('    flowers='+r[0]+'  plants='+r[1]+'  pot-variants='+r[2]+'  bouquets='+r[3]+'  serviceable-PINs='+r[4]);process.exit(0)}).catch(e=>{console.log('    could not read counts: '+e.message);process.exit(0)})"

$url = "http://localhost:$wanted"
Step "Open the shop"
Write-Host "    store     $url/flowers" -ForegroundColor Cyan
Write-Host "    delivery  $url/delivery" -ForegroundColor Cyan
Write-Host "    admin     $url/admin   (admin@bloomnest.test / Admin@1234)" -ForegroundColor Cyan
Write-Host "    customer  $url/login   (demo@bloomnest.test / Demo@1234)" -ForegroundColor Cyan
Write-Host ""
Say "Hard-refresh the browser once (Ctrl+Shift+R) so the new bundle is picked up."
Say "Product photos are fetched from Wikimedia Commons by the browser, so this window needs internet."
Say "Stop without deleting data: docker compose down      (NEVER 'down -v' — that wipes the database)"
Say "After pulling new code:     powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed"
