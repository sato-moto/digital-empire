# 出力先・ファイル命名規則

## 出力先ルール

成果物は以下のディレクトリ構造で出力する（ユーザーが別途指定しない限り）:

```
output/{project-name}/
  00_course-design/  ← カリキュラム構成 + リサーチサマリー【Phase 1】
  01_outline/        ← 章構成 + アウトライン【Phase 2】
  02_slide-design/   ← スライド構成（CSV + Excel）【Phase 3】
  03_slides/         ← スライド（PPTX + PDF）【Phase 4】
  04_script/         ← 台本（CSV + Excel）【Phase 4】
  06_thumbnails/     ← サムネイル画像（PNG）【Phase 4 完了後・カリキュラム単位一括生成】
```

`{project-name}` はユーザーに確認する。

## Phase 1 の保存構造

```
output/{project}/00_course-design/
  ├── prompt.md              ← リサーチ生成プロンプト
  ├── ver_claude.md          ← Claude版リサーチ
  ├── ver_gemini.md          ← Gemini版リサーチ
  ├── research-summary.md    ← 2版統合リサーチ（4層構造）
  └── course-structure.md    ← カリキュラム構成（確定版）
```

## Phase 2 の保存構造

```
output/{project}/01_outline/{講座名}/
  ├── detailed-research.md        ← 追加リサーチ結果
  ├── title-design.md             ← タイトル設計（従来講座のみ）
  ├── goal-design.md              ← ゴール設計（従来講座のみ）
  ├── chapter-design.md           ← 章ロール設計（従来講座のみ）
  ├── outline_baseline.md         ← GL準拠・総合バランス版アウトライン
  ├── outline_outcome.md          ← 成果直結観点アウトライン
  ├── outline_retention.md        ← 離脱防止観点アウトライン
  ├── outline_segment.md          ← クラスター適合観点アウトライン
  ├── critique_baseline.md        ← GL準拠観点による批評
  ├── critique_outcome.md         ← 成果直結観点による批評
  ├── critique_retention.md       ← 離脱防止観点による批評
  ├── critique_segment.md         ← クラスター適合観点による批評
  ├── self_review_baseline.md     ← GL準拠セルフレビュー
  ├── self_review_outcome.md      ← 成果直結セルフレビュー
  ├── self_review_retention.md    ← 離脱防止セルフレビュー
  ├── self_review_segment.md      ← クラスター適合セルフレビュー
  ├── outline_selection.md        ← 選択理由 + 評価サマリー
  ├── outline.md                  ← 選択・改善済みアウトライン
  ├── coherence-check.md          ← 工程整合チェック結果（従来講座のみ）
  ├── review-report.md            ← 51項目レビュー結果
  └── outline-final.md            ← 最終版（レビュー反映済み）
```

## SET単位制作時の命名規則（教養講座）

SET単位で制作する場合、教養講座のアウトラインは従来と同じ命名規則を使用する:

```
output/{project}/01_outline/{講座名}/
  └── outline-final.md    ← 教養講座のアウトライン（従来と同じ）
```

教養講座は Phase 3（スライド構成）→ Phase 4（台本+スライド生成）へ進む。

## SET単位制作時の命名規則（実務講座）

SET単位で制作する場合、実務講座のアウトラインは以下の命名規則を使用する:

```
output/{project}/01_outline/{set_slug}/
  ├── outline_setN.md          ← 動画スライド生成用（実務講座・講師デモ構成）
  ├── textmaterial_setN.md     ← 受講者ハンズオン教材（実務講座・テキスト配布用）
  └── outline-final.md         ← 教養講座（従来通り）
```

**ヘッダーノート規約:**
- `outline_setN.md` の先頭: `> このファイルは動画スライド生成用です。テキスト教材（受講者ハンズオン）は textmaterial_setN.md を参照してください。`
- `textmaterial_setN.md` の先頭: `> このファイルは受講者が動画視聴後に手元で実践するためのハンズオン教材です。動画用アウトラインは outline_setN.md を参照してください。`

**{set_slug} の命名:** `set{N}-{テーマの短縮名}` 形式（例: `set2-kadai-hakken`）

## 実務講座の収録指示書（SET単位制作時）

SET単位で制作する場合、実務講座の成果物は収録指示書（md + csv + xlsx）+ PDF 手順書（Windows 版 + Mac 版の2本）になる。

```
output/{project}/05_practice/
  ├── practice-{講座番号}.md            ← 収録指示書（Markdown・UTF-8 without BOM・Windows 表記固定）
  ├── practice-{講座番号}.csv           ← 操作×台本（2カラムCSV・UTF-8 with BOM・CRLF・Windows 表記固定）
  ├── practice-{講座番号}.xlsx          ← 操作×台本（Excel・Step 5-C で /xlsx スキルにより自動生成）
  ├── practice-{講座番号}-final.md      ← 51項目レビュー反映版（MD）
  ├── practice-{講座番号}-final.csv     ← 51項目レビュー反映版（CSV）
  ├── practice-{講座番号}-final.xlsx    ← 51項目レビュー反映版（Excel・Step 6 で /xlsx スキルにより再生成）
  ├── practice-{講座番号}-guide-win.pdf ← Windows 受講者向け PDF 手順書（Step 6.5-P で generate_practice_pdf.py により自動生成）
  └── practice-{講座番号}-guide-mac.pdf ← Mac 受講者向け PDF 手順書（Step 6.5-P で generate_practice_pdf.py により自動生成）
```

**OS 表記ポリシー（重要）:**
- **CSV / MD / XLSX は Windows 表記で固定**する（`Ctrl+S`、`Windowsキー+矢印`、`タスクバー自動非表示` 等）。両 OS 併記は禁止
- Mac 受講者向けの OS 変換は **PDF 生成時（Step 6.5-P）のみ** 実施する
- 変換ルールは `references/os-conversion-rules.md` を参照（メインClaude が Mac 版 PDF 生成時に Read）
- 詳細は `guidelines/practice_video_guideline.md` §3-6 を参照

**エンコーディング規定（文字化け防止）:**
詳細は `guidelines/practice_video_guideline.md` §3-2 を SSOT として参照すること。要点:
- MD: UTF-8 **without** BOM / LF
- CSV: UTF-8 **with** BOM / CRLF（Excel で文字化けしないため必須）
- XLSX: `/xlsx` スキルが openpyxl で生成（UTF-8 内部処理・セル内改行保持）
- PDF: Noto Sans JP 埋め込み（`scripts/generate_practice_pdf.py` 標準）

**ファイル命名の注意:**
- `{講座番号}` はゼロ埋めしない（例: 3, 14, 24）
- 1つの講義に複数の実践動画がある場合は連番（practice-3-1, practice-3-2, ...）
- CSV: UTF-8 with BOM、カンマ区切り、ヘッダ行: `操作内容,台本`
- Excel: シート名「操作×台本」、ヘッダ行太字+背景色、セル内折り返しON（詳細は `practice_video_guideline.md` §5-2）
- 旧仕様の `practice-{N}-guide.pdf`（suffix なし）は**廃止**。後方互換は不要

## Phase 3 の保存構造

```
output/{project}/02_slide-design/
  ├── slide-design-draft.md   ← スライド構成ドラフト
  ├── slide-design.csv        ← スライド構成（CSV）
  └── slide-design.xlsx       ← スライド構成（Excel）
```

## Phase 4 の保存構造

```
output/{project}/03_slides/
  └── {講座名}.pptx + {講座名}.pdf  ← スライド

output/{project}/04_script/
  ├── script-draft.md         ← 台本ドラフト
  ├── script.csv              ← 台本（CSV）
  └── script.xlsx             ← 台本（Excel）
```
