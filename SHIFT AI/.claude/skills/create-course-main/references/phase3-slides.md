# Phase 3: スライド構成設計 — 詳細仕様

Phase 2 で完成した `outline-final.md` をもとに、各スライドの構成を設計する。

## Step 7: スライド構成設計（メインClaude直接実行）

**メインClaude（Opus 4.6）が直接実行する。サブエージェントには委任しない。**

**パイプライン:**
1. `outline-final.md` と `guidelines/slides_v1.md` GL を Read
2. GL準拠でスライド構成を直接生成 → `{out}/slide-design-draft.md`
3. タイトル文字数チェック: 全スライドタイトルが26文字以内か検証し、超過があれば短縮
4. textlint 実行: `cd "{skill_root}" && npx textlint "{out}/slide-design-draft.md"`
5. セルフチェック（NG判定16項目 + 工程整合4項目 = 全20項目）
6. ⚠️❌があれば改善 → textlint 再実行
7. CSV + Excel に変換して出力
   - CSV ヘッダー: `章,スライド番号,スライドタイトル,スライド用テキスト,ミニ台本`
   - slide-generator の入力フォーマット（A:章, B:スライド番号, C:タイトル, D:テキスト, E:台本）と一致させること

**出力先**: `output/{project}/02_slide-design/`

**成果物**: `slide-design.csv` + `slide-design.xlsx`
