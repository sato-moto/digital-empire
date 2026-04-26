---
name: slide-generator
description: >
  Excel/CSV/JSON からプロフェッショナルな PPTX+PDF スライドを生成する。
  PptxGenJS 直接 API 方式でピクセル精度の配置を実現。Noto Sans JP フォント、
  マゼンタ(#A51E6D)アクセント、8px グリッド準拠のデザインシステム搭載。
  「スライド生成」「PPTX作成」「プレゼン作成」「Excel→スライド」
  「講座スライド」「スライドを作って」等のリクエスト時に使用する。
---

# Slide Generator

Excel/CSV/JSON の入力データから、テンプレート背景付きの PPTX + PDF スライドを生成する。

## Quick Start

```bash
# Step 1: Excel → JSON 変換
PYTHONUTF8=1 python scripts/parse_excel.py <input.xlsx> output/slides.json

# Step 2: 図解画像生成 (Gemini API / Nano Banana Pro)
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

## Workflow

スライド生成を開始する前に、以下のフローに従う:

**出力先:** 入力ファイルと同階層に `output/` フォルダを作成し、全成果物（JSON, 図解画像, PPTX, PDF）をそこに出力する。コマンド実行時の CWD は入力ファイルのディレクトリとする。

### Step 0: 生成範囲と講師名をユーザーに確認（最初に必ず実行）
**スキル発動直後に AskUserQuestion で以下の2つを同時に聞く:**

**質問1: 生成範囲（選択式）**
- **冒頭5枚テスト**: cover + 最初の4枚（レイアウト確認用）
- **全スライド生成**: 全スライドを生成
- **特定の章のみ**: 章番号を指定して該当章のスライドのみ生成

**質問2: 講師名（選択式）**
- **Shifuko**: デフォルト選択肢
- **Shifuto**: デフォルト選択肢
- **その他**: 自由入力（AskUserQuestion の Other 欄で入力）
- 全スライド左下に90°反時計回りで縦書き表示される
- build_slides.js の `--author` オプションで渡す

### Step 1: Excel → JSON 変換
parse_excel.py で全スライドの JSON を `output/slides.json` に生成し、内容を確認する。

### Step 2: フィルタ済み JSON の作成
ユーザーの選択に応じて `output/slides.json` をフィルタ:
- **冒頭5枚**: slides配列の先頭5要素を抽出
- **全スライド**: そのまま使用
- **特定章**: 該当章の chapter スライドから次の chapter スライド手前までを抽出
  （cover スライドは常に先頭に含める）

フィルタ済み JSON は Python ワンライナーで作成:
```bash
PYTHONUTF8=1 python -c "
import json
with open('output/slides.json','r',encoding='utf-8') as f: data=json.load(f)
filtered = data['slides'][:5]  # 冒頭5枚の例
with open('output/slides_filtered.json','w',encoding='utf-8') as f:
    json.dump({'slides':filtered},f,ensure_ascii=False,indent=2)
"
```

### Step 3: 図解生成
フィルタ済み JSON（または全体 JSON）を使って Quick Start の Step 2 を実行。

### Step 3.5: 図解画像チェック（タイトル文言の混入検出）
図解生成完了後、全生成画像をチェックする:

1. `output/diagrams/` 内の `slide-*.png` を Read ツールで順に読み取る
2. slides.json の該当スライドの `title` と照合し、以下に該当する場合 **NG**:
   - タイトルと完全一致する文言が画像内に表示されている
   - タイトルと酷似する文言（語順違い・部分一致含む）が表示されている
   - 「テーマ:」等のラベル付きでタイトル文言が表示されている
3. NG画像を `rm` で削除し、generate_diagrams.js を再実行（既存スキップロジックにより削除分のみ再生成）
4. 再生成画像を再チェック（最大3回。3回NGならユーザーに報告して続行）

※ 箇条書きキーワード単体（例:「データ収集」「分析手法」）はOK。タイトル文全体の混入のみNG。

### Step 4: PPTX ビルド
Quick Start の Step 3 を実行。
※ すべてのパスは `output/` 配下を指定すること。

## Input Format

### Excel (parse_excel.py 経由)

| 列 | 内容 | 備考 |
|----|------|------|
| A (章) | 章番号 | 1始まり。パース時は直接使用しない |
| B (No) | スライド番号 | 1始まり |
| C (Title) | スライドタイトル | `講座名` → cover, `タイトルスライド` → chapter |
| D (Body) | 本文テキスト | cover/chapter時: 1行目=タイトル, 2行目=サブタイトル |
| E (Script) | 講師台本 | 任意列。PPTX には含めない (メタデータ) |

**スライドタイプ判定 (parse_excel.py):**
- 列C が `講座名` → `cover`（先頭行は必ずこれ）
- 列C が `タイトルスライド` → `chapter`
- それ以外 → `content`

### JSON (slides.json)

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

## Design System

| 項目 | 値 | 用途 |
|------|-----|------|
| FONT | `Noto Sans JP` | 全テキスト共通 |
| ACCENT | `A51E6D` | 図解のアクセントカラー |
| TEXT_COLOR | `333333` | タイトル |
| TITLE_X | 56pt | タイトル左マージン |
| TITLE_Y | 20pt | タイトル上端 (バー中央35.6pt、h=32+valign:middle→36pt) |
| CONTENT_X | 40pt | コンテンツ左マージン |
| FOOTER_Y | 296pt | フッター禁止エリア手前 |
| RIGHT_EDGE | 696pt | スライド右端 |

**スライドサイズ:** 720pt x 405pt (10" x 5.625", 16:9)
**グリッド:** 全サイズ・マージンは 8 の倍数
**フッター制約:** y >= 296pt にはコンテンツ配置禁止

### カバースライド位置仕様

テンプレート `cover.png` には2本の白線セパレータが焼き込まれている:
- 上白線: y=166pt
- 下白線: y=197pt

| 要素 | y | h | valign | 制約 |
|------|---|---|--------|------|
| タイトル | 56pt | 104pt | bottom | bottom=160pt < 上白線166pt |
| サブタイトル | 200pt | 38pt | middle | 下白線(197pt)の直下に配置、白文字 |

**背景ルール:**
- `cover.png` は最初のスライド (index=0) のみに使用
- 章タイトルスライド (type=chapter) は `chapter.png` (skill assets) を使用
- コンテンツスライドは `temp.png` を使用

## Diagram Integration

### Step 1: 図解自動生成

```bash
NODE_PATH="$(npm root -g)" \
  node scripts/generate_diagrams.js <slides.json> <output_dir> [--env <.env_path>]
```

- slides.json の各コンテンツスライドに対して Gemini API で図解 PNG を生成
- 命名規則: `slide-{NNN}.png` (NNN = ゼロ埋め3桁、1-indexed)
- カバースライドはスキップ
- API キー: `GOOGLE_API_KEY` 環境変数 or `--env` で `.env` ファイル指定
- エラー時は該当スライドをスキップして続行
- **既存ファイルスキップ**: 出力先に `slide-{NNN}.png` が存在する場合は自動スキップ（リトライ時に便利）
- **5並列生成 (CONCURRENCY=5)**: 5枚ずつ並列で図解を生成し、チャンク間に12秒のレート制限ディレイを挟む
- API レート制限対策: 12秒間隔 + 自動リトライ (最大5回、429時は12s/24s/36s/48s/60sの累進待機)
- **白背景必須**: 図解は必ず白背景(#ffffff)のPNGで生成。プロンプトの重要ルール・配色・禁止事項の3箇所で強制指定

**図解プロンプト設計:**
- `classifyStructure()` でbody本文をキーワード分析し、4構造（階層/手順/比較/因果）に自動分類
- `assignPattern()` で型別カウンターにより11種のサブパターンを順番に割当（同一パターンの連続を回避）
- パターンはプロンプトで「指定済み・変更禁止」として Gemini に指示（Geminiに選ばせない）
- 図・アイコン・矢印をメインに、文字は最小限（キーワードのみ）
- 1スライド1メッセージの視覚表現
- 視覚要素は3〜4個に制限（ワーキングメモリの限界）
- 人物は1図解に最大1人、シンプルなフラットイラスト
- キーワード強調: 最重要ワードをマゼンタ (`#A51E6D`) で目立たせる
- 4要素以上の横一列配置は禁止（2×2グリッドまたは2段構成）
- 装飾アイコン（歯車・電球等）は1図解に最大1個

**図解レイアウトパターン（11種）:**
- 階層: ロジックツリー / ピラミッド図 / ネストボックス
- 手順: ステップフロー / タイムライン / プロセスチェーン
- 比較: 左右パネル / カード並列
- 因果: 因果チェーン / フィッシュボーン / Before→After

**図解カラースキーム（最大4色 + 白背景）:**
- メインカラー: `#A51E6D`（ボーダー、ヘッダー、強調要素）
- 文字色: `#333333`
- 補助色1: 薄グレー `#F5F5F5`（ボックス背景）
- 補助色2: ティール `#1ABC9C` またはスレートブルー `#5D6D7E`（イラスト内の差し色）
- 背景: 必ず `#ffffff`（白）— 暗い背景は禁止
- **アイコン・イラストはカラフル可**: 上記4色のトーン違い（濃淡）や、その他の色も自由に使用してよい

### Step 2: PPTX 統合

`build_slides.js` に `--diagrams <dir>` を指定するとスライドに統合。

**図解仕様:**
- シンプルなフラットイラスト（人物は最大1人、シルエット風）
- アイコン・イラストはカラフル可（ブルー、ティール、オレンジ等を自由に使用）
- PNG 1200x420px、白背景必須 (#ffffff)
- 枠線・ヘッダー: `#A51E6D`、文字色: `#333333`
- キーワード強調: 最重要ワードをマゼンタ (`#A51E6D`) で表示
- Before→After: Beforeは小さく・グレー (`#333333`)、Afterは大きく・マゼンタ (`#A51E6D`) で対比
- 禁止: パターン名・英語タイトル・メタラベル（「Business Infographic」等）の図解内表示

## Slide Design Guidelines

スライド設計時は `references/slides_v1.md` を参照する。主要原則:

- **1スライド1メッセージ**: 複数主張は認知過負荷を生む
- **タイトル＝結論**: トピックでなく主張文で書く
- **Why→What→How→Wrap**: 認知順序に従う構造
- **ミニ台本300文字以上**: 結論→理由→接続を含む

## Dependencies

**Node.js:**
```bash
npm install -g pptxgenjs    # PPTX 生成
npm install -g playwright   # PDF 生成 (optional)
```

**Python:**
```bash
pip install openpyxl        # Excel 読み込み
```

**API Key (図解生成用):**
- `GOOGLE_API_KEY` 環境変数に Google AI Studio の API キーを設定
- または `.env` ファイルに `GOOGLE_API_KEY=...` を記載し `--env` で指定

## Setup

```bash
# .env ファイルのパスを環境変数に設定（GOOGLE_API_KEY を含むファイル）
export SLIDE_GEN_ENV="/path/to/your/.env"
```
