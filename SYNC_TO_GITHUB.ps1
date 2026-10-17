# Replaces the existing cloud_project repository's main branch with this BloomNest project.
# Repository NAME stays cloud_project. Run only after testing locally.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$Repo = "https://github.com/Nishant21092004/cloud_project.git"

if (!(Test-Path "backend/prisma/schema.prisma") -or !(Test-Path "frontend/src/pages/CheckoutPage.tsx") -or !(Test-Path "docker-compose.yml")) {
  throw "BloomNest project files are missing. Run this script from the updated cc_project folder."
}
Write-Host "This will replace the ShopSense content in Nishant21092004/cloud_project (main) with BloomNest." -ForegroundColor Yellow
Write-Host "Repo name stays cloud_project. Existing remote main history will be replaced." -ForegroundColor Yellow
$choice = Read-Host "Type REPLACE to continue"
if ($choice -cne "REPLACE") { Write-Host "Cancelled. No remote changes made."; exit 0 }

if (!(Test-Path ".git")) { git init -b main }
# Ensure the newly extracted BloomNest checkout is the source, not a clone of ShopSense.
$origin = git remote 2>$null
if ($origin -contains 'origin') { git remote remove origin }
git remote add origin $Repo
# Lease protects against overwriting a newer remote commit without noticing it.
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw "Could not read remote repository; verify GitHub authentication and network." }
git switch -C main
if ($LASTEXITCODE -ne 0) { throw "Could not switch to main." }
git add -A
if ($LASTEXITCODE -ne 0) { throw "Could not stage files." }
# .env, node_modules and uploaded runtime files are excluded by .gitignore.
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "Replace ShopSense with BloomNest flower store update"
  if ($LASTEXITCODE -ne 0) { throw "Git commit failed; configure your git user.name and user.email first." }
}
git push --force-with-lease origin main
if ($LASTEXITCODE -ne 0) { throw "Push failed; remote was NOT replaced. Check permissions and recent remote updates." }
Write-Host "GitHub updated: $Repo (main). Repository name unchanged." -ForegroundColor Green
