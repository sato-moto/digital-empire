# パイプライン構成サマリー

## Phase 1: カリキュラム設計パイプライン

メインClaude がオーケストレーション、api-caller が API 呼び出し代行:

1. **Web検索で情報収集** → チェックリストに沿って網羅的に調査
2. **生成プロンプト作成** → メインClaude がガイドラインに基づくプロンプト作成
3. **2モデル並列生成** → メインClaude（Opus 4.6）が Claude版生成 ←並行→ api-caller が Gemini API 呼び出し
4. **各版ファクトチェック** → 2版それぞれに WebSearch で裏取り（統合前に品質担保）
5. **各版セルフチェック** → 2版それぞれに14項目チェック + 改善（統合前に品質担保）
6. **2版統合** → メインClaude がMECE統合（統合判断基準9項目）

## Phase 2 Step 3〜5: アウトライン制作パイプライン（一括PL）

→ 詳細は `references/phase2-bulk-pipeline.md` を参照。モデル別役割は `.claude/rules/model-roles.md` を参照。

1. **追加リサーチ** → 2モデル並列 → 統合
2. **アウトライン生成** → 4エージェント並列
3. **相互批評** → 4エージェント並列
4. **セルフクリティカルシンキング** → 4エージェント並列
5. **ベース案選定+差分マージ** → メインClaude直接実行
6. **textlint** → 日本語表記ゆれチェック

## Phase 2 従来講座パイプライン（段階PL）

→ 詳細は `references/phase2-staged-pipeline.md` を参照。

1. **タイトル+ゴール一括設計** → メインClaude単独（outline_v1.md ①②準拠）→ ★ユーザー確認
2. **追加リサーチ** → 確定タイトル+ゴールで2モデル並列 → ★ユーザー確認
3. **章ロール設計** → メインClaude単独（outline_v1.md ③準拠）→ ★ユーザー確認+ブラッシュアップ
4. **章アウトライン設計** → 2モデル並列+フルパイプライン（outline_v1.md ④準拠）→ ★ユーザー確認+ブラッシュアップ
5. **工程整合チェック** → メインClaude直接実行 → ★ユーザー確認
6. **51項目レビュー** → `.claude/rules/quality-review.md` 参照

## Phase 2 Step 6: 51項目レビューパイプライン

→ 詳細は `.claude/rules/quality-review.md`（常時読込）を参照。

## Phase 3 Step 7: スライド構成設計パイプライン

メインClaude（Opus 4.6）が直接生成する:

1. **GL読み込み** → `guidelines/slides_v1.md` + `outline-final.md`
2. **直接生成** → GL準拠でスライド構成を生成
3. **textlint** → 日本語表記ゆれチェック
4. **セルフチェック** → NG判定15項目 + 工程整合4項目 = 全19項目
5. **自己改善** → ⚠️❌項目を改善 → textlint 再実行
6. **CSV + Excel 出力**

## Phase 4 Step 8-A: 台本設計パイプライン

メインClaude（Opus 4.6）が直接生成する:

1. **GL読み込み** → `guidelines/talk_v1.md` + `slide-design.csv`
2. **直接生成** → GL準拠で台本を生成
3. **textlint** → 日本語表記ゆれチェック
4. **セルフチェック** → NG判定15項目 + 工程整合5項目 = 全20項目
5. **自己改善** → ⚠️❌項目を改善 → textlint 再実行
6. **CSV + Excel 出力**

## スライド生成パイプライン

`/slide-generator` スキル（別スキル）が以下のパイプラインを実行する:

1. **Excel → JSON 変換** → parse_excel.py
2. **図解生成** → generate_diagrams.js（Gemini API）
3. **PPTX + PDF 生成** → build_slides.js（PptxGenJS + Playwright）

## スクリプト

API呼び出しスクリプト:
- `{skill_root}/scripts/call_gemini.py` — Gemini API 呼び出し
- `{skill_root}/scripts/call_parallel.py` — レガシー（Gemini + OpenAI 並列呼び出し・現在未使用）
- `{skill_root}/scripts/call_openai.py` — レガシー（OpenAI 単独呼び出し・現在未使用）

APIキー: `{skill_root}/.env`

## textlint

```bash
cd "{skill_root}" && npx textlint "{対象ファイル}"
```
