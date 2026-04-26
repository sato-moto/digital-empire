/**
 * ga4-mcp-server / server.js
 * GA4 Data API + Search Console API を Claude Code に提供する MCP サーバー
 *
 * 起動: node server.js
 * 設定: credentials.json（Googleサービスアカウントキー）が同ディレクトリに必要
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 設定読み込み ───
const CONFIG_PATH = join(__dirname, 'config.json');
const CREDS_PATH  = join(__dirname, 'credentials.json');

if (!existsSync(CONFIG_PATH)) {
  console.error('❌ config.json が見つかりません。config.json を作成してください。');
  process.exit(1);
}
if (!existsSync(CREDS_PATH)) {
  console.error('❌ credentials.json が見つかりません。Googleサービスアカウントキーを配置してください。');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const GA4_PROPERTY_ID = config.ga4_property_id; // 例: "123456789"
const SC_SITE_URL     = config.sc_site_url;      // 例: "https://kumatori-info.com/"

// ─── Google認証 ───
const auth = new google.auth.GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly'
  ]
});

// GA4クライアント
const ga4Client = new BetaAnalyticsDataClient({ keyFilename: CREDS_PATH });

// Search Consoleクライアント
const searchConsole = google.searchconsole({ version: 'v1', auth });

// ─── ユーティリティ ───

/**
 * 日付オフセットを "YYYY-MM-DD" に変換
 * @param {number} daysAgo - 何日前か（0=今日）
 */
function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * GA4レポート結果を読みやすいテキストに変換
 */
function formatGA4Response(response) {
  if (!response.rows || response.rows.length === 0) return '該当データなし';

  const dimHeaders = response.dimensionHeaders?.map(h => h.name) || [];
  const metHeaders = response.metricHeaders?.map(h => h.name) || [];

  const rows = response.rows.map(row => {
    const dims = row.dimensionValues?.map((v, i) => `${dimHeaders[i]}: ${v.value}`) || [];
    const mets = row.metricValues?.map((v, i) => `${metHeaders[i]}: ${v.value}`) || [];
    return [...dims, ...mets].join(' | ');
  });

  return rows.join('\n');
}

// ─── MCPサーバー定義 ───
const server = new Server(
  { name: 'ga4-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ─── ツール一覧 ───
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'ga4_overview',
      description: '指定期間のGA4サマリー（セッション数・PV・ユーザー数・直帰率・平均滞在時間）を取得する',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' }
        }
      }
    },
    {
      name: 'ga4_top_pages',
      description: 'PV数上位のページ一覧を取得する',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' },
          limit:      { type: 'number', description: '取得件数（省略時: 20）' }
        }
      }
    },
    {
      name: 'ga4_traffic_sources',
      description: 'トラフィック流入元（オーガニック検索・SNS・直接等）の内訳を取得する',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' }
        }
      }
    },
    {
      name: 'ga4_realtime',
      description: '現在サイトを見ているアクティブユーザー数とページ別内訳をリアルタイムで取得する',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'ga4_page_detail',
      description: '特定ページのパフォーマンス（PV・ユーザー・滞在時間・直帰率）を取得する',
      inputSchema: {
        type: 'object',
        required: ['page_path'],
        properties: {
          page_path:  { type: 'string', description: 'ページパス（例: /kumatori-lunch/）' },
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' }
        }
      }
    },
    {
      name: 'ga4_daily_trend',
      description: '日別のセッション数・PV推移を取得する（グラフ用データ）',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' }
        }
      }
    },
    {
      name: 'search_console_keywords',
      description: 'Search Consoleから検索クエリ（KW）・表示回数・クリック数・CTR・平均順位を取得する',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' },
          limit:      { type: 'number', description: '取得件数（省略時: 30）' }
        }
      }
    },
    {
      name: 'search_console_pages',
      description: 'Search ConsoleからページURL別のクリック数・表示回数・CTR・順位を取得する',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' },
          limit:      { type: 'number', description: '取得件数（省略時: 20）' }
        }
      }
    },
    {
      name: 'search_console_page_keywords',
      description: '特定ページに流入しているKW一覧をSearch Consoleから取得する',
      inputSchema: {
        type: 'object',
        required: ['page_url'],
        properties: {
          page_url:   { type: 'string', description: 'ページURL（例: https://kumatori-info.com/kumatori-lunch/）' },
          start_date: { type: 'string', description: '開始日 YYYY-MM-DD（省略時: 28日前）' },
          end_date:   { type: 'string', description: '終了日 YYYY-MM-DD（省略時: 昨日）' }
        }
      }
    }
  ]
}));

// ─── ツール実行ハンドラ ───
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const startDate = args?.start_date || dateOffset(28);
  const endDate   = args?.end_date   || dateOffset(1);
  const limit     = args?.limit      || 20;

  try {
    // ── GA4: サマリー ──
    if (name === 'ga4_overview') {
      const [res] = await ga4Client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ]
      });
      const row = res.rows?.[0];
      if (!row) return { content: [{ type: 'text', text: 'データなし' }] };
      const [sessions, pv, users, bounce, duration] = row.metricValues;
      const text = [
        `期間: ${startDate} 〜 ${endDate}`,
        `セッション数: ${Number(sessions.value).toLocaleString()}`,
        `ページビュー: ${Number(pv.value).toLocaleString()}`,
        `ユーザー数: ${Number(users.value).toLocaleString()}`,
        `直帰率: ${(Number(bounce.value) * 100).toFixed(1)}%`,
        `平均滞在時間: ${Math.round(Number(duration.value))}秒`
      ].join('\n');
      return { content: [{ type: 'text', text }] };
    }

    // ── GA4: トップページ ──
    if (name === 'ga4_top_pages') {
      const [res] = await ga4Client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'averageSessionDuration' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit
      });
      const rows = res.rows?.map((row, i) => {
        const [path, title] = row.dimensionValues;
        const [pv, users, dur] = row.metricValues;
        return `${i + 1}. [${pv.value}PV / ${users.value}人 / ${Math.round(Number(dur.value))}秒] ${path.value}`;
      }) || [];
      return { content: [{ type: 'text', text: `期間: ${startDate} 〜 ${endDate}\n\n` + rows.join('\n') }] };
    }

    // ── GA4: 流入元 ──
    if (name === 'ga4_traffic_sources') {
      const [res] = await ga4Client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      });
      const rows = res.rows?.map(row => {
        const [channel] = row.dimensionValues;
        const [sessions, users] = row.metricValues;
        return `${channel.value}: ${Number(sessions.value).toLocaleString()}セッション / ${Number(users.value).toLocaleString()}ユーザー`;
      }) || [];
      return { content: [{ type: 'text', text: `期間: ${startDate} 〜 ${endDate}\n\n` + rows.join('\n') }] };
    }

    // ── GA4: リアルタイム ──
    if (name === 'ga4_realtime') {
      const [res] = await ga4Client.runRealtimeReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 10
      });
      const total = res.rows?.reduce((sum, r) => sum + Number(r.metricValues[0].value), 0) || 0;
      const pages = res.rows?.map(row =>
        `  ${row.dimensionValues[0].value}: ${row.metricValues[0].value}人`
      ).join('\n') || '  なし';
      const text = `現在のアクティブユーザー: ${total}人\n\nページ別:\n${pages}`;
      return { content: [{ type: 'text', text }] };
    }

    // ── GA4: ページ詳細 ──
    if (name === 'ga4_page_detail') {
      const [res] = await ga4Client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'EXACT', value: args.page_path }
          }
        }
      });
      const row = res.rows?.[0];
      if (!row) return { content: [{ type: 'text', text: `${args.page_path} のデータなし` }] };
      const [pv, users, dur, bounce] = row.metricValues;
      const text = [
        `ページ: ${args.page_path}`,
        `期間: ${startDate} 〜 ${endDate}`,
        `PV: ${Number(pv.value).toLocaleString()}`,
        `ユーザー数: ${Number(users.value).toLocaleString()}`,
        `平均滞在時間: ${Math.round(Number(dur.value))}秒`,
        `直帰率: ${(Number(bounce.value) * 100).toFixed(1)}%`
      ].join('\n');
      return { content: [{ type: 'text', text }] };
    }

    // ── GA4: 日別トレンド ──
    if (name === 'ga4_daily_trend') {
      const [res] = await ga4Client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      });
      const rows = res.rows?.map(row => {
        const d = row.dimensionValues[0].value;
        const date = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
        const [sessions, pv] = row.metricValues;
        return `${date}: ${sessions.value}セッション / ${pv.value}PV`;
      }) || [];
      return { content: [{ type: 'text', text: rows.join('\n') }] };
    }

    // ── Search Console: キーワード ──
    if (name === 'search_console_keywords') {
      const authClient = await auth.getClient();
      const res = await searchConsole.searchanalytics.query({
        siteUrl: SC_SITE_URL,
        auth: authClient,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: limit,
          startRow: 0
        }
      });
      const rows = res.data.rows?.map((row, i) => {
        const kw = row.keys[0];
        return `${i + 1}. "${kw}" — クリック:${row.clicks} 表示:${row.impressions} CTR:${(row.ctr * 100).toFixed(1)}% 順位:${row.position.toFixed(1)}`;
      }) || [];
      return { content: [{ type: 'text', text: `期間: ${startDate} 〜 ${endDate}\n\n` + rows.join('\n') }] };
    }

    // ── Search Console: ページ別 ──
    if (name === 'search_console_pages') {
      const authClient = await auth.getClient();
      const res = await searchConsole.searchanalytics.query({
        siteUrl: SC_SITE_URL,
        auth: authClient,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: limit,
          startRow: 0
        }
      });
      const rows = res.data.rows?.map((row, i) => {
        const url = row.keys[0].replace(SC_SITE_URL, '/');
        return `${i + 1}. ${url} — クリック:${row.clicks} 表示:${row.impressions} CTR:${(row.ctr * 100).toFixed(1)}% 順位:${row.position.toFixed(1)}`;
      }) || [];
      return { content: [{ type: 'text', text: `期間: ${startDate} 〜 ${endDate}\n\n` + rows.join('\n') }] };
    }

    // ── Search Console: ページ別KW ──
    if (name === 'search_console_page_keywords') {
      const authClient = await auth.getClient();
      const res = await searchConsole.searchanalytics.query({
        siteUrl: SC_SITE_URL,
        auth: authClient,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'page',
              operator: 'equals',
              expression: args.page_url
            }]
          }],
          rowLimit: 30
        }
      });
      const rows = res.data.rows?.map((row, i) => {
        return `${i + 1}. "${row.keys[0]}" — クリック:${row.clicks} 表示:${row.impressions} CTR:${(row.ctr * 100).toFixed(1)}% 順位:${row.position.toFixed(1)}`;
      }) || [];
      const text = rows.length
        ? `${args.page_url}\n期間: ${startDate} 〜 ${endDate}\n\n` + rows.join('\n')
        : 'データなし（インデックス未登録またはクリックなし）';
      return { content: [{ type: 'text', text }] };
    }

    return { content: [{ type: 'text', text: `未知のツール: ${name}` }] };

  } catch (err) {
    const msg = err.message || JSON.stringify(err);
    return { content: [{ type: 'text', text: `エラー: ${msg}` }], isError: true };
  }
});

// ─── 起動 ───
const transport = new StdioServerTransport();
await server.connect(transport);
