# Slide Generator

> Claude Code Skill — Excel/CSV/JSON からプロフェッショナルな PPTX + PDF スライドを自動生成

PptxGenJS 直接 API 方式でピクセル精度の配置を実現。Noto Sans JP フォント、マゼンタ (#A51E6D) アクセント、8px グリッド準拠のデザインシステムを搭載しています。

## 特徴

- **Excel → JSON → PPTX+PDF** の3ステップ自動変換
- **Gemini API による図解自動生成** — 本文を分析し、11種のレイアウトパターンから最適な図解を作成
- **テンプレート背景対応** — カバー / チャプター / コンテンツの3種類
- **デザインシステム** — 16:9 (720x405pt)、8px グリッド、統一カラースキーム

## 必要環境

- **Node.js** (v18+)
- **Python 3** + `openpyxl`
- **グローバル npm パッケージ**: `pptxgenjs`, `playwright` (PDF 生成用、任意)
- **Google AI Studio API キー** (図解生成用)

## セットアップ

```bash
# Node.js パッケージ
npm install -g pptxgenjs playwright

# Python パッケージ
pip install openpyxl

# API キー設定（図解生成に必要）
export GOOGLE_API_KEY="your-api-key"
# または .env ファイルのパスを指定
export SLIDE_GEN_ENV="/path/to/.env"
```

## 使い方

### Quick Start

```bash
# Step 1: Excel → JSON 変換
PYTHONUTF8=1 python scripts/parse_excel.py <input.xlsx> output/slides.json

# Step 2: 図解画像生成 (Gemini API)
NODE_PATH="$(npm root -g)" \
  node scripts/generate_diagrams.js output/slides.json output/diagrams/ \
  --env "$SLIDE_GEN_ENV"

# Step 3: JSON → PPTX (+PDF)
NODE_PATH="$(npm root -g)" \
  node scripts/build_slides.js output/slides.json output/slides.pptx \
  --diagrams output/diagrams/ \
  --pdf output/slides.pdf \
  --author "講師名"
```

### Claude Code Skill として使う場合

Claude Code から `スライド生成` `PPTX作成` `Excel→スライド` などと指示すると、対話的にスライドを生成します。

1. **生成範囲の選択** — 冒頭5枚テスト / 全スライド / 特定章のみ
2. **講師名の指定** — スライド左下に縦書き表示

## 入力フォーマット

### Excel

| 列 | 内容 | 備考 |
|----|------|------|
| A (章) | 章番号 | 1始まり |
| B (No) | スライド番号 | 1始まり |
| C (Title) | スライドタイトル | `講座名` → cover, `タイトルスライド` → chapter |
| D (Body) | 本文テキスト | cover/chapter: 1行目=タイトル, 2行目=サブタイトル |
| E (Script) | 講師台本 | PPTX には含めない |

### JSON

```json
{
  "slides": [
    {
      "type": "cover",
      "title": "講座タイトル",
      "subtitle": "- サブタイトル -",
      "body": "",
      "script": "台本テキスト"
    },
    {
      "type": "content",
      "title": "スライドタイトル（主張文）",
      "body": "本文テキスト",
      "script": "台本テキスト"
    }
  ]
}
```

## デザインシステム

| 項目 | 値 |
|------|-----|
| フォント | Noto Sans JP |
| アクセントカラー | `#A51E6D` |
| テキストカラー | `#333333` |
| スライドサイズ | 720 x 405pt (16:9) |
| グリッド | 8px 単位 |

### 背景テンプレート

| スライドタイプ | テンプレート |
|---------------|-------------|
| カバー (index=0) | `assets/cover.png` |
| チャプター | `assets/chapter.png` |
| コンテンツ | `assets/temp.png` |

## 図解生成

Gemini API を使い、スライド本文を分析して自動で図解 PNG を生成します。

- **構造自動分類** — 階層 / 手順 / 比較 / 因果 の4タイプ
- **11種のレイアウトパターン** — ロジックツリー、ステップフロー、左右パネル、因果チェーンなど
- **カラースキーム** — メイン `#A51E6D` / 文字 `#333333` / 白背景必須
- **レート制限対策** — 15秒間隔 + 自動リトライ（最大5回）
- **既存ファイルスキップ** — リトライ時に生成済みファイルを自動スキップ

## プロジェクト構成

```
slide-generator/
├── scripts/
│   ├── parse_excel.py          # Excel → JSON 変換
│   ├── generate_diagrams.js    # Gemini API 図解生成
│   └── build_slides.js         # JSON → PPTX (+PDF) ビルド
├── assets/
│   ├── cover.png               # カバースライド背景
│   ├── chapter.png             # チャプタースライド背景
│   └── temp.png                # コンテンツスライド背景
├── references/
│   └── slides_v1.md            # スライド設計ガイドライン
├── skill.md                    # Claude Code Skill 定義
└── README.md
```

## ライセンス

MIT License
