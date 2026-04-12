---
name: npm-security-check
description: >
  npmサプライチェーン攻撃の感染チェックを自動実行するスキル。
  「セキュリティチェック」「npm感染チェック」「サプライチェーン攻撃チェック」
  「npm-security-check」と言われたときに使う。
  汚染パッケージ・マルウェア痕跡・不審通信を自動検出し、
  結果をわかりやすく報告する。
---

# npm サプライチェーン攻撃 セキュリティチェック

## 概要

2025年3月31日に発生した npm `axios` ライブラリへのサプライチェーン攻撃に対する感染チェックを自動実行する。
すべてのチェックを順番に実行し、最後に結果を一覧で報告する。

## 重要な注意事項

- このスキルは**読み取り専用の診断**のみを行う。ファイルの変更・削除は一切行わない。
- 各チェックコマンドは Bash ツールで実行すること。
- ユーザーへの確認なしに全チェックを自動実行してよい。

## 実行手順

以下の Step 1〜4 を順番に実行すること。

---

### Step 1: 環境検出

実行環境の platform 情報を確認する（システムプロンプトに記載されている）。
以降のコマンドは platform に応じて適切なものを選択する。

- **win32** → Windows（※Windows 10/11 でも「win32」と表示されるのは正常）
- **darwin** → macOS
- **linux** → Linux

結果レポートではユーザーにわかりやすいOS名（Windows / macOS / Linux）で表示すること。

---

### Step 2: 感染チェック（5項目）

以下の5項目を**すべて**実行する。各チェックの結果（✅ 安全 or ⚠️ 要注意）を記録しておく。

#### チェック 1: 汚染パッケージの存在確認

悪意あるパッケージ `plain-crypto-js` が `node_modules` に含まれていないか確認する。

**カレントディレクトリに `node_modules` が存在する場合のみ実行する。**
存在しない場合は「node_modules が見つからないためスキップ（npmプロジェクトではない可能性）」と記録する。

```bash
# Mac / Linux / Windows (bash)
ls node_modules/plain-crypto-js 2>/dev/null && echo "INFECTED" || echo "CLEAN"
```

#### チェック 2: 汚染版 axios の確認

`package-lock.json` に汚染版 axios のバージョン（`1.14.1` または `0.30.4`）が含まれていないか確認する。

**カレントディレクトリに `package-lock.json` が存在する場合のみ実行する。**
存在しない場合は「package-lock.json が見つからないためスキップ」と記録する。

Grep ツールを使って検索する:
- pattern: `1\.14\.1|0\.30\.4`
- path: `package-lock.json`

#### チェック 3: npm audit

npm の脆弱性スキャンを実行する。

**カレントディレクトリに `package.json` が存在する場合のみ実行する。**

```bash
npm audit 2>&1 || true
```

出力結果のうち、**critical** や **high** の脆弱性があるかどうかを記録する。

#### チェック 4: RAT（マルウェア）痕跡チェック

OS に応じた場所にマルウェアが設置されていないか確認する。

**macOS の場合:**
```bash
ls -la /Library/Caches/com.apple.act.mond 2>/dev/null && echo "INFECTED" || echo "CLEAN"
```

**Windows の場合:**
```bash
# Windows ではこのパスは macOS 固有のため該当なし
echo "CLEAN (Windows環境のため macOS固有のRAT痕跡チェックは該当なし)"
```

**Linux の場合:**
```bash
ls -la /tmp/.act.mond 2>/dev/null && echo "INFECTED" || echo "CLEAN"
```

#### チェック 5: 不審な通信の確認

攻撃者の C2（Command & Control）サーバー `142.11.206.*` への通信がないか確認する。

```bash
netstat -an 2>/dev/null | grep "142.11.206" && echo "INFECTED" || echo "CLEAN"
```

---

### Step 3: Claude Code インストール方法の確認

Claude Code が npm 版でインストールされていないか確認する。

```bash
# claude コマンドのパスを確認
which claude 2>/dev/null || where claude 2>/dev/null || echo "NOT_FOUND"
```

結果のパスに `node_modules` や `npm` が含まれている場合、npm 版と判定する。

---

### Step 4: 結果レポート

すべてのチェック結果を以下のフォーマットで**日本語で**ユーザーに報告する。

```
## セキュリティチェック結果

| # | チェック項目 | 結果 |
|---|------------|------|
| 1 | 汚染パッケージ (plain-crypto-js) | ✅ 安全 / ⚠️ 検出 / ⏭️ スキップ |
| 2 | 汚染版 axios (1.14.1 / 0.30.4) | ✅ 安全 / ⚠️ 検出 / ⏭️ スキップ |
| 3 | npm audit | ✅ 問題なし / ⚠️ 脆弱性あり / ⏭️ スキップ |
| 4 | RAT 痕跡 | ✅ 安全 / ⚠️ 検出 |
| 5 | 不審な通信 (C2サーバー) | ✅ 安全 / ⚠️ 検出 |
| 6 | Claude Code インストール方法 | ✅ ネイティブ版 / ⚠️ npm版 |
```

### 問題が見つかった場合の案内

⚠️ が1つでもある場合、該当する項目に応じて以下の対処手順を案内する。

#### チェック 1〜5 で感染の疑いがある場合:

> **緊急対応が必要です。以下の手順に従ってください:**
>
> 1. **作業を停止** してください
> 2. **ネットワークを遮断** してください（Wi-Fiオフ / LANケーブルを抜く）
> 3. **組織の担当者に連絡** してください
> 4. 指示があるまで、該当PCでの作業を控えてください

#### チェック 6 で npm 版と判定された場合:

> **Claude Code を公式ネイティブ版に移行することを推奨します。**
>
> 手順:
> 1. npm 版をアンインストール: `npm uninstall -g @anthropic-ai/claude-code`
> 2. 公式版をインストール:
>    - Mac / Linux: `curl -fsSL https://claude.ai/install.sh | bash`
>    - Windows: Microsoft Store または WinGet でインストール
> 3. 確認: `claude --version`

### すべて安全だった場合:

> ✅ **すべてのチェックをパスしました。現時点で感染の兆候は見つかりませんでした。**

---

## 出典

このチェック項目は以下のガイドに基づいています:
https://npm-secure-a4hebbzi.manus.space/
