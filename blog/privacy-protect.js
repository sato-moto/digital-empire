/**
 * privacy-protect.js
 * 画像内の「顔」と「ナンバープレート」を検出し、プライバシー保護処理を行う。
 *
 * - ナンバープレート: 自動でモザイク（確認不要）
 * - 顔: 検出結果を表示してユーザーが選択してからモザイク
 *
 * 使い方:
 *   node privacy-protect.js <画像パス>
 */

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp    = require('sharp');
// blog/.env を優先、なければ create-course/.env にフォールバック
const dotenv = require('dotenv');
const envResult = dotenv.config({ path: require('path').join(__dirname, '.env') });
if (envResult.error || !process.env.GOOGLE_API_KEY) {
  dotenv.config({
    path: 'C:/Users/motok/OneDrive/Desktop/Claude code/SHIFT AI/.claude/skills/create-course/.env'
  });
}

const OUTPUT_DIR   = path.join(__dirname, 'enhanced-photos');
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const BLUR_LEVEL   = 30; // モザイクの強さ（大きいほど強い）

// ── Gemini に座標検出を依頼するプロンプト ──
const DETECT_PROMPT = `
Analyze this image and detect all human faces and vehicle license plates.
Return ONLY a valid JSON array with no explanation, no markdown, no code block.
Each object must have these exact fields:
{
  "type": "face" or "plate",
  "label": "short description in Japanese (e.g. 左側の人物, 駐車中の車のナンバー)",
  "x": percentage from left edge (0.0 to 1.0),
  "y": percentage from top edge (0.0 to 1.0),
  "w": width as percentage of image width (0.0 to 1.0),
  "h": height as percentage of image height (0.0 to 1.0)
}
If nothing is detected, return an empty array: []
`.trim();

// ── ユーザー入力を受け付ける ──
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── 特定領域にモザイクをかける（Sharp composite方式）──
async function applyMosaic(inputBuffer, regions, imageWidth, imageHeight) {
  let pipeline = sharp(inputBuffer);

  const composites = [];
  for (const region of regions) {
    // パーセント → ピクセル変換（画像端をはみ出さないようクランプ）
    const left   = Math.max(0, Math.floor(region.x * imageWidth));
    const top    = Math.max(0, Math.floor(region.y * imageHeight));
    const width  = Math.min(Math.ceil(region.w * imageWidth),  imageWidth  - left);
    const height = Math.min(Math.ceil(region.h * imageHeight), imageHeight - top);

    if (width <= 0 || height <= 0) continue;

    // 対象領域を切り出してモザイク化（極小リサイズ→拡大でピクセル化）
    const pixelSize = Math.max(4, Math.floor(Math.min(width, height) / BLUR_LEVEL));
    const mosaicBuf = await sharp(inputBuffer)
      .extract({ left, top, width, height })
      .resize(Math.max(1, Math.floor(width / pixelSize)),
              Math.max(1, Math.floor(height / pixelSize)),
              { kernel: 'nearest' })
      .resize(width, height, { kernel: 'nearest' })
      .toBuffer();

    composites.push({ input: mosaicBuf, left, top });
  }

  if (!composites.length) return inputBuffer;

  return await sharp(inputBuffer).composite(composites).toBuffer();
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('使い方: node privacy-protect.js <画像パス>');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const fileName   = path.basename(inputPath);
  const outputPath = path.join(OUTPUT_DIR, 'privacy_' + fileName);
  const imageData  = fs.readFileSync(inputPath);
  const base64     = imageData.toString('base64');
  const ext        = path.extname(fileName).toLowerCase();
  const mimeType   = ext === '.png' ? 'image/png' : 'image/jpeg';

  // 画像サイズ取得
  const meta        = await sharp(imageData).metadata();
  const imageWidth  = meta.width;
  const imageHeight = meta.height;

  console.log(`\n🔍 検出中: ${fileName} (${imageWidth}×${imageHeight}px)`);

  // ── Gemini で顔・ナンバープレートを検出 ──
  const genAI  = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model  = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  let detections = [];
  try {
    const result = await model.generateContent({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: DETECT_PROMPT }
        ]
      }],
      generationConfig: { responseModalities: ['TEXT'] }
    });

    const text = result.response.candidates?.[0]?.content?.parts
      ?.find(p => p.text)?.text ?? '[]';

    // JSONだけ抽出（余計なテキストを除去）
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    detections = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (err) {
    console.warn(`  ⚠️  Gemini 検出失敗: ${err.message}`);
  }

  if (!detections.length) {
    console.log('  ✅ 顔・ナンバープレートは検出されませんでした。');
    fs.copyFileSync(inputPath, outputPath);
    console.log(`  💾 コピー保存 → ${outputPath}`);
    return;
  }

  const faces  = detections.filter(d => d.type === 'face');
  const plates = detections.filter(d => d.type === 'plate');

  console.log(`\n📋 検出結果:`);
  faces.forEach((f, i)  => console.log(`  👤 顔 ${i + 1}: ${f.label}`));
  plates.forEach((p, i) => console.log(`  🚗 ナンバー ${i + 1}: ${p.label}`));

  // ── ナンバープレートは自動でモザイク ──
  const autoTargets = [...plates];
  if (plates.length) {
    console.log(`\n  🚗 ナンバープレート ${plates.length}件 → 自動モザイク`);
  }

  // ── 顔はユーザーに確認 ──
  const faceTargets = [];
  if (faces.length) {
    console.log('');
    const ans = await ask(
      `👤 顔が ${faces.length} 件検出されました。モザイクをかける番号を入力してください。\n` +
      `   (例: "1 2" で顔1と顔2 / "all" で全員 / "skip" でスキップ)\n> `
    );

    if (ans.toLowerCase() === 'all') {
      faceTargets.push(...faces);
    } else if (ans.toLowerCase() !== 'skip') {
      ans.split(/[\s,]+/).forEach(n => {
        const idx = parseInt(n, 10) - 1;
        if (faces[idx]) faceTargets.push(faces[idx]);
      });
    }
  }

  const allTargets = [...autoTargets, ...faceTargets];
  if (!allTargets.length) {
    console.log('\n  スキップしました。処理なしで保存します。');
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  // ── モザイク処理 ──
  console.log(`\n  🎨 モザイク処理中... (${allTargets.length}件)`);
  const resultBuffer = await applyMosaic(imageData, allTargets, imageWidth, imageHeight);

  await sharp(resultBuffer).jpeg({ quality: 90 }).toFile(outputPath);
  console.log(`  ✅ 保存完了 → ${outputPath}`);
}

main().catch(err => console.error('❌ エラー:', err.message));
