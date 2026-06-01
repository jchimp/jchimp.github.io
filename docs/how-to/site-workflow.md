---
title: Site Workflow
---

# Site Workflow

## Daily loop

1. Create or edit a markdown file under `docs/`
2. Add images under `docs/images/<topic>/`
3. Run `mkdocs serve` to preview locally
4. Run the image compression helper
5. Commit and push your source changes
6. Run `mkdocs gh-deploy` when you want the site updated

## Source sync example

```bash
git add .
git commit -m "add new Zonerr notes"
git push
```

## Publish example

```bash
mkdocs gh-deploy
```

## Rule of thumb

- `main` = source of truth
- `gh-pages` = generated output only
