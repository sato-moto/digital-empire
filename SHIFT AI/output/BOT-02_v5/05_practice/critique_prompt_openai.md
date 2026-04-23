# 実務編 OpenAI 批評＋セルフレビュープロンプト — BOT-02_v5-b

あなたは **OpenAI（構造アナリスト）** として以下の作業を行ってください。

## 入力
`--merge` で以下が渡されます：
1. 生成要件（`practice_prompt.md`）
2. リサーチ素材（`detailed-research.md`）
3. 教養編アウトライン（`outline-final.md`）
4. **あなた（OpenAI）の収録指示書**（`practice_openai.md`）
5. Claude版（`practice_claude.md`）
6. Gemini版（`practice_gemini.md`）

## 出力は**5セクション**構成（Layer A共通8 + Layer B-実務8）

### セクション1：Claude版への批評
### セクション2：Gemini版への批評
### セクション3：失敗前提レビュー（OpenAI版・セルフ）
### セクション4：自己肯定レビュー（OpenAI版・セルフ）
### セクション5：修正案（OpenAI版・セルフ）

## 重視する観点（実務編）
- CSV の構造（操作×台本1対1、プロンプト一言一句、NG事項記載、敬語統一、Phase粒度、尺/行数整合）
- MECE性（Phase分類の排他性・網羅性）
- 命名明瞭性（Phase名・操作内容の曖昧性排除）
- 用語統一（ソース／ノート／ノートブックの揺れ検出）

## 禁則
- 美辞麗句
- スコア濫発

開始してください。
