---
name: blog-article
description: >
  熊取つーしん（kumatori-info.com）のWEB記事を制作するスキル。
  KWヒアリング → 構成案 → 本文執筆（HTML） → 品質チェック → ファイル保存 → WP投稿まで一気通貫で行う。
  「記事を書きたい」「記事作って」「ブログ記事書いて」「SEO記事作って」
  「熊取の記事書いて」「記事スキル発動して」と言われたときに使う。
---

# blog-article

熊取つーしん専属ライタースキル。
キーワードを受け取り、SEO最適化されたWEB記事HTMLを生成し、WordPressへ下書き投稿するまでを自動化する。

作業ディレクトリ: `C:/Users/motok/OneDrive/Desktop/Claude code/blog/`

---

## ファイル保存ルール

**確認なしで即保存する。**

- **保存先**: `C:/Users/motok/OneDrive/Desktop/Claude code/blog/articles/`
- **ファイル名**: `XX_[カテゴリ英字]_[スラッグ].html`
  - XX = 既存記事の最大番号 + 1（現在51が最大 → 次は52）
  - 実行前に `articles/` フォルダをGlobして最大番号を確認すること
- **既存ファイルは絶対に上書きしない**

---

## Phase 0: Context Loading

以下を順番に読み込む。

1. `C:/Users/motok/OneDrive/Desktop/Claude code/blog/CLAUDE.md`
2. `C:/Users/motok/OneDrive/Desktop/Claude code/blog/writing-research-rules.md`
3. `C:/Users/motok/OneDrive/Desktop/Claude code/blog/.claude/rules/article-rules.md`

---

## Phase 1: ヒアリング

以下をユーザーに確認する。まとめて1回で聞く。

```
記事制作を開始します。以下を教えてください。

1. ターゲットKW（例: 熊取 ランチ おすすめ）
2. 記事のネタ・背景情報（知っていること・取材メモ・SNS情報など）
3. カテゴリ（下記から選択）
   - グルメ・飲食店
   - 観光・おでかけ
   - 暮らし・住まい
   - 子育て・教育
   - イベント・祭り
   - 歴史・文化
   - 自然・アウトドア
4. 既存の内部リンク候補（任意。なければこちらで選定）
```

ユーザーが「任せる」と言った場合：カテゴリ・内部リンクはこちらで判断して進める。

---

## Phase 2: 構成案の作成

writing-research-rules.md の Phase 1〜5 に従い、以下を出力する。

### KW設計メモ（簡略版）

```
## KW設計
- メインKW: [KW]
- 共起語候補: [3〜5語]
- 検索意図: [Know / Do / Go / Buy]
- ペルソナ: [1文で]
```

### 構成案

```
【タイトル】[32文字以内・KW前方配置・数字or感情ワード入り]
【SEOタイトル】[30文字前後]
【メタディスクリプション】[80文字以内]
【スラッグ】[英小文字・ハイフン区切り]
【フォーカスKW】[メインKW]

■ リード文の方針（150〜200文字）

■ h2: [セクション1]
  └ h3: [サブ]
  └ h3: [サブ]

■ h2: [セクション2]
  └ h3: [サブ]
  └ h3: [サブ]

■ h2: [セクション3]
  └ h3: [サブ]

■ h2: まとめ

■ 内部リンク候補: [2〜3本]
■ 外部リンク候補: [1本以上]
```

構成案を出力したあと、**ユーザーの確認を待たずに即Phase 3へ進む**。

---

## Phase 3: 本文執筆（HTML生成）

writing-research-rules.md の Phase 6 に従い、完全なHTMLファイルを生成する。

### 出力フォーマット

```html
<!-- META:
{
  "title": "記事タイトル",
  "seo_title": "SEOタイトル（30文字前後）",
  "meta_description": "メタディスクリプション（80文字以内）",
  "slug": "url-slug-here",
  "category": "カテゴリ名",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "focus_keyword": "フォーカスKW",
  "article_number": XX,
  "last_updated": "YYYY-MM"
}
-->

<h1>記事タイトル</h1>

<p>リード文...</p>

<!-- 目次 -->
<nav>
<h2>目次</h2>
<ul>
  <li><a href="#section1">セクション1</a></li>
</ul>
</nav>

<!-- 本文 -->

<!-- まとめ -->
<h2>まとめ</h2>

<!-- 関連記事 -->
<div class="related-articles">
<h3>関連記事</h3>
<ul>
  <li><a href="/内部リンク先/">記事タイトル</a></li>
</ul>
</div>
```

### 執筆の絶対ルール

- 文字数：2,500〜3,500文字（目標3,000文字）
- 冒頭1〜2段落にフォーカスKWの全語を自然に含める
- フォーカスKWを本文中に7回以上登場させる（見出し含む）
- 全h2にフォーカスKWまたは類義語を含める
- 一文は60文字以内
- 一段落は3〜4行まで
- **AI感ワード禁止**：「〜することが重要です」「〜が求められます」「〜を活用しましょう」「〜してみましょう」
- 内部リンク2〜3本・外部リンク1本以上
- 店舗・人物のSNS公式アカウントがあれば必ずaタグでリンク化

---

## Phase 4: 品質チェック（自動実行）

HTML生成後、自己チェックして問題があれば即修正する。ユーザーへの確認不要。

### Yoast緑化チェック
- [ ] SEOタイトルが30文字前後
- [ ] メタディスクリプションが80文字以内
- [ ] 冒頭1〜2段落にフォーカスKWの全語が含まれている
- [ ] フォーカスKWが本文中に7回以上登場している
- [ ] 全h2にフォーカスKWまたは類義語が含まれている
- [ ] 内部リンク1本以上・外部リンク1本以上存在する

### コンテンツ品質チェック
- [ ] 文字数が2,500〜3,500文字の範囲内
- [ ] AI感ワードが含まれていない
- [ ] 不確かな情報（憶測・裏取り未済）が含まれていない
- [ ] h1 → h2 → h3 の階層が正しい

---

## Phase 4.5: 制作ログの生成

Phase 4完了後、以下の3項目を自然言語で生成する。これをPhase 5のNotionへの書き込みに使う。

### SEO戦略メモ
- 選んだフォーカスKWの理由
- 狙った検索意図・ペルソナ
- 内部リンクの設計意図
- 競合との差別化ポイント

### 品質チェック結果
Phase 4の各チェック項目の結果を列挙する。
修正した箇所があれば「→修正済み」と記載。形式例：
`SEOタイトルXX文字✅ / メタディスクリプションXX文字✅ / KW出現X回✅ / h2KW含有（修正済み）✅ / 内部X本+外部X本✅ / 文字数約X,XXX字✅`

### 未修正改善案
チェックで検出したが修正しなかった項目と理由。例：
- ファクト確認が取れていない情報 → 公開前にマスターが確認
- 写真・画像が不足 → 素材なしのため未対応
- 問題なければ「なし」と記載

---

## Phase 5: ファイル保存 → アイキャッチ生成 → WP投稿 → Notion登録

### カテゴリ英字の対応表

| カテゴリ | 英字 |
|---------|------|
| グルメ・飲食店 | gourmet |
| 観光・おでかけ | tourism |
| 暮らし・住まい | living |
| 子育て・教育 | parenting |
| イベント・祭り | event |
| 歴史・文化 | history |
| 自然・アウトドア | nature |

### Step 1: ファイル保存

HTMLをファイルに書き込む（Writeツール使用）。

### Step 2: アイキャッチ画像生成

```bash
cd "C:/Users/motok/OneDrive/Desktop/Claude code/blog" && node generate-eyecatch.js articles/XX_xxx.html
```

生成完了まで待つ（数分かかる場合あり）。

### Step 3: WordPress下書き投稿

```bash
cd "C:/Users/motok/OneDrive/Desktop/Claude code/blog" && node wp-auto-post.js articles/XX_xxx.html
```

投稿ステータスは常に **draft（下書き）**。公開（publish）は絶対に行わない。

### Step 4: Notion管理台帳に登録

`C:/Users/motok/OneDrive/Desktop/Claude code/blog/notion-config.json` を読み込み、以下をNotion APIで実行する。

```bash
cd "C:/Users/motok/OneDrive/Desktop/Claude code/blog" && node -e "
const https=require('https'),fs=require('fs');
const cfg=JSON.parse(fs.readFileSync('notion-config.json','utf8'));
const TOKEN=cfg.token;
const DB_ID='33d18b0b-fabc-8185-8a34-dd07907b22b5';
// ※ meta・seo・check・unfix は各記事の値に置き換えて実行
"
```

登録する項目：
- タイトル / 記事番号 / カテゴリ / フォーカスKW / タグ / 公開URL / 最終更新 / スラッグ
- **SEO戦略メモ**（Phase 4.5で生成）
- **品質チェック結果**（Phase 4.5で生成）
- **未修正改善案**（Phase 4.5で生成）
- **公開ステータス**: 「下書き」で固定

実際には `notion-sync.js` を拡張せず、インラインNode.jsで1件だけ追加登録する。

### Step 5: 公開ステータス一括同期

WP投稿完了後、全記事のステータスをNotionに反映する。

```bash
cd "C:/Users/motok/OneDrive/Desktop/Claude code/blog" && node notion-status-sync.js
```

### Step 6: 完了報告

```
✅ 記事制作完了

- ファイル: articles/XX_xxx.html
- 文字数: 約X,XXX文字
- WP下書き: 投稿済み（ID: XXXX）
- アイキャッチ: images/XX_xxx.png
- Notion: 管理台帳に登録済み
- ステータス同期: 完了（notion-status-sync.js実行済み）

⚠️ WP管理画面での確認事項（マスターが実施）
- [ ] ファクトチェック（営業時間・価格・住所など最新情報の確認）
- [ ] アイキャッチ画像の確認・必要なら差し替え
- [ ] Yoast SEOの緑ランプ確認
- [ ] 公開前の最終レビュー
```

---

## 重要原則

1. **ファクトチェックは人間がやる** — AIは構造と文章を担当。事実の最終確認はマスターが行う
2. **確認より前進** — Phase 2の構成案はユーザー確認を待たず即Phase 3へ進む
3. **下書き投稿のみ** — 公開（publish）は絶対に行わない
4. **既存ファイルは上書きしない** — 実行前にarticles/をGlobして最大番号を確認する
5. **AI感を出さない** — 定型表現・曖昧表現は徹底排除
