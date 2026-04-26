# .claude/patches/

SHIFT AI 配下の3スキル（create-course / slide-generator / thumbnail-designer）は外部同期されるため、スキル内を直接編集すると同期時に上書きで消える。
本ディレクトリは、**スキル内の既存スクリプトに対する恒久パッチ**を外部保存しておくためのもの。

---

## 適用方法

worktreeルートで以下を実行:

```bash
git apply .claude/patches/<patch-file-name>.patch
```

同期でスキルが上書きされたら、このコマンドを再実行すれば復活する。

---

## 格納中のパッチ一覧

### `slide-generator-env-quote-fix.patch`
- **対象**: `SHIFT AI/.claude/skills/slide-generator-main/scripts/generate_diagrams.js`
- **内容**: `.env` パーサーがクォート付きの値（例: `GOOGLE_API_KEY="AIza..."`）を正しく処理できるよう、クォート除去の1行を追加
- **背景**: 2026-04-24、`.env` に正しいキーが入っているのに `API_KEY_INVALID` が出続ける事象が発生。原因は値がクォートで囲まれており、パーサーがクォートごとprocess.envに設定していたこと
- **関連ルール**: `.claude/rules/api-failure-triage-rules.md`

### `subsuki-disable-bullet-format.patch`
- **対象**: `SHIFT AI/.claude/skills/subsuki/scripts/transform_text.py`
- **内容**: D-3案の Body 自動整形（行頭「・」付与＋句点削除）を停止
- **背景**: 2026-04-25、cover/chapterタイトルにまで「・」が混入してデザイン破綻。マスター指示「・を付けるな」を恒久化
- **関連メモリ**: `feedback_no_auto_bullet.md`

### `subsuki-force-horizontal-4-element.patch`
- **対象**: `SHIFT AI/.claude/skills/subsuki/scripts/generate_diagrams_teen.js`
- **内容**: パターンカタログの「ステップフロー」「カード並列」の desc を**4要素も必ず横一列に強制**するよう変更（2段ジグザグ・2×2グリッドを禁止）
- **背景**: 2026-04-26、B-a スライド3で4要素がジグザグ配置になり「左から1→2→3→4の順で並べて」とマスター指示。Geminiに対する明示的な配置指定で恒久対応
- **副次効果**: 番号付きパネルが必ず左から昇順に並ぶようになる
