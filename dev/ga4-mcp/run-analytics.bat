@echo off
REM ======================================================
REM 熊取つーしん アナリティクス日報 自動実行スクリプト
REM Windows タスクスケジューラから毎朝 9:00 に実行される
REM ======================================================

SET SCRIPT_DIR=C:\Users\motok\OneDrive\Desktop\Claude code\dev\ga4-mcp
SET NODE=C:\Program Files\nodejs\node.exe
SET LOGFILE=%SCRIPT_DIR%\analytics-log.txt

REM ── ログ出力ヘルパー ──
echo [%DATE% %TIME%] START >> "%LOGFILE%"

REM ── Step 1: analytics-daily.js を実行（データ収集 + 分析 + Notion記録） ──
echo [%DATE% %TIME%] Step 1: 日報生成中（analytics-daily.js）... >> "%LOGFILE%"
cd /d "%SCRIPT_DIR%"
"%NODE%" "%SCRIPT_DIR%\analytics-daily.js" >> "%LOGFILE%" 2>&1

IF ERRORLEVEL 1 (
  echo [%DATE% %TIME%] FAILED >> "%LOGFILE%"
  exit /b 1
)

echo [%DATE% %TIME%] DONE >> "%LOGFILE%"
