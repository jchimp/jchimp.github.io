---
title: Zonerr
summary: DNS manager project overview and working notes.
tags:
  - dns
  - flask
  - docker
  - project
---

# Zonerr

Zonerr is a DNS manager project with a modular provider model so back-end DNS providers can be swapped through configuration instead of rewriting the application.

## Goals

- simple UI for common DNS tasks
- provider abstraction for portability
- clean containerized deployment
- easy export/import of zones
- low-friction homelab to production path

## Current shape

- Flask-based application
- provider pattern for DNS back ends
- configuration-driven behavior
- Docker-friendly packaging

## Suggested page expansion

### Architecture

Describe app structure, provider interfaces, config layout, and auth model.

### Deployment

Document compose examples, reverse proxy config, backups, and upgrades.

### Screenshots

Store screenshots under:

```text
docs/images/zonerr/
```

### Lessons learned

Capture design trade-offs, failure modes, and future refactor notes.

## Placeholder deployment notes

```yaml
services:
  zonerr:
    image: ghcr.io/yourname/zonerr:latest
    container_name: zonerr
    restart: unless-stopped
    ports:
      - "8080:8080"
```
