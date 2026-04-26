# Thumbnail Designer

Claude Code Skill for automated thumbnail generation — from course outline to production-ready images.

アウトライン（企画情報）を渡すと、プロの広告デザイン思考でサムネイルを自由設計し、Gemini API で画像生成、テキスト検証・修正まで一気通貫で行う Claude Code スキルです。

## Overview

```
アウトライン → 企画分析 → ビジュアル設計 → コピー設計 → プロンプト生成 → 画像生成 → テキスト修正 → ロゴ合成
```

**ゴール**: 0.5秒で目が止まり、次の0.5秒で「参加したい！」と思わせるサムネイル

### Generated Sample

<img src="references/sample.png" alt="Generated thumbnail sample" width="600">

## Features

- **ゼロベース設計** — テンプレートに縛られず、毎回ターゲット・訴求から最適な構図・配色・コピーを導出
- **2枚同時生成** — X宣伝用バナー (1920x1080) とコース講座サムネイル (1000x300) を並列生成
- **テキスト自動検証・修正** — 生成画像内の誤字・脱字を Gemini API で自動修正（最大2回）
- **ロゴ合成** — PIL による後処理でブランドロゴを任意の位置に合成
- **デザインナレッジ内蔵** — 構図・配色・タイポグラフィ・コピーライティングのガイドラインを参照して設計

## Architecture

```
thumbnail-designer/
├── SKILL.md                          # スキル定義（9フェーズのワークフロー）
├── scripts/
│   ├── generate_thumbnails.py        # 画像生成・リサイズ・ロゴ/バッジ/テキスト合成
│   └── correct_text.py               # 生成画像のテキスト修正
└── references/
    ├── design-thinking.md            # 広告デザイン思考（構図・視線誘導・配色・タイポグラフィ）
    ├── visual-design.md              # ビジュアルコンセプト設計ガイド
    ├── copy-design.md                # コピー設計ガイド（サブタイトル5案生成）
    ├── nano-banana-format.md         # Gemini API プロンプトフォーマット
    ├── sample.png                    # リファレンス画像（スタイル参考用）
    └── logo.png                      # ブランドロゴ
```

## Workflow (9 Phases)

| Phase | 内容 | 詳細 |
|-------|------|------|
| 1 | **企画分析** | アウトラインからターゲット・訴求の核を特定 |
| 2 | **ビジュアルコンセプト設計** | 構図・配色・被写体を自由設計 |
| 3 | **コピー設計** | サブタイトル5案を提案、ユーザーが選択 |
| 4 | **プロンプト生成** | コンセプト+コピーを Gemini API プロンプトに統合 |
| 5 | **セルフレビュー** | 9項目の品質チェックリストで最終確認 |
| 6 | **画像生成** | Gemini API で2枚同時生成 |
| 7 | **画像検証・再生成** | 重複テキスト・背景異常等をチェック、問題時1回再生成 |
| 8 | **テキスト検証・修正** | 誤字・脱字を検出し Gemini API で修正（最大2回） |
| 9 | **ロゴ合成** | ユーザー確認後、PIL でロゴを合成 |

## Requirements

- Python 3.10+
- Gemini API key (`GOOGLE_API_KEY`)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (スキルとして実行)

### Python Dependencies

```
requests
Pillow
numpy
```

## Usage

### Claude Code スキルとして使用（推奨）

Claude Code 上で以下のようにトリガーします:

```
サムネ設計して
```

アウトライン（`outline-final.md` 等）を渡すと、Phase 1〜9 を対話的に進行します。

### スクリプト単体での使用

#### 画像生成

```bash
python scripts/generate_thumbnails.py \
  --prompt prompt.txt \
  --output ./output \
  --reference references/sample.png \
  --env .env
```

#### テキスト修正

```bash
python scripts/correct_text.py \
  --image output/x_banner.png \
  --instruction "修正指示テキスト" \
  --output output/x_banner.png \
  --env .env
```

### 主要オプション

| オプション | 説明 |
|-----------|------|
| `--prompt` | プロンプトファイルのパス（必須） |
| `--output` | 出力ディレクトリ（必須） |
| `--reference` | スタイル参考用のリファレンス画像 |
| `--logo` | ロゴ画像のパス（指定時のみ合成） |
| `--logo-position` | ロゴ配置: `top-left` / `top-right` / `bottom-left` / `bottom-right` |
| `--badge` | 講座名バッジテキスト（PIL描画） |
| `--regen` | 再生成モード（既存画像を `rejected/` に退避） |
| `--text-only` | 既存画像にPILでテキストを後合成するフォールバック |
| `--logo-only` | 既存画像にロゴのみ合成 |

### Output

| ファイル | サイズ | 用途 |
|---------|--------|------|
| `x_banner.png` | 1920x1080 | X (Twitter) 投稿用 |
| `course_thumbnail.png` | 1000x300 | 講座ページ用バナー |

## Design Knowledge

このスキルには、プロの広告デザイン原則がナレッジとして組み込まれています:

- **構図** — 三分割法、黄金比、Z/Fパターン等から逆算して選定
- **配色** — 3色ルール、感情心理に基づく色相選定、ネイビー偏り防止チェック
- **タイポグラフィ** — サイズ強弱の極端化、単位系の処理、情報階層の設計
- **コピーライティング** — ベネフィットドリブン、煽りワード変換、20文字制限警告
- **視線誘導** — 人物視線、サイズ差、コントラスト、方向性図形、余白の活用

## License

Private — Internal use only.
