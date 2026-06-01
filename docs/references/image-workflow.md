---
title: Image Workflow
---

# Image Workflow

Use the helper before commits to reduce oversized screenshots while keeping source images in place.

## What it does

- scans `docs/images/`
- compresses PNG, JPG, and JPEG files in place
- resizes images larger than the configured max width or height
- writes a JSON report to `.image-compress-report.json`

## Run it

### Python

```bash
python scripts/compress-images.py
```

### Bash

```bash
./scripts/compress-images.sh
```

### PowerShell

```powershell
./scripts/compress-images.ps1
```

## Default behavior

- max width: `2200`
- max height: `2200`
- JPEG quality: `82`
- PNG optimize: enabled
- recurse under `docs/images/`

## Safe usage notes

- commit before running if you want easy rollback
- use Git to review image diffs after compression
- keep originals elsewhere if you need archival masters
