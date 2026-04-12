---
description: Phase 9 ロゴ合成の確認手順・実行方法
globs:
  - "scripts/**"
  - "SKILL.md"
---

# Phase 9: ロゴ合成

Phase 8 完了後、最終画像を確認したうえでユーザーにロゴを入れるか確認する。

**原則: Phase 6（画像生成）ではロゴなしで生成する。ロゴ合成は本 Phase で行う。**

## 確認フロー（必ず AskUserQuestion ポップアップで確認する）

Phase 8 完了後、最終画像を Read ツールで表示してからポップアップで確認する。

**確認1: ロゴ合成対象**（AskUserQuestion で選択肢を提示）
- A. 両方に入れる — X宣伝用 + コース講座の両方にロゴ合成
- B. X宣伝用のみ — X宣伝用バナーだけにロゴ合成
- C. 入れない — ロゴなしで完了

**確認2: ロゴカラー**（確認1で A or B を選んだ場合のみ）
- A. 黒（black）
- B. 白（white）
- C. オリジナル（original）

**確認3: 配置位置**（確認2の後に別ポップアップで確認）
- A. 左上
- B. 右上
- C. 左下
- D. 右下

## 実行方法

```bash
python "$SKILL_DIR/scripts/generate_thumbnails.py" \
  --prompt "{プロンプトファイル}" \
  --output "{出力ディレクトリ}" \
  --logo-color {black / white} \
  --logo-position {位置} \
  --logo-only \
  --logo-target {both / x_banner / course} \
  --env "{.envファイルパス}"
```

## 引数

- `--logo-only`: 画像の再生成は行わず既存画像にロゴのみ合成する
- `--logo-color`: `black`（黒ロゴ）/ `white`（白ロゴ）。`references/logo_{color}.png` を自動選択
- `--logo-target`: `both`（両方）/ `x_banner`（X宣伝用のみ）/ `course`（コース講座のみ）。デフォルトは `both`
- `--logo-position`: `top-left` / `top-right` / `bottom-left` / `bottom-right`

## 出力

ロゴ合成後の画像は元ファイルを上書きせず、`*_logo.png` として別ファイルに保存される（例: `x_banner_logo.png`）。
