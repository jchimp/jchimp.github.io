# Jeremy's Lab Notes

Static site built with MkDocs + Material and published to GitHub Pages.

## Purpose

This repo is the source of truth for:
- how-tos
- references
- notes
- project write-ups
- screenshots and diagrams

## Local setup

### Windows PowerShell

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Linux/macOS

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run locally

```bash
mkdocs serve
```

Browse to:

```text
http://127.0.0.1:8000
```

## Source sync vs publishing

These are separate on purpose.

### 1. Sync source content

Use this whenever you want to save and sync your markdown, images, and config.

```bash
git add .
git commit -m "add proxmox ceph notes"
git push
```

This updates your source repo only.

### 2. Publish the website

Use this when you want the live site updated.

```bash
mkdocs gh-deploy
```

This builds the static site and pushes the generated output to the `gh-pages` branch.

## Recommended workflow

1. Edit markdown in `docs/`
2. Add images under `docs/images/<topic>/`
3. Preview locally with `mkdocs serve`
4. Commit and push source changes
5. Run `mkdocs gh-deploy` when you want the live site updated

## Content layout

```text
docs/
├── index.md
├── how-to/
├── projects/
├── notes/
├── references/
└── images/
```

## Analytics

Analytics is configured in `mkdocs.yml` with a placeholder:

```yaml
extra:
  analytics:
    provider: google
    property: G-XXXXXXXXXX
```

Replace the value with your GA4 Measurement ID.

## Custom domain and HTTPS checklist

See:

- `docs/references/custom-domain-and-https.md`

## Later: GitHub Actions

A reference workflow is included here but not enabled:

```text
.github/workflows/deploy.yml.example
```

When you are ready to switch away from local `gh-deploy`, rename it to:

```text
.github/workflows/deploy.yml
```

and then stop running `mkdocs gh-deploy` locally.
