/**
 * notion-status-sync.js
 * WordPress の公開ステータスを取得し Notion 管理台帳に反映するスクリプト
 *
 * 使い方: node notion-status-sync.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── 設定読み込み ───
const notionCfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'notion-config.json'), 'utf8'));
const wpCfg     = JSON.parse(fs.readFileSync(path.join(__dirname, 'wp-config.json'), 'utf8'));

const NOTION_TOKEN = notionCfg.token;
const DB_ID        = '33d18b0b-fabc-8185-8a34-dd07907b22b5';
const WP_AUTH      = Buffer.from(`${wpCfg.username}:${wpCfg.app_password}`).toString('base64');
const WP_HOST      = 'kumatori-info.com';

// WPステータス → Notion表示名
const STATUS_MAP = {
  publish:   '公開済み',
  draft:     '下書き',
  private:   '非公開',
  trash:     '削除済み',
  not_found: '未投稿'
};

// ─── Notion API ───
function notionReq(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const body = data ? Buffer.from(JSON.stringify(data)) : null;
    const req = https.request({
      hostname: 'api.notion.com',
      path: `/v1/${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': body.length } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const p = JSON.parse(d);
        res.statusCode < 300 ? resolve(p) : reject(p);
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── WordPress API（スラッグでステータス取得） ───
function getWpStatus(slug) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: WP_HOST,
      path: `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=any&_fields=status`,
      method: 'GET',
      headers: { 'Authorization': `Basic ${WP_AUTH}` }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const posts = JSON.parse(d);
          resolve(Array.isArray(posts) && posts.length > 0 ? posts[0].status : 'not_found');
        } catch {
          resolve('not_found');
        }
      });
    });
    req.on('error', () => resolve('not_found'));
    req.end();
  });
}

// ─── Notionの全ページを取得 ───
async function getAllPages() {
  const pages = [];
  let cursor;
  while (true) {
    const res = await notionReq('POST', `databases/${DB_ID}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });
    pages.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  return pages;
}

// ─── メイン処理 ───
async function main() {
  console.log('🔄 kumatori-info.com ← Notion ステータス同期開始\n');

  const pages = await getAllPages();
  console.log(`📋 対象: ${pages.length}件\n`);

  let updated = 0, unchanged = 0, skipped = 0;

  for (const page of pages) {
    const slug    = page.properties['スラッグ']?.rich_text?.[0]?.text?.content || '';
    const title   = page.properties['タイトル']?.title?.[0]?.text?.content || '(不明)';
    const current = page.properties['公開ステータス']?.select?.name || '';

    if (!slug) {
      console.log(`  ⚠️  スラッグなし → スキップ: ${title}`);
      skipped++;
      continue;
    }

    const wpStatus     = await getWpStatus(slug);
    const notionStatus = STATUS_MAP[wpStatus] || '下書き';

    if (notionStatus === current) {
      console.log(`  ✓  変更なし [${notionStatus}] ${title}`);
      unchanged++;
    } else {
      await notionReq('PATCH', `pages/${page.id}`, {
        properties: { '公開ステータス': { select: { name: notionStatus } } }
      });
      console.log(`  ✅ 更新 [${current || '未設定'} → ${notionStatus}] ${title}`);
      updated++;
    }

    // レート制限対策
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n🎉 同期完了 — 更新: ${updated}件 / 変更なし: ${unchanged}件 / スキップ: ${skipped}件`);
}

main().catch(console.error);
