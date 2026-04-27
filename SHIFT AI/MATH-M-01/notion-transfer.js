/**
 * MATH-M-01 アウトラインを既存ハブ配下に v1 子ページとして転記
 * - 章 → トグルH1
 * - セクション → トグルH2
 */
const https = require('https');
const fs = require('fs');

const cfg = JSON.parse(fs.readFileSync('C:/Users/motok/OneDrive/Desktop/Claude code/blog/notion-config.json', 'utf8'));
const NOTION_TOKEN = cfg.token;

const HUB_PAGE_ID = '33c18b0b-fabc-81f2-8f55-fea5c310e068';
const PAGE_TITLE = '2026-04-11_v1';

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

// ─── ブロック生成ヘルパー ───
const rt = (text, opts = {}) => ({
  type: 'text',
  text: { content: text },
  annotations: { bold: !!opts.bold, italic: !!opts.italic, code: !!opts.code, color: opts.color || 'default' }
});

const para = (text) => ({
  object: 'block', type: 'paragraph',
  paragraph: { rich_text: Array.isArray(text) ? text : [rt(text)] }
});

const bullet = (text) => ({
  object: 'block', type: 'bulleted_list_item',
  bulleted_list_item: { rich_text: Array.isArray(text) ? text : [rt(text)] }
});

const h1Toggle = (text, children) => ({
  object: 'block', type: 'heading_1',
  heading_1: { rich_text: [rt(text)], is_toggleable: true, children }
});

const h2Toggle = (text, children) => ({
  object: 'block', type: 'heading_2',
  heading_2: { rich_text: [rt(text)], is_toggleable: true, children }
});

const h1 = (text) => ({
  object: 'block', type: 'heading_1',
  heading_1: { rich_text: [rt(text)], is_toggleable: false }
});

const divider = () => ({ object: 'block', type: 'divider', divider: {} });

const callout = (text) => ({
  object: 'block', type: 'callout',
  callout: { rich_text: [rt(text)], icon: { type: 'emoji', emoji: '📌' } }
});

// ─── アウトライン本体 ───
const children = [
  // 講座情報
  h1('📋 講座情報'),
  bullet([rt('講座ID：', { bold: true }), rt('MATH-M-01')]),
  bullet([rt('タイトル：', { bold: true }), rt('数学の仕組みをAIで理解する独学法を30分でマスター')]),
  bullet([rt('対象：', { bold: true }), rt('中学生（AI初学者）')]),
  bullet([rt('尺：', { bold: true }), rt('30分')]),
  bullet([rt('メインツール：', { bold: true }), rt('Gemini')]),
  bullet([rt('サブツール：', { bold: true }), rt('ChatGPT（意図した返答が出ない場合のみ）')]),
  bullet([rt('トンマナ：', { bold: true }), rt('冷静に情熱的／論理的で無機質／相棒・コーチのスタンス')]),
  bullet([rt('作成日：', { bold: true }), rt('2026-04-11')]),
  bullet([rt('バージョン：', { bold: true }), rt('v1（アウトライン確定版）')]),
  divider(),

  // 全体構成
  h1('🗂 全体構成と尺配分'),
  bullet([rt('Ch0：', { bold: true }), rt('オープニング（1分／0:00〜1:00）')]),
  bullet([rt('Ch1：', { bold: true }), rt('座学 ─ AIを"専属コーチ"に変える思考法（7分／1:00〜8:00）')]),
  bullet([rt('Ch2-A：', { bold: true }), rt('計算編（5分／8:00〜13:00）※録画差し込み')]),
  bullet([rt('Ch2-B：', { bold: true }), rt('関数編（5分／13:00〜18:00）※録画差し込み')]),
  bullet([rt('Ch2-C：', { bold: true }), rt('図形編（5分／18:00〜23:00）※録画差し込み')]),
  bullet([rt('Ch3：', { bold: true }), rt('成果物生成 ─ 記憶定着の決定打（4分／23:00〜27:00）')]),
  bullet([rt('Ch4：', { bold: true }), rt('まとめ＆エール ─ 自走スイッチを起動する（3分／27:00〜30:00）')]),
  divider(),

  // Ch0
  h1Toggle('Ch0：オープニング（0:00〜1:00／60秒）', [
    callout('役割：15秒以内に「なぜ見るべきか」を刺す'),
    bullet([rt('0〜15秒（フック）：', { bold: true }), rt('「数学、意味わかんないまま公式だけ覚えてるだろ。それ、一生苦手なままだぞ。」という冷静な断定から入る')]),
    bullet([rt('15〜30秒（権威付け）：', { bold: true }), rt('「このAIが、お前専属の24時間コーチになる。塾も家庭教師も、今日からいらない。」')]),
    bullet([rt('30〜50秒（ゴール提示）：', { bold: true }), rt('「30分後、お前は"AIに何を聞けば数学がわかるか"を自力で判断できるようになる。」')]),
    bullet([rt('50〜60秒（トンマナ宣言）：', { bold: true }), rt('「手は貸さない。だが、走り方は全部教える。──始めるぞ。」')]),
  ]),

  // Ch1
  h1Toggle('Ch1：座学 ─ AIを"専属コーチ"に変える思考法（1:00〜8:00／7分）', [
    callout('役割：マインドセット変革 ＋ 分野別「問いかけ方」の概念先出し'),
    h2Toggle('セクション1-1：数学が苦手になる唯一の原因（1:00〜3:00）', [
      bullet('「意味もわからず公式を暗記する」ことの弊害を論理的に解剖'),
      bullet('例：y=ax+b を「暗記」した人間と「意味で理解」した人間の決定的な差'),
      bullet([rt('結論：', { bold: true }), rt('「わからない→質問できない→諦める」のループを断ち切れ')]),
    ]),
    h2Toggle('セクション1-2：AIは"答えを教える先生"ではない（3:00〜5:00）', [
      bullet([rt('AIに「答え」を聞くのはNG。AIは', {}), rt('壁打ち相手', { bold: true }), rt('として使え', {})]),
      bullet('「納得するまで何度でも説明させる」という姿勢の絶対性'),
      bullet([rt('受講者が', {}), rt('自分で思考してAIに言葉を投げる', { bold: true }), rt('ことが大前提', {})]),
    ]),
    h2Toggle('セクション1-3：分野で"問いかけ方"が違う（5:00〜8:00）★核心', [
      bullet([rt('計算編＝手順の確認：', { bold: true }), rt('「この計算、なんでこの順番でやるの？」と過程を分解させる')]),
      bullet([rt('関数編＝可視化の依頼：', { bold: true }), rt('「この式、グラフで見るとどうなる？」と視覚化を要求する')]),
      bullet([rt('図形編＝条件整理の壁打ち：', { bold: true }), rt('「この問題の条件、整理して」と状況の言語化をさせる')]),
      bullet('→この3パターンを覚えておけ。次からの実演で証明する'),
    ]),
  ]),

  // Ch2
  h1Toggle('Ch2：実演チャプター（8:00〜23:00／15分）【空白・録画差し込み】', [
    callout('この3チャプターは制作者が実際のAI操作画面を録画した映像を後から差し込む構成。台本・スライド内容は生成しない'),
    h2Toggle('Ch2-A：計算編（8:00〜13:00／5分）', [
      bullet('タイトルのみ設定。内容は録画差し込みのため空欄'),
      bullet('スライドに「ここから録画」キューのみ挿入'),
    ]),
    h2Toggle('Ch2-B：関数編（13:00〜18:00／5分）', [
      bullet('タイトルのみ設定。内容は録画差し込みのため空欄'),
      bullet('スライドに「ここから録画」キューのみ挿入'),
    ]),
    h2Toggle('Ch2-C：図形編（18:00〜23:00／5分）', [
      bullet('タイトルのみ設定。内容は録画差し込みのため空欄'),
      bullet('スライドに「ここから録画」キューのみ挿入'),
    ]),
  ]),

  // Ch3
  h1Toggle('Ch3：成果物生成 ─ 記憶定着の決定打（23:00〜27:00／4分）', [
    callout('役割：壁打ちで整理された脳内を"自分専用の参考書"に固定化する'),
    h2Toggle('セクション3-1：なぜ"まとめ"が最後なのか（23:00〜24:00）', [
      bullet([rt('AIとの壁打ちで脳内がクリアになった', {}), rt('この瞬間', { bold: true }), rt('が定着の最大チャンス', {})]),
      bullet([rt('復習のためではなく、', {}), rt('"今日の思考の痕跡"を外に出す', { bold: true }), rt('ための作業', {})]),
    ]),
    h2Toggle('セクション3-2：ワンアクションでまとめる3つの型【スライド1枚】（24:00〜26:30）', [
      callout('設計思想：視覚2＋聴覚1で感覚分散／生活動線に無理なく入れる'),
      bullet([rt('① Google Keep型：', { bold: true }), rt('「今日の学びを、付箋3枚分（各100文字）に分けて」→ Google Keepに保存 → スマホウィジェットで毎日視界に入る')]),
      bullet([rt('② Google ドキュメント型：', { bold: true }), rt('「今日の会話を"授業ノート風"に。タイトル・要点・例題の順で」→ Googleドキュメントに保存 → 学校Chromebookで翌日の授業・宿題に直結')]),
      bullet([rt('③ NotebookLM音声概要型：', { bold: true }), rt('会話をNotebookLMに投入 → "音声概要"をワンクリック → 通学・入浴・寝る前の"ながら時間"で定着')]),
    ]),
    h2Toggle('セクション3-3：共通ルール（26:30〜27:00）', [
      bullet([rt('「一言打つだけ」で起動できること', { bold: true })]),
      bullet('手数が増えた瞬間、受講者は続かない'),
      bullet([rt('3つのうち', {}), rt('自分の生活に合う1つだけ選べ', { bold: true }), rt('（全部やるな）', {})]),
    ]),
  ]),

  // Ch4
  h1Toggle('Ch4：まとめ＆エール ─ 自走スイッチを起動する（27:00〜30:00／3分）', [
    h2Toggle('セクション4-1：簡潔なおさらい（27:00〜28:00）', [
      bullet('「苦手の原因」「問いかけ方の3分類」「記憶定着の決定打」を各20秒で復習'),
      bullet('1スライドに3要点を並列表示'),
    ]),
    h2Toggle('セクション4-2：役割と責任の分離宣言（28:00〜29:00）★重要', [
      bullet([rt('「ここまでが私の役割。ここから先はあなたの仕事です。」', { bold: true })]),
      bullet([rt('「真横で走り方は教えました。しかし、絶対に手は貸しません。」', { bold: true })]),
      bullet('冷静に、しかし退路を断つ言い切り'),
    ]),
    h2Toggle('セクション4-3：冷静に情熱的なエール＋CTA（29:00〜30:00）', [
      bullet([rt('エール：', { bold: true }), rt('「勇気を出していってらっしゃい。何度でも見返すことで定着します。迷ったら再視聴を推奨します。」')]),
      bullet([rt('具体CTA①：', { bold: true }), rt('「明日、学校の宿題または問題集を開け」')]),
      bullet([rt('具体CTA②：', { bold: true }), rt('「最初の1問でつまずいたら、即座にAIを開け。"問いかけ方の3分類"を思い出せ」')]),
      bullet([rt('具体CTA③：', { bold: true }), rt('「それができれば、今日の30分は無駄じゃない」')]),
    ]),
  ]),

  // 補足・制作方針
  h1Toggle('補足・制作方針', [
    h2Toggle('Gemini/ChatGPT切替の扱い', [
      bullet('スライドには記載しない'),
      bullet('Ch2実演内で該当シーンが出た際、口頭＋画面下テロップのみで注釈'),
      bullet('例：テロップ「※返答がズレた場合はChatGPTで再質問もOK」'),
    ]),
    h2Toggle('制作方針の絶対ルール', [
      bullet('「AIが一方的に解き方を教える」描写は絶対NG。常に「受講者が問いを投げ、AIが壁打ち相手になる」構造を維持'),
      bullet('動画内に人間は介在せず、AIアバターが擬人化して紹介している設定を徹底'),
      bullet('専門用語回避時は直感的に理解できる例え話を用いる'),
      bullet('論理的で無機質な語り口／伝える内容は熱い＝「冷静に情熱的」'),
    ]),
  ]),
];

// ─── ブロック数カウント（ネスト含む） ───
function countBlocks(blocks) {
  let count = 0;
  for (const b of blocks) {
    count++;
    const key = b.type;
    const obj = b[key];
    if (obj && obj.children) count += countBlocks(obj.children);
  }
  return count;
}

(async () => {
  try {
    console.log(`ブロック総数（ネスト含む）: ${countBlocks(children)}`);

    // ページ作成（タイトルとchildrenを同時送信）
    const page = await notionRequest('POST', 'pages', {
      parent: { page_id: HUB_PAGE_ID },
      properties: {
        title: { title: [rt(PAGE_TITLE)] }
      },
      children
    });

    console.log(`✓ v1子ページ作成成功`);
    console.log(`  ID: ${page.id}`);
    console.log(`  URL: ${page.url}`);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
