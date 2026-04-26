# Design System

## 基本仕様

| 項目 | 値 | 用途 |
|------|-----|------|
| FONT | `Noto Sans JP` | 全テキスト共通 |
| ACCENT | `A51E6D` | 図解のアクセントカラー |
| TEXT_COLOR | `333333` | タイトル |
| TITLE_X | 56pt | タイトル左マージン |
| TITLE_Y | 20pt | タイトル上端 (バー中央35.6pt、h=32+valign:middle→36pt) |
| CONTENT_X | 40pt | コンテンツ左マージン |
| FOOTER_Y | 296pt | フッター禁止エリア手前 |
| RIGHT_EDGE | 696pt | スライド右端 |

**スライドサイズ:** 720pt x 405pt (10" x 5.625", 16:9)
**グリッド:** 全サイズ・マージンは 8 の倍数
**フッター制約:** y >= 296pt にはコンテンツ配置禁止

## ビジュアルティアシステム

スライドのビジュアルを3層に分類し、講座全体の統一感とメリハリを両立する。

| ティア | 名称 | 割合 | 用途 | 特徴 |
|--------|------|------|------|------|
| Tier 1 | Simple Flat | 80% | コース全体の世界観・標準スライド | シェイプ・矢印・ボックスのみ。人物・装飾アイコン禁止。ミニマルで清潔 |
| Tier 2 | Diagram/Icon | 15% | 業務フロー・AIの仕組み・ツール連携 | 詳細インフォグラフィック。アイコン・人物シルエット1人まで許可 |
| Tier 3 | Character | 5% | 導入・ストーリー・感情補助 | キャラクター参照画像を使いGemini APIで生成 |

**ティア判定:**
- Excel F列で明示指定 (`flat` / `diagram` / `character`)
- F列が空の場合: 自動判定（デフォルト=flat、キーワードヒットでdiagram昇格）
- character は手動指定のみ（自動判定しない）

**キャラクター対応:**
| 講師名(--author) | キャラクター | 参照画像 |
|-------------------|-------------|---------|
| Shifuko | Shifko | `references/shifko.png` |
| Shifuto | Shifto | `references/shifto.png` |

## カバースライド位置仕様

テンプレート `assets/cover.png` 使用。

| 要素 | x | y | w | h | fontSize | 備考 |
|------|---|---|---|---|----------|------|
| タイトル | 80pt | 120pt | 580pt | 36pt | 32 | bold, 白, valign:middle |
| サブタイトル | 106pt | 200pt | 549pt | 38pt | 16 | #FFF, valign:middle |

## チャプタースライド位置仕様

テンプレート `assets/chapter.png` 使用。

| 要素 | x | y | w | h | fontSize | 備考 |
|------|---|---|---|---|----------|------|
| サブタイトル | 79pt | 122pt | 200pt | 22pt | 14 | TEXT_COLOR, valign:middle |
| タイトル | 81pt | 156pt | 590pt | 32pt | 24 | bold, TEXT_COLOR, valign:middle |

## 背景テンプレート

| スライドタイプ | テンプレートファイル | 用途 |
|---------------|---------------------|------|
| cover (index=0) | `assets/cover.png` | 最初のスライドのみ |
| chapter | `assets/chapter.png` | 章タイトルスライド |
| content | `assets/temp.png` | コンテンツスライド |
