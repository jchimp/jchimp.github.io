#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-docs/images}"
MAX_WIDTH="${MAX_WIDTH:-2200}"
MAX_HEIGHT="${MAX_HEIGHT:-2200}"
JPEG_QUALITY="${JPEG_QUALITY:-82}"

python3 scripts/compress-images.py   --root "$ROOT"   --max-width "$MAX_WIDTH"   --max-height "$MAX_HEIGHT"   --jpeg-quality "$JPEG_QUALITY"
