/**
 * アイキャッチ画像AI生成スクリプト
 * Stable Horde API（クラウドGPUネットワーク・匿名キー・無料）を使用
 *
 * 使い方:
 *   node generate-eyecatch.js articles/04_gourmet_kumatori-izakaya.html
 *
 * 仕組み:
 *   1. 記事スラグ→記事テーマに合わせたAI生成プロンプトを決定
 *   2. Stable Horde API でAI画像を生成（Stable Diffusion）
 *   3. 完成した画像をダウンロードして保存
 *
 * 備考:
 *   - Pollinations.ai は現在バックエンド障害のため使用不可（2026年3月時点）
 *   - Stable Horde は匿名キー（0000000000）で無料利用可能
 *   - 匿名キーはキュー優先度が低いため、生成に数分かかる場合あり
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// ─── 記事スラグ別 AI生成プロンプト ───
// 記事テーマ・雰囲気に合致した英語プロンプトを設定する
// photorealistic・cinematic lighting を基本に、被写体を具体的に記述する
const PROMPT_MAP = {
  // グルメ系
  'kumatori-lunch-osusume':  'Japanese lunch meal set on wooden table, miso soup, rice bowl, grilled fish, restaurant interior, warm lighting, photorealistic, food photography',
  'kumatori-cafe':           'cozy Japanese cafe interior, wooden counter, latte art coffee cup, natural light from window, warm atmosphere, photorealistic, high quality',
  'kumatori-sweets':         'beautiful Japanese pastry and cake display, colorful sweets on white plate, patisserie interior, soft natural lighting, photorealistic, food photography',
  'kumatori-izakaya':        'atmospheric Japanese izakaya interior at night, warm golden paper lantern light, charcoal yakitori grill with skewers, sake bottles on wooden shelf, cozy intimate atmosphere, cinematic lighting, photorealistic',
  'kumatori-ramen':          'steaming ramen bowl with rich broth, chashu pork, soft boiled egg, noodles, wooden counter, Japanese ramen restaurant, photorealistic, food photography',
  'kumatori-pan':            'fresh baked artisan bread loaves on wooden shelf, bakery interior, golden brown crust, warm morning light, photorealistic, food photography',
  'kumatori-ekimae':         'Japanese local train station area, small restaurants and shops, evening street scene, warm shop lights glowing, cinematic, photorealistic, no people',
  'kumatori-newopen':        'new Japanese restaurant grand opening, stylish interior design, modern Japanese dining space, warm inviting atmosphere, photorealistic',
  'kumatori-korokke':        'golden crispy Japanese croquette korokke on plate, street food stall, warm light, close-up food photography, photorealistic',
  'kumatori-mizunasu':       'fresh Japanese mizunasu eggplant vegetables, farm field in Osaka countryside, morning sunlight, dewy vegetables, photorealistic',
  'kumatori-takeout':        'Japanese takeout bento box set, variety of dishes, neatly arranged, wooden background, photorealistic, food photography',
  'kumatori-kosodateranch':  'family-friendly Japanese restaurant interior, low table tatami room, colorful children dishes and bento tray on table, warm cozy lighting, no people, photorealistic',
  'kumatori-niko-bagels':    'freshly baked artisan bagels on rustic wooden board, various flavors including walnut red bean and plain, close-up food photography, warm natural light, shallow depth of field, photorealistic',

  // 観光系
  'kumatori-kanko':          'beautiful Japanese countryside scenery, green hills and rice fields, Osaka rural landscape, golden hour light, photorealistic, landscape photography',
  'eiraku-dam':              'serene Japanese dam lake surrounded by cherry blossom trees, pink sakura petals on water surface, spring morning, photorealistic',
  'eiraku-yume-park':        'large colorful playground equipment and long slide at Japanese park, green grass lawn, clear blue sky, bright sunny day, wide angle shot, no people, photorealistic',
  'kumatori-kouen':          'colorful Japanese public park playground equipment, swings and slides, bright blue sky, lush green trees, peaceful suburban park, no people, photorealistic',
  'kumatori-hiking':         'Japanese forest hiking trail, sunlight through green trees, stone path, peaceful nature, Osaka countryside, photorealistic',
  'nakake-house':            'traditional Japanese historic wooden house, thatched roof, old architecture, garden with moss, quiet and serene, photorealistic',
  'kumatori-instaphoto':     'stunning Instagram-worthy Japanese scenery, torii gate, cherry blossoms, golden hour light, photogenic composition, photorealistic',
  'kumatori-onsen':          'Japanese outdoor hot spring onsen bath, misty steam, wooden tub, bamboo garden, peaceful relaxing atmosphere, photorealistic',

  // 暮らし系
  'kumatori-sumiyasusa':     'quiet peaceful Japanese suburban residential street, neat houses with small gardens, blue sky, everyday life, photorealistic',
  'kumatori-iju':            'welcoming Japanese suburban neighborhood, green streets, modern and traditional houses mixed, blue sky, no people, photorealistic',
  'kumatori-eki':            'Japanese local commuter train station platform, JR train arriving, suburban station, morning light, no people, photorealistic',
  'kumatori-super':          'inside Japanese supermarket, colorful fresh produce section, bright lighting, neatly organized shelves, no people, photorealistic',
  'kumatori-hospital':       'clean modern Japanese clinic exterior, welcoming entrance, green plants, calm neighborhood medical facility, photorealistic',
  'himawari-bus':            'Japanese community bus stopped on suburban street, residential area, daytime, no people, photorealistic',
  'kumatori-fudosan':        'Japanese residential house for sale, neat garden, quiet suburban street, real estate, photorealistic',
  'kumatori-chian':          'safe quiet Japanese neighborhood at dusk, streetlights turning on, peaceful residential area, no people, photorealistic',

  // 子育て系
  'kumatori-kosodate':       'colorful Japanese children playroom interior, wooden toys and picture books on low table, building blocks and stuffed animals on soft rug, warm sunlit window, potted plants on windowsill, cozy family room, no people, photorealistic',
  'kumatori-hoikuen':        'bright cheerful Japanese kindergarten classroom interior, colorful toys and tiny chairs on wooden floor, crayon drawings on wall, warm light, no people, photorealistic',
  'kumatori-shogakko':       'Japanese elementary school classroom interior, neatly arranged desks and chairs, blackboard with chalk writing, bright natural light, no people, photorealistic',
  'kumatori-chugakko':       'Japanese junior high school hallway interior, lockers and notice boards, bright corridor, afternoon light, no people, photorealistic',
  'kumatori-daigaku':        'Japanese university campus, modern academic buildings, autumn leaves, wide campus path, no people, photorealistic',
  'kumatori-naraigoto':      'Japanese music lesson room interior, small piano and music books on stand, colorful art supplies on desk, warm light, no people, photorealistic',
  'kumatori-iryohi':         'clean Japanese pediatric clinic interior, small examination table, colorful wall decorations, stethoscope and medical tools on desk, no people, photorealistic',

  // イベント系
  'kumatori-matsuri':        'Japanese traditional festival matsuri, glowing paper lanterns hanging, colorful festival stalls at night, warm atmospheric lighting, no people, photorealistic',
  'eiraku-sakura':           'cherry blossom festival in Japan, full bloom sakura trees, families picnicking, pink petals falling, photorealistic',
  'kumatori-event':          'Japanese community outdoor event, colorful tents and stalls, festive banners and decorations, lively atmosphere, no people, photorealistic',

  // 歴史・文化系
  'kumatori-rekishi':        'traditional Japanese historical architecture, old wooden buildings, cultural heritage site, quiet atmosphere, photorealistic',
  'kumatori-bunka':          'Japanese cultural heritage building, traditional wooden architecture, moss covered stone, historic preservation, photorealistic',

  // 自然系
  'kumatori-nature':         'Japanese nature landscape, green mountains and forest, clear stream, peaceful countryside Osaka, photorealistic',
  'kumatori-outdoor':        'Japanese nature hiking trail, green forest path, sunlight filtering through trees, peaceful outdoor scenery, no people, photorealistic',
};

// カテゴリ別デフォルトプロンプト（スラグが未定義の場合）
const CATEGORY_DEFAULTS = {
  'グルメ・飲食店': 'delicious Japanese food on wooden table, restaurant interior, warm lighting, photorealistic, food photography',
  '観光・おでかけ': 'beautiful Japanese countryside sightseeing spot, scenic landscape, visitors enjoying nature, photorealistic',
  '暮らし・住まい': 'peaceful Japanese suburban neighborhood, quiet residential street, everyday life, photorealistic',
  '子育て・教育':   'happy Japanese children and family, outdoor park, sunny day, photorealistic',
  'イベント・祭り': 'Japanese community festival event, lanterns and crowds, lively outdoor atmosphere, photorealistic',
  '歴史・文化':     'traditional Japanese historic building, wooden architecture, cultural heritage, photorealistic',
  '自然・アウトドア': 'Japanese nature landscape, green forest and mountains, peaceful scenery, photorealistic',
};

// 共通ネガティブプロンプト（低品質・人物・不適切な要素を排除）
// Stable Diffusion は人物生成が不安定なため、人物関連ワードを全面的に排除する
const NEGATIVE_PROMPT = 'ugly, low quality, blurry, text, watermark, logo, cartoon, anime, illustration, distorted, deformed, bad anatomy, extra limbs, western food, modern signage, people, humans, person, man, woman, child, girl, boy, face, body, figure, crowd, silhouette, portrait';

// ─── 5つのビジュアルスタイルパターン ───
// アイキャッチ画像に統一感と変化をもたせるため5種類のスタイルを定義する
// 連続する記事で同じパターンが重ならないようにSTYLE_MAPで管理する
const STYLE_PATTERNS = {
  1: {
    name: 'フォトリアルフード（料理・食材クローズアップ）',
    suffix: ', close-up food photography, shallow depth of field, bokeh background, food styling, warm natural light',
  },
  2: {
    name: '温かみのあるインテリア（店内・室内空間）',
    suffix: ', wide interior shot, warm ambient lighting, cozy atmosphere, architectural photography, cinematic composition',
  },
  3: {
    name: '明るいアウトドア（自然・屋外・街並み）',
    suffix: ', outdoor bright natural daylight, wide angle shot, vibrant colors, clear blue sky, landscape photography',
  },
  4: {
    name: 'シネマティック夜景（夜・夕暮れ・ムード）',
    suffix: ', cinematic night photography, warm bokeh lights, moody dark atmosphere, dramatic lighting, golden hour glow',
  },
  5: {
    name: '生活感・温もり（小物・空間・環境・人物なし）',
    // 人物なしで「生活感」を表現する：小物・食卓・道具・空間の構成で温かみを出す
    suffix: ', lifestyle flatlay composition, everyday objects beautifully arranged, warm soft ambient light, shallow depth of field, bokeh background, cozy atmosphere, no people',
  },
};

// ─── 記事スラグ別スタイルパターン対応表 ───
// 記事番号順に連続しないパターン（P1→P2→P1→P4→...）を割り当て済み
const STYLE_MAP = {
  // グルメ系（記事01〜12）
  'kumatori-lunch-osusume':  1, // P1:フード
  'kumatori-cafe':           2, // P2:インテリア
  'kumatori-sweets':         1, // P1:フード
  'kumatori-izakaya':        4, // P4:夜景
  'kumatori-ramen':          1, // P1:フード
  'kumatori-pan':            2, // P2:インテリア
  'kumatori-ekimae':         4, // P4:夜景
  'kumatori-newopen':        3, // P3:アウトドア
  'kumatori-korokke':        1, // P1:フード
  'kumatori-mizunasu':       3, // P3:アウトドア
  'kumatori-takeout':        5, // P5:ライフスタイル
  'kumatori-kosodateranch':  2, // P2:インテリア
  'kumatori-niko-bagels':    1, // P1:フード
  // 観光系（記事13〜20）
  'kumatori-kanko':          3, // P3:アウトドア
  'eiraku-dam':              5, // P5:ライフスタイル
  'eiraku-yume-park':        3, // P3:アウトドア
  'kumatori-kouen':          5, // P5:ライフスタイル
  'kumatori-hiking':         4, // P4:夜景（森の陰影）
  'nakake-house':            2, // P2:インテリア
  'kumatori-instaphoto':     3, // P3:アウトドア
  'kumatori-onsen':          4, // P4:夜景
  // 暮らし系（記事21〜28）
  'kumatori-sumiyasusa':     5, // P5:ライフスタイル
  'kumatori-iju':            3, // P3:アウトドア
  'kumatori-eki':            4, // P4:夜景（駅）
  'kumatori-super':          5, // P5:ライフスタイル
  'kumatori-hospital':       2, // P2:インテリア
  'himawari-bus':            3, // P3:アウトドア
  'kumatori-fudosan':        5, // P5:ライフスタイル
  'kumatori-chian':          4, // P4:夜景
  // 子育て系（記事29〜35）
  'kumatori-kosodate':       5, // P5:ライフスタイル
  'kumatori-hoikuen':        2, // P2:インテリア
  'kumatori-shogakko':       5, // P5:ライフスタイル
  'kumatori-chugakko':       3, // P3:アウトドア
  'kumatori-daigaku':        2, // P2:インテリア
  'kumatori-naraigoto':      5, // P5:ライフスタイル
  'kumatori-iryohi':         2, // P2:インテリア
  // イベント系（記事36〜38）
  'kumatori-matsuri':        4, // P4:夜景
  'eiraku-sakura':           3, // P3:アウトドア
  'kumatori-event':          5, // P5:ライフスタイル
  // 歴史・文化系（記事39〜40）
  'kumatori-rekishi':        2, // P2:インテリア
  'kumatori-bunka':          4, // P4:夜景（ドラマチック）
  // 自然系（記事41〜42）
  'kumatori-nature':         3, // P3:アウトドア
  'kumatori-outdoor':        5, // P5:ライフスタイル
};

// ─── プロンプト決定（ベースプロンプト＋スタイルサフィックスを結合） ───
function getPrompt(meta) {
  // ベースプロンプトを取得
  const base = PROMPT_MAP[meta.slug]
    || CATEGORY_DEFAULTS[meta.category]
    || 'beautiful Japan local town scenery, peaceful countryside, photorealistic';

  // スタイルパターンを取得（未定義スラグはP1をデフォルト）
  const styleNum = STYLE_MAP[meta.slug] || 1;
  const style = STYLE_PATTERNS[styleNum];
  console.log(`   スタイル: P${styleNum} ${style.name}`);

  return base + style.suffix;
}

// ─── 記事HTMLからMETAを解析 ───
function parseMeta(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/<!--\s*META:\s*([\s\S]*?)-->/);
  if (!match) throw new Error('METAブロックが見つかりません');
  return JSON.parse(match[1]);
}

// ─── HTTPSリクエスト（共通） ───
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch (e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('リクエストタイムアウト')); });
    if (postData) req.write(postData);
    req.end();
  });
}

// ─── 待機 ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── リダイレクト対応ダウンロード ───
function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(url, hops) {
      if (hops > 10) return reject(new Error('リダイレクト過多'));
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { headers: { 'User-Agent': 'kumatori-articles/2.0' } }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return get(new URL(res.headers.location, url).href, hops + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 30 * 1024) return reject(new Error(`サイズ不足 (${(buf.length / 1024).toFixed(0)}KB)`));
          fs.writeFileSync(dest, buf);
          resolve((buf.length / 1024).toFixed(0));
        });
      });
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('ダウンロードタイムアウト')); });
      req.on('error', reject);
    }
    get(url, 0);
  });
}

// ─── Stable Horde でAI画像生成 ───
async function generateWithStableHorde(prompt, savePath) {
  const fullPrompt = `${prompt} ### ${NEGATIVE_PROMPT}`;

  // ジョブ送信
  const payload = JSON.stringify({
    prompt: fullPrompt,
    params: {
      sampler_name: 'k_euler_a',
      steps: 25,
      cfg_scale: 7.5,
      width: 576,
      height: 384,
      n: 1,
      karras: true,
    },
    models: ['stable_diffusion'],
    r2: true, // 画像をCloudflare R2にアップロードしURLで返す
  });

  const submitRes = await httpsRequest({
    hostname: 'stablehorde.net',
    path: '/api/v2/generate/async',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'apikey': '0000000000', // 匿名キー（無料）
      'Client-Agent': 'kumatori-articles:2.0',
    },
  }, payload);

  if (submitRes.status !== 202) {
    throw new Error(`ジョブ送信失敗 (HTTP ${submitRes.status}): ${JSON.stringify(submitRes.body).substring(0, 100)}`);
  }

  const jobId = submitRes.body.id;
  console.log(`   ジョブID: ${jobId}`);

  // ポーリング（最大10分）
  for (let i = 0; i < 60; i++) {
    await sleep(10000); // 10秒ごとに確認

    const checkRes = await httpsRequest({
      hostname: 'stablehorde.net',
      path: `/api/v2/generate/check/${jobId}`,
      method: 'GET',
      headers: { 'apikey': '0000000000', 'Client-Agent': 'kumatori-articles:2.0' },
    });

    const s = checkRes.body;
    if (s.faulted) throw new Error('Stable Horde 生成エラー（faulted）');
    if (!s.done) {
      console.log(`   生成中... キュー位置: ${s.queue_position ?? '-'} | 推定待機: ${s.wait_time ?? '-'}秒`);
      continue;
    }

    // 完成 → 結果取得
    const statusRes = await httpsRequest({
      hostname: 'stablehorde.net',
      path: `/api/v2/generate/status/${jobId}`,
      method: 'GET',
      headers: { 'apikey': '0000000000', 'Client-Agent': 'kumatori-articles:2.0' },
    });

    const gen = statusRes.body.generations && statusRes.body.generations[0];
    if (!gen || !gen.img) throw new Error('生成結果が空');

    // 画像ダウンロード（URLまたはbase64）
    if (gen.img.startsWith('http')) {
      const kb = await download(gen.img, savePath);
      return kb;
    } else {
      // base64の場合
      const buf = Buffer.from(gen.img, 'base64');
      fs.writeFileSync(savePath, buf);
      return (buf.length / 1024).toFixed(0);
    }
  }

  throw new Error('タイムアウト（10分経過）');
}

// ─── メイン処理 ───
async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('使い方: node generate-eyecatch.js articles/XX_xxx.html');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }

  const meta = parseMeta(filePath);
  const fileBase = path.basename(filePath, '.html');
  const imagesDir = path.join(path.dirname(filePath), '..', 'images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  const savePath = path.join(imagesDir, `${fileBase}.png`);

  // 既存ファイルがあればスキップ
  if (fs.existsSync(savePath)) {
    console.log(`⚠️ 画像が既に存在します: ${path.basename(savePath)}`);
    console.log('   上書きする場合は先にファイルを削除してください。');
    return;
  }

  const prompt = getPrompt(meta);
  console.log(`🎨 AI画像を生成中（Stable Horde）`);
  console.log(`   スラグ: ${meta.slug}`);
  console.log(`   プロンプト: ${prompt.substring(0, 80)}...`);

  try {
    const kb = await generateWithStableHorde(prompt, savePath);
    console.log(`✅ AI画像生成・保存完了！ (${kb} KB)`);
    console.log(`   保存先: ${path.basename(savePath)}`);
  } catch (e) {
    console.error(`❌ 生成失敗: ${e.message}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('❌ 予期しないエラー:', e.message); process.exit(1); });
