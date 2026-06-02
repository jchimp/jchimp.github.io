#!/usr/bin/env bash
# ---------------------------------------------------------------
#  deploy.sh — Build with Zensical and push to gh-pages branch
#  Usage:
#    ./scripts/deploy.sh
#    DRY_RUN=true ./scripts/deploy.sh
#    ./scripts/deploy.sh my-branch
# ---------------------------------------------------------------

set -euo pipefail

BRANCH="${1:-gh-pages}"
BUILD_DIR="site"
DRY_RUN="${DRY_RUN:-false}"
COMMIT_MSG="deploy: $(date '+%Y-%m-%d %H:%M:%S')"

log()    { echo "[deploy]   $*"; }
log_ok() { echo -e "[deploy]   \033[0;32m$*\033[0m"; }
log_err(){ echo -e "[error]    \033[0;31m$*\033[0m" >&2; }

# ---------- Pre-flight checks ----------

command -v git      >/dev/null 2>&1 || { log_err "git not found";      exit 1; }
command -v zensical >/dev/null 2>&1 || { log_err "zensical not found"; exit 1; }
[ -d ".git" ]                       || { log_err "not a git repo";     exit 1; }

ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "current branch: $ORIGINAL_BRANCH"

# ---------- Cleanup trap ----------

TEMP_DIR=""
cleanup() {
    log "switching back to $ORIGINAL_BRANCH ..."
    git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

# ---------- Build ----------

log "running zensical build ..."
zensical build

if [ ! -d "$BUILD_DIR" ]; then
    log_err "build directory '$BUILD_DIR' does not exist"
    exit 1
fi

FILE_COUNT="$(find "$BUILD_DIR" -type f | wc -l | tr -d ' ')"
if [ "$FILE_COUNT" -eq 0 ]; then
    log_err "build directory '$BUILD_DIR' is empty"
    exit 1
fi
log "build produced $FILE_COUNT file(s)"

# ---------- Dry run ----------

if [ "$DRY_RUN" = "true" ]; then
    echo ""
    echo "[dry-run]  branch:    $BRANCH"
    echo "[dry-run]  build dir: $BUILD_DIR"
    echo "[dry-run]  files:     $FILE_COUNT"
    echo "[dry-run]  message:   $COMMIT_MSG"
    echo "[dry-run]  no changes pushed"
    exit 0
fi

# ---------- Deploy ----------

TEMP_DIR="$(mktemp -d)"
log "copying build output to temp ..."
cp -r "$BUILD_DIR"/. "$TEMP_DIR/"

# Switch to deploy branch
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    log "checking out existing branch '$BRANCH' ..."
    git checkout "$BRANCH"
else
    log "creating orphan branch '$BRANCH' ..."
    git checkout --orphan "$BRANCH"
fi

# Remove all tracked files
log "cleaning working tree ..."
git rm -rf . 2>/dev/null || true
rm -f .gitignore

# Copy build output back
log "copying build output into branch ..."
cp -r "$TEMP_DIR"/. ./

# Stage, commit, push
git add --all
git commit -m "$COMMIT_MSG" --allow-empty
log "pushing to origin/$BRANCH ..."
git push origin "$BRANCH" --force

log_ok "deployed successfully"
log_ok "site will be available once GitHub Pages picks up the gh-pages branch"
