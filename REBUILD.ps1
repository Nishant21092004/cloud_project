<#
  REBUILD.ps1 — one command to pick up catalogue / code changes in D:\cc_project.

  Why this exists: docker-compose.bind mounts the source into the container, so a
  *data* change still needs a re-seed, and any backend change needs `prisma
  generate` + a rebuild of the image. Doing it by hand in the wrong order is the
  number one cause of "I changed the code but the site still shows the old stuff".

  Usage (from D:\cc_project):
    powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1
    powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed    # rebuild + re-seed
    powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -SeedOnly
    powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Full    # --no-cache, slowest, always correct

  -SeedOnly skips the image build: use it after editing prisma/data/* or running
  the catalogue seed, which is the common case while you are tuning flowers/plants.
#>
[CmdletBinding()]
param(
  [switch]$Seed,
  [switch]$SeedOnly,
  [switch]$Full
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "!!! $msg" -ForegroundColor Yellow }

function Invoke-Compose([string[]]$ComposeArgs) {
  & docker compose @ComposeArgs
  if ($LASTEXITCODE -ne 0) { throw "docker compose $($ComposeArgs -join ' ') failed (exit $LASTEXITCODE)" }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Warn "Docker was not found on PATH. Start Docker Desktop, then run this script again."
  exit 1
}

if ($SeedOnly) {
  Step "Re-seeding the catalogue (no image rebuild)"
  Invoke-Compose @("exec", "-T", "backend", "npm", "run", "seed")
  Step "Done — hard-refresh the browser (Ctrl+Shift+R)"
  exit 0
}

if ($Full) {
  Step "Full rebuild with --no-cache (this pulls a fresh npm install, be patient)"
  Invoke-Compose @("build", "--no-cache")
} else {
  Step "Building images"
  Invoke-Compose @("build")
}

Step "Restarting the stack"
Invoke-Compose @("down")
Invoke-Compose @("up", "-d")

Step "Waiting for the API to answer /health/ready"
$deadline = (Get-Date).AddSeconds(120)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    & docker compose exec -T backend node -e "fetch('http://localhost:4000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  } catch { }
  Start-Sleep -Seconds 3
}
if (-not $ready) { Warn "API did not report ready within 120s — check: docker compose logs --tail=80 backend" }

if ($Seed -or $Full) {
  Step "Seeding flowers / plants / bouquets / delivery pincodes"
  Invoke-Compose @("exec", "-T", "backend", "npm", "run", "seed")
} else {
  Step "Note"
  Write-Host "Skipped seeding. If you changed backend/prisma/data/*, run:  .\REBUILD.ps1 -SeedOnly" -ForegroundColor DarkGray
}

Step "Current catalogue"
try {
  $count = & docker compose exec -T backend node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();Promise.all([p.flower.count(),p.plant.count(),p.bouquet.count()]).then(r=>{console.log('flowers='+r[0]+' plants='+r[1]+' bouquets='+r[2]);process.exit(0)})" 2>$null
  if ($count) { Write-Host $count }
} catch { Warn "Could not read counts." }

$port = if ($env:WEB_PORT) { $env:WEB_PORT } else { "80" }
Step "Open http://localhost:$port/flowers and hover a card"
Write-Host "Photos come from Wikimedia Commons at view time, so the browser needs internet." -ForegroundColor DarkGray
Write-Host "Test login: demo@bloomnest.test / Demo@1234  ·  admin@bloomnest.test / Admin@1234" -ForegroundColor DarkGray
