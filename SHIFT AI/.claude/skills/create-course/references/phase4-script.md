# Phase 4: 台本設計 + スライド生成 — 詳細仕様

Phase 3 完了後、台本設計とスライド生成を **並列で** 実行する。
両者は Phase 3 の成果物を入力とし、互いに依存関係がないため並列実行できる。

## Step 8-A: 台本設計（メインClaude直接実行）

**メインClaude（Opus 4.6）が直接実行する。サブエージェントには委任しない。**

**パイプライン:**
1. `slide-design.csv`（列構造: `章,スライド番号,スライドタイトル,スライド用テキスト,ミニ台本`）と `guidelines/talk_v1.md` GL を Read
2. GL準拠で台本を直接生成 → `{out}/script-draft.md`
3. textlint 実行: `cd "{skill_root}" && npx textlint "{out}/script-draft.md"`
4. セルフチェック（NG判定15項目 + 工程整合5項目 = 全20項目）
5. ⚠️❌があれば改善 → textlint 再実行
6. CSV + Excel に変換して出力

**出力先**: `output/{project}/04_script/`

**成果物**: `script.csv` + `script.xlsx`

## Step 8-B: スライド生成

**起動**: `/slide-generator` スキルに以下を渡す
- スライド構成のパス（`02_slide-design/slide-design.xlsx`）
- 出力先: `output/{project}/03_slides/`

**成果物**: `{講座名}.pptx` + `{講座名}.pdf`
