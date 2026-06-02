# ---------------------------------------------------------------
#  deploy.ps1 — Build with Zensical and push to gh-pages branch
#  Usage:
#    ./scripts/deploy.ps1
#    ./scripts/deploy.ps1 -DryRun
#    ./scripts/deploy.ps1 -Branch "gh-pages" -CommitMsg "my deploy"
# ---------------------------------------------------------------

param(
    [string]$Branch    = "gh-pages",
    [string]$BuildDir  = "site",
    [string]$CommitMsg = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Log   { param([string]$msg) Write-Host "[deploy]   $msg" }
function LogOk { param([string]$msg) Write-Host "[deploy]   $msg" -ForegroundColor Green }
function LogErr{ param([string]$msg) Write-Host "[error]    $msg" -ForegroundColor Red }

# ---------- Pre-flight checks ----------

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    LogErr "git is not installed or not in PATH"; exit 1
}
if (-not (Get-Command zensical -ErrorAction SilentlyContinue)) {
    LogErr "zensical is not installed or not in PATH"; exit 1
}
if (-not (Test-Path ".git")) {
    LogErr "not inside a git repository"; exit 1
}

$OriginalBranch = (git rev-parse --abbrev-ref HEAD).Trim()
Log "current branch: $OriginalBranch"

# ---------- Build ----------

Log "running zensical build ..."
zensical build
if ($LASTEXITCODE -ne 0) { LogErr "zensical build failed"; exit 1 }

if (-not (Test-Path $BuildDir)) {
    LogErr "build directory '$BuildDir' does not exist"; exit 1
}
$FileCount = (Get-ChildItem -Path $BuildDir -Recurse -File).Count
if ($FileCount -eq 0) {
    LogErr "build directory '$BuildDir' is empty"; exit 1
}
Log "build produced $FileCount file(s)"

# ---------- Dry run ----------

if ($DryRun) {
    Write-Host ""
    Write-Host "[dry-run]  branch:    $Branch"
    Write-Host "[dry-run]  build dir: $BuildDir"
    Write-Host "[dry-run]  files:     $FileCount"
    Write-Host "[dry-run]  message:   $CommitMsg"
    Write-Host "[dry-run]  no changes pushed"
    exit 0
}

# ---------- Deploy ----------

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "zensical-deploy-$(Get-Random)"

try {
    # Copy build output to safe temp location
    Log "copying build output to temp ..."
    Copy-Item -Path $BuildDir -Destination $TempDir -Recurse -Force

    # Switch to deploy branch (orphan if new)
    $BranchExists = git branch --list $Branch
    if ($BranchExists) {
        Log "checking out existing branch '$Branch' ..."
        git checkout $Branch
    } else {
        Log "creating orphan branch '$Branch' ..."
        git checkout --orphan $Branch
    }

    # Remove all tracked files
    Log "cleaning working tree ..."
    git rm -rf . 2>$null
    if (Test-Path ".gitignore") { Remove-Item ".gitignore" -Force }

    # Copy build output back
    Log "copying build output into branch ..."
    Get-ChildItem -Path $TempDir -Force | Copy-Item -Destination . -Recurse -Force

    # Stage, commit, push
    git add --all
    git commit -m $CommitMsg --allow-empty
    Log "pushing to origin/$Branch ..."
    git push origin $Branch --force

    LogOk "deployed successfully"
    LogOk "site will be available once GitHub Pages picks up the gh-pages branch"
}
finally {
    # Always switch back to original branch
    Log "switching back to $OriginalBranch ..."
    git checkout $OriginalBranch 2>$null | Out-Null

    # Clean up temp
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force 2>$null
    }
}
