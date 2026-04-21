$ScriptDir = "C:\Users\motok\OneDrive\Desktop\Claude code\dev\ga4-mcp"
$Node      = "C:\Program Files\nodejs\node.exe"
$LogPath   = "$ScriptDir\analytics-log.txt"

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogPath -Value "$ts $msg" -Encoding UTF8
    Write-Host "$ts $msg"
}

Log "START"

Set-Location $ScriptDir
$r1 = & $Node "$ScriptDir\analytics-daily.js" 2>&1
Log "$r1"
if ($LASTEXITCODE -ne 0) { Log "FAILED"; exit 1 }

Log "DONE"
