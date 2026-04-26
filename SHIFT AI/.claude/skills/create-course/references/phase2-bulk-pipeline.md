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

## 体制のハイライト

Phase 2 は **ハイブリッド体制** で進行する:

- **Step 3（リサーチ）**: Gemini API を呼び出し（検索グラウンディングによる探索的リサーチ）
- **Step 4〜5-B（アウトライン起案・批評・セルフレビュー）**: **Claude 4サブエージェント並列**（baseline-designer / outcome-reviewer / retention-reviewer / segment-fit-reviewer）
- **Step 5-C/6（統合・レビュー）**: メインClaude 直接実行

4サブエージェントは **GL準拠の基準線** + 会員データに根差した **直交する3特化観点** でアウトラインを見る:

| エージェント | 観点 | 役割・根拠 |
|---|---|---|
| baseline-designer | GL準拠・総合バランス | マージ時のアンカー（基準線）。GLに忠実な正統派アウトライン |
| outcome-reviewer | 成果直結 — 動詞ベース目標・定量KPI・演習配置 | 88%が実務/収益化/不安解消期待 |
| retention-reviewer | 離脱防止 — 最初の成功体験・ハードル・ナビ | 22.1%が不安・未定層で離脱リスク最大 |
| segment-fit-reviewer | クラスター適合 — 対象明確性・制約整合・舞台接地 | 8クラスター×4カテゴリで多様 |

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

## Step 3: 追加リサーチ（2モデル並列）

Phase 1 の research-summary.md を土台に、選択された講座を実現するための**具体的情報**を追加収集する。
机上の空論を防ぐため、実際の事例・数値・プロンプト等を重点的に調査する。

**この工程は Gemini API を呼び出して実行する** — 検索グラウンディングによる探索的リサーチの強みを活用する。

### SET単位の場合のGL読み込み（種別で分岐・トークン節約）

SET単位で制作する場合、Step 3 のリサーチでは **対象講座の種別に応じて必要なGLだけ** を読み込む。全GLを一括で読み込まない（メインOpusのコンテキスト節約）。

**教養講座のリサーチ時（3GL）:**
1. `guidelines/教養_講座設計ガイドライン.md` — 教養講座のWhy/What/How/Wrap設計
2. `guidelines/教養と実務_コース設計ガイドライン.md` — SET構造・教養→実務の接続
3. `guidelines/実務_講座設計ガイドライン_2.md` — SET内設計原則（一貫ケース・ストーリー）

**実務講座のリサーチ時（4GL）:**
1. `guidelines/実務_講座設計ガイドライン.md` — 実務講座のロール・ミッション・アウトライン設計
2. `guidelines/実務_講座設計ガイドライン_2.md` — SET内設計原則（一貫ケース・ストーリー）
3. `guidelines/practice_video_guideline.md` — 実践動画の収録指示書GL（汎用）
4. `guidelines/practice-3.md` — 収録指示書サンプル（具体例・参考用）

### 従来の場合のGL読み込み

`guidelines/outline_v1.md` に基づいてリサーチを行う。

### 追加調査の重点（講座種別で分岐）
- **教養**: Why素材（悩み・リスク事例）、How素材（思考プロセス・失敗パターン）、具体例・比喩、教養How用の別業界事例
- **実務**: ペルソナ深掘り、操作手順の実例、プロンプト素材追加、Before/After裏取り、収録指示書に必要な画面操作手順・ツール設定

**パイプライン（メインClaude がオーケストレーション）:**
1. メインClaude がリサーチプロンプトを作成 → `{out}/research_prompt.md`（モデル別役割指示を含む）
2. **メインClaude（Opus 4.6）** が Claude版リサーチを生成 → `detailed_research_claude.md`
3. **並行して** api-caller エージェントが Gemini を API 呼び出し → `_gemini.md`
4. **メインClaude** が2版を統合 → `detailed-research.md`（4層構造: 事実/一致論点/仮説/使用禁止）

**成果物**: `detailed-research.md`（4層構造）

## Step 4: 講座制作（教養/実務で分岐）— 4サブエージェント並列

**Step 4 以降、アウトライン起案・批評・セルフレビューは 4サブエージェント並列 で実行する。**

### Step 4-A: 教養講座 → アウトライン起案（4エージェント並列）

メインClaude が以下の4エージェントを **1メッセージ内で並列起動** する:

- `baseline-designer` → `outline_baseline.md` を起案（GL準拠・総合バランス）
- `outcome-reviewer` → `outline_outcome.md` を起案
- `retention-reviewer` → `outline_retention.md` を起案
- `segment-fit-reviewer` → `outline_segment.md` を起案

**各エージェントに渡す入力（トークン節約: 必要部分のみ抜粋して渡す）:**
- タスク種別: 「起案」
- 対象講座のブリーフ（タイトル・対象クラスター・尺・前後接続）
- リサーチ結果: `detailed-research.md` から **対象講座に関連するセクションのみ抜粋**（全文を渡さない）
  - メインClaude (Opus 4.6) が `detailed-research.md` を読み、対象講座に必要な Layer 1〜3 の該当部分を抽出してプロンプトに埋め込む
  - Layer 4（使用禁止情報）は要約のみ渡す（「以下は使用禁止: {キーワード一覧}」）
- 設計GL: `guidelines/教養_講座設計ガイドライン.md` + `guidelines/教養と実務_コース設計ガイドライン.md`
- アウトラインGL: `guidelines/outline_v1.md`
- 会員データ: `references/cluster-summary.md` から **対象クラスターの該当行のみ抜粋**（全8クラスター分を渡さない）
- 出力先パス

**各エージェントは自観点に振り切って起案する**（観点の侵食禁止。baseline-designer はGL準拠のバランス型）。4版は独立コンテキストで並列生成される。

**成果物**: 4つの独立したアウトライン → Step 5（相互批評+セルフレビュー+マージ）→ Step 6（レビュー）→ `outline-final.md`

### Step 4-B: 実務講座 → 収録指示書起案（4エージェント並列）

`practice_video_guideline.md` のテンプレートに沿って、実践動画の収録指示書を4エージェントが各々独立に起案する。

メインClaude が以下の4エージェントを並列起動する:

- `baseline-designer` → `practice_baseline.md` + `.csv` を起案（GL準拠・総合バランス）
- `outcome-reviewer` → `practice_outcome.md` + `.csv` を起案
- `retention-reviewer` → `practice_retention.md` + `.csv` を起案
- `segment-fit-reviewer` → `practice_segment.md` + `.csv` を起案

**各エージェントに渡す入力:**
- タスク種別: 「起案（収録指示書）」
- 対象SETのブリーフ（一貫ケース・対象クラスター・使用ツール）
- リサーチ結果: `detailed-research.md`
- 設計GL: `guidelines/実務_講座設計ガイドライン_2.md` + `guidelines/実務_講座設計ガイドライン.md`
- 出力形式GL: `guidelines/practice_video_guideline.md`
- サンプル: `guidelines/practice-3.md` + `guidelines/practice-3.csv`
- 会員データ: `references/cluster-summary.md`
- **OS 表記ポリシー**: `guidelines/practice_video_guideline.md` §3-6 に従い、CSV/MD 内の Windows/Mac 両記は禁止。**Windows 表記で固定**して起案すること（`Ctrl+S`、`Windowsキー+矢印`、`タスクバー自動非表示` 等）。Mac 受講者向けの変換は Step 6.5-P で別途実施されるため、起案段階では一切考慮しない
- 出力先パス

**各エージェントの観点の適用（実務版）:**
- **outcome-reviewer**: 受講者が動画視聴後に「再現できる手順」「持ち帰るプロンプト」が明確か、Phase分割ごとに成果物があるか
- **retention-reviewer**: 最初の Phase で小さな達成感があるか、操作説明の前提知識が適切か、迷子防止（「今どの Phase にいるか」）が設計されているか
- **segment-fit-reviewer**: 対象クラスターの業務文脈/生活文脈と合っているか、一貫ケースのデータ接地が適切か

**各エージェントの生成内容:**
- 対象パートの確認（How章のどのアクションを実践動画化するか）
- 使用ツール・アウトプットの定義
- Phase分割（3〜6個のPhase、各1〜2分）
- Markdown指示書の作成（§2テンプレート準拠）
- CSV指示書の作成（§3フォーマット準拠: 操作内容×台本の2カラム）
- 一貫ケースのデータをプロンプト等に一言一句埋め込む

**成果物**: 4組の独立した収録指示書（md + csv）→ Step 5（批評+マージ）→ Step 6（レビュー）

※ 実務講座は Phase 3/4 には進まない。収録指示書（md + csv）が最終成果物。

## Step 5: 相互批評 + セルフレビュー + マージ（教養・実務共通）

**教養（アウトライン）も実務（収録指示書）も、Step 5 の相互批評→セルフレビュー→マージ+構造lint を必ず実施する。**

### Step 5-A: 相互批評（4エージェント並列）

各エージェントが **他の3エージェントの成果物を自観点で批評** する。

メインClaude が以下の4エージェントを並列起動する:

- `baseline-designer` → タスク種別「相互批評」で他3案をGL準拠観点で批評 → `critique_baseline.md`
- `outcome-reviewer` → タスク種別「相互批評」で他3案を批評 → `critique_outcome.md`
- `retention-reviewer` → タスク種別「相互批評」で他3案を批評 → `critique_retention.md`
- `segment-fit-reviewer` → タスク種別「相互批評」で他3案を批評 → `critique_segment.md`

**批評観点（各エージェントの定義ファイル参照）:**
- `outcome-reviewer`: O1〜O6（動詞/KPI/成果物/演習/ブリッジ/持ち帰り）
- `retention-reviewer`: R1〜R7（成功体験/用語/ナビ/負荷/ロードマップ/不安処理/段差）
- `segment-fit-reviewer`: S1〜S6（対象明記/制約/カテゴリ期間/舞台/副ターゲット/文脈整合）

各観点を ✅/⚠️/❌ で評価し、⚠️❌には「何が問題か・なぜ問題か・どう直すか」の3点を記述する。

### Step 5-B: セルフレビュー（4エージェント並列）

各エージェントが **自分の起案した成果物 + 受けた批評** を入力に、失敗前提・強み・修正案の3観点でセルフレビューする。

メインClaude が以下の4エージェントを並列起動する:

- `baseline-designer` → タスク種別「セルフレビュー」 → `self_review_baseline.md`
- `outcome-reviewer` → タスク種別「セルフレビュー」 → `self_review_outcome.md`
- `retention-reviewer` → タスク種別「セルフレビュー」 → `self_review_retention.md`
- `segment-fit-reviewer` → タスク種別「セルフレビュー」 → `self_review_segment.md`

**セルフレビューの構造:**

1. **失敗前提**: この構成で自観点における失敗がどこで起きるか
2. **強み**: 自観点で残すべきコア設計は何か
3. **修正案**: 他役割の批評で取り入れるべき点、妥協してはいけない点

### Step 5-C: ベース案選定 + 4観点マージ（メインClaude Opus 4.6 直接実行）

**メインClaude が「アウトラインエディター」役割で直接実行。自案を持たない純粋な編集長として、4案を俯瞰してマージする。**

**パイプライン:**
1. 4版のアウトライン + 4つの相互批評 + 4つのセルフレビュー を一覧で比較
2. **ベース案選定**: 通常は `outline_baseline.md`（GL準拠・総合バランス）をベースとし、3特化観点の差分を上乗せする
   - baseline がGL準拠で十分な品質なら → baseline ベース（推奨）
   - 成果直結が最優先の講座なら → `outline_outcome.md` ベースも可
   - 初心者層が主ターゲットなら → `outline_retention.md` ベースも可
   - 特定クラスター特化なら → `outline_segment.md` ベースも可
   - 編集長基準（`.claude/rules/quality-review.md` 参照）で判断
3. 他3案から取り込むべき **差分を特定**:
   - ベースが baseline なら、outcome から「定量KPI・動詞ベース目標」、retention から「第1章の成功体験設計」、segment から「対象クラスター明記・舞台設定」を取り込む
   - ベースが outcome なら、baseline から「GL準拠の構造」、retention から「成功体験設計」、segment から「対象クラスター明記」を取り込む
   - ベースが retention なら、baseline から「GL準拠の構造」、outcome から「定量KPI」、segment から「舞台設定」を取り込む
   - ベースが segment なら、baseline から「GL準拠の構造」、outcome から「動詞ベース目標」、retention から「ナビゲーション」を取り込む
4. 差分ごとに **マージ理由を明記**
5. マージ実行:
   - 教養 → `outline.md`
   - 実務 → `practice-{講座番号}.md` + `practice-{講座番号}.csv`
6. **構造lint**（9項目 + 実務の場合は収録指示書チェック P1-P11）を実行 → 問題があれば修正
   - 実務講座の場合は追加で **Mac 併記残存チェック** を実行:
     - `grep -nE "（Mac:" {practice-N}.md {practice-N}.csv` で検出される行が**0件**であることを確認
     - 検出された場合は該当行を Windows 単独に書き直す（`practice_video_guideline.md` §3-6 準拠）
7. textlint 実行（教養のみ。実務の収録指示書は口語体のため textlint 対象外）
8. **Excel 変換（実務のみ・新規）**: `/xlsx` スキルを呼び出して `practice-{N}.csv` を Excel 化する。
   - 入力: `practice-{N}.csv`
   - 出力: `practice-{N}.xlsx`
   - 変換仕様: `guidelines/practice_video_guideline.md` §5-2 準拠（シート名 `操作×台本`、ヘッダ太字+背景色、列幅 A=60/B=80、セル内改行保持、フォント `Yu Gothic UI`）
   - 変換後、CSV と Excel のデータ行数一致・ヘッダ一致・文字化けなしを自動チェック

**成果物:**
- `outline_selection.md`（ベース案選定理由 + 4観点からの取り込み差分 + 各差分のマージ理由）
- 教養: `outline.md`（マージ済みアウトライン）
- 実務: `practice-{講座番号}.md` + `.csv` + `.xlsx`（マージ済み収録指示書・Excel 併出）

## Step 6: 51項目レビュー + セット整合チェック（教養・実務共通・メインClaude直接実行）

**教養も実務も、Step 6 のレビューを必ず実施する。**

→ 詳細は `.claude/rules/quality-review.md` を参照（講座種別に応じたチェック項目が自動適用される）

**実務の追加処理（Excel 再生成）:**
- レビュー反映で `practice-{N}-final.csv` が更新されたら、`/xlsx` スキルで `practice-{N}-final.xlsx` を**再生成**する
- 変換仕様は `guidelines/practice_video_guideline.md` §5-2 準拠（Step 5-C と同じ）
- 再生成後、CSV と Excel のデータ行数一致・ヘッダ一致・文字化けなしを自動チェック

**成果物:**
- 教養: `outline-final.md` + `review-report.md`
- 実務: `practice-{講座番号}-final.md` + `practice-{講座番号}-final.csv` + `practice-{講座番号}-final.xlsx` + `review-report.md`

## Step 6.5-P: 受講者向けPDF手順書生成（Windows 版 + Mac 版の2本出し・実務講座のみ・自動実行）

**適用条件:** 実務講座の Step 6 が完了し、`practice-{N}-final.md` + `practice-{N}-final.csv` が存在する場合に**自動実行**する（ユーザー確認不要）。

**実行方法:** 内部スクリプト `scripts/generate_practice_pdf.py`（reportlab ベース・Noto Sans JP 埋め込み）を使用。メインClaude (Opus 4.6) が直接実行する。**受講者の OS に応じて Windows 版と Mac 版の2種類を出力する。**

### 入力
- `practice-{N}-final.md` — 収録指示書（メタ情報・事前準備・Phase構成・話し方ルール・**Windows 表記固定**）
- `practice-{N}-final.csv` — 操作×台本（2カラムCSV・**Windows 表記固定**）
- `references/os-conversion-rules.md` — OS 変換マッピング表（**Mac 版 PDF 生成時にのみ参照**）

### 出力
- `practice-{N}-guide-win.pdf` — Windows 受講者向け PDF 手順書
- `practice-{N}-guide-mac.pdf` — Mac 受講者向け PDF 手順書（OS 変換ルール適用済み）
- 保存先: `output/{project}/05_practice/`

### PDF設計仕様（受講者向け手順書・両 OS 共通）

**重要: このPDFは会員（受講者）が動画視聴後に手元で実践するための手順書である。**
CSVの「操作内容」「台本」は講師の収録用データであり、PDFにそのまま転記してはならない。
生成時に**受講者目線に変換**してから出力する。

**両版共通の変換ルール**（§ CSV→PDF 変換ルール 参照）は同じ。**Mac 版のみ追加で OS 変換ルール表** を適用する。

**ページ設定:**
- A4縦、余白: 上下左右 20mm
- 日本語フォント: Noto Sans JP（`scripts/generate_practice_pdf.py` が自動埋め込み）

**構成（上から順に）:**

1. **表紙ページ**
   - タイトル: `practice-{N}-final.md` の `# 実践動画 指示書：` 行から講座タイトルを抽出
   - サブタイトル: 「操作手順ガイド」
   - メタ情報: 使用ツール、想定所要時間、完成物（§0 メタ情報から抽出）

2. **事前準備ページ**
   - `practice-{N}-final.md` の §2（事前準備）から抽出
   - チェックリスト形式で表示（□ マーク付き）
   - NG事項を赤枠の警告ボックスで強調

3. **手順ページ（メインコンテンツ）**
   - CSVの各行を**受講者目線に変換**してから番号付きステップとして表示
   - 各ステップの構成:
     - **操作手順**（背景色: 薄いブルー `#E8F4FD`）: 受講者が行う操作を簡潔に記述
     - **ポイント**（背景色: 薄いグレー `#F5F5F5`）: なぜその操作をするのか、注意点（任意。ポイントがある場合のみ表示）
   - プロンプト入力部分は等幅フォント + 枠線で視覚的に分離
   - Phase区切りには見出しバーを挿入（`practice-{N}-final.md` の Phase 情報から）

   **CSV→PDF変換ルール:**

   | CSVの内容 | PDF での扱い |
   |---|---|
   | ツール操作（「Claudeを開く」「プロンプトを入力する」等） | **操作手順として記載**（「〜してください」「〜します」の指示形に変換） |
   | プロンプト全文・入力テキスト | **操作手順内にコピペ用枠で掲載**（等幅フォント + 枠線） |
   | 講師の動作指示（「話し続ける」「画面を映す」「間を置く」等） | **除外**（受講者の操作ではない） |
   | 講師の語りかけ・セリフ（話し言葉） | **除外**（受講者向け情報ではない） |
   | 台本内の操作のコツ・注意点・判断基準 | **「ポイント」欄に抽出**（「〜です・〜ます」の文体に変換） |
   | 台本内の結果確認・期待される出力の説明 | **「確認」欄として記載**（「〜になっていれば成功です」形式） |
   | オープニング・エンディングのセリフ | **除外**（振り返りページで要約として別途記載） |

   **変換の具体例:**

   CSV原文:
   ```
   操作内容: 「Claudeのチャット欄に以下を入力する。[プロンプト全文]」
   台本: 「ここがポイントです。件名から書くのではなく、まず相手の状況と目的を伝えるんですね。これでClaudeが文脈を理解して、的確なメールを書いてくれます。」
   ```

   PDF出力:
   ```
   Step 3: Claudeにプロンプトを入力する
   ┌─────────────────────────────┐
   │ [プロンプト全文]              │  ← コピペ用枠
   └─────────────────────────────┘
   ポイント: 件名からではなく、相手の状況と目的を先に伝えます。
   これによりClaudeが文脈を理解し、的確なメールを生成します。
   ```

   CSV原文（講師動作のみ → 除外対象）:
   ```
   操作内容: 「そのまま話し続ける。」
   台本: 「この2つを守れば、1通15分かかっていたメール返信が3分で完了するようになります。」
   ```

   → **PDFには出力しない**（受講者の操作ステップではないため）

4. **振り返りページ**
   - 講座全体で学んだことの要約（CSVのエンディング部分から要点を抽出・変換）
   - 完成物チェックリスト（□ マーク付き）
   - 「次のステップ」（次講座への接続がある場合）

**デザイン原則:**
- フォントサイズ: 本文 11pt、見出し 14pt、ステップ番号 16pt（大きめ）
- 操作手順とポイントの視覚的分離を徹底（色 + 罫線）
- 1ステップが1ページを跨がないよう適切に改ページ
- プロンプト全文は改行・インデントを整えて読みやすく表示
- 文体は「です・ます調」で統一（講師のセリフ口調は使わない）

### 生成パイプライン（Windows 版 + Mac 版の2本出し）

**共通の前処理（両 OS 版で1回だけ実行）:**

1. `practice-{N}-final.md` を Read → メタ情報・事前準備・Phase構成を抽出
2. `practice-{N}-final.csv` を Read → 操作×台本の全行を取得
3. **CSV→受講者目線への変換処理**（メインClaude が実行）:
   - 各行を上記「CSV→PDF変換ルール」に従って分類・変換
   - 講師動作指示・セリフのみの行は除外
   - 操作手順を「〜してください」「〜します」の指示形に統一
   - 台本からポイント・注意点・確認事項を抽出し「です・ます調」に変換
   - 変換結果を**Windows 表記のままの構造化データ**として整理（この段階では OS 変換しない）

**Windows 版 PDF 生成:**

4. 上記 3 の構造化データ（Windows 表記のまま）をそのまま使用
5. 事前準備は `practice-{N}-final.md` の §2 をそのまま採用（タスクバー自動非表示・集中モード等）
6. `scripts/generate_practice_pdf.py` で PDF を構築:
   - 表紙（サブタイトル「操作手順ガイド（Windows 版）」）→ 事前準備 → 手順（Phase単位で区切り）→ 振り返り
7. `practice-{N}-guide-win.pdf` として保存

**Mac 版 PDF 生成:**

8. `references/os-conversion-rules.md` を Read（OS 変換マッピング表）
9. 上記 3 の構造化データに対して **OS 変換マッピングを適用**:
   - キーボードショートカット置換（Ctrl → Cmd 等、§2-1 適用）
   - ウィンドウ操作の展開（Windows キー + 矢印 → 3段階フォールバック、§2-2 適用）
   - マウス操作（§2-3、基本的に無変換）
   - ファイルパス置換（`C:\Users\...` → `/Users/...`、§2-5 適用）
   - アプリ名置換（エクスプローラー → Finder 等、§2-6 適用）
10. **変換表に該当しないパターンを検出した場合はユーザー警告**（`os-conversion-rules.md` §1-2 参照）:
    - 検出パターンをリストアップして提示
    - ユーザー回答を得てから PDF 生成を継続（サイレントに誤変換しない）
11. 事前準備セクションを Mac 向けに再構成:
    - タスクバー自動非表示 → Dock 自動非表示
    - 集中モード → おやすみモード
    - **Rectangle.app 推奨インストール**を追加（画面分割操作がある場合）
    - macOS バージョン差注意書き（§5-2 のテンプレ）
12. `scripts/generate_practice_pdf.py` で PDF を構築:
    - 表紙（サブタイトル「操作手順ガイド（Mac 版）」）→ 事前準備（Mac 版）→ 手順（OS 変換済み）→ 振り返り
13. `practice-{N}-guide-mac.pdf` として保存

**ユーザー報告:**

14. 両 PDF 生成完了後、以下のフォーマットで報告:
    ```
    📁 PDF 手順書を2種類生成しました:
      - Windows 版: output/{project}/05_practice/practice-{N}-guide-win.pdf
      - Mac 版:     output/{project}/05_practice/practice-{N}-guide-mac.pdf
    ```
    - Mac 版で変換表外のパターンを検出し処理した場合は、その旨も併記
