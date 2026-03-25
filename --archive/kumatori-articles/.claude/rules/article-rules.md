# 記事制作ルール

## 記事フォーマット
- 全記事はWordPress直貼用のHTML形式
- 冒頭にMETA JSONブロックを必ず含める（wp-auto-post.js用）
- ファイル命名: `XX_category_article-slug.html`
- 保存先: `articles/` フォルダ

## SEOルール
- 全記事のタイトル・h1に「熊取」を含める
- タイトル: **30文字前後**、KW前方配置、数字 or 感情ワード（Yoast表示幅上限のため32文字超禁止）
- メタディスクリプション: **80文字以内**（Yoastの「長すぎる」警告回避）
- 見出し: h1 → h2 → h3 の階層厳守
- 文字数: 2,500〜3,500文字（目標3,000文字）
- 内部リンク: 2〜3本（既存記事 or カテゴリページへのリンク）
- 外部リンク: **1本以上**（Googleマップ・食べログ・公式サイト等）
- 画像ALT: KWを含む
- FAQ記事: FAQスキーマ付与
- Yoast SEO フォーカスKW: 必ず設定

## Yoast SEO 緑化チェックリスト（投稿前に確認）
- [ ] SEOタイトルが30文字前後（Yoast表示幅ゲージが緑）
- [ ] メタディスクリプションが80文字以内
- [ ] **冒頭1〜2段落**にフォーカスKWの全語を自然に含める
- [ ] フォーカスKWが本文中に**7回以上**登場（見出し含む）
- [ ] **全H2にフォーカスKWまたは類義語**を含める（例:「熊取のおすすめ〇〇ランチ」）
- [ ] 内部リンク＋外部リンクが各1本以上存在する

## SNS・公式アカウントのリンク掲載ルール
- 店舗・人物・団体のInstagram・X（旧Twitter）・公式サイト等を情報源として紹介・引用した場合、**必ずそのアカウントへのリンクを本文中に貼る**
- アカウント名（@〇〇）を文章内に記載するだけでなく、`<a href="https://www.instagram.com/〇〇/" target="_blank" rel="noopener noreferrer">` でリンク化すること
- 公式サイトが存在する場合も同様にリンクを付与する
- 例: `<a href="https://www.instagram.com/account_name/" target="_blank" rel="noopener noreferrer">Instagram（@account_name）</a>`

## ファクトチェック基準
- 飲食店の営業情報: 3ヶ月以内
- 開店・閉店情報: 1ヶ月以内
- イベント日程: 当年の公式発表
- 行政制度: 1年以内 + 公式サイト確認
- 歴史・文化: 3年以内OK
- SNS情報: 6ヶ月以内、最低2ソースで裏取り

## E-E-A-T方針
- Experience: 体験ベースの表現
- Expertise: 正確なデータ引用・公式ソース明記
- Authority: 著者プロフィール・取材実績
- Trust: 情報源明記・最終更新日記載

## カテゴリ一覧（WPカテゴリ名）
- グルメ・飲食店（12本）
- 観光・おでかけ（8本）
- 暮らし・住まい（8本）
- 子育て・教育（7本）
- イベント・祭り（7本）
- 歴史・文化（4本）
- 自然・アウトドア（4本）

## アイキャッチ画像の生成・設定ルール（必須）

記事をWordPressに投稿する際は、**必ず以下のプロセスでAI生成画像をアイキャッチとして設定すること**。既存の写真を検索・流用することは禁止。

### Step 1: AI画像を生成する
```bash
node generate-eyecatch.js articles/XX_xxx.html
```
- `generate-eyecatch.js` の `PROMPT_MAP` に記事スラグ対応のプロンプトが定義済み
- **Stable Horde API**（匿名キー・無料）を使用してAI画像を生成
- 生成に数分かかる場合あり（匿名キーはキュー優先度が低い）
- 出力先: `images/XX_xxx.html` に対応した `images/XX_xxx.png`

### Step 2: wp-auto-post.js で投稿（画像を自動添付）
```bash
node wp-auto-post.js articles/XX_xxx.html
```
- `images/` フォルダに同名の画像ファイルが存在する場合、自動でアイキャッチとして設定される

### Step 3: 画像を差し替える場合
既存画像を削除してから再生成する：
```bash
rm images/XX_xxx.png
node generate-eyecatch.js articles/XX_xxx.html
node wp-auto-post.js update <WP投稿ID> articles/XX_xxx.html
```

### プロンプトのカスタマイズ
新しい記事スラグを追加した場合は `generate-eyecatch.js` の `PROMPT_MAP` に対応プロンプトを追加すること。

### 備考
- Pollinations.ai は2026年3月時点でバックエンド障害のため使用不可
- 生成画像サイズ: 1024×640px（横長・アイキャッチに最適）

## WordPress自動投稿
- スクリプト: `wp-auto-post.js`
- 設定: `wp-config.json`（認証情報含む、git管理禁止）
- 投稿ステータス: 常にdraft（下書き）
- Yoast SEO対応: title, metadesc, focuskw を自動設定（mu-plugin `setup-yoast-rest.php` がサーバー側で必要・設定済み）
- カテゴリ・タグ: 未存在なら自動作成
- **H1除去**: `wp-auto-post.js` は投稿時にHTMLBody先頭のH1を自動除去（WPがタイトルを別途表示するため重複防止済み）

## マップ埋め込みパターン（エリア系記事向け）
エリアガイド・観光記事でGoogleマップを埋め込む場合は以下のiframeを使用（APIキー不要）:

```html
<div style="margin:24px 0;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
  <iframe
    src="https://maps.google.com/maps?q=熊取町+大阪府+【検索KW】&output=embed&z=14&hl=ja"
    width="100%" height="420"
    style="border:0;display:block;"
    allowfullscreen loading="lazy"
    title="熊取町【テーマ】マップ">
  </iframe>
</div>
<p style="font-size:0.85em;color:#666;margin-top:-12px;margin-bottom:24px;">※地図はGoogleマップの検索結果を表示しています。</p>
```

## 制作バッチ順（優先度順）
1. バッチ1: グルメ（12本）← 最優先
2. バッチ2: 観光（8本）← 最優先
3. バッチ3: 暮らし（8本）
4. バッチ4: 子育て（7本）
5. バッチ5: イベント（7本）
6. バッチ6: 歴史+自然（8本）
