# Build a single-file version: inline css/style.css and js/*.js into index.html
# Usage (run inside the 网站 folder):
#   powershell -ExecutionPolicy Bypass -File build_single.ps1
# Output: handbook_single.html

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

$html = [System.IO.File]::ReadAllText((Join-Path $here "index.html"), $utf8)

$cssTag = '<link rel="stylesheet" href="css/style.css">'
if ($html.IndexOf($cssTag) -lt 0) { throw "stylesheet tag not found in index.html" }
$css = [System.IO.File]::ReadAllText((Join-Path $here "css\style.css"), $utf8)
$html = $html.Replace($cssTag, "<style>`n" + $css + "`n</style>")

$scripts = @("js/data.js", "js/meta.js", "js/guides.js", "js/app.js")
foreach ($s in $scripts) {
  $code = [System.IO.File]::ReadAllText((Join-Path $here ($s -replace "/", "\")), $utf8)
  if ($code.IndexOf("</script") -ge 0) { throw ($s + " contains a closing script tag and cannot be inlined") }
  $tag = '<script src="' + $s + '"></script>'
  if ($html.IndexOf($tag) -lt 0) { throw ("tag not found: " + $tag) }
  $html = $html.Replace($tag, "<script>`n" + $code + "`n</script>")
}

$out = Join-Path $here "handbook_single.html"
[System.IO.File]::WriteAllText($out, $html, $utf8)
$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Output ("Built: " + $out + " (" + $size + " KB)")
