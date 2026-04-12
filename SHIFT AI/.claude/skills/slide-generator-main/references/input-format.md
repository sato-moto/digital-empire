# Input Format

## Excel (parse_excel.py 経由)

| 列 | 内容 | 備考 |
|----|------|------|
| A (章) | 章番号 | 1始まり。パース時は直接使用しない |
| B (No) | スライド番号 | 1始まり |
| C (Title) | スライドタイトル | `講座名` → cover, `タイトルスライド`/`章タイトルスライド` → chapter |
| D (Body) | 本文テキスト | cover/chapter時: 1行目=タイトル, 2行目=サブタイトル |
| E (Script) | 講師台本 | 任意列。PPTX には含めない (メタデータ) |
| F (Visual Type) | ビジュアルティア | 任意列。`flat` / `diagram` / `character` / 空(自動判定) |

**スライドタイプ判定 (parse_excel.py):**
- 列C が `講座名` → `cover`（先頭行は必ずこれ）
- 列C が `タイトルスライド` または `章タイトルスライド` → `chapter`
- それ以外 → `content`

**ビジュアルティア判定 (generate_diagrams.js):**
- F列に `flat` / `diagram` / `character` → そのまま使用
- F列が空 → 自動判定（デフォルト: `flat`、キーワードヒットで `diagram` に昇格）
- `character` は自動判定しない（意図的配置のため手動指定のみ）

## JSON (slides.json)

```json
{
  "slides": [
    {
      "type": "cover",
      "title": "講座タイトル",
      "subtitle": "- サブタイトル -",
      "body": "",
      "script": "台本テキスト",
      "visual_type": null
    },
    {
      "type": "content",
      "title": "スライドタイトル（主張文）",
      "body": "本文テキスト",
      "script": "台本テキスト",
      "visual_type": "flat"
    },
    {
      "type": "content",
      "title": "AIの仕組みを理解する",
      "body": "本文テキスト",
      "script": "台本テキスト",
      "visual_type": "diagram"
    },
    {
      "type": "content",
      "title": "導入ストーリー",
      "body": "本文テキスト",
      "script": "台本テキスト",
      "visual_type": "character"
    }
  ]
}
```
