/**
 * analytics-chat-server.js
 * アナリティクスデータをコンテキストにしたシンプルなチャットサーバー
 *
 * 起動: node analytics-chat-server.js
 * ブラウザで http://localhost:3737 を開く
 * Notion の embed ブロックに http://localhost:3737 を貼る
 */

import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3737;
const CFG_PATH  = path.join(__dirname, 'config.json');
const DATA_PATH = path.join(__dirname, 'analytics-data-latest.json');

const config = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
const claude = new Anthropic({ apiKey: config.anthropic_api_key || process.env.ANTHROPIC_API_KEY });

// ─── アナリティクスデータを読み込んでコンテキスト文字列を生成 ───
function buildContext() {
  if (!fs.existsSync(DATA_PATH)) return 'データなし';
  const d   = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const g28 = d.ga4_28d?.summary;
  const g7  = d.ga4_7d?.summary;
  const top7 = d.ga4_7d?.topPages?.slice(0, 8)
    .map(p => `  ${p.path}: ${p.pv}PV, ${p.users}ユーザー, 滞在${p.duration}秒`)
    .join('\n');
  const ch7 = d.ga4_7d?.channels
    ?.map(c => `  ${c.channel}: ${c.sessions}セッション`)
    .join('\n');
  const sc28 = d.sc_28d?.pages?.slice(0, 8)
    .map(p => `  ${p.url}: クリック${p.clicks}, 表示${p.impressions}, CTR${p.ctr_pct}%, ${p.position}位`)
    .join('\n');
  const kw28 = d.sc_28d?.keywords
    ?.filter(k => k.impressions > 0)
    .map(k => `  「${k.keyword}」表示${k.impressions}回・CTR${k.ctr_pct}%・${k.position}位`)
    .join('\n');

  return `
【熊取つーしん アナリティクスデータ（${d.collected_at}収集）】

■ GA4 サマリー
28日（${d.period_28d?.start}〜${d.period_28d?.end}）: セッション${g28?.sessions}, PV${g28?.pageviews}, ユーザー${g28?.users}, 直帰率${g28?.bounce_rate_pct}%, 滞在${g28?.avg_session_duration_sec}秒
7日（${d.period_7d?.start}〜${d.period_7d?.end}）: セッション${g7?.sessions}, PV${g7?.pageviews}, ユーザー${g7?.users}, 直帰率${g7?.bounce_rate_pct}%, 滞在${g7?.avg_session_duration_sec}秒

■ 7日間 上位ページ
${top7 || 'なし'}

■ 7日間 流入元
${ch7 || 'なし'}

■ Search Console 上位ページ（28日）
${sc28 || 'なし'}

■ Search Console キーワード（28日）
${kw28 || 'なし'}
`.trim();
}

// ─── チャット HTML ───
const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>アナリティクスAIアシスタント</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;
    background: #f7f7f5;
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-size: 14px;
  }
  #header {
    background: #1a1a1a;
    color: #fff;
    padding: 10px 16px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  #header span { opacity: 0.55; font-size: 11px; margin-left: auto; }
  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .msg {
    max-width: 88%;
    padding: 10px 14px;
    border-radius: 12px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13.5px;
  }
  .msg.user {
    background: #2f2f2f;
    color: #fff;
    align-self: flex-end;
    border-radius: 12px 12px 2px 12px;
  }
  .msg.ai {
    background: #fff;
    color: #1a1a1a;
    align-self: flex-start;
    border-radius: 12px 12px 12px 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  }
  .msg.loading { color: #aaa; font-style: italic; }
  #inputArea {
    border-top: 1px solid #e5e5e5;
    padding: 10px 14px;
    display: flex;
    gap: 8px;
    background: #fff;
    flex-shrink: 0;
    align-items: flex-end;
  }
  #input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13.5px;
    font-family: inherit;
    resize: none;
    outline: none;
    min-height: 38px;
    max-height: 96px;
    line-height: 1.5;
  }
  #input:focus { border-color: #888; }
  #sendBtn {
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0 16px;
    cursor: pointer;
    font-size: 13px;
    height: 38px;
    flex-shrink: 0;
  }
  #sendBtn:disabled { background: #ccc; cursor: not-allowed; }
  #clearBtn {
    background: none;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0 10px;
    cursor: pointer;
    font-size: 12px;
    color: #999;
    height: 38px;
    flex-shrink: 0;
  }
  #clearBtn:hover { background: #f5f5f5; }
</style>
</head>
<body>
<div id="header">
  📊 アナリティクスAIアシスタント
  <span>ページ移動で履歴リセット</span>
</div>
<div id="messages">
  <div class="msg ai">熊取つーしんのアナリティクスデータを読み込みました。数値の解釈・改善施策・記事アイデアなど気軽に聞いてください。</div>
</div>
<div id="inputArea">
  <textarea id="input" placeholder="例：今週の1位ページは？　CTR改善できる記事は？" rows="1"></textarea>
  <button id="clearBtn" onclick="clearChat()">消去</button>
  <button id="sendBtn" onclick="send()">送信</button>
</div>
<script>
  const messages = document.getElementById('messages');
  const input    = document.getElementById('input');
  const sendBtn  = document.getElementById('sendBtn');

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });

  function addMsg(text, role) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  async function send() {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    addMsg(text, 'user');
    const loading = addMsg('考え中…', 'ai loading');

    try {
      const res  = await fetch('/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text })
      });
      const data = await res.json();
      loading.className   = 'msg ai';
      loading.textContent = data.reply || 'エラーが発生しました';
    } catch(e) {
      loading.className   = 'msg ai';
      loading.textContent = 'サーバーエラー: ' + e.message;
    }

    sendBtn.disabled = false;
    input.focus();
  }

  function clearChat() {
    messages.innerHTML = '<div class="msg ai">履歴を消去しました。</div>';
  }

  input.focus();
</script>
</body>
</html>`;

// ─── HTTPサーバー ───
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET / → チャット画面
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  // POST /chat → Claude API
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        const context = buildContext();

        const response = await claude.messages.create({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: `あなたは熊取つーしん（kumatori-info.com）のアナリティクスアシスタントです。
以下の最新データを参照して、簡潔に日本語で答えてください。
データにない情報は「データにないため不明」と正直に答えてください。

${context}`,
          messages: [{ role: 'user', content: message }]
        });

        const reply = response.content[0].text;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ reply: 'エラー: ' + e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✅ アナリティクスチャットサーバー起動`);
  console.log(`   ブラウザ: http://localhost:${PORT}`);
  console.log(`   Notion embed URL: http://localhost:${PORT}`);
  console.log(`   停止: Ctrl+C`);
});
