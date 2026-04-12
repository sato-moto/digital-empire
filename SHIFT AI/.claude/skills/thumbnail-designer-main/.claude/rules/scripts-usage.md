---
description: generate_thumbnails.py / correct_text.py の実行方法・引数・出力仕様
globs:
  - "scripts/**"
---

# スクリプト実行リファレンス

## Phase 6: 画像生成（generate_thumbnails.py）

Phase 5 完了後、確定したプロンプトを Gemini API に投入して2枚のサムネイルを同時生成する。

### 生成仕様

| 種別 | サイズ | 用途 |
|------|--------|------|
| X宣伝用バナー | 1920x1080px | X (Twitter) 投稿用 |
| コース講座サムネイル | 1000x300px | 講座ページ用バナー |

### 実行方法

1. Phase 4 で完成したプロンプトをテキストファイルに保存
2. `scripts/generate_thumbnails.py` を実行

**Phase 6 ではロゴなしで生成する。ロゴ合成は Phase 9 で行う。**
**テキスト（講座名・サブタイトル）はGeminiが直接描画する。`build_prompt_for_spec()` がプロンプトにフォントサイズ（px）を自動追記し、生成ごとのサイズのブレを抑える（基準: 1920px幅で講座名120px Bold / サブタイトル52px Medium、画像幅に比例スケール）。**

```bash
python "$SKILL_DIR/scripts/generate_thumbnails.py" \
  --prompt "{プロンプトファイル}" \
  --output "{出力ディレクトリ}" \
  --reference "$SKILL_DIR/references/sample.png" \
  --env "{.envファイルパス}"
```

※ PILバッジが必要な場合: `--badge "講座名テキスト"`
※ PILでテキストを後から合成（フォールバック用）: `--text-only --title "..." --subtitle "..."`

### 引数

| 引数 | 必須 | 説明 |
|------|------|------|
| `--prompt` | 必須 | プロンプトファイルのパス |
| `--output` | 必須 | 出力ディレクトリ |
| `--reference` | 任意 | リファレンス画像のパス。デザインスタイルのリファレンスとして Gemini API に送信。デフォルトは `references/sample.png` |
| `--title` | 任意 | 講座名テキスト（`--text-only` モード用、PILで固定サイズ描画） |
| `--subtitle` | 任意 | サブタイトルテキスト（`--text-only` モード用） |
| `--accent-text` | 任意 | サブタイトル内で強調するフレーズ（`--text-only` モード用） |
| `--accent-color` | 任意 | アクセントカラー hex（デフォルト: `#FF6B4A`、`--text-only` モード用） |
| `--text-color` | 任意 | テキストカラー hex（デフォルト: `#FFFFFF`、`--text-only` モード用） |
| `--text-only` | 任意 | 既存画像にPILでテキストを合成するフォールバックモード（`*_text.png` で出力） |
| `--logo` | 任意 | ロゴ画像のパス（直接指定。`--logo-color` との併用時はこちらが優先） |
| `--logo-color` | 任意 | `original` / `black` / `white`。`references/` 内の対応ロゴを自動選択（original→`logo.png`, black→`logo_black.png`, white→`logo_white.png`） |
| `--logo-position` | 任意 | ロゴの配置位置: `top-left` / `top-right` / `bottom-left` / `bottom-right`（デフォルト: `top-left`） |
| `--logo-only` | 任意 | 画像の再生成は行わず既存画像にロゴのみ合成する |
| `--logo-target` | 任意 | ロゴ合成対象: `both` / `x_banner` / `course`（デフォルト: `both`） |
| `--logo-offset-y` | 任意 | ロゴのY軸オフセット（px）。負の値で上に移動 |
| `--badge` | 任意 | 講座名バッジのテキスト。PIL で描画（Gemini描画のフォールバック用） |
| `--regen` | 任意 | 再生成モード: 既存画像を `rejected/` に移動してから再生成 |
| `--env` | 任意 | .env ファイルのパス |

### 出力ファイル

| ファイル | 内容 |
|---------|------|
| `x_banner.png` | X宣伝用バナー (1920x1080) |
| `course_thumbnail.png` | コース講座サムネイル (1000x300) |
| `*_response.txt` | Gemini のテキスト応答（あれば） |

### 注意

- 2枚は並列で同時生成される（ThreadPoolExecutor）
- `--reference` を指定すると、リファレンス画像が Gemini API にマルチモーダル入力として送信され、スタイル・雰囲気・レイアウトが参考にされる
- 生成画像はカバーフィット＋中央クロップで指定サイズに調整
- ロゴは `--logo` または `--logo-color` を明示指定した場合のみ PIL で合成（デフォルトはロゴなし）。ロゴ指定時のみ、Gemini プロンプトにロゴ領域の回避指示が自動挿入される
- テキスト（講座名・サブタイトル）はGeminiが直接描画する。`build_prompt_for_spec()` がプロンプトにフォントサイズ（px）を自動追記し、サイズを統一する（基準: 1920px幅で講座名120px Bold / サブタイトル52px Medium、画像幅に比例スケール）
- `--text-only` モード（フォールバック用）: 既存画像にPILで固定サイズのテキストを合成する。`--title` が必須。PILバッジが必要な場合は `--badge` で指定
- API キーは `--env` オプションまたは環境変数 `GOOGLE_API_KEY` で指定

---

## Phase 7: 再生成

Phase 7 の画像品質チェック（→ `.claude/rules/quality-checklist.md`）で問題があった場合、`--regen` フラグ付きで再実行する（1回のみ）。

```bash
python "$SKILL_DIR/scripts/generate_thumbnails.py" \
  --prompt "{プロンプトファイル}" \
  --output "{出力ディレクトリ}" \
  --regen \
  [その他の元と同じオプション]
```

- `--regen` を指定すると、既存画像が自動的に `{出力ディレクトリ}/rejected/` に移動される
- 再生成された画像を最終版として採用する（2回目の再生成は行わない）
- 再生成後も問題がある場合は、そのまま Phase 8 に進み `correct_text.py` で対応する

---

## Phase 8: テキスト検証・修正（correct_text.py）

画像生成後、Claude が生成画像を読み取り、プロンプトで指定したテキストと比較する。
誤字・脱字・文字化けがあれば、Gemini API に元画像＋修正指示を送って文字だけ修正する。

### ワークフロー

1. **読み取り**: Read ツールで生成画像を表示し、画像内のテキストを目視確認する
2. **比較**: Phase 4 で指定したテキスト（講座名・サブタイトル・その他）と照合する
3. **修正指示の作成**: 誤っている箇所ごとに「位置の説明 + 誤テキスト → 正テキスト」をリストアップ
4. **修正実行**: `scripts/correct_text.py` で元画像 + 修正指示を Gemini API に送信
5. **再検証**: 修正後の画像を再度読み取り、テキストが正しいか確認

### 修正ルール

- **最大2回まで修正を試みる**。2回修正しても直らない場合は、そのまま出力し「Canva/Figma でテキスト差し替え推奨」と報告する
- 修正指示は**テキストの変更のみ**。構図・配色・人物などデザイン要素は変更しない
- 修正指示には「デザインやレイアウトは一切変更せず、指定した文字だけを正確に書き換えること」を必ず含める

### 実行方法

```bash
python "$SKILL_DIR/scripts/correct_text.py" \
  --image "{修正対象の画像パス}" \
  --instruction "{修正指示テキスト}" \
  --output "{出力ファイルパス}" \
  --env "{.envファイルパス}"
```

### 修正指示のフォーマット

```
この画像内のテキストを以下の通り修正してください。
デザイン・レイアウト・配色・人物・背景は一切変更せず、文字だけを正確に書き換えてください。

修正1: [位置の説明（例: 画像中央上部の大きな白文字）]
  誤: [現在表示されている誤ったテキスト]
  正: [正しいテキスト]

修正2: [位置の説明]
  誤: [誤ったテキスト]
  正: [正しいテキスト]
```

### 出力ファイル

修正後の画像は元のファイルを上書きする（`x_banner.png` / `course_thumbnail.png`）。
修正前の画像は `*_before_fix.png` としてバックアップされる。
