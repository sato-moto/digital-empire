/**
 * analytics-collect.js
 * GA4 + Search Console データ収集スクリプト
 *
 * GA4（28日・7日）および Search Console（28日・7日）のデータを取得し、
 * analytics-data-latest.json に保存する。
 *
 * 実行: node analytics-collect.js
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config     = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));
const CREDS_PATH = join(__dirname, 'credentials.json');
const GA4_PROP   = `properties/${config.ga4_property_id}`;
const SC_SITE    = config.sc_site_url;
const OUT_PATH   = join(__dirname, 'analytics-data-latest.json');

// ─── クライアント初期化 ───
const ga4 = new BetaAnalyticsDataClient({ keyFilename: CREDS_PATH });
const auth = new google.auth.GoogleAuth({
  keyFile: CREDS_PATH,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});
const sc = google.searchconsole({ version: 'v1', auth });

// ─── 日付ユーティリティ ───
function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ─── GA4 データ取得 ───
async function fetchGA4(startDate, endDate) {
  // サマリー（セッション・PV・ユーザー・直帰率・滞在時間）
  const [sumRes] = await ga4.runReport({
    property: GA4_PROP,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'totalUsers' },
      { name: 'bounceRate' }, { name: 'averageSessionDuration' }
    ]
  });
  const s = sumRes.rows?.[0]?.metricValues;
  const summary = s ? {
    sessions:                 parseInt(s[0].value),
    pageviews:                parseInt(s[1].value),
    users:                    parseInt(s[2].value),
    bounce_rate_pct:          parseFloat((Number(s[3].value) * 100).toFixed(1)),
    avg_session_duration_sec: Math.round(Number(s[4].value))
  } : {};

  // トップページ上位20件
  const [topRes] = await ga4.runReport({
    property: GA4_PROP,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'averageSessionDuration' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20
  });
  const topPages = topRes.rows?.map(r => ({
    path:     r.dimensionValues[0].value,
    pv:       parseInt(r.metricValues[0].value),
    users:    parseInt(r.metricValues[1].value),
    duration: Math.round(Number(r.metricValues[2].value))
  })) || [];

  // 流入チャネル
  const [chRes] = await ga4.runReport({
    property: GA4_PROP,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
  });
  const channels = chRes.rows?.map(r => ({
    channel:  r.dimensionValues[0].value,
    sessions: parseInt(r.metricValues[0].value),
    users:    parseInt(r.metricValues[1].value)
  })) || [];

  // 日別トレンド
  const [trendRes] = await ga4.runReport({
    property: GA4_PROP,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }]
  });
  const dailyTrend = trendRes.rows?.map(r => {
    const d = r.dimensionValues[0].value;
    return {
      date:     `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,
      sessions: parseInt(r.metricValues[0].value),
      pv:       parseInt(r.metricValues[1].value)
    };
  }) || [];

  return { summary, topPages, channels, dailyTrend };
}

// ─── Search Console データ取得 ───
async function fetchSC(startDate, endDate) {
  const authClient = await auth.getClient();

  // キーワード上位30件
  const kwRes = await sc.searchanalytics.query({
    siteUrl: SC_SITE, auth: authClient,
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
    siteUrl: SC_SITE, auth: authClient,
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

// ─── メイン処理 ───
async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[analytics-collect] ${today} データ取得開始...`);

  // 2期間を並列取得
  const [ga4_28d, ga4_7d, sc_28d, sc_7d] = await Promise.all([
    fetchGA4(dateOffset(28), dateOffset(1)),
    fetchGA4(dateOffset(7),  dateOffset(1)),
    fetchSC(dateOffset(28),  dateOffset(1)),
    fetchSC(dateOffset(7),   dateOffset(1))
  ]);

  const output = {
    collected_at: today,
    period_28d:   { start: dateOffset(28), end: dateOffset(1) },
    period_7d:    { start: dateOffset(7),  end: dateOffset(1) },
    ga4_28d,
    ga4_7d,
    sc_28d,
    sc_7d
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`[analytics-collect] 完了 → analytics-data-latest.json`);
}

main().catch(e => { console.error('[ERROR]', e.message); process.exit(1); });
