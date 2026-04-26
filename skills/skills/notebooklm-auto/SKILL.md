---
name: notebooklm-auto
description: コンテンツをNotebookLMに渡してスライドを自動生成するスキル。デザインや構成ロジックはCUSTOMIZE.mdで設定。「NotebookLMでスライド作って」「NotebookLMでスライド生成して」などのトリガーで使用する。
---

# Skill: NotebookLM Auto Slide Generator

## 使い方

`/notebooklm-auto` と入力する。スライドにしたいコンテンツを用意した状態で実行する（または、CUSTOMIZE.mdに構成ロジックが定義されていれば、テーマを話しかけるだけでOK）。

---

## 実行フロー

### Step 0: デザインルールと構成ロジックの読み込み

以下の2ファイルを読み込む。

**1. 共通デザインルール（必須）**
```bash
cat "$HOME/.claude/skills/shared/slide-design.md"
```
- カラー・フォント・余白・デザイン原則をメモする
- ファイルが存在しない場合はスキップして次へ進む

**2. NB専用設定ファイル（必須）**
```bash
cat "[Base directory]/CUSTOMIZE.md"
```
- **視覚パターン・出力フォーマット**（SECTION 1）をメモする
- **スライド構成ロジック**（SECTION 2）が記載されているか確認する

CUSTOMIZE.mdが存在しない場合: 「CUSTOMIZE.mdが見つかりません。SKILL.mdと同じディレクトリにCUSTOMIZE.mdを作成してください。」と案内して停止する。

---

### Step 1: 前提条件チェック

**notebooklm CLIの確認:**

```bash
which notebooklm 2>/dev/null || echo "NOT_INSTALLED"
```

未インストールの場合、自動でインストールを実行する:

```bash
uv tool install "notebooklm-py[browser]"
```

uvが入っていない場合は先にインストールを案内する:
```
uv が見つかりません。以下のいずれかでインストールしてください:
  brew install uv
  または
  curl -LsSf https://astral.sh/uv/install.sh | sh
完了後に再度 /notebooklm-auto を実行してください。
```

**ログイン状態の確認:**

```bash
notebooklm list 2>&1 | head -3
```

認証エラーが出る場合:
```
以下のコマンドを実行してブラウザで認証してください:
  notebooklm login
完了後に再度 /notebooklm-auto を実行してください。
```

---

### Step 2: コンテンツの準備

**CUSTOMIZE.mdのSECTION 2（スライド構成ロジック）が記載されている場合:**
- そのロジックに従ってスライド構成案を生成する
- 生成結果をユーザーに確認・修正してもらう
- OKが出たらStep 3へ進む

**SECTION 2が空の場合:**
- 直前の会話にコンテンツ（テキスト・構成案など）があればそれを使う
- なければ「スライドにしたい内容を貼り付けてください」と聞く

---

### Step 3: ノートブックの選択

```bash
notebooklm list
```

ユーザーに確認する:
「既存のノートブックに追加しますか？それとも新規作成しますか？」

**新規作成の場合:**
```bash
notebooklm create "[ノートブック名]"
```

**共通:**
```bash
notebooklm use [notebook_id]
```

---

### Step 4: コンテンツをソースとして追加

```bash
cat > /tmp/notebooklm_source.md << 'EOF'
[Step 2で確定したコンテンツ全文]
EOF

notebooklm source add /tmp/notebooklm_source.md --title "[タイトル YYYY-MM-DD]"
```

---

### Step 5: スライド生成

ユーザーに枚数を確認する（デフォルト: 15枚）。

**共通デザインルール（slide-design.md）とNB専用指示（CUSTOMIZE.md SECTION 1）を結合してプロンプトを作成する。**
手動で転記・コピペすると内容が欠落するため禁止。必ずファイルから直接読み込む。

```bash
DESIGN_PATH="$HOME/.claude/skills/shared/slide-design.md"
CUSTOMIZE_PATH="[Base directory]/CUSTOMIZE.md"

# デザインルールを読み込む
DESIGN_RULES=$(cat "$DESIGN_PATH" 2>/dev/null || echo "")

# CUSTOMIZE.md の SECTION 1（NB専用指示）を抽出する
NB_SECTION1=$(awk '/^## SECTION 1/,/^## SECTION 2/' "$CUSTOMIZE_PATH" | grep -v "^## SECTION")

# 枚数指定 + デザインルール + NB専用指示を結合
printf "1枚目から[X]枚目のスライドを作成してください。\n\n【共通デザインルール】\n%s\n\n【NotebookLM生成指示】\n%s" \
  "$DESIGN_RULES" "$NB_SECTION1" > /tmp/design_prompt.txt

# 生成実行
DESCRIPTION=$(cat /tmp/design_prompt.txt)
notebooklm generate slide-deck "$DESCRIPTION" --format presenter --language ja
```

**16枚以上の場合:** 1〜15枚目、16〜XX枚目と分割して複数回実行する（1回の生成上限は15枚）。各バッチで上記コマンドの枚数指定部分だけ変える。

---

### Step 6: 確認 & ダウンロード

```bash
# 生成状況を確認（完了まで数分かかる場合あり）
notebooklm artifact list

# ダウンロード
notebooklm download slide-deck ./slides_[YYYYMMDD].pdf --artifact [artifact_id]
```

カレントディレクトリにPDFが保存されたら完了。

---

## 前提条件まとめ

| 項目 | 確認方法 |
|------|---------|
| uv | `which uv` |
| notebooklm CLI | `which notebooklm` |
| ログイン認証 | `notebooklm list` でエラーが出なければOK |
| slide-design.md | `~/.claude/skills/shared/slide-design.md` に存在すること |
| CUSTOMIZE.md | このSKILL.mdと同じディレクトリに存在すること |

---

## カスタマイズ方法

デザインルールを変更する場合 → `~/.claude/skills/shared/slide-design.md` を編集する
NB専用の視覚パターン・構成ロジックを変更する場合 → `CUSTOMIZE.md` を編集する

| ファイル | 内容 |
|---------|------|
| `shared/slide-design.md` | カラー・フォント・余白・デザイン原則（全スキル共通） |
| `CUSTOMIZE.md` SECTION 1 | NB専用の視覚パターン・出力フォーマット指示 |
| `CUSTOMIZE.md` SECTION 2 | スライド構成ロジック（任意） |
