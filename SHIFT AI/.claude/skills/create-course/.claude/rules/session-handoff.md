# セッション引き継ぎ・チェックポイント仕様

長時間の講座制作処理中にコンテキスト（メモリ）が限界に近づいた場合、**処理を中断せず、次のセッションへシームレスに引き継げる** ようにする。

## 目的

- 4エージェント並列実行・2モデルリサーチ・大量のGL読み込みでコンテキスト消費が大きい
- セッションが尽きたからといって **簡略化・省略・スキップは絶対に禁止**
- 代わりに **状態を保存して次セッションへ引き継ぐ** ことで、レギュレーションを完全遵守したまま継続する

## チェックポイント保存タイミング

**各 Step の成果物が確定するたびに** `progress.json` を更新する（Phase 2 は Step 4-A、4-B、5-A、5-B、5-C、6 の各完了時点で必ず保存）。

以下のタイミングで **無条件に** チェックポイント保存:

| タイミング | 保存内容 |
|---|---|
| Phase 1 Step 0 完了時（research-summary.md 生成後） | リサーチ統合完了 |
| Phase 1 Step 1 完了時（course-structure.md 確定時） | カリキュラム構成確定 |
| Phase 2 SET前処理完了時 | SET設計方針確定 |
| Phase 2 Step 3 完了時（detailed-research.md 生成後） | 追加リサーチ完了 |
| Phase 2 Step 4 完了時（4エージェント起案完了） | 4版アウトライン起案完了 |
| Phase 2 Step 5-A 完了時（3批評完了） | 相互批評完了 |
| Phase 2 Step 5-B 完了時（3セルフレビュー完了） | セルフレビュー完了 |
| Phase 2 Step 5-C 完了時（マージ完了） | マージ完了。**実務講座の場合は `practice-{N}.xlsx` を `/xlsx` スキルで生成し保存** |
| Phase 2 Step 6 完了時（review-report.md 生成後） | レビュー完了 → outline-final.md。**実務講座の場合は `practice-{N}-final.xlsx` を `/xlsx` スキルで再生成** |
| Phase 2 Step 6.5-P 完了時（実務講座のみ） | Windows/Mac 両 PDF 生成完了（`practice-{N}-guide-win.pdf` + `practice-{N}-guide-mac.pdf`） |
| Phase 3 Step 7 完了時 | スライド構成完了 |
| Phase 4 Step 8-A 完了時 | 台本完了 |
| Phase 4 Step 8-B 完了時 | スライド生成完了 |

## progress.json のスキーマ

**保存先:** `output/{project}/progress.json`

```json
{
  "project_name": "jidouka",
  "curriculum_name": "業務自動化カリキュラム",
  "course": "本業強化コース",
  "last_updated": "2026-04-15T14:32:00+09:00",
  "current_phase": "Phase 2",
  "current_set": "SET 3",
  "current_lecture": "【実務】業務プロセスの自動化設計",
  "current_step": "Step 5-A",
  "next_action": "Step 5-B: 4エージェントでセルフレビューを並列実行",
  "context_status": "healthy",
  "completed_artifacts": {
    "phase1": {
      "research_summary": "output/jidouka/00_course-design/research-summary.md",
      "course_structure": "output/jidouka/00_course-design/course-structure.md"
    },
    "phase2": {
      "SET 1": { "status": "completed", "lectures": ["..."] },
      "SET 2": { "status": "completed", "lectures": ["..."] },
      "SET 3": {
        "status": "in_progress",
        "current_lecture": "【実務】業務プロセスの自動化設計",
        "step_status": {
          "step3_research": "completed",
          "step4_drafting": "completed",
          "step5a_critique": "completed",
          "step5b_self_review": "pending",
          "step5c_merge": "pending",
          "step6_review": "pending"
        },
        "artifacts": {
          "detailed_research": "output/jidouka/01_outline/set3-xxx/detailed-research.md",
          "outline_baseline": "output/jidouka/01_outline/set3-xxx/outline_baseline.md",
          "outline_outcome": "output/jidouka/01_outline/set3-xxx/outline_outcome.md",
          "outline_retention": "output/jidouka/01_outline/set3-xxx/outline_retention.md",
          "outline_segment": "output/jidouka/01_outline/set3-xxx/outline_segment.md",
          "critique_baseline": "output/jidouka/01_outline/set3-xxx/critique_baseline.md",
          "critique_outcome": "output/jidouka/01_outline/set3-xxx/critique_outcome.md",
          "critique_retention": "output/jidouka/01_outline/set3-xxx/critique_retention.md",
          "critique_segment": "output/jidouka/01_outline/set3-xxx/critique_segment.md",
          "practice_md": "output/jidouka/05_practice/practice-3.md",
          "practice_csv": "output/jidouka/05_practice/practice-3.csv",
          "practice_xlsx": "output/jidouka/05_practice/practice-3.xlsx",
          "practice_final_md": "output/jidouka/05_practice/practice-3-final.md",
          "practice_final_csv": "output/jidouka/05_practice/practice-3-final.csv",
          "practice_final_xlsx": "output/jidouka/05_practice/practice-3-final.xlsx",
          "practice_guide_win_pdf": "output/jidouka/05_practice/practice-3-guide-win.pdf",
          "practice_guide_mac_pdf": "output/jidouka/05_practice/practice-3-guide-mac.pdf"
        }
      }
    }
  },
  "handoff_notes": "Step 5-A まで完了。次セッションでは Step 5-B（セルフレビュー）から4エージェント並列で再開。対象講座は上記 current_lecture を参照。"
}
```

## コンテキスト残量モニタリング

メインClaude は以下の状況で **context_status を更新し、早めに引き継ぎ準備** を始める:

| context_status | 判断基準 | 取るべき行動 |
|---|---|---|
| `healthy` | 通常状態 | そのまま続行 |
| `warning` | 大きなファイルを複数読み込み、次の Step で逼迫の可能性 | 現在実行中の Step を完了させ、次の Step 開始前にチェックポイント保存 + ユーザーに引き継ぎ提案 |
| `critical` | 次の並列エージェント起動でコンテキスト超過の恐れ | **必ず** 現 Step の成果物を保存 → progress.json 更新 → ユーザーに引き継ぎを宣言して停止 |

**判断基準の目安（早期判定でトークン無駄遣いを防ぐ）:**

| タイミング | 自動判定 |
|---|---|
| Step 3 完了時 | `healthy` を維持（リサーチのみ完了、まだ余裕がある） |
| Step 4 完了時（4エージェント起案後） | **`warning` に引き上げ**。次の Step 5-A でさらに4エージェント起動するため、ここが分岐点 |
| Step 5-A 完了時（4エージェント批評後） | 2回目の4エージェント起動済み。**`warning` 維持 or `critical` に引き上げ** |
| Step 5-B 完了時（4エージェントレビュー後） | 3回目の4エージェント起動済み。Step 5-C（マージ）はメインOpusが直接実行で重い。**`critical` を積極検討** |

- 4エージェント並列起動は1回あたり相当のトークン消費になる（Sonnet 4.6 × 4 = メインOpusのコンテキストには直接影響しないが、メインOpusが結果を読み込む段階でコンテキストが増える）
- **Step 4 完了後が最初の引き継ぎ判定ポイント**。Step 5-A 開始前に `warning` 状態ならユーザーに引き継ぎを提案する
- 1 SET の完全制作（Step 3〜6）が単独セッションで完結しない場合は、**Step 4 完了 or Step 5-A 完了で引き継ぎ**が最も安全
- 従来講座（段階PL）や実務講座の収録指示書制作は特に重い
- **迷ったら引き継ぐ**。コンテキスト溢れで無駄になるトークンの方がセッション分割のコストより大きい

## 引き継ぎフロー

### 引き継ぎ宣言（現セッション）

コンテキスト残量が逼迫したら、メインClaude は以下を実行する:

1. **現在進行中の Step を必ず完了させる**（中途半端な状態で停止しない）
   - 4エージェント並列起動を始めたら、4つとも完了を待つ
   - Step 5-C のマージ途中で止めない
   - レビュー途中で止めない
2. **progress.json を更新**
   - `current_step` を最新の完了ステップに
   - `next_action` を次セッションで実行する内容で記述
   - `handoff_notes` に続行時の注意点を書く
3. **メモリに進捗を保存**（`project_{project-name}.md` を更新）
4. **ユーザーに引き継ぎを宣言:**

```
⚠️ コンテキスト残量が逼迫してきたため、ここで一旦セッションを区切ります。

📁 保存した状態:
  - output/{project}/progress.json
  - メモリ: project_{project-name}.md

✅ 完了した作業: {current_step まで}
⏭️ 次セッションでの続き: {next_action}

新しいセッションで /create-course を実行すると、自動的にここから再開します。
```

### 引き継ぎ検出（次セッション起動時）

`/create-course` スキルが起動した際、**起動時分岐（workflow-routing.md）より前に** 以下を確認する:

1. メモリの `MEMORY.md` に未完了プロジェクトがあるか確認
2. 該当プロジェクトの `progress.json` を Read
3. `current_step` が完了していて `next_action` が存在すれば、**再開の提案を最初に表示**:

```
前回の続きから再開できます。

📋 プロジェクト: {curriculum_name}（{project_name}）
🏁 前回完了: {current_phase} / {current_step}
⏭️ 次の作業: {next_action}

続きから再開しますか？

① はい、続きから再開する
② いいえ、新しい作業を始める（①②③の通常分岐へ）
```

### 再開時の Step 実行

ユーザーが「①続きから再開」を選んだ場合:

1. `progress.json` の `next_action` に従って該当 Step から開始
2. **完了済みの Step は絶対に再実行しない**（成果物が既に存在する）
3. 必要なファイルのみを Read（progress.json の `artifacts` に記載されたパスから読み込む）
4. Step 実行後、通常通り progress.json を更新

## 禁止事項（引き継ぎ時の簡略化禁止）

**コンテキスト逼迫を理由に、以下の簡略化は絶対に行わない:**

| ❌ 禁止 | 代わりに |
|---|---|
| 4エージェント → 3エージェント以下に削減 | **必ず4エージェント並列** を維持。引き継いで新セッションで実行 |
| 相互批評（Step 5-A）のスキップ | **必ず実施**。Step 4 完了後に引き継ぎ、新セッションで5-A から |
| セルフレビュー（Step 5-B）のスキップ | **必ず実施**。5-A 完了後に引き継ぎ、新セッションで5-B から |
| 51項目レビュー（Step 6）の一部省略 | **全項目適用**。Step 5-C 完了後に引き継ぎ、新セッションで6から |
| 2版統合を1版で代用 | **必ず2版統合**。Gemini 呼び出しを省略しない |
| 構造lint・textlint のスキップ | **必ず実施** |
| ユーザー確認（★確認ポイント）のスキップ | **必ず実施**。省略は禁止 |

## 簡略化したくなる場面での正しい対応

| 状況 | ❌ してはいけない対応 | ✅ 正しい対応 |
|---|---|---|
| 4エージェント並列の直前でコンテキストが厳しい | 1エージェントだけで済ませる | Step 4 開始前に引き継ぎ → 新セッションで4並列実行 |
| Step 5-A と 5-B を一気通貫したいがコンテキストが足りない | 5-A/5-B を統合して簡略化 | 5-A 完了で引き継ぎ → 新セッションで5-B |
| ユーザーが「早く終わらせたい」と言った | レギュレーションを崩す | 「セッションを分けて全工程を守る」選択肢を提示 |
| GL読み込みが重い | 読み込まずに推測で進める | **必ず Read**。必要なら Read 前に引き継ぎを判断 |

## progress.json の運用ルール

- **作成**: 新規プロジェクト開始時に `output/{project}/` 配下に作成
- **更新頻度**: Step 完了ごと（最小単位）
- **削除禁止**: プロジェクト完了まで保持。完了後もアーカイブとして残す
- **同時編集禁止**: 1プロジェクトにつき1セッションで編集（並列セッション非対応）

## メモリとの役割分担

| 情報の種類 | 保存先 |
|---|---|
| プロジェクト全体の概要（カリキュラム名・コース・進捗サマリー） | メモリ（`project_{name}.md`） |
| Step 単位の詳細進捗・成果物パス・handoff_notes | `progress.json` |
| カリキュラム構成・アウトライン本文 | 各種 .md / .csv（従来通り） |

メモリは **会話をまたいだ再開の入り口**、progress.json は **Step 単位の正確な状態** を管理する。両方を併用する。
