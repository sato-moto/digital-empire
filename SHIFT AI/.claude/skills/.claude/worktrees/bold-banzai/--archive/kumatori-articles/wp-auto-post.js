const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── 設定読み込み ───
const CONFIG_PATH = path.join(__dirname, 'wp-config.json');
const ARTICLES_DIR = path.join(__dirname, 'articles');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ wp-config.json が見つかりません');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

// ─── WordPress REST API通信 ───
function wpRequest(config, method, endpoint, data = null, isMultipart = false, fileBuffer = null, fileName = null, mimeType = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.site_url}/wp-json/wp/v2/${endpoint}`);
    const auth = Buffer.from(`${config.username}:${config.app_password}`).toString('base64');
    const isHttps = url.protocol === 'https:';

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'KumatoriAutoPost/2.0'
      }
    };

    let body = null;

    if (isMultipart && fileBuffer) {
      // ファイルアップロード
      const boundary = '----KumatoriUpload' + Date.now();
      options.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      
      const parts = [];
      parts.push(`--${boundary}\r\n`);
      parts.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
      parts.push(`Content-Type: ${mimeType}\r\n\r\n`);
      
      const header = Buffer.from(parts.join(''));
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      
      // alt_text等の追加フィールド
      let extraFields = '';
      if (data && data.alt_text) {
        extraFields += `\r\n--${boundary}\r\nContent-Disposition: form-data; name="alt_text"\r\n\r\n${data.alt_text}`;
      }
      if (data && data.title) {
        extraFields += `\r\n--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\n${data.title}`;
      }
      const extraBuf = Buffer.from(extraFields);
      
      body = Buffer.concat([header, fileBuffer, extraBuf, footer]);
      options.headers['Content-Length'] = body.length;
    } else if (data) {
      options.headers['Content-Type'] = 'application/json';
      body = Buffer.from(JSON.stringify(data));
    }

    const req = (isHttps ? https : http).request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, message: parsed.message || parsed.code || responseBody });
          }
        } catch (e) {
          reject({ status: res.statusCode, message: responseBody.substring(0, 500) });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── 記事HTMLからメタデータを抽出 ───
function parseArticle(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const metaMatch = content.match(/<!--\s*META:\s*([\s\S]*?)-->/);
  if (!metaMatch) {
    console.error(`❌ メタデータが見つかりません: ${filePath}`);
    return null;
  }

  let meta;
  try {
    meta = JSON.parse(metaMatch[1]);
  } catch (e) {
    console.error(`❌ メタデータのJSONが不正です: ${filePath}`);
    return null;
  }

  // METAブロックを除去後、先頭のH1タグも除去（WordPressがタイトルを別途表示するため重複防止）
  const htmlBody = content
    .replace(/<!--\s*META:\s*[\s\S]*?-->/, '')
    .trim()
    .replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  return { meta, htmlBody };
}

// ─── カテゴリ取得 or 作成 ───
async function getOrCreateCategory(config, categoryName) {
  const existing = await wpRequest(config, 'GET', `categories?search=${encodeURIComponent(categoryName)}&per_page=100`);
  const found = existing.find(c => c.name === categoryName);
  if (found) return found.id;
  const created = await wpRequest(config, 'POST', 'categories', { name: categoryName });
  console.log(`  📁 カテゴリ作成: ${categoryName} (ID: ${created.id})`);
  return created.id;
}

// ─── タグ取得 or 作成 ───
async function getOrCreateTag(config, tagName) {
  const existing = await wpRequest(config, 'GET', `tags?search=${encodeURIComponent(tagName)}&per_page=100`);
  const found = existing.find(t => t.name === tagName);
  if (found) return found.id;
  const created = await wpRequest(config, 'POST', 'tags', { name: tagName });
  return created.id;
}

// ─── アイキャッチ画像アップロード ───
async function uploadFeaturedImage(config, imagePath, altText, title) {
  if (!fs.existsSync(imagePath)) {
    console.log(`  ⚠️ 画像ファイルが見つかりません: ${imagePath}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);
  const ext = path.extname(fileName).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  try {
    const media = await wpRequest(config, 'POST', 'media', 
      { alt_text: altText, title: title },
      true, fileBuffer, fileName, mimeType
    );
    console.log(`  🖼️ 画像アップロード成功 (ID: ${media.id})`);
    return media.id;
  } catch (error) {
    console.error(`  ❌ 画像アップロード失敗: ${error.message}`);
    return null;
  }
}

// ─── Yoast SEOメタ設定（投稿後に別リクエスト） ───
async function setYoastMeta(config, postId, meta) {
  const yoastFields = {};
  if (meta.seo_title) yoastFields['_yoast_wpseo_title'] = meta.seo_title;
  if (meta.meta_description) yoastFields['_yoast_wpseo_metadesc'] = meta.meta_description;
  if (meta.focus_keyword) yoastFields['_yoast_wpseo_focuskw'] = meta.focus_keyword;

  // 方法1: meta フィールドで設定
  try {
    await wpRequest(config, 'POST', `posts/${postId}`, { meta: yoastFields });
    console.log(`  🎯 Yoast SEO設定成功（方法1: meta）`);
    return true;
  } catch (e) {
    console.log(`  ⚠️ 方法1失敗、方法2を試行...`);
  }

  // 方法2: yoast_meta 直接設定
  try {
    await wpRequest(config, 'POST', `posts/${postId}`, { yoast_meta: yoastFields });
    console.log(`  🎯 Yoast SEO設定成功（方法2: yoast_meta）`);
    return true;
  } catch (e) {
    console.log(`  ⚠️ 方法2も失敗`);
  }

  // 方法3: アンダースコアなしで試行
  try {
    const altFields = {};
    if (meta.seo_title) altFields['yoast_wpseo_title'] = meta.seo_title;
    if (meta.meta_description) altFields['yoast_wpseo_metadesc'] = meta.meta_description;
    if (meta.focus_keyword) altFields['yoast_wpseo_focuskw'] = meta.focus_keyword;
    await wpRequest(config, 'POST', `posts/${postId}`, { meta: altFields });
    console.log(`  🎯 Yoast SEO設定成功（方法3: no underscore）`);
    return true;
  } catch (e) {
    console.error(`  ❌ Yoast SEO設定失敗: REST APIでメタフィールドが登録されていない可能性`);
    console.error(`  💡 解決策: mu-plugin をインストールしてください（setup-yoast-rest.php）`);
    return false;
  }
}

// ─── 記事投稿 ───
async function postArticle(config, filePath) {
  const parsed = parseArticle(filePath);
  if (!parsed) return false;

  const { meta, htmlBody } = parsed;
  const fileName = path.basename(filePath);
  const fileBase = path.basename(filePath, '.html');

  console.log(`\n📝 投稿中: ${meta.title}`);
  console.log(`   ファイル: ${fileName}`);

  try {
    // カテゴリ
    const categoryId = await getOrCreateCategory(config, meta.category);

    // タグ
    const tagIds = [];
    if (meta.tags && meta.tags.length > 0) {
      for (const tag of meta.tags) {
        const tagId = await getOrCreateTag(config, tag);
        tagIds.push(tagId);
      }
    }

    // アイキャッチ画像
    let featuredMediaId = null;
    const imgDir = path.join(path.dirname(filePath), '..', 'images');
    const possibleExts = ['.jpg', '.jpeg', '.png', '.webp'];
    
    for (const ext of possibleExts) {
      const imgPath = path.join(imgDir, `${fileBase}${ext}`);
      if (fs.existsSync(imgPath)) {
        const altText = meta.eyecatch_alt || `${meta.title}のアイキャッチ画像`;
        featuredMediaId = await uploadFeaturedImage(config, imgPath, altText, meta.title);
        break;
      }
    }

    // 記事投稿
    const postData = {
      title: meta.title,
      content: htmlBody,
      status: config.default_status || 'draft',
      slug: meta.slug,
      categories: [categoryId],
      tags: tagIds
    };

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    const result = await wpRequest(config, 'POST', 'posts', postData);
    console.log(`   ✅ 投稿成功！ (ID: ${result.id}, ステータス: ${result.status})`);
    console.log(`   🔗 ${result.link}`);

    // Yoast SEO メタ設定（投稿後に別リクエスト）
    await setYoastMeta(config, result.id, meta);

    return { success: true, postId: result.id };

  } catch (error) {
    console.error(`   ❌ 投稿失敗: ${error.message || JSON.stringify(error)}`);
    return { success: false };
  }
}

// ─── メイン処理 ───
async function main() {
  const args = process.argv.slice(2);
  const config = loadConfig();

  console.log('🐻 熊取つーしん 自動投稿ツール v2.0');
  console.log(`📡 サイト: ${config.site_url}`);
  console.log(`📋 ステータス: ${config.default_status}（${config.default_status === 'draft' ? '下書き保存' : '即時公開'}）`);
  console.log('─'.repeat(50));

  // 接続テスト
  if (args[0] === 'test') {
    console.log('\n🔍 接続テスト中...');
    try {
      const user = await wpRequest(config, 'GET', 'users/me');
      console.log(`✅ 接続成功！ ユーザー: ${user.name} (ID: ${user.id})`);
      const posts = await wpRequest(config, 'GET', 'posts?per_page=1');
      console.log(`✅ 記事取得OK`);
      const cats = await wpRequest(config, 'GET', 'categories?per_page=100');
      console.log(`✅ カテゴリ一覧: ${cats.map(c => c.name).join(', ')}`);
      
      // Yoast SEO対応チェック
      console.log('\n🔍 Yoast SEO REST APIチェック...');
      try {
        const testPost = await wpRequest(config, 'GET', 'posts?per_page=1&_fields=id,meta');
        if (testPost[0] && testPost[0].meta) {
          const metaKeys = Object.keys(testPost[0].meta);
          const yoastKeys = metaKeys.filter(k => k.includes('yoast'));
          if (yoastKeys.length > 0) {
            console.log(`✅ Yoast SEOメタフィールド検出: ${yoastKeys.join(', ')}`);
          } else {
            console.log(`⚠️ Yoast SEOメタフィールドがREST APIに未登録`);
            console.log(`💡 setup-yoast-rest.php をmu-pluginsにインストールしてください`);
          }
        }
      } catch (e) {
        console.log(`⚠️ メタフィールドチェック失敗`);
      }
    } catch (error) {
      console.error(`❌ 接続失敗: ${error.message || JSON.stringify(error)}`);
    }
    return;
  }

  // 既存記事を更新（update <WP投稿ID> <HTMLファイルパス>）
  if (args[0] === 'update') {
    const postId = args[1];
    const filePath = args[2] ? path.resolve(args[2]) : null;
    if (!postId || !filePath) {
      console.error('使い方: node wp-auto-post.js update <投稿ID> <HTMLファイルパス>');
      return;
    }
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${filePath}`);
      return;
    }
    const parsed = parseArticle(filePath);
    if (!parsed) return;
    const { meta, htmlBody } = parsed;
    const fileBase = path.basename(filePath, '.html');
    console.log(`\n✏️ 更新中: ${meta.title} (ID: ${postId})`);
    try {
      // アイキャッチ画像のアップロード（images/フォルダに同名ファイルがあれば）
      let featuredMediaId = null;
      const imgDir = path.join(path.dirname(filePath), '..', 'images');
      const possibleExts = ['.jpg', '.jpeg', '.png', '.webp'];
      for (const ext of possibleExts) {
        const imgPath = path.join(imgDir, `${fileBase}${ext}`);
        if (fs.existsSync(imgPath)) {
          const altText = meta.eyecatch_alt || `${meta.title}のアイキャッチ画像`;
          featuredMediaId = await uploadFeaturedImage(config, imgPath, altText, meta.title);
          break;
        }
      }

      // 本文・タイトル・スラッグを更新（画像があればfeatured_mediaも更新）
      const updateData = {
        title: meta.title,
        content: htmlBody,
        slug: meta.slug,
      };
      if (featuredMediaId) {
        updateData.featured_media = featuredMediaId;
      }

      const result = await wpRequest(config, 'POST', `posts/${postId}`, updateData);
      console.log(`   ✅ 本文更新成功！ (ID: ${result.id})`);
      await setYoastMeta(config, postId, meta);
    } catch (e) {
      console.error(`   ❌ 更新失敗: ${e.message || JSON.stringify(e)}`);
    }
    return;
  }

  // 特定ファイルを投稿
  if (args[0]) {
    const filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ ファイルが見つかりません: ${filePath}`);
      return;
    }
    await postArticle(config, filePath);
    return;
  }

  // articlesフォルダ内の全記事を投稿
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error(`❌ articles フォルダが見つかりません`);
    return;
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.html')).sort();
  if (files.length === 0) {
    console.log('📭 投稿する記事がありません');
    return;
  }

  console.log(`\n📚 ${files.length} 件の記事を投稿します...\n`);
  let success = 0, fail = 0;

  for (const file of files) {
    const result = await postArticle(config, path.join(ARTICLES_DIR, file));
    if (result && result.success) success++; else fail++;
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`🎉 完了！ 成功: ${success}件 / 失敗: ${fail}件`);
}

main().catch(console.error);
