# Phase 2: 一括パイプライン（教養/実務）— 詳細仕様

講座種別が **【教養】** または **【実務】** の場合に使用するパイプライン。
Step 3〜6 を一気通貫で実行する。

## Phase 2 の入力

**Phase 1 経由の場合:**
- `course-structure.md` — カリキュラム全体の文脈（この講座がどのセットに属し、前後にどんな講座があるか）
- `research-summary.md` — Phase 1 リサーチ素材
- 対象講座の情報（タイトル・種別・セット内の位置づけ）

**Phase 2 直接開始の場合:**
- `lecture-brief.md` — ヒアリングで収集した講座情報
- `course-structure.md` / `research-summary.md` は存在しない
- Step 3 の追加リサーチで Phase 1 相当の情報を補完する

## SET単位制作の前処理（Step 3 の前に実行）

**適用条件:** SET単位で制作する場合（course-structure.md に「標準一貫ケース」が定義済み）

1. `guidelines/実務_講座設計ガイドライン_2.md` を Read
2. course-structure.md から対象SETの情報を抽出
3. SET内設計を確認・補完:
   - 一貫ケースが定義済みか → 未定義なら設計
   - 問題解決ストーリーのこのSETの位置づけ
   - 教養How用別事例の割当
   - 使用ツール
4. ユーザーに確認後、Step 3（リサーチ）へ

**SET内の制作順序:** course-structure.md で定義された講座を順に制作する。教養・実務の制作順序は固定ではない（学習順序は教養→実務だが、制作はどちらからでも可）。

## Step 3: 追加リサーチ（3モデル並列）

Phase 1 の research-summary.md を土台に、選択された講座を実現するための**具体的情報**を追加収集する。
机上の空論を防ぐため、実際の事例・数値・プロンプト等を重点的に調査する。

### SET単位の場合のGL読み込み

SET単位で制作する場合、Step 3 のリサーチでは教養+実務+収録指示書の全GLを一括で参照し、SET全体を見通したリサーチを行う:

1. `guidelines/教養_講座設計ガイドライン.md` — 教養講座のWhy/What/How/Wrap設計
2. `guidelines/教養と実務_コース設計ガイドライン.md` — SET構造・教養→実務の接続
3. `guidelines/実務_講座設計ガイドライン_2.md` — SET内設計原則（一貫ケース・ストーリー）
4. `guidelines/実務_講座設計ガイドライン.md` — 実務講座のロール・ミッション・アウトライン設計
5. `guidelines/practice_video_guideline.md` — 実践動画の収録指示書GL（汎用）
6. `guidelines/practice-3.md` — 収録指示書サンプル（具体例・参考用）

### 従来の場合のGL読み込み

`guidelines/outline_v1.md` に基づいてリサーチを行う。

### 追加調査の重点（講座種別で分岐）
- **教養**: Why素材（悩み・リスク事例）、How素材（思考プロセス・失敗パターン）、具体例・比喩、教養How用の別業界事例
- **実務**: ペルソナ深掘り、操作手順の実例、プロンプト素材追加、Before/After裏取り、収録指示書に必要な画面操作手順・ツール設定

**パイプライン（メインClaude がオーケストレーション）:**
1. メインClaude がリサーチプロンプトを作成 → `{out}/research_prompt.md`（モデル別役割指示を含む）
2. **メインClaude（Opus 4.6）** が Claude版リサーチを生成 → `detailed_research_claude.md`
3. **並行して** api-caller エージェントが Gemini + OpenAI を API 呼び出し → `_gemini.md`, `_openai.md`
4. **メインClaude** が3版を統合 → `detailed-research.md`（4層構造: 事実/一致論点/仮説/使用禁止）

**成果物**: `detailed-research.md`（4層構造）

## Step 4: 講座制作（教養/実務で分岐）

### Step 4-A: 教養講座 → アウトライン生成（3モデル並列）

教養GL に100%準拠したアウトラインを、3モデルが各々独立に生成する。

**参照GL:**
- `guidelines/教養と実務_コース設計ガイドライン.md`
- `guidelines/教養_講座設計ガイドライン.md`

**パイプライン（メインClaude がオーケストレーション）:**
1. メインClaude が GL の構成ルール（Why/What/How/Wrap）+ モデル別役割指示を含むプロンプト作成
2. **メインClaude（Opus 4.6）** が Claude版アウトラインを生成 → `outline_claude.md`
3. **並行して** api-caller が Gemini + OpenAI を API 呼び出し → `outline_gemini.md`, `outline_openai.md`

**成果物**: 3つの独立したアウトライン → Step 5（批評+マージ）→ Step 6（レビュー）→ `outline-final.md`

### Step 4-B: 実務講座 → 収録指示書生成（3モデル並列）

`practice_video_guideline.md` のテンプレートに沿って、実践動画の収録指示書を3モデルが各々独立に生成する。

**参照GL:**
- `guidelines/実務_講座設計ガイドライン_2.md` — SET内設計原則
- `guidelines/実務_講座設計ガイドライン.md` — 実務講座の設計思想
- `guidelines/practice_video_guideline.md` — 収録指示書の出力形式・テンプレート
- `guidelines/practice-3.md` + `guidelines/practice-3.csv` — サンプル（参考用）

**パイプライン（メインClaude がオーケストレーション）:**
1. メインClaude が `practice_video_guideline.md` §4 の出力フロー + モデル別役割指示を含むプロンプト作成
2. **メインClaude（Opus 4.6）** が Claude版収録指示書を生成 → `practice_claude.md` + `practice_claude.csv`
3. **並行して** api-caller が Gemini + OpenAI を API 呼び出し → `practice_gemini.md` + `.csv`, `practice_openai.md` + `.csv`

**各モデルの生成内容:**
- 対象パートの確認（How章のどのアクションを実践動画化するか）
- 使用ツール・アウトプットの定義
- Phase分割（3〜6個のPhase、各1〜2分）
- Markdown指示書の作成（§2テンプレート準拠）
- CSV指示書の作成（§3フォーマット準拠: 操作内容×台本の2カラム）
- 一貫ケースのデータをプロンプト等に一言一句埋め込む

**成果物**: 3組の独立した収録指示書（md + csv）→ Step 5（批評+マージ）→ Step 6（レビュー）

※ 実務講座は Phase 3/4 には進まない。収録指示書（md + csv）が最終成果物。

## Step 5: 相互批評 + クリティカルシンキング + 選択（教養・実務共通）

**教養（アウトライン）も実務（収録指示書）も、Step 5 の相互批評→セルフレビュー→マージ+構造lint を必ず実施する。**

3モデルの成果物を相互批評し、**最良の案を選択**する（マージではなく選択）。
- 教養: 3つのアウトライン（`outline_claude/gemini/openai.md`）を批評
- 実務: 3組の収録指示書（`practice_claude/gemini/openai.md` + `.csv`）を批評

### Step 5-A: 相互批評（3モデル並列）
各モデルが他の2モデルのアウトラインを批評する（`references/critic_template.md` フレームワーク使用）:
- MECE チェック（網羅性・排他性・構造性）
- クリティカルシンキング（根拠・論理・反論・前提・具体性）
- ファクトチェック（数値・引用・因果）
- 教育コンテンツとしての品質 + GL準拠度

**実行主体:**
- **メインClaude（Opus 4.6）** → Gemini版 + OpenAI版を批評 → `critique_claude.md`
- **Gemini（API）** → Claude版 + OpenAI版を批評 → `critique_gemini.md`（api-caller が呼び出し）
- **OpenAI（API）** → Claude版 + Gemini版を批評 → `critique_openai.md`（api-caller が呼び出し）

### Step 5-B: セルフクリティカルシンキング — 3段階（3モデル並列）

各モデルが3段階でセルフレビューを行う:

**Step 5-B-1: 失敗前提レビュー**
「このアウトラインで講座を作った場合、受講者が離脱・混乱・不満を感じるとしたら何が原因か？」
→ `failure_review_claude.md` / `_gemini.md` / `_openai.md`

**Step 5-B-2: 自己肯定レビュー**
「このアウトラインの最大の強みは何か？他案にない独自の価値は何か？」
→ `strength_review_claude.md` / `_gemini.md` / `_openai.md`

**Step 5-B-3: 修正案提示**
失敗前提 + 他モデルの批評を踏まえた具体的修正案
→ `self_review_claude.md` / `_gemini.md` / `_openai.md`

**実行主体:**
- **メインClaude（Opus 4.6）** → Claude版の3段階を実行
- **Gemini（API）** → api-caller が呼び出し
- **OpenAI（API）** → api-caller が呼び出し

### Step 5-C: ベース案選定 + 差分マージ（メインClaude Opus 4.6 直接実行）

**メインClaude が直接実行。「最良の1つを選ぶ」ではなく「ベース案+差分マージ」で最良編集する。**

**パイプライン:**
1. 採点表のスコア（A+B = /80）でベース案を決定（最高得点の案）
2. 他2案から取り込むべき差分を特定（章順/命名/具体例/論点/構造）
3. 差分ごとにマージ理由を明記
4. マージ実行:
   - 教養 → `outline.md`
   - 実務 → `practice-{講座番号}.md` + `practice-{講座番号}.csv`
5. **構造lint**（9項目 + 実務の場合は収録指示書チェック P1-P8）を実行 → 問題があれば修正
6. textlint 実行（教養のみ。実務の収録指示書は口語体のため textlint 対象外）

**成果物:**
- `outline_selection.md`（ベース案選定理由 + 差分マージ内容 + 各差分のマージ理由）
- 教養: `outline.md`（マージ済みアウトライン）
- 実務: `practice-{講座番号}.md` + `.csv`（マージ済み収録指示書）

## Step 6: 51項目レビュー + セット整合チェック（教養・実務共通・メインClaude直接実行）

**教養も実務も、Step 6 のレビューを必ず実施する。**

→ 詳細は `.claude/rules/quality-review.md` を参照（講座種別に応じたチェック項目が自動適用される）

**成果物:**
- 教養: `outline-final.md` + `review-report.md`
- 実務: `practice-{講座番号}-final.md` + `practice-{講座番号}-final.csv` + `review-report.md`
