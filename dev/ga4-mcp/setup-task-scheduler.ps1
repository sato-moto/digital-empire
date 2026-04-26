# setup-task-scheduler.ps1
# 熊取つーしん アナリティクス日報タスクを Windows タスクスケジューラに登録する
# 実行方法: PowerShell を管理者権限で開いて実行
# PS> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# PS> .\setup-task-scheduler.ps1

$TaskName    = "熊取つーしん_アナリティクス日報"
$BatPath     = "C:\Users\motok\OneDrive\Desktop\Claude code\dev\ga4-mcp\run-analytics.bat"
$LogPath     = "C:\Users\motok\OneDrive\Desktop\Claude code\dev\ga4-mcp\analytics-log.txt"
$TriggerTime = "06:00"  # 毎朝 6:00（日本時間）

# 既存タスクがあれば削除
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "既存タスクを削除しました。"
}

# アクション定義（cmd /c でバッチ実行、ログをファイルに記録）
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$BatPath`" >> `"$LogPath`" 2>&1"

# トリガー定義（毎日 9:00）
$Trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime

# 設定（PCがスリープ中でも起動・バッテリー接続時のみ実行しない）
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -WakeToRun

# 登録（現在のユーザーで実行）
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
Write-Host "実行時刻  : 毎日 $TriggerTime（日本時間）"
Write-Host "ログ出力先: $LogPath"
Write-Host ""
Write-Host "即時テスト実行する場合:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
