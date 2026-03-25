# 熊取つーしん記事制作プロジェクト

このプロジェクトは kumatori-info.com 向けの記事50本を量産するための制作環境です。

## プロジェクト構成

```
kumatori-articles/
├── articles/           # 記事HTML（META JSON埋め込み形式）
├── wp-auto-post.js     # WordPress自動投稿スクリプト
├── wp-config.json      # WP認証情報（※git管理しないこと）
├── production-plan.html # 計画書（50本の記事一覧・SEO戦略）
├── research-report.html # リサーチ結果レポート
├── writing-research-rules.md # ライティングルールブック
└── .claude/            # プロジェクト設定
```

## 記事HTMLフォーマット

全記事は以下のMETAブロック付きHTMLで統一する:

```html
<!-- META:
{
  "title": "記事タイトル",
  "seo_title": "SEOタイトル（30文字前後・Yoast表示幅上限のため厳守）",
  "meta_description": "メタディスクリプション（80文字以内）",
  "slug": "url-slug-here",
  "category": "カテゴリ名",
  "tags": ["タグ1", "タグ2"],
  "focus_keyword": "フォーカスKW",
  "article_number": 1,
  "last_updated": "2026-03"
}
-->
（記事本文HTML）
```

## 自動投稿コマンド

```bash
# 接続テスト
node wp-auto-post.js test

# 1記事を下書き投稿
node wp-auto-post.js articles/01_gourmet_xxx.html

# 全記事を一括下書き投稿
node wp-auto-post.js
```

## 重要ルール

- 飲食店情報は **3ヶ月以内** の鮮度のみ使用
- 全記事に「熊取」をタイトル・h1に含める
- 文字数は 2,500〜3,500文字（目標3,000文字）
- 内部リンクを2〜3本含める
- Yoast SEO のフォーカスキーワードを必ず設定（mu-plugin `setup-yoast-rest.php` サーバー設置済み・REST API経由で自動設定される）
- 投稿は必ず **draft（下書き）** で行い、WP管理画面で確認後に公開
- 詳細は `writing-research-rules.md` および `.claude/rules/article-rules.md` を参照
