# yuniko — AI動画・記事・リサーチ 自動化エージェント

## プロジェクト概要

AI動画制作・記事生成・市場リサーチの全プロセスをAIエージェントで自動化するプロジェクト。
台本からナレーション・字幕・画像・動画編集、さらにWebスクレイピングによる市場データ収集まで一気通貫で対応する。

## 技術スタック

- **ランタイム**: Node.js (CommonJS)
- **動画フレームワーク**: Remotion
- **スクレイピング**: Puppeteer（SPA対応・system Chrome使用）
- **AIエージェント**: Claude Code
- **音声生成**: 音声API（カスタム音声クローン対応）
- **画像生成**: 画像生成API

## ディレクトリ構造

```
yuniko/
├── CLAUDE.md              # このファイル
├── package.json
├── .claude/               # Claude Code設定
│   ├── settings.json
│   ├── commands/          # カスタムスラッシュコマンド
│   │   ├── create-article.md
│   │   ├── create-video.md
│   │   └── research.md    # 市場調査・スクレイピング
│   ├── rules/             # プロジェクトルール（自動判定ロジック含む）
│   ├── skills/            # スキル定義
│   └── agents/            # サブエージェント定義
│       ├── article-creator.md
│       ├── video-creator.md
│       └── researcher.md  # 市場調査・HTML可視化
└── 参考記事/               # 参考資料

research/channels/[チャンネル名]/   # スクレイピング出力先
├── scraper.js             # スクレイピングスクリプト
├── [name]_ranking.json    # 収集データ（全件）
├── [name]_ranking.csv     # 収集データ（CSV）
├── ranking.html           # ランキング可視化（ダーク）
└── analysis.html          # 市場分析レポート（白背景）
```

## コーディング規約

- **言語**: JavaScript (CommonJS)
- **コミュニケーション**: 日本語
- **命名規則**: キャメルケース（変数・関数）、パスカルケース（Remotionコンポーネント）
- **エラーハンドリング**: try-catchで適切にエラーを捕捉し、日本語のエラーメッセージを出力

## 動画制作フロー

1. 対話形式で動画の目的・内容・スタイルを確認
2. 台本を生成（またはユーザー提供の台本を使用）
3. ナレーション音声を生成（またはユーザー提供の音声を使用）
4. 字幕を生成
5. 画像を生成（またはユーザー提供の画像を使用）
6. Remotionで動画を編集・レンダリング
7. 完成動画のタイトル案を提示
8. 通し番号と一覧HTMLで管理

## スタイルテンプレート

30種類のスタイルテンプレートを用意（ピクセルアート、アニメ風、シネマティック等）。
詳細は `.claude/skills/remotion-video/SKILL.md` を参照。

## リサーチ・データ可視化フロー

1. `/research` コマンドまたは「調査して」で `researcher` エージェントを起動
2. 対象URL・キーワード・取得件数を確認
3. Puppeteer（SPA対応）またはHTTP requestでデータ収集
4. JSON + CSV形式で保存
5. 市場インサイト分析（6点以上）を抽出
6. `ranking.html`（ダーク）+ `analysis.html`（白背景モダン）を生成
7. タイトル案・コンテンツ提案10案を型別・理由付きで出力

## HTMLレポートデザイン規則

| 用途 | スタイル |
|------|---------|
| ランキング一覧 (`ranking.html`) | ダーク背景・カード型・グロー効果 |
| 市場分析 (`analysis.html`) | 白背景・モダン・コンサルレポート風 |
| ワークスペース図解 | ダーク背景・Mermaid.js図解・キャラクター演出 |

## Puppeteer スクレイピング注意事項

- **SPA判定**: WebFetchで中身が取れない場合はSPA → Puppeteer に自動切替
- **Chrome**: `C:\Program Files\Google\Chrome\Application\chrome.exe` を `executablePath` に指定
- **タイムアウト**: `networkidle2` が失敗した場合 `domcontentloaded` + 3秒 sleep でフォールバック
- **重複排除**: URLまたはタイトル前25文字をキーにしたSetで重複を排除
- **package.json**: 日本語フォルダ名はnpm initがエラーになるため手動作成（name は英数字のみ）
