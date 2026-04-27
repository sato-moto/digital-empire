/**
 * Notion親ページの子ページ一覧を取得して、MATH-M-01ハブの有無を確認する
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// トークン読み込み（出力しない）
const cfg = JSON.parse(fs.readFileSync('C:/Users/motok/OneDrive/Desktop/Claude code/blog/notion-config.json', 'utf8'));
const NOTION_TOKEN = cfg.token;

const PARENT_PAGE_ID = '33c18b0bfabc802ab708dfceed91a671';

function notionRequest(method, endpoint, data) {
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
    }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          const json = JSON.parse(text);
          if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${JSON.stringify(json)}`));
          else resolve(json);
        } catch (e) {
          reject(new Error(`parse error: ${text}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    // 親ページの子ブロック（子ページ）を取得
    const res = await notionRequest('GET', `blocks/${PARENT_PAGE_ID}/children?page_size=100`);
    console.log(`親ページ配下のブロック数: ${res.results.length}`);
    console.log('---');
    for (const block of res.results) {
      if (block.type === 'child_page') {
        console.log(`[child_page] id=${block.id} title=${block.child_page.title}`);
      } else {
        console.log(`[${block.type}] id=${block.id}`);
      }
    }
    console.log('---');
    // MATH-M-01 ハブの検索
    const mathHub = res.results.find(b => b.type === 'child_page' && b.child_page.title.includes('MATH-M-01'));
    if (mathHub) {
      console.log(`✓ MATH-M-01ハブ存在: ${mathHub.id} "${mathHub.child_page.title}"`);
    } else {
      console.log('✗ MATH-M-01ハブは存在しない → 新規作成が必要');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
