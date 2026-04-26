# 出力フォーマット選択ロジック

スライド系スキル共通の出力フォーマット選択・生成手順。
real-event-slides・webinar-event-slides など、スライドを作るスキルはすべてこれを参照する。

**保存先フォルダは各スキルのSKILL.mdに定義されたパスを使うこと。**

---

## フォーマット選択

コンテンツのレビュー・修正が完了したら、以下を提示してユーザーに選択してもらう。

```
スライドをどの形式で出力しますか？

1. NotebookLM（PDF形式・SHIFT AIデザインで自動生成）
2. HTML（ブラウザで開けるスライド）
3. PowerPoint（.pptxファイルを直接生成）
```

---

## 選択1: NotebookLM

### 手順

1. 完成したスライド全内容を以下の形式に整形する

```markdown
# [タイトル] スライドコンテンツ

## 全体概要
- タイトル：
- 日時：
- 伝えたいメッセージ：

## 各スライドの内容

### No.1：[スライド名]
表示内容：（スライドに書くテキスト）
話す内容：（登壇者・講師が話す内容）

### No.2：...
（以下、全スライド分）
```

2. 整形後、**notebooklm-autoスキルを発火させる**
   - notebooklm-autoのStep 2で「直前の会話にコンテンツがある」として処理される

3. 整形したコンテンツを `[保存先フォルダ]/YYYY-MM-DD_[タイトル略称]_NB用.md` に保存する

---

## 選択2: HTML

### 手順

1. `~/.claude/skills/shared/slide-design.md` を読み込み、デザインルールを適用する
2. 完成したスライドコンテンツをもとに **HTMLスライドを1ファイルで生成する**

### 適用するデザイン仕様（slide-design.mdより）

- フォント: Noto Sans JP
- 文字色: #333333 / アクセントカラー: #A51E6D
- スライドサイズ: 1920 × 1080px（16:9）
- パディング: 上下左右 80px（テキスト配置禁止エリア）
- ヘッダーバンド: 高さ120px・グラデーション（#FF5757 → #8C52FF）・タイトル32px
- フォントサイズ: 最小24px・サイズ・余白はすべて8の倍数
- 行間: 1.4
- 1スライド1メッセージ・詰め込まない

### HTML構成ルール

- キーボード矢印キー（← →）でスライド送りができるようにする
- 全スライドを1つの `.html` ファイルに収める
- Google Fonts から Noto Sans JP を読み込む

### 保存先

`[保存先フォルダ]/YYYY-MM-DD_[タイトル略称].html`

---

## 選択3: PowerPoint（.pptx直接生成）

### 前提

- `python-pptx`（v1.0.2）がインストール済みであること
- `~/.claude/skills/shared/slide_template.pptx` にデザイン参照用のPPTXを配置すること
  - このファイルが存在しない場合はSHIFT AIカラー（`#FF5757`→`#8C52FF` グラデーション）をデフォルトとして使用する

### 手順

1. **デザイン参照用PPTXを読み込む**
   - `~/.claude/skills/shared/slide_template.pptx` を開いて以下を確認する
     - タイトルスライドのレイアウト・フォント・カラー
     - 本文スライドのレイアウト（タイトル位置・本文エリア）
     - ヘッダーバンドのデザイン（グラデーション適用有無）
     - 背景色・アクセントカラー
   - 確認したデザイン要素をPythonスクリプトに反映する

2. **Pythonスクリプトを生成する**
   - `[保存先フォルダ]/generate_pptx.py` としてスクリプトを生成する
   - スクリプトの要件：
     - `python-pptx` で各スライドを生成する
     - スライドサイズ: 16:9（幅13.33インチ × 高さ7.5インチ）
     - ヘッダーバンドのグラデーションは `lxml` でXML直接操作（`a:gradFill` を `p:spPr` に挿入）で実現する
     - pptx-template.pptxで確認したカラー・フォント・レイアウトを忠実に再現する
     - 話者ノートを各スライドに設定する
   - スクリプト内のコメントはすべて日本語で記載する

3. **スクリプトを実行して.pptxを生成する**
   - `python3 [保存先フォルダ]/generate_pptx.py` を実行する
   - 生成後、ファイルが正しく作成されたか確認する

### 保存先

- スクリプト: `[保存先フォルダ]/generate_pptx.py`
- 生成PPTX: `[保存先フォルダ]/YYYY-MM-DD_[タイトル略称].pptx`

### グラデーション適用のXML操作（lxml）

ヘッダーバンド等にグラデーションを適用する場合は以下のパターンを使用する。

```python
from lxml import etree

def apply_gradient(shape, color_start, color_stop):
    """シェイプにグラデーション塗りを適用する（lxmlでXML直接操作）"""
    p_ns = "http://schemas.openxmlformats.org/presentationml/2006/main"
    a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
    sp = shape._element
    spPr = sp.find(f"{{{p_ns}}}spPr")
    if spPr is None:
        spPr = sp.find(f"{{{a_ns}}}spPr")

    # 既存の塗り設定を削除
    for tag in ["solidFill", "gradFill", "noFill"]:
        el = spPr.find(f"{{{a_ns}}}{tag}")
        if el is not None:
            spPr.remove(el)

    # gradFillを挿入
    grad_xml = f"""<a:gradFill xmlns:a="{a_ns}">
      <a:gsLst>
        <a:gs pos="0"><a:srgbClr val="{color_start}"/></a:gs>
        <a:gs pos="100000"><a:srgbClr val="{color_stop}"/></a:gs>
      </a:gsLst>
      <a:lin ang="5400000" scaled="0"/>
    </a:gradFill>"""
    grad_el = etree.fromstring(grad_xml)
    spPr.insert(0, grad_el)
```

---

## 保存後の共通処理

- 保存完了後「〇〇に保存しました」と報告する
- 次のPhase（確認事項の提示）へ進む
