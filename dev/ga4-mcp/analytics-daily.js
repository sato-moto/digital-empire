/**
 * analytics-daily.js
 * 熊取つーしん 毎日アナリティクス解析スクリプト
 *
 * 処理フロー:
 * 1. analytics-method.json から現在の分析手法を読み込む
 * 2. GA4 + Search Console からデータを取得（28日・7日の2期間）
 * 3. Claude API でデータ分析・インサイト生成・手法自己評価を実行
 * 4. Notion「熊取つーしんDB」に日報ページを追加
 * 5. 手法改善提案があれば analytics-method.json を更新
 *
 * 実行: node analytics-daily.js
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 設定読み込み（環境変数優先・ローカルのconfig.jsonはフォールバック） ───
let config = {};
const configPath = join(__dirname, 'config.json');
if (existsSync(configPath)) config = JSON.parse(readFileSync(configPath, 'utf8'));

const METHOD_PATH = join(__dirname, 'analytics-method.json');
let method = JSON.parse(readFileSync(METHOD_PATH, 'utf8'));

const NOTION_TOKEN   = process.env.NOTION_TOKEN   || config.notion_token || '';
const NOTION_PAGE_ID = '34018b0b-fabc-8158-909a-e53f133f3646';
const GA4_PROPERTY   = `properties/${process.env.GA4_PROPERTY_ID   || config.ga4_property_id}`;
const SC_SITE        =              process.env.SC_SITE_URL         || config.sc_site_url;
const ANTHROPIC_API_KEY =           process.env.ANTHROPIC_API_KEY  || config.anthropic_api_key || '';

// GitHub Actions 環境では GOOGLE_CREDENTIALS（Base64）から一時ファイルに書き出す
let CREDS_PATH = join(__dirname, 'credentials.json');
if (process.env.GOOGLE_CREDENTIALS) {
  const tmpCredPath = join(tmpdir(), 'ga4-credentials.json');
  writeFileSync(tmpCredPath, Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf8'));
  CREDS_PATH = tmpCredPath;
}

// ─── クライアント初期化 ───
const ga4 = new BetaAnalyticsDataClient({ keyFilename: CREDS_PATH });
const auth = new google.auth.GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});
const sc = google.searchconsole({ version: 'v1', auth });
const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─── 日付ユーティリティ ───
function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}
const today = new Date().toISOString().split('T')[0];

// ─── GA4 データ取得 ───
async function fetchGA4(startDate, endDate) {
  // サマリー
  const [sumRes] = await ga4.runReport({
    property: GA4_PROPERTY,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' }, { name: 'screenPageViews' },
      { name: 'totalUsers' }, { name: 'bounceRate' },
      { name: 'averageSessionDuration' }
    ]
  });
  const sumRow = sumRes.rows?.[0];
  const summary = sumRow ? {
    sessions:            parseInt(sumRow.metricValues[0].value),
    pageviews:           parseInt(sumRow.metricValues[1].value),
    users:               parseInt(sumRow.metricValues[2].value),
    bounce_rate_pct:     parseFloat((Number(sumRow.metricValues[3].value) * 100).toFixed(1)),
    avg_session_duration_sec: Math.round(Number(sumRow.metricValues[4].value))
  } : {};

  // トップページ（上位20件）
  const [topRes] = await ga4.runReport({
    property: GA4_PROPERTY,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'averageSessionDuration' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20
  });
  const topPages = topRes.rows?.map(row => ({
    path:     row.dimensionValues[0].value,
    pv:       parseInt(row.metricValues[0].value),
    users:    parseInt(row.metricValues[1].value),
    duration: Math.round(Number(row.metricValues[2].value))
  })) || [];

  // 流入チャネル
  const [chRes] = await ga4.runReport({
    property: GA4_PROPERTY,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
  });
  const channels = chRes.rows?.map(row => ({
    channel: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value),
    users:    parseInt(row.metricValues[1].value)
  })) || [];

  // 日別トレンド
  const [trendRes] = await ga4.runReport({
    property: GA4_PROPERTY,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }]
  });
  const dailyTrend = trendRes.rows?.map(row => {
    const d = row.dimensionValues[0].value;
    return {
      date: `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,
      sessions: parseInt(row.metricValues[0].value),
      pv:       parseInt(row.metricValues[1].value)
    };
  }) || [];

  return { summary, topPages, channels, dailyTrend };
}

// ─── Search Console データ取得 ───
async function fetchSearchConsole(startDate, endDate) {
  const authClient = await auth.getClient();

  // キーワード上位30件
  const kwRes = await sc.searchanalytics.query({
    siteUrl: SC_SITE,
    auth: authClient,
    requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 30 }
  });
  const keywords = kwRes.data.rows?.map(r => ({
    keyword:     r.keys[0],
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr_pct:     parseFloat((r.ctr * 100).toFixed(1)),
    position:    parseFloat(r.position.toFixed(1))
  })) || [];

  // ページ別上位20件
  const pgRes = await sc.searchanalytics.query({
    siteUrl: SC_SITE,
    auth: authClient,
    requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 20 }
  });
  const pages = pgRes.data.rows?.map(r => ({
    url:         r.keys[0].replace(SC_SITE, '/'),
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr_pct:     parseFloat((r.ctr * 100).toFixed(1)),
    position:    parseFloat(r.position.toFixed(1))
  })) || [];

  return { keywords, pages };
}

// ─── Claude API で分析・手法評価 ───
async function analyzeWithClaude(data28d, data7d, sc28d, sc7d) {
  const prompt = `
あなたは地域情報メディア「熊取つーしん（kumatori-info.com）」の編集戦略アドバイザーです。
運営者は熊取町在住の個人で、SEOの専門知識はありません。
データを見て「次に何をすべきか」を具体的に教えることが最大の役割です。

## GA4データ（直近28日）
${JSON.stringify(data28d, null, 2)}

## GA4データ（直近7日）
${JSON.stringify(data7d, null, 2)}

## Search Console（直近28日）
${JSON.stringify(sc28d, null, 2)}

## Search Console（直近7日）
${JSON.stringify(sc7d, null, 2)}

## 出力フォーマット（JSON必須）
**絶対ルール: JSONの総文字数を7000文字以内。文字数上限を超えたら必ず切り捨てること。**

{
  "report": {
    "today_summary": "今日のひとこと。専門用語なし。数字を使って端的に（100文字以内）",
    "traffic_table": [
      {"label": "訪問者数", "week": "直近7日の値", "month": "直近28日の値", "trend": "↑/↓/→", "memo": "一言（20文字以内）"},
      {"label": "ページ閲覧数", "week": "値", "month": "値", "trend": "↑/↓/→", "memo": "一言"},
      {"label": "Googleからの流入", "week": "値", "month": "値", "trend": "↑/↓/→", "memo": "一言"},
      {"label": "検索での表示回数", "week": "値", "month": "値", "trend": "↑/↓/→", "memo": "一言"},
      {"label": "検索からのクリック数", "week": "値", "month": "値", "trend": "↑/↓/→", "memo": "一言"}
    ],
    "hot_pages": [
      {"page": "ページパス", "visits": 数値, "why_hot": "注目理由（30文字以内）"}
    ],
    "article_strategy": [
      {
        "title": "具体的な記事タイトル案",
        "reason": "なぜ今書くべきか・データの根拠（60文字以内）",
        "keyword": "狙うキーワード",
        "difficulty": "簡単/普通/難しい"
      }
    ],
    "info_to_gather": [
      {
        "info": "集めるべき情報・取材内容",
        "article": "それで書ける記事タイトル案",
        "how": "入手方法（40文字以内）"
      }
    ],
    "one_action": "今日やるべきことを1つだけ。具体的に（60文字以内）",
    "alerts": ["気になること（50文字以内）×最大2件"]
  },
  "method_evaluation": {
    "current_method_score": 1から10の整数,
    "needs_update": true または false,
    "issues_found": ["問題点（40文字以内）×最大2件"],
    "proposed_changes": {
      "add_metrics": [],
      "remove_metrics": [],
      "change_thresholds": {},
      "add_sections": [],
      "special_focus": ["注目観点（60文字以内）×最大3件"],
      "reason": "変更理由（150文字以内）"
    }
  }
}

日本語で書いてください。専門用語は使わないこと。
`;

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8096,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;

  // デバッグ用：レスポンス全文を保存
  writeFileSync(join(__dirname, 'debug-claude-response.txt'), text, 'utf8');

  // JSON部分を抽出（```json ... ``` ブロックにも対応）
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error('Claude APIのレスポンスからJSONを抽出できませんでした:\n' + text.substring(0, 500));

  // JSONの文字列値内にある改行・制御文字をエスケープして修復（dotAllフラグで改行もマッチ）
  function repairJson(str) {
    return str.replace(/"((?:[^"\\]|\\.)*)"/gs, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e1) {
    try {
      return JSON.parse(repairJson(jsonStr));
    } catch (e2) {
      throw new Error('JSON解析エラー: ' + e2.message + '\n抽出テキスト(先頭300文字): ' + jsonStr.substring(0, 300));
    }
  }
}

// ─── Notion ページ作成 ───
async function createNotionReport(analysis) {
  const r = analysis.report;
  const dateLabel = today;

  // アラートテキスト
  const alertText = r.alerts?.length ? r.alerts.join('\n') : 'なし';

  // 各テーブルの行データを配列形式に変換
  const trafficRows = (r.traffic_table || []).map(t => [
    t.label || '', t.week || '', t.month || '', t.trend || '', t.memo || ''
  ]);
  const hotPagesRows = (r.hot_pages || []).map(p => [
    p.page || '', String(p.visits ?? ''), p.why_hot || ''
  ]);
  const strategyRows = (r.article_strategy || []).map(a => [
    a.title || '', a.reason || '', a.keyword || '', a.difficulty || ''
  ]);
  const infoRows = (r.info_to_gather || []).map(i => [
    i.info || '', i.article || '', i.how || ''
  ]);

  // Notion ブロック構築
  const blocks = [
    callout('💬', r.today_summary || '', 'blue_background'),
    divider(),
    heading2('📊 アクセス数（今週 vs 今月）'),
    notionTable(['指標', '直近7日', '直近28日', '増減', 'ひとこと'], trafficRows),
    divider(),
    heading2('🔥 今週の注目ページ'),
    notionTable(['ページ', '訪問数', '注目理由'], hotPagesRows),
    divider(),
    heading2('📝 次に書くべき記事（優先順）'),
    notionTable(['記事タイトル案', '書くべき理由', 'キーワード', '難易度'], strategyRows),
    divider(),
    heading2('📡 集めると記事になる情報'),
    notionTable(['集める情報', '書ける記事', '入手方法'], infoRows),
    divider(),
    callout('✅', r.one_action || '', 'green_background'),
    divider(),
    callout('⚠️', alertText, 'red_background'),
  ];

  // Notion API でページ作成
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { page_id: NOTION_PAGE_ID },
      icon: { type: 'emoji', emoji: '📊' },
      properties: {
        title: {
          title: [{ text: { content: `アナリティクス日報 ${dateLabel}` } }]
        }
      },
      children: blocks
    })
  });

  const data = await res.json();
  if (data.object === 'error') throw new Error('Notion API エラー: ' + JSON.stringify(data));
  const pageId = data.id;

  // ページID確定後に壁打ちコーナーを追加
  const chatUrl = `https://sato-moto.github.io/digital-empire/?pageId=${pageId.replace(/-/g, '')}`;
  await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      children: [
        divider(),
        heading2('💬 壁打ちコーナー'),
        { object: 'block', type: 'embed', embed: { url: chatUrl }, format: { block_full_width: true, block_page_width: true } }
      ]
    })
  });

  return pageId;
}

// ─── Notion ブロックヘルパー ───
function heading2(text) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: text } }] } };
}
// Notion は1ブロックあたり2000文字制限があるため、超過時は複数ブロックに分割する
function paragraph(text) {
  const str = text || '';
  const LIMIT = 1900; // 余裕を持って1900文字で区切る
  if (str.length <= LIMIT) {
    return [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: str } }] } }];
  }
  const blocks = [];
  for (let i = 0; i < str.length; i += LIMIT) {
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: str.slice(i, i + LIMIT) } }] } });
  }
  return blocks;
}
// code ブロックも2000文字制限あり。超過時は複数ブロックに分割する
function code(text) {
  const str = text || '';
  const LIMIT = 1900;
  if (str.length <= LIMIT) {
    return { object: 'block', type: 'code', code: { rich_text: [{ type: 'text', text: { content: str } }], language: 'plain text' } };
  }
  // 先頭ブロックのみ code、続きは paragraph で展開
  const blocks = [{ object: 'block', type: 'code', code: { rich_text: [{ type: 'text', text: { content: str.slice(0, LIMIT) } }], language: 'plain text' } }];
  for (let i = LIMIT; i < str.length; i += LIMIT) {
    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: str.slice(i, i + LIMIT) } }] } });
  }
  return blocks;
}
function divider() {
  return { object: 'block', type: 'divider', divider: {} };
}
// callout ブロック（色付き背景ボックス）
function callout(emoji, text, color) {
  return {
    object: 'block', type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: text } }],
      icon: { type: 'emoji', emoji },
      color
    }
  };
}
// Notion テーブルブロック（headers: 列名配列, rows: 値の2次元配列）
function notionTable(headers, rows) {
  const tableWidth = headers.length;
  const toCell = text => [{ type: 'text', text: { content: String(text ?? '') } }];
  const headerRow = {
    object: 'block', type: 'table_row',
    table_row: { cells: headers.map(toCell) }
  };
  const dataRows = rows.map(row => ({
    object: 'block', type: 'table_row',
    table_row: { cells: row.map(toCell) }
  }));
  return {
    object: 'block', type: 'table',
    table: { table_width: tableWidth, has_column_header: true, has_row_header: false, children: [headerRow, ...dataRows] }
  };
}

// ─── analytics-method.json 更新 ───
function updateMethod(evaluation) {
  if (!evaluation.needs_update) return;
  const changes = evaluation.proposed_changes;
  if (!changes) return;

  // メトリクスの追加・削除
  if (changes.add_metrics?.length)    method.focus_metrics    = [...new Set([...method.focus_metrics, ...changes.add_metrics])];
  if (changes.remove_metrics?.length) method.focus_metrics    = method.focus_metrics.filter(m => !changes.remove_metrics.includes(m));
  if (changes.add_sections?.length)   method.reporting_sections = [...new Set([...method.reporting_sections, ...changes.add_sections])];
  if (changes.special_focus?.length)  method.special_focus    = changes.special_focus;

  // 閾値変更
  if (changes.change_thresholds && Object.keys(changes.change_thresholds).length) {
    method.alert_thresholds = { ...method.alert_thresholds, ...changes.change_thresholds };
  }

  // 改善ログ追加
  method.improvement_log.push({
    date:   today,
    score:  evaluation.current_method_score,
    reason: changes.reason || '',
    issues: evaluation.issues_found || []
  });

  method.version       += 1;
  method.last_updated   = today;

  writeFileSync(METHOD_PATH, JSON.stringify(method, null, 2), 'utf8');
  console.log(`[手法更新] analytics-method.json を v${method.version} に更新しました`);
}

// ─── メイン処理 ───
async function main() {
  console.log(`\n====== 熊取つーしん アナリティクス日報 ${today} ======`);

  try {
    // Step 1: データ取得
    console.log('[1/4] GA4 データ取得中...');
    const [ga4_28d, ga4_7d] = await Promise.all([
      fetchGA4(dateOffset(28), dateOffset(1)),
      fetchGA4(dateOffset(7), dateOffset(1))
    ]);

    console.log('[2/4] Search Console データ取得中...');
    const [sc_28d, sc_7d] = await Promise.all([
      fetchSearchConsole(dateOffset(28), dateOffset(1)),
      fetchSearchConsole(dateOffset(7), dateOffset(1))
    ]);

    // Step 2: Claude API で分析
    console.log('[3/4] Claude API で分析・手法評価中...');
    const analysis = await analyzeWithClaude(ga4_28d, ga4_7d, sc_28d, sc_7d);

    // Step 3: Notion に記録
    console.log('[4/4] Notion に日報ページを作成中...');
    const pageId = await createNotionReport(analysis);
    console.log(`[完了] Notion ページ作成: https://notion.so/${pageId.replace(/-/g, '')}`);

    // Step 4: 手法更新（必要な場合）
    updateMethod(analysis.method_evaluation);

    console.log('====== 完了 ======\n');

  } catch (err) {
    console.error('[エラー]', err.message);
    process.exit(1);
  }
}

main();
