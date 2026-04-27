---
description: 記事HTMLを作成してWordPressに自動投稿するワークフロー
---

# 記事制作・自動投稿ワークフロー

## 前提条件
- `wp-config.json` が設定済み
- `node` コマンドが使用可能
- `wp-auto-post.js` が最新

## ワークフロー

### 1. 記事HTMLを作成

`articles/` フォルダ内に以下の形式で作成:

```
ファイル名: XX_category_article-slug.html
例: 01_gourmet_kumatori-lunch-osusume.html
```

冒頭に必ずMETAブロックを付与:
```html
<!-- META:
{
  "title": "記事タイトル",
  "seo_title": "SEOタイトル",
  "meta_description": "メタディスクリプション（120文字）",
  "slug": "url-slug",
  "category": "カテゴリ名",
  "tags": ["タグ1", "タグ2"],
  "focus_keyword": "フォーカスKW",
  "article_number": 1,
  "last_updated": "2026-03"
}
-->
```

### 2. SEOチェック（記事本文・Yoast緑化基準）
- [ ] seo_title が **30文字前後**（Yoastの表示幅上限）
- [ ] meta_description が **80文字以内**
- [ ] **冒頭1〜2段落**にフォーカスKWの全語を自然に含める
- [ ] フォーカスKWが本文中に **7回以上**（見出し含む）
- [ ] **全H2にフォーカスKWまたは類義語**を含める
- [ ] 内部リンク 1本以上 ＋ 外部リンク 1本以上
- [ ] h1 → h2 → h3 の見出し階層
- [ ] 文字数 2,500〜3,500文字
- [ ] 画像ALTにKW含む

### 3. 下書き投稿（1記事）
// turbo
```bash
node wp-auto-post.js articles/XX_category_slug.html
```

### 4. 全記事一括投稿
```bash
node wp-auto-post.js
```

### 5. WordPress管理画面で確認
- 投稿 → 下書き一覧 で内容確認
- Yoast SEOのスコアチェック
- プレビューで表示確認
- 問題なければ「公開」

## 注意事項
- 投稿は常に `draft`（下書き）で実行される
- 同じ記事を2回投稿すると重複するので注意（重複した場合は古い方をREST APIで削除してから再投稿）
- カテゴリ・タグは自動作成される
- Yoast SEOのメタ情報も自動設定される（`setup-yoast-rest.php` mu-plugin が前提・サーバー設置済み）
- **H1はwp-auto-post.jsが自動除去**するため、記事HTMLのH1は残しておいてよい

## 既存投稿の修正 vs 削除＆再投稿
| 状況 | 対応 |
|------|------|
| 本文の一部だけ修正 | REST APIで`POST /posts/{id}`（content更新） |
| Yoast SEOのみ修正 | REST APIで`POST /posts/{id}`（metaのみ更新） |
| タイトル重複・構造的な問題 | **削除（`?force=true`）→ 再投稿**が確実 |

削除コマンド:
```bash
node -e "
const https=require('https'),config=JSON.parse(require('fs').readFileSync('wp-config.json','utf8'));
const auth=Buffer.from(config.username+':'+config.app_password).toString('base64');
const req=https.request({hostname:'kumatori-info.com',path:'/wp-json/wp/v2/posts/{POST_ID}?force=true',method:'DELETE',headers:{'Authorization':'Basic '+auth}},res=>{let b='';res.on('data',d=>b+=d);res.on('end',()=>console.log(JSON.parse(b).deleted?'✅ 削除成功':'失敗',b))});
req.on('error',console.error);req.end();
"
```
