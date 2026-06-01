---
title: GitHub Actions Deployment (Later)
---

# GitHub Actions Deployment (Later)

This repo starts with **manual local publishing**:

```bash
mkdocs gh-deploy
```

That keeps the deployment path simple while getting comfortable with the workflow.

## Current flow

### Sync source

```bash
git add .
git commit -m "update notes"
git push
```

### Publish site

```bash
mkdocs gh-deploy
```

## Later flow

When ready, switch to GitHub Actions so that a push to `main` can build and publish automatically.

## Activation steps

1. Rename:

```text
.github/workflows/deploy.yml.example
```

to:

```text
.github/workflows/deploy.yml
```

2. Commit and push the change.
3. Stop running `mkdocs gh-deploy` locally.
4. Use `git push` as both source sync and publish trigger.
