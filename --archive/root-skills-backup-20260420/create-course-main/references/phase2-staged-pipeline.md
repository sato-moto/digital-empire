# Phase 2: 段階パイプライン（従来講座）— 詳細仕様

講座種別が **【従来】** の場合に使用するパイプライン。
`guidelines/outline_v1.md` の4ステップ構成（①タイトル→②ゴール→③章ロール→④章アウトライン）に従い、
**各ステップでユーザー確認+ブラッシュアップ**を挟みながら段階的にアウトラインを完成させる。

**Step順序:** T1/T2（タイトル+ゴール一括）→ Step 3（リサーチ）→ T3（章ロール）→ T4（章アウトライン）→ 5-T → 6

リサーチ（Step 3）はタイトル・ゴール確定後に実施する。確定したタイトル・ゴール・ペルソナを使って的を絞ったリサーチを行うことで、T3以降の品質を高める。

## Step 4-T1/T2: タイトル+ゴール設計（メインClaude単独）

**メインClaude（Opus 4.6）が直接実行する。**

**GL参照:**
- `guidelines/outline_v1.md`「① 講座タイトル入力」セクション
- `guidelines/outline_v1.md`「② 講座ゴール設計」セクション

**パイプライン:**
1. lecture-brief.md（ヒアリング素材情報）を入力
2. outline_v1.md ①②の設計原則に従い、タイトル設計+ゴール設計を一括生成
3. outline_v1.md ① のNGチェックリスト（5項目）+ ② のNGチェックリスト（7項目）でセルフチェック
4. 設計結果（①②両方）+ NGチェック結果をユーザーに一括提示
5. ユーザーのフィードバック → 修正 → 再提示（OKが出るまでループ）

**出力フォーマット:**
- ① 準拠: 講座タイトル/講座テーマ/想定受講者/タイトル意図/提供価値
- ② 準拠: ペルソナ/ゴール文/Before→After 4観点

**成果物:** `title-design.md` + `goal-design.md`（1回のユーザー確認で両方確定）

## Step 3: 追加リサーチ（タイトル+ゴール確定後に実施）

教養/実務パイプラインの Step 3 と同じ3モデル並列パイプラインを実行する。

**入力:** title-design.md（確定タイトル）+ goal-design.md（確定ゴール・ペルソナ・Before/After）
**目的:** 確定したタイトル・ゴール・ペルソナに基づく的を絞ったリサーチ。T3（章ロール設計）・T4（章アウトライン）の素材を収集する。

完了後に **ユーザー確認を挟む**（リサーチ結果の概要を提示し、方向性の合意を取る）。

**成果物:** `detailed-research.md`

## Step 4-T3: 章ロール設計（メインClaude単独）

**メインClaude（Opus 4.6）が直接実行する。**

**GL参照:** `guidelines/outline_v1.md`「③ 章ロール設計」セクション

**パイプライン:**
1. title-design.md + goal-design.md + detailed-research.md を入力
2. outline_v1.md ③ の設計原則に従い、章構成を設計
3. **制約:** 心理順序（興味→納得→実行→自信）に沿った章順
4. outline_v1.md ③ のNGチェックリスト（7項目）でセルフチェック
5. ユーザーに提示 → フィードバック → 修正ループ

**出力フォーマット:** outline_v1.md ③ 準拠（各章の章タイトル/章ロール/章ゴール）

**成果物:** `chapter-design.md`

## Step 4-T4: 章アウトライン設計（フルパイプライン）

**既存の Step 4 + Step 5 と同じフルパイプラインを適用する。**

**GL参照:** `guidelines/outline_v1.md`「④ 章アウトライン設計」セクション

**入力:** title-design.md + goal-design.md + chapter-design.md + detailed-research.md

**パイプライン:**
1. メインClaude がプロンプト作成（GL構成ルール + モデル別役割指示 + 確定済みタイトル/ゴール/章構成を含む）
2. **メインClaude** が Claude版アウトラインを生成 → `outline_claude.md`
3. **並行して** api-caller が Gemini + OpenAI を API 呼び出し → `outline_gemini.md`, `outline_openai.md`
4. 相互批評（Step 5-A相当）→ `critique_claude.md`, `critique_gemini.md`, `critique_openai.md`
5. セルフレビュー 3段階（Step 5-B相当）→ `self_review_claude.md`, `self_review_gemini.md`, `self_review_openai.md`
6. マージ+構造lint（Step 5-C相当）→ `outline.md`
7. textlint 実行
8. outline_v1.md ④ のNGチェックリスト（14項目）でセルフチェック
9. ユーザーに提示 → フィードバック → 修正ループ

**固有名詞の除去ルール:** 教養/実務パイプラインの Step 4 と同じルールを適用

**成果物:** `outline.md`（マージ済み）+ 中間ファイル群

## Step 5-T: 工程整合チェック（メインClaude直接実行）

**メインClaude（Opus 4.6）が直接実行する。**

**入力:** title-design.md + goal-design.md + chapter-design.md + outline.md

**チェック項目:** outline_v1.md 末尾の工程整合チェック（5項目）
- [ ] タイトルとゴールが一致している
- [ ] ゴールと章構成が一致している
- [ ] 章構成とアウトラインが一致している
- [ ] 章順が心理順序に沿っている
- [ ] 講座全体がゴールに収束している

不整合が見つかった場合、どのステップの成果物を修正すべきかを特定し、ユーザーに提案する。
必要に応じて該当ステップに戻って再設計する。

**成果物:** `coherence-check.md`

## Step 6: 51項目レビュー（教養/実務と共通）

教養/実務パイプラインの Step 6 と同じ。講座タイプ判定時の適用範囲:
- **従来:** 共通(#1〜37) + 工程整合(#47〜51)。講座内容に応じて教養追加(#38〜39) or 実務追加(#40〜46) を適用
