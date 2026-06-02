#!/usr/bin/env bash
# ---------------------------------------------------------------
#  serve.sh — Local dev server for Zensical
#  Uses port 8001 to avoid common port conflicts
# ---------------------------------------------------------------

set -euo pipefail

if zensical serve --dev-addr 127.0.0.1:8001 2>/dev/null; then
    :
else
    echo "[serve] --dev-addr not supported, falling back to default ..."
    zensical serve
fi
