---
title: Home
---

# Jeremy's Lab Notes

A small publishing hub for how-tos, operational notes, technical references, and longer project write-ups.

<div class="grid cards" markdown>

-   :material-file-document-multiple-outline: __How-To__

    ---

    Step-by-step procedures, break/fix runbooks, installation notes, and maintenance guides.

    [:octicons-arrow-right-24: Browse how-to](how-to/README.md)

-   :material-folder-cog-outline: __Projects__

    ---

    Architecture notes, screenshots, deployment examples, and lessons learned for active projects.

    [:octicons-arrow-right-24: Browse projects](projects/README.md)

-   :material-notebook-outline: __Notes__

    ---

    Short captures, troubleshooting breadcrumbs, command snippets, and known-good configs.

    [:octicons-arrow-right-24: Browse notes](notes/README.md)

-   :material-bookshelf: __References__

    ---

    Stable lookup material such as commands, file paths, service names, and site operations.

    [:octicons-arrow-right-24: Browse references](references/README.md)

</div>

## Featured projects

<div class="grid cards" markdown>

-   :material-dns-outline: __Zonerr__

    ---

    DNS manager project with a modular provider model and container-friendly deployment.

    [:octicons-arrow-right-24: Read the project page](projects/zonerr.md)

-   :material-source-repository: __JRepo__

    ---

    File sync and repository helper focused on safe defaults, logging, and unattended jobs.

    [:octicons-arrow-right-24: Read the project page](projects/jrepo.md)

</div>

## Author workflow

1. Create or update markdown under `docs/`
2. Add screenshots to `docs/images/<topic>/`
3. Preview with `mkdocs serve`
4. Compress screenshots before commit
5. `git push` to sync source
6. `mkdocs gh-deploy` to publish

## Quick links

- [Site workflow](how-to/site-workflow.md)
- [Image workflow](references/image-workflow.md)
- [Custom domain and HTTPS](references/custom-domain-and-https.md)
