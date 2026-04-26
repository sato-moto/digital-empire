# setup-chat-server-task.ps1
# アナリティクスチャットサーバーをログイン時に自動起動するタスクを登録する
#
# 実行方法: PowerShell を管理者権限で開いて実行
# PS> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# PS> .\setup-chat-server-task.ps1

$TaskName   = "熊取つーしん_チャットサーバー"
$ScriptDir  = "C:\Users\motok\OneDrive\Desktop\Claude code\dev\ga4-mcp"
$NodePath   = "C:\Program Files\nodejs\node.exe"
$ScriptPath = "$ScriptDir\analytics-chat-server.js"
$LogPath    = "$ScriptDir\chat-server.log"

# 既存タスクがあれば削除
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "既存タスクを削除しました。"
}

# アクション: node analytics-chat-server.js をバックグラウンドで起動
$Action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $ScriptDir

# トリガー: ログイン時
$Trigger = New-ScheduledTaskTrigger -AtLogOn

# 設定
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Days 365) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

# 登録
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -RunLevel Highest `
    -Force

Write-Host ""
Write-Host "=== タスク登録完了 ==="
Write-Host "タスク名  : $TaskName"
Write-Host "起動タイミング: ログイン時に自動起動"
Write-Host "アクセスURL   : http://localhost:3737"
Write-Host ""
Write-Host "即時テスト起動:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "停止する場合:"
Write-Host "  Stop-ScheduledTask -TaskName '$TaskName'"
