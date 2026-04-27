# MATH-M-01 スライド構成案（デフォルト仕様準拠版）

- **講座ID**: MATH-M-01
- **総スライド数**: 31枚
- **形式**: PPTX（slide-generator-main準拠）
- **講師キャラクター**: Shifuko
- **作成日**: 2026-04-11

---

## 準拠デザイン仕様（変更禁止）

`SHIFT AI/.claude/skills/slide-generator-main/references/design-system.md` に完全準拠。

| 項目 | 値 |
|---|---|
| フォント | Noto Sans JP |
| アクセントカラー | #A51E6D（マゼンタ） |
| テキストカラー | #333333 |
| スライドサイズ | 720×405pt（16:9） |
| グリッド | 8の倍数 |
| フッター禁止エリア | y≧296pt |
| 背景（cover） | `assets/cover.png`（先頭1枚のみ） |
| 背景（chapter） | `assets/chapter.png` |
| 背景（content） | `assets/temp.png` |
| 講師名 | Shifuko（左下縦書き） |

### ビジュアルティア配分
- **Tier1 Flat（80%）**：シェイプ・矢印・ボックスのみ。標準スライドのほとんどがこれ
- **Tier2 Diagram（15%）**：詳細インフォグラフィック（S12, S19, S24など核心スライドに限定）
- **Tier3 Character（5%）**：Shifukoキャラ画像使用（S1カバー、S27メッセージスライドなど導入・感情補助）

---

## Ch0：オープニング（1分／3枚）

### Slide 1：cover（0:00〜0:15）
- **type**: cover
- **title（D列1行目）**: 数学の仕組みをAIで理解する独学法を30分でマスター
- **subtitle（D列2行目）**: ─ 意味もわからず公式を覚える時代は終わった ─
- **背景**: cover.png
- **tier**: character（cover.png内にShifuko配置想定）
- **尺**: 15秒

### Slide 2：content ─ フック（0:15〜0:35）
- **type**: content
- **title**: 数学が苦手なのは、お前のせいじゃない。
- **body**: 意味を考えずに公式を暗記させられてきた、それだけだ。
- **tier**: flat（×マーク＋「公式暗記」のテキストボックス）
- **尺**: 20秒

### Slide 3：content ─ ゴール提示（0:35〜1:00）
- **type**: content
- **title**: 30分後、お前はAIに"何を聞けばいいか"を自力で判断できる。
- **body**: 手は貸さない。だが、走り方は全部教える。
- **tier**: flat（矢印で「今→30分後」）
- **尺**: 25秒

---

## Ch1：座学（7分／10枚）

### Slide 4：chapter ─ Ch1タイトル（1:00〜1:10）
- **type**: chapter
- **title（D列1行目）**: Ch1：AIを"専属コーチ"に変える思考法
- **subtitle（D列2行目）**: ─ 座学パート ─
- **背景**: chapter.png

### Slide 5：content（1:10〜2:00）
- **type**: content
- **title**: 苦手の原因は、たった1つ。
- **body**: 意味もわからず、公式だけ暗記してきたこと。
- **tier**: flat
- **尺**: 50秒

### Slide 6：content（2:00〜2:40）
- **type**: content
- **title**: 暗記した人間と、意味で理解した人間の差
- **body**: y=ax+b ─ "aは傾き"と覚えた者 vs "aは変化の速さ"と理解した者
- **tier**: diagram（左右2カラム比較、Before→After型）
- **尺**: 40秒

### Slide 7：content（2:40〜3:00）
- **type**: content
- **title**: わからない → 質問できない → 諦める
- **body**: この負のループを断ち切るのが、今日の目的だ。
- **tier**: flat（循環矢印＋×マーク）
- **尺**: 20秒

### Slide 8：content（3:00〜3:50）
- **type**: content
- **title**: AIに"答え"を聞くな。
- **body**: AIは答えを持っているが、それを受け取るだけの者に価値はない。
- **tier**: flat
- **尺**: 50秒

### Slide 9：content（3:50〜4:30）
- **type**: content
- **title**: AIは、納得するまで何度でも説明してくれる壁打ち相手だ。
- **body**: 疲れない、怒らない、嫌な顔もしない。完璧な相棒。
- **tier**: flat（対話イメージの簡易アイコン）
- **尺**: 40秒

### Slide 10：content（4:30〜5:00）
- **type**: content
- **title**: 受講者が自分で思考して、AIに言葉を投げる。
- **body**: これができない者に、このコースは機能しない。
- **tier**: flat（大矢印「人間→AI」）
- **尺**: 30秒

### Slide 11：content（5:00〜5:30）
- **type**: content
- **title**: 計算・関数・図形。それぞれ、問いかけ方が違う。
- **body**: これを知らずにAIを使うのは、鍵穴に違う鍵を差すのと同じだ。
- **tier**: flat（3分野アイコン横並び）
- **尺**: 30秒

### Slide 12：content ─ 【核心スライド】（5:30〜7:30）
- **type**: content
- **title**: 問いかけ方の3分類
- **body**:
  - 計算編＝手順の確認：「なんでこの順番？」
  - 関数編＝可視化の依頼：「グラフで見るとどうなる？」
  - 図形編＝条件整理の壁打ち：「条件、整理して」
- **tier**: diagram（カード並列／3カラム）
- **尺**: 2分

### Slide 13：content（7:30〜8:00）
- **type**: content
- **title**: この3パターンを、今から実演で証明する。
- **body**: 次のチャプターから、画面の向こうで私が動く。
- **tier**: flat（次章への矢印）
- **尺**: 30秒

---

## Ch2：実演チャプター（15分／3枚）【空白・録画差し込み】

### Slide 14：chapter ─ Ch2-A（8:00）
- **type**: chapter
- **title（D列1行目）**: Ch2-A：計算編
- **subtitle（D列2行目）**: ─ 手順の確認をAIに分解させる ─
- **背景**: chapter.png
- **注記**: この後5分間、録画映像を差し込む

### Slide 15：chapter ─ Ch2-B（13:00）
- **type**: chapter
- **title（D列1行目）**: Ch2-B：関数編
- **subtitle（D列2行目）**: ─ グラフで"見える化"させる ─
- **背景**: chapter.png
- **注記**: この後5分間、録画映像を差し込む

### Slide 16：chapter ─ Ch2-C（18:00）
- **type**: chapter
- **title（D列1行目）**: Ch2-C：図形編
- **subtitle（D列2行目）**: ─ 条件を言語化させて整理する ─
- **背景**: chapter.png
- **注記**: この後5分間、録画映像を差し込む

---

## Ch3：成果物生成（4分／6枚）

### Slide 17：chapter ─ Ch3タイトル（23:00〜23:10）
- **type**: chapter
- **title（D列1行目）**: Ch3：記憶定着の決定打
- **subtitle（D列2行目）**: ─ 壁打ちで整理した脳内を"外に出す" ─
- **背景**: chapter.png

### Slide 18：content（23:10〜24:00）
- **type**: content
- **title**: AIとの壁打ちで脳内がクリアになった"この瞬間"こそ、定着の最大チャンス。
- **body**: 復習のためじゃない。思考の痕跡を外に固定するためだ。
- **tier**: flat（脳→ノートの矢印）
- **尺**: 50秒

### Slide 19：content ─ 【最重要1枚】（24:00〜26:00）
- **type**: content
- **title**: 一言打つだけ。選べ、1つだけ。
- **body**:
  - ① Google Keep型：「今日の学びを付箋3枚分（各100文字）に」→ スマホで毎日視界に
  - ② Google ドキュメント型：「今日の会話を授業ノート風に」→ 学校Chromebookで翌日に直結
  - ③ NotebookLM音声概要型：会話を投入→音声概要クリック→通学時間で定着
- **tier**: diagram（カード並列／3カラム）
- **尺**: 2分

### Slide 20：content（26:00〜26:30）
- **type**: content
- **title**: "一言打つだけ"で起動できること。
- **body**: 手数が増えた瞬間、人は続かない。
- **tier**: flat
- **尺**: 30秒

### Slide 21：content（26:30〜26:50）
- **type**: content
- **title**: 全部やるな。1つだけ選べ。
- **body**: 自分の生活に最も無理なく入る型を、1つだけ。
- **tier**: flat（3択→1択イメージ）
- **尺**: 20秒

### Slide 22：content（26:50〜27:00）
- **type**: content
- **title**: これで、お前専用の参考書が毎日手元にある。
- **body**: 次は最終チャプター。
- **tier**: flat
- **尺**: 10秒

---

## Ch4：まとめ＆エール（3分／9枚）

### Slide 23：chapter ─ Ch4タイトル（27:00〜27:10）
- **type**: chapter
- **title（D列1行目）**: Ch4：自走スイッチを起動する
- **subtitle（D列2行目）**: ─ ここからはあなたの番だ ─
- **背景**: chapter.png

### Slide 24：content ─ おさらい（27:10〜28:00）
- **type**: content
- **title**: 今日学んだ3つのこと
- **body**:
  - ① 苦手の原因は「意味を考えずに暗記」したこと
  - ② 分野ごとに問いかけ方が違う（計算・関数・図形）
  - ③ 最後に"一言"で参考書を作れ
- **tier**: diagram（3要点並列）
- **尺**: 50秒

### Slide 25：content ─ 役割分離①（28:00〜28:20）
- **type**: content
- **title**: ここまでが、私の役割。
- **body**: （沈黙）
- **tier**: flat（線引きイメージ）
- **尺**: 20秒

### Slide 26：content ─ 役割分離②（28:20〜28:40）
- **type**: content
- **title**: ここから先は、あなたの仕事です。
- **body**: （沈黙）
- **tier**: flat（線引きイメージ・反対側スポット）
- **尺**: 20秒

### Slide 27：content ─ 役割分離③【強烈メッセージ】（28:40〜29:00）
- **type**: content
- **title**: 真横で走り方は教えました。しかし、絶対に手は貸しません。
- **body**: ─
- **tier**: character（Shifukoの表情込みで強調）
- **尺**: 20秒

### Slide 28：content ─ エール（29:00〜29:20）
- **type**: content
- **title**: 勇気を出して、いってらっしゃい。
- **body**: 何度でも見返せる。迷ったら、再視聴を推奨する。
- **tier**: flat
- **尺**: 20秒

### Slide 29：content ─ CTA①（29:20〜29:35）
- **type**: content
- **title**: 明日、学校の宿題か問題集を開け。
- **body**: 今日の学びを使う場は、そこにある。
- **tier**: flat
- **尺**: 15秒

### Slide 30：content ─ CTA②（29:35〜29:50）
- **type**: content
- **title**: 最初の1問で詰まったら、即座にAIを開け。
- **body**: "問いかけ方の3分類"を、そこで思い出せ。
- **tier**: flat
- **尺**: 15秒

### Slide 31：content ─ エンディング（29:50〜30:00）
- **type**: content
- **title**: それができれば、今日の30分は無駄じゃない。
- **body**: MATH-M-01 ／ 数学の仕組みをAIで理解する独学法
- **tier**: flat（エンドカード）
- **尺**: 10秒

---

## スライド統計

| Ch | 枚数 | タイプ内訳 |
|---|---|---|
| Ch0 | 3枚 | cover×1, content×2 |
| Ch1 | 10枚 | chapter×1, content×9 |
| Ch2 | 3枚 | chapter×3（全て空白） |
| Ch3 | 6枚 | chapter×1, content×5 |
| Ch4 | 9枚 | chapter×1, content×8 |
| **合計** | **31枚** | cover×1, chapter×6, content×24 |

---

## ティア配分の実績

| Tier | スライド | 実数 | 比率 |
|---|---|---|---|
| flat | S2,S3,S5,S7,S8,S9,S10,S11,S13,S18,S20,S21,S22,S25,S26,S28,S29,S30,S31 | 19 | 61% |
| diagram | S6, S12, S19, S24 | 4 | 13% |
| character | S1（cover）, S27 | 2 | 6% |
| chapter（テンプレート背景） | S4,S14,S15,S16,S17,S23 | 6 | 19% |

※ Tier基準は content スライドのみで計算すると flat=79%、diagram=17%、character=4%。設計ガイドライン（80/15/5）にほぼ準拠。
