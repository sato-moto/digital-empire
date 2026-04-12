# Thumbnail Designer

オンライン講座のサムネイルを、プロの広告設計思考でゼロベース設計し、
Gemini API で画像生成→テキスト検証→ロゴ合成まで行うスキル。

## ディレクトリ構成

| パス | 役割 |
|------|------|
| SKILL.md | スキル定義 + 9フェーズワークフロー + Phase 1 詳細 |
| references/design-thinking.md | 広告デザイン原則（構図・配色・タイポグラフィ） |
| references/visual-design.md | Phase 2: ビジュアルコンセプト設計ガイド |
| references/copy-design.md | Phase 3: コピー設計ガイド |
| references/nano-banana-format.md | Phase 4: Gemini プロンプトフォーマット |
| scripts/generate_thumbnails.py | 画像生成（Phase 6-7, 9） |
| scripts/correct_text.py | テキスト修正（Phase 8） |
| .claude/rules/ | 横断ルール（テキスト保護・品質チェック・スクリプト仕様・ロゴ） |

## 実行環境

- Python: python（venv推奨）
- API キー: 環境変数 `GOOGLE_API_KEY`、または `--env` オプションで .env ファイルパスを指定
- 出力: 2枚同時（X宣伝用 1920x1080 + コース講座 1000x300）

## 命名規則（出力ファイル）

- x_banner.png / course_thumbnail.png — 生成画像
- *_logo.png — ロゴ合成後
- *_before_fix.png — テキスト修正前バックアップ
- rejected/ — 再生成時の退避先
