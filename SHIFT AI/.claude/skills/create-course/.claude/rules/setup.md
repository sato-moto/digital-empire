# 環境セットアップ ガイド

## トリガー

ユーザーが以下のいずれかを言った場合、このセットアップフローを実行する:
- 「セットアップ」「セットアップして」
- 「setup」
- 「環境構築」「環境構築して」
- 「インストール」「インストールして」

## 前提

`~/.claude/skills/` 配下に以下3つのスキルが配置済みであること:
- `create-course/`（このスキル）
- `slide-generator/`
- `thumbnail-designer/`

`{skill_root}` は create-course のルートディレクトリを指す。

## セットアップフロー

**原則: 各ステップの結果をユーザーに見せながら進める。エラーがあればその場で解決策を提示する。**

### Step 1: 前提条件チェック

以下を並列で実行し、結果をまとめて報告する:

```bash
python --version 2>&1 || python3 --version 2>&1
node --version
npm --version
ls "$(dirname "{skill_root}")/create-course" "$(dirname "{skill_root}")/slide-generator" "$(dirname "{skill_root}")/thumbnail-designer"
```

**合格条件:**
- Python 3.10+
- Node.js 18+
- npm が存在
- 3スキルフォルダが全て存在

**不足がある場合:** 不足ツールのインストール手順を案内し、インストール後に「セットアップして」と再度呼んでもらう。先に進まない。

**報告フォーマット:**
```
前提条件チェック:
  ✅ Python 3.12.x
  ✅ Node.js v20.x.x
  ✅ npm 10.x.x
  ✅ create-course/ 存在
  ✅ slide-generator/ 存在
  ✅ thumbnail-designer/ 存在
```

### Step 2: Python 仮想環境 + pip 依存

```bash
cd "{skill_root}" && bash setup.sh
```

`setup.sh` が Python venv 作成 → pip install → Node.js 依存 → フォント確認 → .env テンプレートコピーまで一括で実行する。

**スキップ判定:** `.venv` が親ディレクトリに存在し、`python -c "import google.genai"` が成功すればスキップ可能。ただし初回は必ず実行する。

### Step 3: setup.sh の結果確認

setup.sh の出力を確認し、⚠️ や ❌ がある項目をユーザーに報告する。

特に:
- **Noto Sans JP フォント** が ⚠️ の場合 → ダウンロードURLを案内
- **.env** が新規作成された場合 → Step 4 で API キーを設定

### Step 4: API キー設定（対話型）

`.env` ファイルの中身を確認する:

```bash
cd "{skill_root}" && cat .env
```

**4a: GOOGLE_API_KEY の確認**

値が `your-google-api-key` のままか空の場合、ユーザーに入力を求める:

「Google AI Studio の API キーを入力してください。
Gemini API（リサーチ・アウトライン生成）とサムネイル生成で使用します。
取得先: https://aistudio.google.com/apikey

入力するか、「スキップ」で後から設定することもできます。」

**キーが入力された場合:** `.env` ファイルの該当行を Edit ツールで更新する。

**既にキーが設定されている場合:** 先頭4文字 + **** で表示し、「このまま使いますか？」と確認。

### Step 5: 動作確認

以下のコマンドを実行して最終確認する:

```bash
# Python 依存
cd "$(dirname "{skill_root}")" && .venv/Scripts/python -c "import google.genai; import openpyxl; import PIL; import reportlab; import pdfplumber; print('OK')" 2>&1 || .venv/bin/python -c "import google.genai; import openpyxl; import PIL; import reportlab; import pdfplumber; print('OK')" 2>&1

# textlint
cd "{skill_root}" && npx textlint --version

# pptxgenjs
NODE_PATH="$(npm root -g)" node -e "require('pptxgenjs'); console.log('OK')"

# API キー存在チェック
cd "{skill_root}" && python -c "
from dotenv import load_dotenv; import os; load_dotenv()
g = bool(os.getenv('GOOGLE_API_KEY','')) and os.getenv('GOOGLE_API_KEY') != 'your-google-api-key'
print(f'GOOGLE_API_KEY: {\"設定済み\" if g else \"未設定\"}')
" 2>&1
```

### Step 6: 完了報告

全ステップの結果をまとめてユーザーに報告する:

```
🎉 セットアップ完了！

✅ Python 3.12.x + 仮想環境（.venv）
✅ Node.js 20.x.x
✅ textlint（create-course）
✅ pptxgenjs + playwright（slide-generator）
✅ reportlab + pdfplumber（PDF手順書生成）
✅/⚠️ Noto Sans JP フォント
✅/❌ GOOGLE_API_KEY

📁 .env ファイル: {skill_root}/.env

使い方: `/create-course` と入力して講座制作を開始してください。
```

**⚠️/❌ がある場合:** 該当項目の対処方法を添える。
**全て ✅ の場合:** そのまま `/create-course` で講座制作を開始できることを伝える。
