# Build a single-file version: inline css/style.css and js/*.js into index.html
# Usage (run inside the 网站 folder):
#   powershell -ExecutionPolicy Bypass -File build_single.ps1
# Output: ShouYu-game.html (the published single-file page)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

$html = [System.IO.File]::ReadAllText((Join-Path $here "index.html"), $utf8)

$cssTag = '<link rel="stylesheet" href="css/style.css">'
if ($html.IndexOf($cssTag) -lt 0) { throw "stylesheet tag not found in index.html" }
$css = [System.IO.File]::ReadAllText((Join-Path $here "css\style.css"), $utf8)
foreach ($name in @("resource")) {
  $fontPath = "assets/type-v2/signplay-" + $name + ".woff2"
  $fontData = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $here $fontPath)))
  $css = $css.Replace("../" + $fontPath, "data:font/woff2;base64," + $fontData)
}
$html = $html.Replace($cssTag, "<style>`n" + $css + "`n</style>")

$scripts = @("js/data.js", "js/meta.js", "js/guides.js", "js/banks.js", "js/app.js")
foreach ($s in $scripts) {
  $code = [System.IO.File]::ReadAllText((Join-Path $here ($s -replace "/", "\")), $utf8)
  if ($code.IndexOf("</script") -ge 0) { throw ($s + " contains a closing script tag and cannot be inlined") }
  $tag = '<script src="' + $s + '"></script>'
  if ($html.IndexOf($tag) -lt 0) { throw ("tag not found: " + $tag) }
  $html = $html.Replace($tag, "<script>`n" + $code + "`n</script>")
}

# Keep the logo and web icons available when this HTML is used on its own.
$assetPattern = '(src|href)="(assets/brand-v1/[^"<>]+)"'
$assetMatches = [regex]::Matches($html, $assetPattern)
$assetMimeTypes = @{ ".svg" = "image/svg+xml"; ".png" = "image/png"; ".ico" = "image/x-icon" }
foreach ($asset in $assetMatches) {
  $path = $asset.Groups[2].Value
  $extension = [System.IO.Path]::GetExtension($path)
  $mime = $assetMimeTypes[$extension]
  if (-not $mime) { throw ("Unsupported image type: " + $path) }
  $bytes = [System.IO.File]::ReadAllBytes((Join-Path $here $path))
  $data = [Convert]::ToBase64String($bytes)
  $replacement = $asset.Groups[1].Value + '="data:' + $mime + ';base64,' + $data + '"'
  $html = $html.Replace($asset.Value, $replacement)
}

$out = Join-Path $here "ShouYu-game.html"
[System.IO.File]::WriteAllText($out, $html, $utf8)
$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Output ("Built: " + $out + " (" + $size + " KB)")
