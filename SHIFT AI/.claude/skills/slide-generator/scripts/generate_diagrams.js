/**
 * generate_diagrams.js — Gemini API (Nano Banana Pro) で図解画像を生成
 *
 * slides.json を読み込み、各コンテンツスライドに対して
 * 図形・矢印のみのダイアグラム PNG を生成する。
 *
 * Usage:
 *   node generate_diagrams.js <slides.json> <output_dir> [--env <.env_path>]
 */

const fs = require('fs');
const path = require('path');

// ── Constants ──
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const RATE_LIMIT_DELAY_MS = 12000;
const CONCURRENCY = 5;

// ── .env loader (no external deps) ──
function loadEnvFile(envPath) {
  const candidates = [
    envPath,
    process.env.ENV_FILE_PATH,
    path.resolve(__dirname, '..', '.env'),  // skill フォルダ直下の .env
  ].filter(Boolean);

  for (const filePath of candidates) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
      console.log(`[env] Loaded: ${filePath}`);
      return;
    } catch { /* try next */ }
  }

  if (!process.env.GOOGLE_API_KEY) {
    console.error('[env] ERROR: .env file not found and GOOGLE_API_KEY not set.');
    console.error('  Usage: node generate_diagrams.js <slides.json> <output_dir> --env /path/to/.env');
    console.error('  Or set environment variable: ENV_FILE_PATH=/path/to/.env');
    process.exit(1);
  }
}

// ── Body content extractor ──
function extractDiagramContent(body) {
  const lines = (body || '').split('\n').map(l => l.trim()).filter(l => l);

  const bullets = [];
  const headings = [];

  for (const line of lines) {
    if (/^[・\-\d]+[.\)）]?\s/.test(line) || /^[・\-]/.test(line)) {
      bullets.push(line.replace(/^[・\-\d]+[.\)）]?\s*/, '').trim());
    } else if (line.length < 50 && !/[。]$/.test(line)) {
      headings.push(line);
    }
  }

  return { bullets, headings };
}

// ── Pattern catalog & classifier ──
const PATTERN_CATALOG = {
  hierarchy: [
    { name: 'ロジックツリー', desc: '枝分かれ線で親→子を分解。上部に親要素、下に複数の子要素を線で接続。' },
    { name: 'ピラミッド図', desc: '三角形の段階で上下関係を表現。上段は小さく、下段に向かって広がる。' },
    { name: 'ネストボックス', desc: '大きな枠の中に小さな枠を入れ子配置。外枠が全体、内枠が構成要素。' },
  ],
  process: [
    { name: 'ステップフロー', desc: '番号付き角丸ボックスを矢印で接続。3要素は横一列、4要素以上は2段ジグザグ配置にする。' },
    { name: 'タイムライン', desc: '横一本の時間軸上にマイルストーンを配置。軸の上下に交互にラベル。' },
    { name: 'プロセスチェーン', desc: '縦または横のフローで工程を順に表示。各工程は四角で矢印で接続。' },
  ],
  comparison: [
    { name: '左右パネル', desc: '画面を2列に分け、左右に対比要素を並列表示。中央に区切り線。' },
    { name: 'カード並列', desc: '3枚のカードを横並び、4枚の場合は2×2グリッドで配置。各カードにシンプルなアイコンとラベル。中心メッセージのカードを他より大きくする。' },
  ],
  causal: [
    { name: '因果チェーン', desc: '太い矢印で原因→中間→結果を左から右に接続。各ノードは角丸ボックス。' },
    { name: 'フィッシュボーン', desc: '右端に結果を置き、左から複数の原因を魚の骨状に斜め線で分岐。' },
    { name: 'Before→After', desc: '左にBeforeを小さく・グレー系で控えめに描き、右にAfterを1.5倍大きく・マゼンタ系で明るく強調。中央に太い矢印（Before側は細く、After側で太くなる）を配置し、変化の落差を視覚的に表現する。' },
  ],
};

function classifyStructure(body) {
  const text = (body || '').replace(/\n/g, ' ');
  const scores = { hierarchy: 0, process: 0, comparison: 0, causal: 0 };

  // 手順シグナル
  const numbered = (text.match(/(?:^|\s)(?:\d+[\.\)）]|Step\s*\d)/gi) || []).length;
  if (numbered >= 2) scores.process += 3;
  if (/まず|次に|最後に|Step\s*\d|ステップ|手順|フロー|流れ|工程/i.test(text)) scores.process += 2;
  if (/→.*→/.test(text)) scores.process += 2;

  // 比較シグナル
  if (/違い|比較|対比|一方|対して|メリット|デメリット/i.test(text)) scores.comparison += 3;
  const colonItems = (text.match(/・[^：:]+[：:]/g) || []).length;
  if (colonItems >= 2) scores.comparison += 2;

  // 因果シグナル
  if (/原因|結果|なぜ|課題|問題|打破|解決|Before.*After|現状.*鍵/i.test(text)) scores.causal += 3;

  // 階層シグナル
  if (/上位|下位|包含|構成|分類|カテゴリ|レベル|段階|構成要素|ロードマップ/i.test(text)) scores.hierarchy += 3;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) {
    const bullets = (text.match(/[・\-]/g) || []).length;
    return bullets >= 3 ? 'comparison' : 'hierarchy';
  }
  return sorted[0][0];
}

function assignPattern(structureType, typeCounters) {
  const patterns = PATTERN_CATALOG[structureType];
  const idx = (typeCounters[structureType] || 0) % patterns.length;
  typeCounters[structureType] = (typeCounters[structureType] || 0) + 1;
  return patterns[idx];
}

// ── Prompt builder ──
function buildDiagramPrompt(title, body, script, assignedPattern) {
  const { bullets, headings } = extractDiagramContent(body);

  let contentLines = [];
  if (headings.length > 0) contentLines.push(...headings);
  if (bullets.length > 0) contentLines.push(...bullets);

  const contentText = contentLines.length > 0
    ? contentLines.join('\n')
    : '（テキストなし。アイコン・図形・矢印のみで視覚的に表現する）';

  return `2400x840pxのビジネスインフォグラフィック画像を生成してください。

# 重要ルール
以下の「図解に含めるテキスト」セクション内のテキストだけを図解に描画すること。
それ以外のすべての文（指示文、禁止事項、メタ情報、テーマなど）は図解に描画しない。

# 対象ユーザー
この図解はtoC（一般消費者向け）の学習教材に使用される。
- 視認性を最優先: 文字は大きく明瞭に、コントラストを十分に確保する
- 親しみやすさと信頼感の両立: ビジネスパーソンが本業強化のために学ぶ教材。子供っぽくならず、大人が安心して学べる洗練されたデザイン。フラット・アイソメトリックイラストを活用しつつ、プロフェッショナルな印象を保つ
- 学習効果: 情報の流れが直感的にわかるように矢印・番号・色分けで誘導する
- スマートフォンでも見やすいサイズ感を意識する（文字が小さくなりすぎない）

# メタ情報（生成の参考のみ。図解内に描画するテキストではない）
テーマ: ${title}
※「${title}」という文字列を図解内に絶対に描画しないこと。テーマは図解の方向性を理解するための参考情報であり、図解内のテキストとして表示するものではない。

# 図解に含めるテキスト
${contentText}

# 図解パターン（指定済み・変更禁止）
以下の図解パターンを必ず使用すること。他のパターンに変更しないこと。

レイアウト: ${assignedPattern.desc}

上記のレイアウトに厳密に従い、テキスト内容を配置すること。
※ パターン名やレイアウト名を図解内に絶対に表示しない。

# Step 3: 認知負荷ルール（厳守）
- 視覚要素は3〜4個に厳守（ワーキングメモリの限界。5個以上は統合・削減する）
- 1つの図解で1つのメッセージだけ伝える
- テキストラベルは短く（各ラベル15文字以内）
- 余白を十分に確保する（詰め込み禁止）
- 4要素以上の横一列配置は禁止（2×2グリッドまたは2段構成にする）

# Step 4: テキストサイズ（厳守）
- 全テキストは12ポイント以上18ポイント以下のサイズで統一する
- 小さすぎて読みにくい文字は絶対に禁止
- テキストが入りきらないなら項目数を減らす
- 文字の太さはデフォルトのまま統一する

# 配色（教育コンテンツパレット + 白背景）
※ マゼンタ (#A51E6D) が図解内で最も目立つ色であること。他の色はマゼンタより控えめに使い、マゼンタの強調効果を邪魔しない。
- 背景: 白固定 (#ffffff)
- テキスト色: ダークグレー (#333333) のみ。マゼンタ (#A51E6D) 以外の色でテキストを強調しない
- アクセント色（最も目立つ色）: マゼンタ (#A51E6D)。最も伝えたいキーワード（1〜2語）と強調ボーダーにのみ使用
- イラスト・図形の配色（すべてマゼンタより控えめなトーンで使う）:
  - スモーキーブルー (#6E9ECF): 信頼・学びを表現。アイコン・図形・ボーダーの主色
  - ソフトオレンジ (#E8A87C): 注目・気づきを表現。ポイント・注意要素に使用
  - セージグリーン (#7DAF7D): 成長・達成を表現。成果・メリット要素に使用
  - ウォームグレー (#9E9E9E): 補助・背景要素に使用
- 枠線・ボーダー: ダークグレー (#333333) をベースに、スモーキーブルー (#6E9ECF) も使用可。強調ボーダーのみマゼンタ (#A51E6D)
- ボックス背景色: すべて白 (#ffffff)。色付き背景は使わない。グルーピングは枠線のみで表現する
- 配色の優先順位: マゼンタ > スモーキーブルー > ソフトオレンジ ≒ セージグリーン > ウォームグレー。マゼンタが常に最も鮮やかで目を引く色であること

# スタイル（厳守）
- 必ずフラット・アイソメトリックスタイルで描く。フラット・アイソメトリックとは、影や質感のない「フラットデザイン」と、斜め上から俯瞰する「等角投影法」を組み合わせた、現代的で親しみやすいイラストスタイル。立体的な奥行きを保ちつつ、シンプルでカラフルな情報をわかりやすく伝える。強い光沢・フォトリアル表現は禁止。ボックスには軽いドロップシャドウを付与
- すべてのボックス・図形・アイコンはフラット・アイソメトリック視点で統一し、影や質感は使わず、明るくカラフルなベタ塗りで構成する
- 図形・矢印・線・ボックスが面積の70%以上
- 清潔感・余白・洗練された親しみやすさを最優先（ビジネスパーソンが信頼感を持って学べるデザイン）
- デュアルコーディング: 図形と短いテキストラベルを組み合わせる

# ビジュアル技法（インフォグラフィック品質向上）
- フラット・アイソメトリックイラスト: 人物は1図解に最大1人。人物はビジネスパーソン（スーツ・オフィスカジュアル）として描き、頭身は6〜7頭身のリアルな体型比率で、大人の知的な雰囲気を保つ。デフォルメしすぎない（2〜3頭身の子供っぽいキャラクターは禁止）。フラット・アイソメトリックスタイル（等角投影＋ベタ塗り）で描く。人物なしでも可
- 装飾要素の制限: 歯車・電球・雲・吹き出しなどの装飾アイコンは1図解に最大1個。「意味のある要素」だけを描く
- キーワード強調: 各要素で最も重要なワード（1〜2語）はマゼンタ (#A51E6D) で目立たせる。それ以外のテキストはすべてダークグレー (#333333) のみ。紫・オレンジ・緑・赤・青など、マゼンタ以外の色でテキストを着色することは絶対禁止。マゼンタ文字は必ず白背景 (#ffffff) または明るい背景の上に配置すること
- サイズ階層: 中心概念・結論は大きく目立たせ、補助要素は小さく控えめにする
- 角丸ボックス: radius 8-12px、border 0.5px（色はダークグレー #333333。強調ボックスのみマゼンタ #A51E6D）、軽いドロップシャドウ（offset 2px, blur 4px, 透明度20%程度の黒）を付与。グラデーションは禁止
- 線と矢印の使い分け（厳守）:
  - 区切り線（セパレータ）: 領域を分割するだけの線には矢印の先端（三角形）を付けない。縦線・横線・破線で区切る
  - 因果関係・フロー: 原因→結果、ステップ1→ステップ2 など方向性がある場合のみ矢印（三角形の先端）を使う
  - 目線誘導: 読者の視線を次の要素に導く場合は矢印を使う
  - 色: すべてダークグレー (#333333) 1色のみ。矢印や線にマゼンタとダークグレーを混在させない
- グルーピング: 関連要素はボックス背景色（ホワイト）の囲みと枠線でまとめる
- 視線導線: 情報は左→右、上→下の自然な流れで配置する
- ネガティブスペース: 要素間に十分な余白（最低20px）を確保し、詰まった印象を避ける
- コントラスト: 重要な要素はマゼンタ (#A51E6D) で強調し、それ以外はグレー系 (#333333〜#95A5A6) で抑える

# 禁止（厳守）
- カラーコード（16進数表記、例: #A51E6Dなど）を図解内にテキストとして絶対に表示しない
- マゼンタ (#A51E6D) 背景の丸アイコンの多用（全面的に禁止。代わりに角丸ボックス・矢印・線を使う）
- ロゴ・ブランドマークの表示
- 小さすぎて読みにくい文字
- 暗い背景・ダークモード・濃色の帯やバナー（ダークグレー #333333 や黒の塗りつぶし帯の上にマゼンタ #A51E6D 文字を載せるのは視認性が極端に悪いため絶対禁止。テキストラベルの背景は必ず白 #ffffff または非常に薄い色にすること）
- 矢印・線・ボーダーにマゼンタ (#A51E6D) とダークグレー (#333333) を混在させること（1本の矢印や線は単色で統一。色が切り替わる矢印は禁止）
- マゼンタ (#A51E6D) 以外の色（紫・オレンジ・緑・赤・青など）でテキストを強調・着色すること（テキストの色はダークグレー #333333 とマゼンタ #A51E6D の2色のみ）
- イラスト内にマゼンタと競合する鮮やかな色（ビビッドな赤・ビビッドなピンク）を大面積で使用すること
- 写真・実写風の表現
- 「図解に含めるテキスト」セクション以外の文字列を図解内に描画しない
- テーマ・タイトル・メタ情報・指示文・禁止事項の文章を図解内に描画しない
- 「ビジネスインフォグラフィック」「Business Infographic」等のメタ的なタイトル・ラベルの表示（図解の種類や形式名を図解内に日本語でも英語でも書かない。独自の英語タイトルも禁止）
- 要素の詰め込み（5個以上の要素は禁止）
- 歯車・電球・雲などの装飾アイコンの複数使用（1個まで）
- 4個以上の要素を横一列に並べること（2×2または2段にする）
- 人物の複数配置（最大1人まで）
- フォトリアル表現・強い光沢・強いドロップシャドウ・過度なぼかし・影・質感・グラデーション（禁止。フラット・アイソメトリックはベタ塗りが基本）
- 区切り線（セパレータ）に矢印の先端を付けること（区切りは矢印なしの線のみ。矢印は因果関係・フローにのみ使用）
- テーマ「${title}」の文言（全体または大部分）を図解内にテキストとして表示すること。テーマはメタ情報であり、図解のラベルや見出しとして使わない
- フォントサイズ表記やデザイン指示（「16pt」「12px」「font-size」等）を図解内のテキストとして表示すること。このプロンプト内の技術的な指示はすべてメタ情報であり、図解のラベルには絶対に含めない`;
}

// ── Gemini API caller with retry ──
async function callGeminiImageAPI(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `${GEMINI_API_BASE}/${IMAGE_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429 || response.status >= 500) {
        const delay = response.status === 429
          ? RATE_LIMIT_DELAY_MS * attempt   // 429: 15s, 30s, 45s, 60s, 75s
          : BASE_DELAY_MS * Math.pow(2, attempt - 1); // 5xx: 2s, 4s, 8s, 16s, 32s
        console.error(`  [retry ${attempt}/${MAX_RETRIES}] HTTP ${response.status}, waiting ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errorBody.slice(0, 300)}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Gemini API error (${data.error.code}): ${data.error.message}`);
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini API: no candidates in response');
      }

      // Extract image from response
      const parts = data.candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return part.inlineData; // { mimeType, data (base64) }
        }
      }

      // No image — model returned only text
      const textParts = parts.filter(p => p.text).map(p => p.text).join('\n');
      throw new Error(`No image generated. Model said: ${textParts.slice(0, 200)}`);

    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.error(`  [retry ${attempt}/${MAX_RETRIES}] ${err.message.slice(0, 100)}, waiting ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('All retries exhausted (rate limited)');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── PNG size validation ──
// Gemini API returns JPEG at 1744x608 regardless of prompt size request (2400x840).
// Validate that all images are the same dimensions for consistency.
const EXPECTED_WIDTH = 1744;
const EXPECTED_HEIGHT = 608;
const SIZE_MAX_RETRIES = 3;

function getImageDimensions(buffer) {
  // PNG: signature 89 50 4E 47
  if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  // JPEG: signature FF D8
  if (buffer.length >= 4 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      // SOF0-SOF3 markers contain dimensions
      if (marker >= 0xC0 && marker <= 0xC3) {
        if (offset + 9 < buffer.length) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
      }
      if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS
      const segLen = buffer.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
  }
  return null;
}

async function generateWithSizeCheck(prompt) {
  for (let sizeAttempt = 1; sizeAttempt <= SIZE_MAX_RETRIES; sizeAttempt++) {
    const imageData = await callGeminiImageAPI(prompt);
    const buf = Buffer.from(imageData.data, 'base64');
    const dims = getImageDimensions(buf);
    if (dims && dims.width === EXPECTED_WIDTH && dims.height === EXPECTED_HEIGHT) {
      return buf;
    }
    const actual = dims ? `${dims.width}x${dims.height}` : 'unknown';
    console.error(`  [size-check] NG: ${actual} (expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}), retry ${sizeAttempt}/${SIZE_MAX_RETRIES}`);
    if (sizeAttempt < SIZE_MAX_RETRIES) await sleep(RATE_LIMIT_DELAY_MS);
  }
  // All retries failed — return last attempt anyway with warning
  console.error(`  [size-check] WARNING: size mismatch after ${SIZE_MAX_RETRIES} retries, saving anyway`);
  const imageData = await callGeminiImageAPI(prompt);
  return Buffer.from(imageData.data, 'base64');
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);

  // Parse args
  let envPath = null;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && i + 1 < args.length) { envPath = args[++i]; }
    else { positional.push(args[i]); }
  }

  const jsonPath = positional[0];
  const outputDir = positional[1];

  if (!jsonPath || !outputDir) {
    console.log('Usage: node generate_diagrams.js <slides.json> <output_dir> [--env <.env_path>]');
    process.exit(1);
  }

  // Load environment
  loadEnvFile(envPath);
  if (!process.env.GOOGLE_API_KEY) {
    console.error('ERROR: GOOGLE_API_KEY not set. Use --env or set environment variable.');
    process.exit(1);
  }

  // Read slides
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const slides = data.slides;
  fs.mkdirSync(outputDir, { recursive: true });

  // Build task list (skip covers and existing files)
  const tasks = [];
  let skipped = 0;
  let existing = 0;
  const typeCounters = {};  // 型別カウンター（パターンバリエーション用）

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slideNum = String(i + 1).padStart(3, '0');
    if (s.type === 'cover' || s.type === 'chapter') {
      console.log(`  [${slideNum}] SKIP (${s.type})`);
      skipped++;
    } else {
      // パターン分類は既存ファイルスキップ前に実行（一貫性のため）
      const structureType = classifyStructure(s.body);
      const pattern = assignPattern(structureType, typeCounters);
      const outPath = path.join(outputDir, `slide-${slideNum}.png`);
      if (fs.existsSync(outPath)) {
        console.log(`  [${slideNum}] SKIP (exists)`);
        existing++;
      } else {
        console.log(`  [${slideNum}] ${structureType} -> ${pattern.name}`);
        tasks.push({ s, i, slideNum, pattern });
      }
    }
  }

  console.log(`\n[START] Generating ${tasks.length} diagrams (${existing} already exist, ${CONCURRENCY} parallel)...\n`);

  let succeeded = 0, failed = 0;

  // Process in chunks of CONCURRENCY
  for (let c = 0; c < tasks.length; c += CONCURRENCY) {
    const chunk = tasks.slice(c, c + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(async ({ s, i, slideNum, pattern }) => {
        const outPath = path.join(outputDir, `slide-${slideNum}.png`);
        console.log(`  [${slideNum}] ${s.title.slice(0, 40)}...`);
        const prompt = buildDiagramPrompt(s.title, s.body, s.script, pattern);
        const buf = await generateWithSizeCheck(prompt);
        fs.writeFileSync(outPath, buf);
        console.log(`  [${slideNum}] OK -> ${path.basename(outPath)}`);
        return slideNum;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') succeeded++;
      else { failed++; console.error(`  FAILED: ${r.reason.message}`); }
    }

    // Rate limit delay between chunks (skip after last chunk)
    if (c + CONCURRENCY < tasks.length) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log(`\n[DONE] ${succeeded} generated, ${failed} failed, ${existing} existed, ${skipped} covers (total: ${slides.length})`);
  if (failed > 0) process.exit(2);
}

main().catch(err => { console.error(err); process.exit(1); });
