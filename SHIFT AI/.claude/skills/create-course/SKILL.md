---
name: create-course
description: |
  講座コンテンツ（教材）の作成ワークフローを実行するスキル。
  Phase 1: カリキュラム設計 → Phase 2: 講座制作 → Phase 3: スライド構成 → Phase 4: 台本+スライド生成
  の4フェーズで教材を体系的に設計・制作する。
  「講座を作りたい」「教材を作成して」「コースを設計して」「講座の企画」「アウトラインを作って」
  「スライドを設計して」「台本を書いて」「リサーチして」「カリキュラムを設計して」と言われたときに使う。
  教育コンテンツ制作に関するあらゆる依頼で、まずこのスキルの使用を検討すること。
---

# 講座コンテンツ作成ワークフロー

教育コンテンツ（オンライン講座）を体系的に設計・制作するスキル。
**Phase 1（カリキュラム設計）** → **Phase 2（講座制作）** → **Phase 3（スライド構成）** → **Phase 4（台本+スライド生成）** の4フェーズで構成される。

## スキルルート

このスキルのルートディレクトリ（この SKILL.md が存在するディレクトリ）を `{skill_root}` と呼ぶ。
エージェントや参照ファイルのパスは `{skill_root}` を基準にする。

Claude Code はスキル起動時に SKILL.md の場所からルートを自動解決する。

## スキル構成

```
create-course/
├── SKILL.md                          ← このファイル（オーケストレーター）
├── .claude/
│   ├── rules/                        ← ポリシー（自動読み込み）
│   │   ├── workflow-routing.md       起動分岐・Phase遷移ルール
│   │   ├── model-roles.md           モデル役割・実行マッピング
│   │   ├── output-naming.md         出力先・ファイル命名規則
│   │   ├── quality-review.md        品質レビュー基準（51項目・構造lint・編集長基準）
│   │   └── user-interaction.md      ユーザー対応・メモリ保存
│   └── agents/
│       └── api-caller.md            Gemini API呼び出しエージェント
├── references/                       ← Phase別詳細仕様（必要時に読み込み）
│   ├── phase1-curriculum.md          Phase 1 カリキュラム設計の全Step仕様
│   ├── phase2-bulk-pipeline.md       Phase 2 一括PL（教養/実務）Step 3〜6
│   ├── phase2-staged-pipeline.md     Phase 2 段階PL（従来）Step 3〜6
│   ├── phase3-slides.md              Phase 3 スライド設計 Step 7
│   ├── phase4-script.md              Phase 4 台本+スライド生成 Step 8
│   ├── pipeline-specs.md             パイプライン構成サマリー
│   ├── review-checklist.md           51項目チェックリスト
│   ├── cluster-summary.md            会員クラスター分析
│   ├── critic_template.md            批評テンプレート（MECE/CT）
│   ├── tool-practice-guideline.md    ツール実践ガイドライン
│   ├── sample_slide.xlsx             サンプルスライド
│   └── sample_daihon.xlsx            サンプル台本
├── guidelines/                       ← 設計ガイドライン（Phase実行時に読み込み）
│   ├── 教養と実務_コース設計ガイドライン.md    カリキュラム設計GL
│   ├── 教養_講座設計ガイドライン.md            教養講座GL
│   ├── 実務_講座設計ガイドライン.md            実務講座GL
│   ├── outline_v1.md                           教養+従来 アウトライン設計GL
│   ├── outline_jitsumu.md                      実務 アウトライン設計GL
│   ├── 実務_講座設計ガイドライン_2.md          SET内設計原則GL（一貫ケース・ストーリー・教養How例外）
│   ├── practice_video_guideline.md             実践動画 収録指示書GL（汎用）
│   ├── practice-3.md                           収録指示書サンプル（具体例・参考用）
│   ├── practice-3.csv                          収録指示書サンプル（CSV版・操作×台本）
│   ├── slides_v1.md                            スライド構成設計GL
│   ├── talk_v1.md                              台本設計GL
│   ├── course_research_checklist.md            カリキュラムリサーチCL
│   └── set_zitsumu.md                          企画提案コース固有CONVENTIONS（参考資料）
└── scripts/                          ← スクリプト群
    ├── call_gemini.py                Gemini API 呼び出し
    ├── generate_practice_pdf.py      受講者向けPDF手順書生成（reportlab・Noto Sans JP）
    ├── call_parallel.py              Gemini + OpenAI 並列呼び出し（レガシー・未使用）
    └── call_openai.py                OpenAI 単独呼び出し（レガシー・未使用）
```

---

## ワークフロー全体像

```
━━━ 起動時分岐 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  講座プロデューサーがユーザーに選択を求める:
  ① カリキュラム設計から → Phase 1 へ
  ② 講座制作から → Phase 2（SET単位 or 従来）へ
  → 詳細は .claude/rules/workflow-routing.md

━━━ Phase 1: カリキュラム設計（対話型）━━━━━━━━━━━━━━━━━

Step 0: カリキュラムリサーチ（2モデル並列 → 統合）
Step 1: カリキュラム構成提案 + 壁打ちループ
Step 2: 制作対象の選択
  → 詳細は references/phase1-curriculum.md を Read

━━━ Phase 2: 講座制作（対象範囲の全講座を完了させる）━━━━━━━━━━

SET単位（①②選択時）:
  → SET前処理 → Step 3（リサーチ: 6GL一括参照）
  → Step 4〜6: 教養/実務で分岐
    ├─ 教養 → アウトライン生成（4エージェント並列→批評→マージ→レビュー）→ outline-final.md
    └─ 実務 → 収録指示書生成（Windows 表記固定）→ practice-{N}.md + .csv + .xlsx（/xlsx スキル併出）
          → PDF手順書生成: practice-{N}-guide-win.pdf + practice-{N}-guide-mac.pdf（generate_practice_pdf.py）
  → references/phase2-bulk-pipeline.md を Read
従来（③選択時）:
  └─ 段階PL → references/phase2-staged-pipeline.md を Read

1SET完了ごと → ユーザーに確認（次SET / Phase 3 / 修正 / 終了）

━━━ Phase 3: スライド構成設計（教養+従来のみ）━━━━━━━━━━━━━━

※ 実務講座は収録指示書（md + csv + xlsx）+ PDF手順書（Windows/Mac）が最終成果物のため Phase 3 は対象外

Step 7: スライド構成設計
  → 詳細は references/phase3-slides.md を Read

━━━ Phase 4: 台本 + スライド生成（教養+従来のみ）━━━━━━━━━━━━

※ 実務講座は Phase 4 も対象外

Step 8-A: 台本設計
Step 8-B: スライド生成（/slide-generator スキル）
  → 詳細は references/phase4-script.md を Read

━━━ サムネイル一括生成（Phase 4 完了後・カリキュラム単位）━━━━━━━━

Phase 4 完了後にプロアクティブに提案。/thumbnail-designer をカリキュラム単位で起動。
Step S-1: 対象講座一覧の収集
Step S-2: カリキュラム共通設定の確認（登壇者・ブランド・サイズ等を1回だけ）
Step S-3: 各講座のサムネイル生成ループ（/thumbnail-designer を順次起動）
Step S-4: 一括生成完了報告
  → 詳細は .claude/rules/workflow-routing.md「カリキュラム単位サムネイル一括生成フロー」
```

---

## Phase 1: カリキュラム設計（概要）

カリキュラム（複数のセット × 複数の動画講義）の全体構成を設計する。

| Step | 内容 | 実行者 | 成果物 |
|---|---|---|---|
| Step 0 | カリキュラムリサーチ（2モデル並列→統合→ファクトチェック→セルフチェック） | メインClaude + api-caller | `research-summary.md` |
| Step 1 | カリキュラム構成提案 + ユーザー壁打ちループ | メインClaude | `course-structure.md` |
| Step 2 | 制作対象の選択（SET単位で選択） | ユーザー判断 | → Phase 2 へ |

**実行時**: `references/phase1-curriculum.md` を Read して詳細仕様を確認すること。

**GL参照テーブル（Phase 1）:**

| タイミング | 読み込むGL |
|---|---|
| Step 0 リサーチ | `guidelines/course_research_checklist.md` + `guidelines/教養と実務_コース設計ガイドライン.md` |
| Step 0 リサーチプロンプト | `guidelines/教養_講座設計ガイドライン.md` + `guidelines/実務_講座設計ガイドライン.md`（GL逆算用） |
| Step 1 構成設計 | `guidelines/教養と実務_コース設計ガイドライン.md` |
| Step 2 SET選択後 | `guidelines/実務_講座設計ガイドライン_2.md`（SET内設計原則） |
| Step 2 種別判定 | `references/cluster-summary.md`（クラスター参照、必要時のみ） |

---

## Phase 2: 講座制作（概要 + 分岐）

**SET単位で進行し、1SET完了ごとにユーザーに次のアクション（次SET / Phase 3 / 修正 / 終了）を確認する。**
**※ サムネイル生成は Phase 4 完了後にカリキュラム単位で一括提案する（SET完了時点では提示しない）。**

### 分岐ロジック

```
SET単位（①②選択時）:
  → SET前処理 → Step 3（リサーチ: 6GL一括参照）
  → Step 4〜6: 教養/実務で分岐
    ├─ 教養 → アウトライン生成（4エージェント並列→批評→マージ→レビュー）→ outline-final.md
    └─ 実務 → 収録指示書生成 → practice-{N}.md + .csv + .xlsx

従来（③選択時）:
  └─ guidelines/outline_v1.md → 段階PL（4-T1/T2 + Step 3 + 4-T3 + 4-T4 + 5-T + 6）
```

### 一括パイプライン: 教養

| Step | 内容 | 成果物 |
|---|---|---|
| Step 3 | 追加リサーチ（2モデル並列→統合） | `detailed-research.md` |
| Step 4 | アウトライン生成（4エージェント並列） | `outline_baseline/outcome/retention/segment.md` |
| Step 5 | 相互批評→セルフレビュー→マージ+構造lint | `outline.md` |
| Step 6 | 51項目レビュー | `outline-final.md` |

### 一括パイプライン: 実務（収録指示書）

| Step | 内容 | 成果物 |
|---|---|---|
| Step 3 | 追加リサーチ（2モデル並列→統合） | `detailed-research.md` |
| Step 4 | 収録指示書生成（4エージェント並列・`practice_video_guideline.md` 準拠・**Windows 表記固定**） | `practice_baseline/outcome/retention/segment.md` + `.csv` |
| Step 5 | 相互批評→セルフレビュー→マージ+構造lint+収録指示書チェック(P1-P11) **+Excel変換（/xlsx）** | `practice-{N}.md` + `.csv` + `.xlsx` |
| Step 6 | 51項目レビュー + セット整合(#52-57) + 収録指示書チェック(P1-P11) **+Excel再生成（/xlsx）** | `practice-{N}-final.md` + `.csv` + `.xlsx` |
| Step 6.5-P | 受講者向けPDF手順書生成（Windows 版 + Mac 版の2本・`generate_practice_pdf.py` 使用・自動実行） | `practice-{N}-guide-win.pdf` + `practice-{N}-guide-mac.pdf` |

※ 実務の最終成果物は収録指示書（md + csv + **xlsx**・Windows 表記固定）+ PDF 手順書2本（Windows/Mac）。Phase 3/4 には進まない。
※ CSV/MD/XLSX は Windows 表記固定、Mac 対応は PDF 生成時のみ（詳細は `references/os-conversion-rules.md` + `guidelines/practice_video_guideline.md` §3-6 参照）。
※ エンコーディング規定（文字化け防止）の SSOT は `guidelines/practice_video_guideline.md` §3-2。CSV は UTF-8 with BOM、MD は UTF-8 without BOM、Excel は /xlsx スキル、PDF は `scripts/generate_practice_pdf.py`（reportlab ベース）で Noto Sans JP 埋め込み。

**実行時**: `references/phase2-bulk-pipeline.md` を Read して詳細仕様を確認すること。

### 段階パイプライン（従来講座）

| Step | 内容 | 成果物 |
|---|---|---|
| Step 4-T1/T2 | タイトル+ゴール一括設計 → ★確認 | `title-design.md` + `goal-design.md` |
| Step 3 | 追加リサーチ（確定タイトル+ゴールで実施）→ ★ユーザー確認 | `detailed-research.md` |
| Step 4-T3 | 章ロール設計 → ★確認+ブラッシュアップ | `chapter-design.md` |
| Step 4-T4 | 章アウトライン設計（フルPL）→ ★確認 | `outline.md` |
| Step 5-T | 工程整合チェック → ★確認 | `coherence-check.md` |
| Step 6 | 51項目レビュー | `outline-final.md` |

**実行時**: `references/phase2-staged-pipeline.md` を Read して詳細仕様を確認すること。

### GL参照テーブル（Phase 2）

**SET単位の場合:**

| タイミング | 読み込むGL |
|---|---|
| SET前処理 | `guidelines/実務_講座設計ガイドライン_2.md` |
| Step 3 リサーチ（教養） | 下記3つ（教養に必要なGLだけ読む・トークン節約） |
| Step 3 リサーチ（実務） | 下記4つ（実務に必要なGLだけ読む・トークン節約） |

Step 3 教養リサーチ時のGL（3つ）:
- `guidelines/教養_講座設計ガイドライン.md` — 教養講座のWhy/What/How/Wrap設計
- `guidelines/教養と実務_コース設計ガイドライン.md` — SET構造・教養→実務の接続
- `guidelines/実務_講座設計ガイドライン_2.md` — SET内設計原則（一貫ケース・ストーリー）

Step 3 実務リサーチ時のGL（4つ）:
- `guidelines/実務_講座設計ガイドライン.md` — 実務講座のロール・ミッション・アウトライン設計
- `guidelines/実務_講座設計ガイドライン_2.md` — SET内設計原則（一貫ケース・ストーリー）
- `guidelines/practice_video_guideline.md` — 実践動画の収録指示書GL（汎用）
- `guidelines/practice-3.md` — 収録指示書サンプル（具体例・参考用）

**教養の制作時（Step 4〜6: アウトライン生成→批評→レビュー）:**

| 講座種別 | 設計GL | アウトラインGL | 批評テンプレート | レビューCL |
|---|---|---|---|---|
| 教養 | `guidelines/教養と実務_コース設計ガイドライン.md` + `guidelines/教養_講座設計ガイドライン.md` | `guidelines/outline_v1.md` | `references/critic_template.md` | `references/review-checklist.md` |

**実務の制作時（Step 4〜5: 収録指示書生成→整合性チェック）:**

| 講座種別 | 設計GL | 出力形式GL | サンプル |
|---|---|---|---|
| 実務 | `guidelines/実務_講座設計ガイドライン_2.md` + `guidelines/実務_講座設計ガイドライン.md` | `guidelines/practice_video_guideline.md` | `guidelines/practice-3.md` + `guidelines/practice-3.csv` |

※ 実務の出力は `practice-{N}.md` + `practice-{N}.csv` + `practice-{N}.xlsx`（収録指示書・Windows 表記固定）+ `practice-{N}-guide-win.pdf` + `practice-{N}-guide-mac.pdf`（PDF 手順書2本）。Phase 3/4 には進まない。
※ Step 5-C マージ完了時と Step 6 レビュー完了時に `/xlsx` スキルで Excel を生成・再生成する（CSV と併出）。
※ Step 6.5-P（PDF手順書生成）は `scripts/generate_practice_pdf.py` で自動実行。詳細は `references/phase2-bulk-pipeline.md` Step 6.5-P を参照。

**従来の場合:**

| 講座種別 | アウトラインGL | 批評テンプレート | レビューCL |
|---|---|---|---|
| 従来 | `guidelines/outline_v1.md` | `references/critic_template.md` | `references/review-checklist.md` |

---

## Phase 3: スライド構成設計（概要）

Phase 2 の `outline-final.md` をもとにスライド構成を設計する。

| Step | 内容 | GL | 成果物 |
|---|---|---|---|
| Step 7 | スライド構成設計（メインClaude直接実行） | `guidelines/slides_v1.md` | `slide-design.csv` + `.xlsx` |

**実行時**: `references/phase3-slides.md` を Read して詳細仕様を確認すること。

---

## Phase 4: 台本 + スライド生成（概要）

Phase 3 完了後、台本設計とスライド生成を **並列で** 実行する。

| Step | 内容 | GL/ツール | 成果物 |
|---|---|---|---|
| Step 8-A | 台本設計（メインClaude直接実行） | `guidelines/talk_v1.md` | `script.csv` + `.xlsx` |
| Step 8-B | スライド生成 | `/slide-generator` スキル | `.pptx` + `.pdf` |

**実行時**: `references/phase4-script.md` を Read して詳細仕様を確認すること。

**Phase 4 完了後**: サムネイル一括生成（カリキュラム単位）をプロアクティブに提案する。
`/thumbnail-designer` を各講座ごとに順次起動し、共通設定（登壇者・ブランド等）は1回の確認で全講座に適用する。
詳細は `.claude/rules/workflow-routing.md`「カリキュラム単位サムネイル一括生成フロー」を参照。

---

## textlint

```bash
cd "{skill_root}" && npx textlint "{対象ファイル}"
```

アウトライン・スライド構成・台本の各成果物に対して実行する。
