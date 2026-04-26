#!/bin/bash
# =====================================================
# 講座コンテンツ制作スキル — 統合セットアップ
# =====================================================
# 対象: create-course / slide-generator / thumbnail-designer
#
# 使い方:
#   cd ~/.claude/skills/create-course
#   bash setup.sh
# =====================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  講座コンテンツ制作スキル セットアップ"
echo "=========================================="
echo ""
echo "スキルディレクトリ: $SKILLS_DIR"
echo ""

# -------------------------------------------------
# Step 1: 前提チェック
# -------------------------------------------------
echo "--- Step 1: 前提条件チェック ---"

# Python（python3 が Microsoft Store スタブの場合があるため、--version の出力で実機判定）
PYTHON=""
for candidate in python python3; do
    if command -v "$candidate" &>/dev/null; then
        ver_output="$("$candidate" --version 2>&1)"
        if [[ "$ver_output" == Python\ 3.* ]]; then
            PYTHON="$candidate"
            break
        fi
    fi
done
if [[ -z "$PYTHON" ]]; then
    if [[ -f "/c/Users/$USER/AppData/Local/Programs/Python/Python312-arm64/python.exe" ]]; then
        PYTHON="/c/Users/$USER/AppData/Local/Programs/Python/Python312-arm64/python.exe"
    elif [[ -f "/c/Users/$USER/AppData/Local/Programs/Python/Python312/python.exe" ]]; then
        PYTHON="/c/Users/$USER/AppData/Local/Programs/Python/Python312/python.exe"
    elif [[ -f "$LOCALAPPDATA/Programs/Python/Python312/python.exe" ]]; then
        PYTHON="$LOCALAPPDATA/Programs/Python/Python312/python.exe"
    else
        echo "❌ Python が見つかりません。Python 3.10+ をインストールしてください。"
        exit 1
    fi
fi
echo "✅ Python: $("$PYTHON" --version)"

# Node.js
if ! command -v node &>/dev/null; then
    echo "❌ Node.js が見つかりません。Node.js 18+ をインストールしてください。"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# npm
if ! command -v npm &>/dev/null; then
    echo "❌ npm が見つかりません。"
    exit 1
fi
echo "✅ npm: $(npm --version)"

# 3スキルの存在
MISSING=0
for skill in create-course slide-generator thumbnail-designer; do
    if [ -d "$SKILLS_DIR/$skill" ]; then
        echo "✅ $skill/"
    else
        echo "❌ $skill/ が見つかりません"
        MISSING=1
    fi
done
if [ $MISSING -eq 1 ]; then
    echo ""
    echo "不足しているスキルを ~/.claude/skills/ にクローンしてください:"
    echo "  cd ~/.claude/skills"
    echo "  git clone https://github.com/community-contents-create/create-course"
    echo "  git clone https://github.com/community-contents-create/slide-generator"
    echo "  git clone https://github.com/community-contents-create/thumbnail-designer"
    exit 1
fi
echo ""

# -------------------------------------------------
# Step 2: Python 仮想環境 + pip 依存
# -------------------------------------------------
echo "--- Step 2: Python 仮想環境 ---"

VENV_DIR="$SKILLS_DIR/.venv"

if [ -f "$VENV_DIR/Scripts/python.exe" ] || [ -f "$VENV_DIR/bin/python" ]; then
    echo "✅ .venv は既に存在します（スキップ）"
else
    echo "仮想環境を作成中..."
    "$PYTHON" -m venv "$VENV_DIR"
fi

# activate
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source "$VENV_DIR/Scripts/activate"
else
    source "$VENV_DIR/bin/activate"
fi

echo "pip 依存をインストール中..."
python -m pip install --upgrade pip -q
python -m pip install -r "$SCRIPT_DIR/requirements.txt" -q
echo "✅ Python 依存インストール完了"
echo ""

# -------------------------------------------------
# Step 2.5: PDF ライブラリ確認
# -------------------------------------------------
echo "--- Step 2.5: PDF ライブラリ確認 ---"

pip list 2>/dev/null | grep -qi reportlab && echo "✅ reportlab" || echo "❌ reportlab が見つかりません"
pip list 2>/dev/null | grep -qi pdfplumber && echo "✅ pdfplumber" || echo "❌ pdfplumber が見つかりません"
echo ""

# -------------------------------------------------
# Step 3: Node.js 依存
# -------------------------------------------------
echo "--- Step 3: Node.js 依存 ---"

# textlint (create-course ローカル)
if [ -d "$SCRIPT_DIR/node_modules" ]; then
    echo "✅ textlint（ローカル）は既にインストール済み"
else
    echo "textlint をインストール中..."
    cd "$SCRIPT_DIR" && npm install --silent
    echo "✅ textlint インストール完了"
fi

# グローバルパッケージ (slide-generator 用)
for pkg in pptxgenjs playwright; do
    if npm list -g "$pkg" &>/dev/null 2>&1; then
        echo "✅ $pkg（グローバル）は既にインストール済み"
    else
        echo "$pkg をグローバルインストール中..."
        npm install -g "$pkg" --silent
        echo "✅ $pkg インストール完了"
    fi
done
echo ""

# -------------------------------------------------
# Step 4: フォント確認
# -------------------------------------------------
echo "--- Step 4: フォント確認 ---"

FONT_FOUND=0
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    if ls /c/Windows/Fonts/NotoSans* &>/dev/null 2>&1; then
        FONT_FOUND=1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    if ls ~/Library/Fonts/NotoSans* /Library/Fonts/NotoSans* &>/dev/null 2>&1; then
        FONT_FOUND=1
    fi
else
    if ls ~/.local/share/fonts/NotoSans* /usr/share/fonts/*/NotoSans* &>/dev/null 2>&1; then
        FONT_FOUND=1
    fi
fi

if [ $FONT_FOUND -eq 1 ]; then
    echo "✅ Noto Sans JP フォント検出"
else
    echo "⚠️  Noto Sans JP フォントが見つかりません"
    echo "   スライド生成で使用します。以下からダウンロード・インストールしてください:"
    echo "   https://fonts.google.com/noto/specimen/Noto+Sans+JP"
fi
echo ""

# -------------------------------------------------
# Step 5: .env テンプレート
# -------------------------------------------------
echo "--- Step 5: API キー設定ファイル ---"

if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "✅ .env は既に存在します"
    echo "   API キーの設定は Claude Code で「セットアップして」と入力すると対話で設定できます。"
else
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        echo "✅ .env を .env.example からコピーしました"
        echo "   以下のキーを設定してください:"
        echo "   - GOOGLE_API_KEY（Gemini API + サムネイル生成・2モデル並列生成）"
        echo ""
        echo "   手動: .env ファイルを直接編集"
        echo "   自動: Claude Code で「セットアップして」と入力"
    else
        echo "⚠️  .env.example が見つかりません"
    fi
fi
echo ""

# -------------------------------------------------
# 完了
# -------------------------------------------------
echo "=========================================="
echo "  セットアップ完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "  1. API キーを設定（まだの場合）"
echo "     → .env ファイルを編集、または Claude Code で「セットアップして」"
echo "  2. Claude Code で /create-course と入力して講座制作を開始"
echo ""
