import Anthropic from '@anthropic-ai/sdk';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Notionページのブロックをテキストに変換
async function fetchNotionContext(pageId) {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28'
      }
    });
    const data = await res.json();
    const lines = [];
    for (const block of data.results || []) {
      const type = block.type;
      const richText = block[type]?.rich_text || block[type]?.cells?.[0] || [];
      if (Array.isArray(richText)) {
        const text = richText.map(t => t.plain_text || '').join('');
        if (text) lines.push(text);
      }
      // テーブル行
      if (type === 'table_row') {
        const cells = block.table_row.cells.map(c => c.map(t => t.plain_text).join('')).join(' | ');
        if (cells.trim()) lines.push(cells);
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { messages, pageId } = req.body;

  // Notionからアナリティクスデータを取得してコンテキストに注入
  const notionContext = pageId ? await fetchNotionContext(pageId) : '';

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `あなたは地域情報メディア「熊取つーしん（kumatori-info.com）」の運営者・佐藤さんの専属アシスタントです。
佐藤さんはSEOの専門知識はない普通の個人運営者です。
今日のアナリティクスレポートを踏まえて、何でも気軽に相談に乗ってください。

ルール：
- 専門用語は使わない。使うなら必ず一言で説明する
- 答えは短く具体的に
- 「記事どう書く？」「これどういう意味？」など何でもOK
- 熊取町の地域情報メディアという文脈を常に意識する

## 今日のアナリティクスレポート（参考情報）
${notionContext || '（データなし）'}`,
    messages
  });

  res.json({ reply: response.content[0].text });
}
