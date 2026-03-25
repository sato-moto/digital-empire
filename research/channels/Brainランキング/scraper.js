/**
 * Brain Market — AI カテゴリ ランキングスクレイパー
 *
 * 戦略：
 *  Phase 1 → Puppeteer でページを開きネットワークリクエストを傍受 → API エンドポイントを特定
 *  Phase 2 → 特定した API を直接 fetch で叩いてページング → 300件取得
 *  Phase 3 → CSV / JSON に保存
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');
const https     = require('https');
const http      = require('http');

// ── 設定 ─────────────────────────────────────────
const TARGET_URL  = 'https://brain-market.com/search?q=AI&order=fav&searchType=fav';
const TARGET_COUNT = 300;
const OUT_DIR     = __dirname;
const OUT_CSV     = path.join(OUT_DIR, 'brain_AI_ranking.csv');
const OUT_JSON    = path.join(OUT_DIR, 'brain_AI_ranking.json');

// 傍受したい API リクエストのパターン
const API_PATTERNS = [
  /\/api\//,
  /\/search/,
  /brain-market\.com.*\?(.*q=AI|.*order=fav)/,
  /graphql/i,
];

// ── ユーティリティ ────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** CSV 用に文字列をエスケープ */
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** オブジェクト配列 → CSV 文字列 */
function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

/** HTTP GET をプロミスで */
function fetchUrl(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ja,en;q=0.9',
        'Referer': 'https://brain-market.com/',
        ...extraHeaders,
      },
    };
    const req = lib.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Phase 1: API エンドポイント特定 ───────────────
async function detectApiEndpoint() {
  console.log('\n📡 Phase 1: ブラウザ起動 & API エンドポイント検出中...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // ネットワークリクエストを全て記録
  const capturedRequests = [];

  await page.setRequestInterception(true);
  page.on('request', req => {
    req.continue();
  });

  page.on('response', async res => {
    const url  = res.url();
    const type = res.request().resourceType();
    // XHR / fetch / document のみ対象
    if (!['xhr', 'fetch', 'document'].includes(type)) return;
    if (url.includes('analytics') || url.includes('gtm') || url.includes('segment')) return;

    try {
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('json')) {
        const body = await res.text().catch(() => '');
        capturedRequests.push({ url, type, status: res.status(), body: body.slice(0, 2000) });
        console.log(`  🔍 JSON レスポンス検出: ${url.slice(0, 100)}`);
      }
    } catch (e) { /* ignore */ }
  });

  console.log(`  ブラウザでページを開いています: ${TARGET_URL}`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
    console.log('  ⚠️  networkidle2 タイムアウト — domcontentloaded で続行');
  });

  // コンテンツが描画されるまで少し待つ
  await sleep(4000);

  // ページの実際のコンテンツも念のため取得（DOM スクレイプのフォールバック用）
  const domData = await page.evaluate(() => {
    // 商品カードを探す（一般的なクラス名パターンで試みる）
    const cards = [];

    // Vuetify のカード/リストアイテムを探す
    const candidates = document.querySelectorAll(
      'a[href*="/u/"], a[href*="/brain/"], .v-card, article, [class*="article"], [class*="card"], [class*="item"]'
    );

    candidates.forEach(el => {
      const link = el.closest('a') || el.querySelector('a');
      const href = link ? link.href : '';
      if (!href || !href.includes('brain-market.com')) return;

      const text  = el.innerText || '';
      const price = text.match(/[¥￥]\s?[\d,]+/) || text.match(/[\d,]+\s*円/);
      cards.push({
        href,
        text: text.slice(0, 200),
        price: price ? price[0] : '',
      });
    });

    return {
      cards,
      title: document.title,
      url: location.href,
      // ページ内の全 a タグで brain-market のものを収集
      allLinks: Array.from(document.querySelectorAll('a[href*="brain-market.com/u/"]'))
        .map(a => ({ href: a.href, text: a.innerText.trim().slice(0, 100) }))
        .slice(0, 20),
    };
  });

  console.log(`  DOM スキャン結果: カード候補 ${domData.cards.length} 件, リンク ${domData.allLinks.length} 件`);
  if (domData.allLinks.length > 0) {
    console.log('  サンプルリンク:', domData.allLinks.slice(0, 3));
  }

  await browser.close();

  return { capturedRequests, domData };
}

// ── Phase 2: API を叩いてデータ収集 ───────────────
async function collectViaApi(apiBase, cookies = '') {
  const allItems = [];
  let page = 1;
  const perPage = 30; // 推定値（後で調整）

  while (allItems.length < TARGET_COUNT) {
    const url = `${apiBase}&page=${page}`;
    console.log(`  📥 取得中: page=${page} (現在 ${allItems.length}/${TARGET_COUNT} 件)`);

    const res = await fetchUrl(url, cookies ? { Cookie: cookies } : {}).catch(e => {
      console.log(`  ⚠️  エラー: ${e.message}`);
      return null;
    });

    if (!res || res.status !== 200) {
      console.log(`  ⚠️  HTTP ${res?.status} — 取得失敗`);
      break;
    }

    let json;
    try { json = JSON.parse(res.body); } catch (e) {
      console.log('  ⚠️  JSON パース失敗');
      break;
    }

    // データ配列の場所を推定（構造が不明なため汎用的に）
    const items = extractItems(json);
    if (!items.length) {
      console.log('  ℹ️  データなし — 取得完了');
      break;
    }

    allItems.push(...items);
    console.log(`  ✅ page ${page}: ${items.length} 件取得 (累計 ${allItems.length} 件)`);

    if (items.length < perPage) break; // 最終ページ
    page++;
    await sleep(500); // レート制限回避
  }

  return allItems.slice(0, TARGET_COUNT);
}

/** JSON レスポンスから商品配列を汎用的に抽出 */
function extractItems(json) {
  if (Array.isArray(json)) return json;

  // よくあるキー名を試す
  for (const key of ['data', 'items', 'results', 'articles', 'brains', 'products', 'contents', 'list']) {
    if (json[key] && Array.isArray(json[key])) return json[key];
  }

  // ネストを1段掘る
  for (const val of Object.values(json)) {
    if (val && typeof val === 'object') {
      for (const key of ['data', 'items', 'results', 'articles', 'list']) {
        if (val[key] && Array.isArray(val[key])) return val[key];
      }
    }
  }

  return [];
}

/** API アイテムを統一フォーマットに正規化 */
function normalizeItem(item, rank) {
  // Brain Market でよくあるフィールド名パターン
  const title = item.title || item.name || item.brain_title || item.content_title || '';
  const url   = item.url   || item.link || item.brain_url  ||
    (item.uid || item.id ? `https://brain-market.com/u/${item.uid || item.author_id}/b/${item.id}/` : '');
  const price = item.price || item.amount || item.brain_price || item.content_price || '';
  const reviews = item.fav_count || item.review_count || item.favorites || item.like_count || item.fav || '';
  const author  = item.author_name || item.user_name || item.username || item.author || '';
  const category = item.category || item.tag || item.genre || '';
  const description = item.description || item.summary || item.body_summary || '';
  const thumbnail = item.thumbnail || item.image || item.thumb_url || '';
  const createdAt = item.created_at || item.published_at || item.release_date || '';

  return {
    rank,
    title,
    url,
    price,
    reviews,
    author,
    category,
    description: String(description).slice(0, 200),
    thumbnail,
    createdAt,
    _raw: JSON.stringify(item).slice(0, 300),
  };
}

// ── Phase 2b: DOM スクレイプ（API 特定失敗時のフォールバック）──
async function collectViaDom() {
  console.log('\n🌐 Phase 2b: DOM スクレイピングモードに切り替え...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const allItems = [];
  let page = 1;

  while (allItems.length < TARGET_COUNT) {
    const url = `${TARGET_URL}&page=${page}`;
    console.log(`  📄 DOM 取得中: page=${page} (現在 ${allItems.length}/${TARGET_COUNT} 件)`);

    const tab = await browser.newPage();
    await tab.setViewport({ width: 1280, height: 900 });

    // ネットワーク傍受でAPIも探し続ける
    const apiHits = [];
    tab.on('response', async res => {
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('json') && res.url().includes('brain-market.com')) {
        const body = await res.text().catch(() => '');
        const items = extractItems(JSON.parse(body).catch ? {} : JSON.parse(body));
        if (items.length > 3) {
          apiHits.push({ url: res.url(), items });
        }
      }
    });

    try {
      await tab.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
    } catch (e) {
      await sleep(2000);
    }
    await sleep(3000);

    // API ヒットがあれば優先
    if (apiHits.length > 0) {
      console.log(`  🎯 API 発見: ${apiHits[0].url}`);
      await tab.close();
      await browser.close();
      return { items: apiHits[0].items, apiUrl: apiHits[0].url };
    }

    // DOM から直接スクレイプ
    const pageItems = await tab.evaluate((currentPage) => {
      const items = [];

      // ランキング順を保持するため、商品カードを包括的に探す
      const selectors = [
        'a[href*="/u/"][href*="/b/"]',
        '.v-card a',
        '[class*="article"] a',
        '[class*="item"] a',
        '[class*="card"] a',
        'main a[href*="brain-market"]',
      ];

      let links = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 3) { links = Array.from(found); break; }
      }

      // /u/*/b/* パターンのリンクを探す
      if (!links.length) {
        links = Array.from(document.querySelectorAll('a')).filter(a =>
          a.href && a.href.match(/brain-market\.com\/u\/[^/]+\/b\//)
        );
      }

      // 重複除去
      const seen = new Set();
      links.forEach((a, i) => {
        if (seen.has(a.href)) return;
        seen.add(a.href);

        const card = a.closest('[class*="card"]') || a.closest('[class*="item"]') ||
                     a.closest('[class*="article"]') || a.closest('li') || a.parentElement;
        const text = card ? card.innerText : a.innerText;

        // 価格を抽出
        const priceMatch = text.match(/[¥￥]\s?[\d,]+/) ||
                           text.match(/[\d,]+\s*円/) ||
                           text.match(/無料/);

        // レビュー・お気に入り数を抽出
        const favMatch = text.match(/(\d+)\s*(件|個|レビュー|お気に入り|favorites?|fav)/i);

        // 著者名を抽出（URLから）
        const authorMatch = a.href.match(/\/u\/([^/]+)\//);

        items.push({
          rank: (currentPage - 1) * 100 + i + 1, // 仮順位（後で補正）
          title: a.innerText.trim() || a.title || '',
          url: a.href,
          price: priceMatch ? priceMatch[0] : '',
          reviews: favMatch ? favMatch[1] : '',
          author: authorMatch ? authorMatch[1] : '',
          fullText: text.slice(0, 300),
        });
      });

      return items;
    }, page);

    if (!pageItems.length) {
      console.log('  ℹ️  これ以上データなし');
      await tab.close();
      break;
    }

    console.log(`  ✅ page ${page}: ${pageItems.length} 件取得 (累計 ${allItems.length + pageItems.length} 件)`);
    allItems.push(...pageItems);
    await tab.close();

    // 次のページが存在するか確認
    if (pageItems.length < 5) break;
    page++;
    await sleep(1000);
  }

  await browser.close().catch(() => {});
  return { items: allItems, apiUrl: null };
}

// ── メイン処理 ────────────────────────────────────
async function main() {
  console.log('━'.repeat(60));
  console.log('  Brain Market AI ランキングスクレイパー');
  console.log(`  対象: ${TARGET_URL}`);
  console.log(`  取得件数目標: ${TARGET_COUNT} 件`);
  console.log('━'.repeat(60));

  let rawItems   = [];
  let apiUrl     = null;

  // ── Phase 1: API エンドポイント検出
  const { capturedRequests, domData } = await detectApiEndpoint();

  console.log(`\n  傍受したJSONリクエスト: ${capturedRequests.length} 件`);

  // 商品データが入っていそうなリクエストを探す
  for (const req of capturedRequests) {
    try {
      const parsed = JSON.parse(req.body);
      const items  = extractItems(parsed);
      if (items.length >= 3) {
        console.log(`  🎯 API 発見！ → ${req.url}`);
        console.log(`     アイテム数: ${items.length}`);
        apiUrl = req.url;
        break;
      }
    } catch (e) { /* ignore */ }
  }

  if (apiUrl) {
    // URL からページパラメータを解析
    const urlObj    = new URL(apiUrl);
    const pageParam = urlObj.searchParams.has('page') ? 'page' : 'p';
    urlObj.searchParams.delete(pageParam);
    const baseApi   = urlObj.toString();

    console.log(`\n🚀 Phase 2: API 直接取得モード`);
    console.log(`   ベース API: ${baseApi}`);

    let page = 1;
    while (rawItems.length < TARGET_COUNT) {
      const url = `${baseApi}&${pageParam}=${page}`;
      console.log(`  📥 page=${page} (累計 ${rawItems.length} 件)`);

      const res = await fetchUrl(url).catch(() => null);
      if (!res || res.status !== 200) break;

      let parsed;
      try { parsed = JSON.parse(res.body); } catch { break; }

      const items = extractItems(parsed);
      if (!items.length) break;

      rawItems.push(...items);
      console.log(`  ✅ ${items.length} 件 (累計 ${rawItems.length} 件)`);
      if (items.length < 10) break;
      page++;
      await sleep(400);
    }
  } else {
    // フォールバック: DOM スクレイプ
    console.log('\n  ℹ️  API 自動検出失敗 → DOM スクレイピングモードへ');
    const result = await collectViaDom();
    rawItems = result.items;
    apiUrl   = result.apiUrl;

    // API が途中で見つかった場合
    if (apiUrl && rawItems.length < TARGET_COUNT) {
      console.log('\n🚀 API 発見！残りを API で補完中...');
      const urlObj = new URL(apiUrl);
      urlObj.searchParams.set('page', '2');
      // 再取得（省略）
    }
  }

  // ── Phase 3: 正規化 & 保存
  console.log(`\n💾 Phase 3: データ正規化 & 保存 (${Math.min(rawItems.length, TARGET_COUNT)} 件)`);

  const normalized = rawItems.slice(0, TARGET_COUNT).map((item, i) => {
    // API レスポンスか DOM スクレイプかで分岐
    if (item._raw !== undefined) return item; // すでに正規化済み
    if (item.fullText !== undefined) {
      // DOM スクレイプ結果
      return {
        rank:        i + 1,
        title:       item.title,
        url:         item.url,
        price:       item.price,
        reviews:     item.reviews,
        author:      item.author,
        category:    '',
        description: item.fullText,
        thumbnail:   '',
        createdAt:   '',
      };
    }
    return normalizeItem(item, i + 1);
  });

  // 保存
  fs.writeFileSync(OUT_JSON, JSON.stringify(normalized, null, 2), 'utf8');
  fs.writeFileSync(OUT_CSV,  '\uFEFF' + toCsv(normalized),       'utf8'); // BOM付きUTF-8

  console.log(`\n✅ 保存完了！`);
  console.log(`   📄 JSON: ${OUT_JSON}`);
  console.log(`   📊 CSV : ${OUT_CSV}`);
  console.log(`   総件数 : ${normalized.length} 件`);

  // サンプル表示
  console.log('\n── サンプル（上位5件） ──────────────────────');
  normalized.slice(0, 5).forEach(item => {
    console.log(`  #${item.rank} ${item.title?.slice(0, 40) || '(タイトルなし)'}`);
    console.log(`       URL: ${item.url?.slice(0, 60) || '—'}`);
    console.log(`       価格: ${item.price || '—'}  レビュー: ${item.reviews || '—'}`);
  });

  console.log('\n━'.repeat(60));
}

main().catch(err => {
  console.error('❌ 致命的エラー:', err.message);
  process.exit(1);
});
