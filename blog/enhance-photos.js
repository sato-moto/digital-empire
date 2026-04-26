/**
 * enhance-photos.js
 * 実写画像を「快晴・高コントラスト」に自動加工してWP投稿用フォルダに保存するスクリプト。
 *
 * 処理フロー:
 *   元画像 → Gemini API（空置換 + 照明強化） → Sharp（仕上げ） → output/ に保存
 *
 * 使い方:
 *   node enhance-photos.js <画像パス>              # 1枚処理
 *   node enhance-photos.js --batch <フォルダパス>  # フォルダ内の全jpg/png を処理
 */

const fs   = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const dotenv = require('dotenv');
const envResult = dotenv.config({ path: require('path').join(__dirname, '.env') });
if (envResult.error || !process.env.GOOGLE_API_KEY) {
  dotenv.config({
    path: 'C:/Users/motok/OneDrive/Desktop/Claude code/SHIFT AI/.claude/skills/create-course/.env'
  });
}

// ── 設定 ──────────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, 'enhanced-photos'); // 加工済み出力先
const GEMINI_MODEL = 'gemini-2.5-flash-image';

// Gemini に渡す編集プロンプト（2例の変換パターンを分析して最適化）
const ENHANCE_PROMPT = [
  'Edit this photo for use in a local shop introduction article.',
  'Replace any overcast, cloudy, or gray sky with a bright clear blue sky with natural white clouds.',
  'Increase brightness, contrast, and color saturation to make the image look like it was taken on a sunny day.',
  'Keep all buildings, signs, vehicles, and ground elements exactly as they are — do not add, remove, or move any objects.',
  'The result should look like a naturally well-lit photograph, not artificially edited.',
  'Maintain the same camera angle and composition as the original.'
].join(' ');

// Sharp による仕上げパラメータ（Gemini出力後の微調整）
const SHARP_OPTIONS = {
  brightness: 1.05,  // わずかに明るく
  saturation: 1.1,   // 彩度を少し上げる
  sharpness: 0.5     // シャープネス強調
};
// ─────────────────────────────────────────────────────────

async function enhanceImage(inputPath) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY が見つかりません');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const fileName  = path.basename(inputPath);
  const outputPath = path.join(OUTPUT_DIR, fileName);

  console.log(`\n🖼️  処理中: ${fileName}`);

  // ── Step 1: Gemini API で空置換 + 照明強化 ──
  console.log('  [1/2] Gemini API で画像編集中...');
  const imageData   = fs.readFileSync(inputPath);
  const base64Image = imageData.toString('base64');
  const ext         = path.extname(fileName).toLowerCase();
  const mimeType    = ext === '.png' ? 'image/png' : 'image/jpeg';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  let geminiOutputBuffer;
  try {
    const result = await model.generateContent({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: ENHANCE_PROMPT }
        ]
      }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
    if (!imgPart) throw new Error('Gemini から画像が返ってきませんでした');

    geminiOutputBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
    console.log('  ✅ Gemini 編集完了');
  } catch (err) {
    console.warn(`  ⚠️  Gemini 失敗 (${err.message}) → Sharp のみで処理します`);
    geminiOutputBuffer = imageData; // 元画像をそのままSharpに渡す
  }

  // ── Step 2: Sharp で仕上げ ──
  console.log('  [2/2] Sharp で仕上げ処理中...');
  await sharp(geminiOutputBuffer)
    .modulate({
      brightness: SHARP_OPTIONS.brightness,
      saturation: SHARP_OPTIONS.saturation
    })
    .sharpen(SHARP_OPTIONS.sharpness)
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  console.log(`  ✅ 保存完了 → ${outputPath}`);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (!args.length) {
    console.log('使い方:');
    console.log('  node enhance-photos.js <画像パス>');
    console.log('  node enhance-photos.js --batch <フォルダパス>');
    return;
  }

  // バッチ処理
  if (args[0] === '--batch') {
    const dir = args[1];
    if (!fs.existsSync(dir)) { console.error(`❌ フォルダが見つかりません: ${dir}`); return; }
    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    if (!files.length) { console.log('📭 処理対象の画像がありません'); return; }
    console.log(`📚 ${files.length} 枚を処理します...`);
    for (const file of files) {
      await enhanceImage(path.join(dir, file));
    }
    console.log(`\n🎉 完了！ enhanced-photos/ フォルダを確認してください`);
    return;
  }

  // 1枚処理
  const inputPath = path.resolve(args[0]);
  if (!fs.existsSync(inputPath)) { console.error(`❌ ファイルが見つかりません: ${inputPath}`); return; }
  const output = await enhanceImage(inputPath);
  console.log(`\n🎉 完了 → ${output}`);
}

main().catch(err => console.error('❌ エラー:', err.message));
