# ---------------------------------------------------------------
#  serve.ps1 — Local dev server for Zensical
#  Uses port 8001 to avoid Windows excluded port range on 8000
# ---------------------------------------------------------------

try {
    zensical serve --dev-addr 127.0.0.1:8001
} catch {
    Write-Host "[serve] --dev-addr not supported, falling back to default ..." -ForegroundColor Yellow
    zensical serve
}
