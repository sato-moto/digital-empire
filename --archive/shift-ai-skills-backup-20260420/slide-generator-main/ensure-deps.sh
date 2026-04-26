#!/bin/bash
# ensure-deps.sh — slide-generator-main の依存パッケージを自動インストール
# package.json がある場所で node_modules が無ければ npm install を実行

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/package.json" ] && [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "[auto-setup] slide-generator-main: node_modules が見つかりません。npm install を実行します..."
  cd "$SCRIPT_DIR" && npm install --silent 2>&1
  echo "[auto-setup] slide-generator-main: 依存パッケージのインストール完了"
fi
