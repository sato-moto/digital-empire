---
description: 指定URLやキーワードで市場調査・スクレイピング・HTMLレポート生成を実行するコマンド
---

# /research コマンド

指定したURL・キーワード・プラットフォームのデータを収集・分析し、HTMLレポートを生成します。

## 手順

1. **対象の確認**
   - ターゲットURL / キーワード / プラットフォーム名を受け取る
   - 取得件数の目標を確認（デフォルト：300件）

2. **スクレイピング**
   - 通常サイト：WebFetch または node.js スクリプトで取得
   - SPA（Vue.js/React等）：Puppeteer + system Chrome でDOMスクレイプ
   - 出力：JSON + BOM付きUTF-8 CSV

3. **データ分析**
   - 頻出キーワード・価格帯・レビュー数の統計
   - 市場インサイト（最低6点）を抽出

4. **タイトル・コンテンツ提案**
   - 分析結果をもとに10案を型別・理由付きで構造化

5. **HTMLレポート生成**
   - `ranking.html`：ダークUI・ランキングカード
   - `analysis.html`：白背景モダン・コンサルレポート風

6. **ブラウザで開く**

## 保存先

```
C:\Users\motok\OneDrive\Desktop\Claude code\research\channels\[チャンネル名]\
```

## 使用例

```
/research Brain Market AI人気ランキング TOP300
/research note 熊取町 人気記事調査
/research YouTube 地方創生 動画トレンド
```
