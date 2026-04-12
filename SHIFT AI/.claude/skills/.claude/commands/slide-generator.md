スライド生成ワークフローを開始する。

以下の手順で実行せよ：

1. まず `slide-generator-main/skill.md` を Read して、ワークフロー全体像を把握する
2. skill.md の指示に従い、入力データ（Excel/CSV/JSON）の有無を確認する
3. 入力データがある場合：
   - `scripts/parse_excel.py` でJSON変換
   - `scripts/generate_slides.js` でPPTX生成
   - `scripts/convert_pdf.py` でPDF変換
4. 入力データがない場合：
   - ユーザーにスライドの内容・構成をヒアリングする
   - 入力データを生成してからスライド生成フローに入る
5. `references/` の設計仕様・テンプレートに準拠する

スキルルート: slide-generator-main/
