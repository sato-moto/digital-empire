# create-course

オンライン講座の教材を、リサーチからスライド・台本まで一気通貫で制作する Claude Code スキル。

3つの AI モデル（Claude / Gemini / OpenAI）を並列に使い、カリキュラム設計 → アウトライン制作 → 品質レビュー → スライド＆台本生成までを自動化します。

## ワークフロー

```
Phase 1  カリキュラム設計
  ├─ カリキュラムリサーチ（3モデル並列 → 統合）
  ├─ カリキュラム構成提案 + ユーザーと壁打ち
  └─ SET選択
         │
Phase 2  講座制作（SET単位でループ）
  ├─ SET前処理（一貫ケース・ストーリー確認）
  ├─ リサーチ（3モデル並列 → 統合）
  ├─ 生成（3モデル並列）
  │   ├─ 教養 → アウトライン
  │   └─ 実務 → 収録指示書（md + csv）
  ├─ 相互批評 → セルフレビュー → マージ
  └─ 51項目品質レビュー + セット整合チェック
         │
  ★ 1SET完了 → 次SET / Phase 3 / 修正 / 終了
         │
Phase 3  スライド構成設計（教養のみ）
  └─ outline-final.md → slide-design.csv / .xlsx
         │
Phase 4  台本 + スライド生成（教養のみ）
  ├─ 台本設計 → script.csv / .xlsx
  └─ スライド生成 → .pptx / .pdf ←── /slide-generator
         │
  ┌──────┴──────┐
  │ 次アクション  │
  ├─ 次のSET    │
  ├─ サムネイル   │←── /thumbnail-designer
  └─ 終了       │
```

> **Note:** 実務講座は収録指示書（md + csv）が最終成果物。Phase 3/4 は通りません。

## 主な機能

- **3モデル並列生成** — Claude・Gemini・OpenAI が同じテーマで独立にリサーチ・アウトライン・収録指示書を生成し、最良の案をマージ
- **SET単位制作** — カリキュラム内のSET（教養+実務のセット）を1つずつ制作し、完了ごとに次のアクションを選択
- **教養/実務の自動分岐** — 教養はアウトライン → スライド → 台本、実務は収録指示書（md + csv）を最終成果物として出力
- **51項目品質レビュー + セット整合チェック** — 教育設計の観点で1項目ずつ検査 + SET間の一貫性を確認
- **スライド + 台本の自動生成** — 教養講座のアウトラインからスライド構成と講師の語り台本を生成
- **サムネイル生成連携** — 完了後に `/thumbnail-designer` を起動してサムネイル画像を自動生成

## 前提条件

- **Python 3.10+**
- **Node.js 18+**
- **Claude Code** がインストール済みであること

## セットアップ

### 自動セットアップ（推奨）

Claude Code で `/create-course セットアップして` と入力すると、対話形式で環境構築を自動実行します。

または、ターミナルから直接実行:

```bash
cd ~/.claude/skills/create-course
bash setup.sh
```

### 手動セットアップ

<details>
<summary>手動で環境構築する場合はこちら</summary>

#### 1. リポジトリをクローン

```bash
cd ~/.claude/skills
git clone https://github.com/community-contents-create/create-course
git clone https://github.com/community-contents-create/slide-generator
git clone https://github.com/community-contents-create/thumbnail-designer
```

#### 2. Python 仮想環境を作成

```bash
cd ~/.claude/skills/create-course
bash setup.sh
```

または手動で:

```bash
cd ~/.claude/skills
python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash)
# source .venv/bin/activate     # Mac/Linux
pip install -r create-course/requirements.txt
```

#### 3. Node.js 依存

```bash
# textlint（create-course 用）
cd ~/.claude/skills/create-course && npm install

# スライド生成（slide-generator 用）
npm install -g pptxgenjs playwright
```

#### 4. フォント

**Noto Sans JP** をインストール（スライド生成で使用）:
https://fonts.google.com/noto/specimen/Noto+Sans+JP

#### 5. API キー

`.env` ファイルを `create-course/` 直下に作成（`.env.example` を参考）：

```
GOOGLE_API_KEY=your-google-api-key
OPENAI_API_KEY=your-openai-api-key
```

> thumbnail-designer は `GOOGLE_API_KEY` のみ使用します。
> slide-generator のスライド生成自体は API キー不要です（図解生成時のみ `GOOGLE_API_KEY` を使用）。

</details>

## 使い方

Claude Code で `/create-course` と入力して起動します。

**2つの開始パターン：**

| パターン | 説明 |
|---------|------|
| **カリキュラム設計から**（Phase 1 →） | カリキュラム全体の構成をリサーチ → 設計 → 壁打ちで作り、その後に個別の講座を制作 |
| **講座制作から**（Phase 2 →） | 既にカリキュラム構成が決まっている場合。必要な情報をヒアリングしてから制作開始 |

## ディレクトリ構成

```
create-course/
├── SKILL.md                    オーケストレーター（スキル定義）
├── README.md                   このファイル
├── .env                        API キー（git管理外）
├── package.json                textlint 依存
├── .claude/
│   ├── rules/                  ポリシー（自動読み込み）
│   │   ├── workflow-routing.md   起動分岐・Phase遷移ルール
│   │   ├── model-roles.md       モデル役割・実行マッピング
│   │   ├── output-naming.md     出力先・ファイル命名規則
│   │   ├── quality-review.md    品質レビュー基準
│   │   └── user-interaction.md  ユーザー対応・メモリ保存
│   └── agents/
│       └── api-caller.md        Gemini+OpenAI API呼び出しエージェント
├── references/                 Phase別詳細仕様
├── guidelines/                 設計ガイドライン
└── scripts/                    API呼び出しスクリプト
    ├── call_parallel.py          Gemini + OpenAI 並列呼び出し
    ├── call_openai.py            OpenAI 単独呼び出し
    └── call_gemini.py            Gemini 単独呼び出し
```

## 出力構造

```
output/{project-name}/
├── 00_course-design/     カリキュラム構成 + リサーチサマリー
├── 01_outline/           教養アウトライン（講座ごとにサブディレクトリ）
├── 02_slide-design/      スライド構成（CSV + Excel）
├── 03_slides/            スライド（PPTX + PDF）
├── 04_script/            台本（CSV + Excel）
└── 05_practice/          実務 収録指示書（md + csv）
```

## 関連スキル

| スキル | 説明 |
|--------|------|
| [thumbnail-designer](../thumbnail-designer/) | アウトラインからサムネイル画像を自動生成（Gemini API） |
| [slide-generator](../slide-generator/) | スライド構成から PPTX + PDF を生成 |
