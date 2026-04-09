/**
 * notion-sync.js
 * 熊取つーしん記事一覧をNotionデータベースに一括登録するスクリプト
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── 設定読み込み ───
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'notion-config.json'), 'utf8'));
const NOTION_TOKEN = config.token;
const PAGE_ID = config.page_id;
const ARTICLES_DIR = path.join(__dirname, 'articles');
const SITE_URL = 'https://kumatori-info.com';

// ─── Notion API リクエスト ───
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
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const parsed = JSON.parse(d);
        res.statusCode < 300 ? resolve(parsed) : reject(parsed);
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── HTMLからMETAを抽出 ───
function extractMeta(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/<!--\s*META:\s*([\s\S]*?)-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// ─── Notionデータベース作成 ───
async function createDatabase() {
  console.log('📋 Notionデータベースを作成中...');
  const db = await notionRequest('POST', 'databases', {
    parent: { type: 'page_id', page_id: PAGE_ID },
    title: [{ type: 'text', text: { content: '熊取つーしん 記事管理台帳' } }],
    properties: {
      'タイトル':      { title: {} },
      '記事番号':      { number: { format: 'number' } },
      'カテゴリ':      { select: { options: [] } },
      'フォーカスKW':  { rich_text: {} },
      'タグ':          { multi_select: { options: [] } },
      '公開URL':       { url: {} },
      '最終更新':      { rich_text: {} },
      'スラッグ':      { rich_text: {} }
    }
  });
  console.log(`✅ データベース作成完了 (ID: ${db.id})`);
  return db.id;
}

// ─── 記事1件をNotionに追加 ───
async function addEntry(dbId, meta) {
  const articleUrl = `${SITE_URL}/${meta.slug}/`;
  const tags = (meta.tags || []).map(t => ({ name: t }));

  await notionRequest('POST', 'pages', {
    parent: { database_id: dbId },
    properties: {
      'タイトル':     { title: [{ text: { content: meta.title || '' } }] },
      '記事番号':     { number: meta.article_number || null },
      'カテゴリ':     { select: meta.category ? { name: meta.category } : null },
      'フォーカスKW': { rich_text: [{ text: { content: meta.focus_keyword || '' } }] },
      'タグ':         { multi_select: tags },
      '公開URL':      { url: articleUrl },
      '最終更新':     { rich_text: [{ text: { content: meta.last_updated || '' } }] },
      'スラッグ':     { rich_text: [{ text: { content: meta.slug || '' } }] }
    }
  });
}

// ─── メイン処理 ───
async function main() {
  // 全記事ファイルを収集・番号順にソート
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`📁 記事ファイル数: ${files.length}`);

  // METAデータ抽出
  const articles = [];
  for (const file of files) {
    const meta = extractMeta(path.join(ARTICLES_DIR, file));
    if (meta) {
      articles.push(meta);
    } else {
      console.warn(`⚠️ META取得失敗: ${file}`);
    }
  }
  console.log(`✅ META取得成功: ${articles.length}件`);

  // Notionデータベース作成
  const dbId = await createDatabase();

  // 1件ずつ登録（レート制限対策: 300msインターバル）
  let success = 0;
  for (const meta of articles) {
    try {
      await addEntry(dbId, meta);
      console.log(`  ✅ [${String(meta.article_number).padStart(2,'0')}] ${meta.title}`);
      success++;
    } catch (e) {
      console.error(`  ❌ [${meta.article_number}] ${meta.title}: ${e.message || JSON.stringify(e)}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n🎉 完了: ${success}/${articles.length}件 登録成功`);
  console.log(`🔗 https://www.notion.so/${PAGE_ID.replace(/-/g,'')}`);
}

main().catch(console.error);
