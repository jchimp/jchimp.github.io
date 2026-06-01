---
title: Custom Domain and HTTPS
---

# Custom Domain and HTTPS

Use this checklist when you are ready to move from the default GitHub Pages URL to your own domain.

## Repo changes

1. Set the production URL in `mkdocs.yml`:

```yaml
site_url: https://yourdomain.com
```

2. Set the domain in `CNAME`:

```text
yourdomain.com
```

3. Commit and push those changes.

## GitHub Pages settings

1. Open the repo on GitHub.
2. Go to **Settings → Pages**.
3. Confirm the site is being served from the correct branch.
4. Enter the custom domain if needed.
5. If you are publishing from a branch, GitHub can create or update the `CNAME` file for you when you save the custom domain.

## DNS patterns

### Apex/root domain

Use one of these with your DNS provider:

- `ALIAS` or `ANAME` pointing at `yourname.github.io`
- or `A` records pointing at the GitHub Pages IPv4 endpoints
- optional `AAAA` records for IPv6 support

### Subdomain

Use a `CNAME` pointing to:

```text
yourname.github.io
```

## Domain verification (recommended)

Verification happens at the profile or account level, not the repository level.

1. In GitHub, open your profile settings.
2. Go to **Pages**.
3. Start domain verification for `yourdomain.com`.
4. Add the TXT record(s) GitHub gives you at your DNS provider.
5. Wait for DNS propagation and complete verification.

## HTTPS checklist

1. Wait for DNS to propagate.
2. Wait for GitHub Pages certificate provisioning.
3. In **Settings → Pages**, enable **Enforce HTTPS** when it becomes available.
4. Test both:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com` if you use `www`

## Troubleshooting

- mismatch between `CNAME` and GitHub Pages settings
- DNS still propagating
- wrong record type for apex vs subdomain
- certificate not provisioned yet
- wildcard DNS records can create takeover risk and are best avoided
