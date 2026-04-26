# BOT-02 追加リサーチ結果

## 1. NotebookLM 基本スペック（2026年4月時点）

### 無料プラン
- 1ノートブックあたり最大**50ソース**
- 1ソースあたり最大**50万語**（約200MB）
- 1日あたり**50チャット**
- ノートブック数の上限あり（具体的数値は非公開だが十分に作成可能）

### 有料プラン
- NotebookLM Plus（Workspace版）: 1ノートあたり100ソース
- NotebookLM Pro（個人サブスク）: 1ノートあたり300ソース
- Google One AI Premium（月額2,900円）でアクセス可能

### 教育向け拡張（2026年4月13日〜）
- Google Workspace for Education Plus / Teaching and Learning Upgrade 対象者はソース・チャット等の利用上限を拡大

---

## 2. ソース対応形式

NotebookLMに読み込めるソース:
- Googleドキュメント
- Googleスライド
- PDF
- テキストファイル
- Webページ（URL指定）
- YouTube動画（字幕から取得）
- 音声ファイル（文字起こし→テキスト化）
- 画像（OCR対応）

**学生視点での重要ポイント:**
- 授業ノートのスキャン画像（写真）→ OCRで読み取り可能
- 教科書のPDF → そのまま読み込み
- 先生の配布プリント → スキャンorPDFで対応

---

## 3. ハルシネーション抑制の仕組み（グラウンディング）

### 技術的根拠
- **RAG（Retrieval-Augmented Generation / 検索拡張生成）** を採用
- アップロードされたソースのみを検索対象とし、そこから情報を取得して回答を生成
- インターネット上の汎用知識は参照しない（ソース限定モード）

### 引用機能
- 回答には**引用番号**が付与される
- クリックすると、どの資料の何ページ目を根拠としたかが表示される
- 受講者が「本当にこのノートに書いてある？」と自分で検証可能

### 限界
- **完全なハルシネーション排除は不可能**。ソースの解釈・統合過程で誤りが生じる可能性がある
- ソースに書かれていない推論を行う場合がある
- 対策: 質問を具体的にし、引用番号で必ず原文を確認する習慣をつける

**講座設計への示唆:**
骨子では「ハルシネーションが少ない」と記載されているが、「少ない」は正確な表現。「ゼロ」とは言わない。引用検証の習慣をセットで教えることが重要。

---

## 4. Gemini × NotebookLM 連携の現状（2026年4月時点）

### 連携の進化タイムライン
1. **2025年12月**: GemにNotebookLMのノートブックを直接接続可能に
2. **2026年1月**: Google Workspace版GeminiでNotebookLMをソースとして追加可能に
3. **2026年4月8日**: Geminiアプリのサイドバーに「Notebooks」機能導入（NotebookLMの機能をGemini内に直接統合）

### Gem + NotebookLM 連携の仕組み
- Gem作成時にNotebookLMのノートブックを「ナレッジ」として紐付け可能
- 毎回NotebookLMを選択する手間なく、専用アシスタントとして常時利用可能
- 複数のノートブックを同時選択可能

### 無料プランでの利用状況
- **現時点ではGoogle One AI Premiumプラン（月額2,900円）以上が必要**
- 無料ユーザーへの展開は「数週間以内」と発表されているが、具体的日程は未公表
- Gems自体は無料プランでも作成・利用可能だが、NotebookLM連携機能は有料限定の可能性あり

**講座設計への示唆:**
骨子のCh4で「無料プランでは連携機能が制限される場合がある」と言及しているが、2026年4月時点では:
- 正確には「Gem×NotebookLM連携は有料プラン推奨、無料では今後展開予定」
- 代替案:「NotebookLMとGemini（Gems）をそれぞれ別タブで開いて並行利用」は引き続き有効

---

## 5. NotebookLM の教育活用事例（海外含む）

### Google公式が推奨する学生向け活用法
1. **スタディガイド生成**: ソースから短答式・論述式の問題と解答、用語集を自動生成
2. **フラッシュカード作成**: ソースからフラッシュカードを生成し、暗記学習に活用
3. **練習問題生成**: 選択式クイズの自動生成（低リスクな反復テストが学業成績を有意に向上させるという研究結果）
4. **オーディオ概要**: ソースの内容を音声で聞ける（通学中の学習に有効）
5. **FAQ生成**: ソースから「よくある質問と回答」を自動生成

### 大学での活用事例
- 卒業論文のリサーチ整理（複数の学術論文をソースとして読み込み、横断的に質問）
- 講義ノートの復習・試験対策
- ケーススタディの深掘り対話

---

## 6. BOT-01（Gems編）との連携設計に関する知見

### 役割分担の構図（2026年版）
- **Gems**: 「先生の人格・教え方のルール・口調」を定義する ＝ **How to teach**
- **NotebookLM**: 「先生が教える教材・知識の範囲」を定義する ＝ **What to teach**
- **連携**: Gem作成時にNotebookLMノートブックをナレッジ紐付け → 人格＋知識が統合

### 同格関係の表現
- どちらが先でも成立する
- BOT-01を先に見た場合: 「人格はできたけど、この先生に何を教えさせる？→ BOT-02へ」
- BOT-02を先に見た場合: 「教材は持たせたけど、この先生にどう教えさせる？→ BOT-01へ」
- この双方向導線は骨子のCh4で自然に実現可能

---

## 7. 講座設計で注意すべき事実確認ポイント

| 項目 | 要注意点 |
|------|----------|
| ハルシネーション | 「少ない」は正確。「ゼロ」と断言しない。引用検証をセットで教える |
| 無料プラン制限 | 50ソース/50チャット/日。学生には十分だが、テスト期間の集中利用時は注意 |
| Gem連携 | 有料プラン推奨。無料展開は未確定。別タブ並行利用の代替案を必ず併記 |
| ソース形式 | 画像OCRの精度は完璧ではない。手書きノートの場合、鮮明な写真が必要 |
| Deep Research機能 | 2025年11月追加。ソース外のWeb情報も参照する機能。本講座ではソース限定の文脈で使うため、この機能には深入りしない |

---

## ソース一覧

- [NotebookLMヘルプ - アップグレード](https://support.google.com/notebooklm/answer/16213268?hl=ja)
- [NotebookLM無料vs有料の制限（2026年版）](https://office-masui.com/notebooklm-free-vs-paid-limits-2026/)
- [NotebookLMソース上限の仕組み](https://office-masui.com/notebooklm-source-limits/)
- [教育向けNotebookLM利用上限拡大](https://helentech.jp/news-gws-84756/)
- [NotebookLM完全ガイド（2026年版）](https://miralab.co.jp/media/notebooklm/)
- [Gemini×NotebookLM連携解説（2026年版）](https://note.com/ai__worker/n/n60ed5d14b10d)
- [Gem×NotebookLM連携ガイド](https://rutinelabo.com/gem-notebooklm-guide2026/)
- [GeminiにNotebookLM統合 Notebooks機能](https://tech-noisy.com/2026/04/10/gemini-notebooklm-notebooks-integration-2026/)
- [Google公式 - NotebookLM for Students](https://notebooklm.google/students)
- [6 ways to use NotebookLM to master any subject](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-student-features/)
- [NotebookLMハルシネーション対策](https://asukaze.co.jp/notebooklm-hallucination/)
- [NotebookLMハルシネーション抑制の実力](https://office-iolite.com/category4/entry63.html)
- [Gemini/Gems/NotebookLM使い分け](https://www.qes.co.jp/media/google/a762)
