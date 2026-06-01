param(
    [string]$Root = "docs/images",
    [int]$MaxWidth = 2200,
    [int]$MaxHeight = 2200,
    [int]$JpegQuality = 82
)

$py = Get-Command py -ErrorAction SilentlyContinue
if ($py) {
    & py scripts/compress-images.py --root $Root --max-width $MaxWidth --max-height $MaxHeight --jpeg-quality $JpegQuality
    exit $LASTEXITCODE
}

python scripts/compress-images.py --root $Root --max-width $MaxWidth --max-height $MaxHeight --jpeg-quality $JpegQuality
exit $LASTEXITCODE
