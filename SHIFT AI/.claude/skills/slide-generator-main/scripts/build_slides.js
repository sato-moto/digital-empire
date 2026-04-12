/**
 * build_slides.js — PptxGenJS 直接方式のスライド生成
 *
 * html2pptx を使わず、PptxGenJS API を直接コールして
 * 正確な位置にシェイプ・テキスト・画像を配置する。
 *
 * Usage:
 *   node build_slides.js <slides.json> <output.pptx> [--diagrams <dir>] [--pdf <output.pdf>]
 */

const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// ── Template paths ──
const PROJ_DIR = path.resolve(__dirname, '..');
const COVER_BG = path.join(PROJ_DIR, 'temp', 'cover.png');
const CHAPTER_BG = path.join(PROJ_DIR, 'assets', 'chapter.png');
const CONTENT_BG = path.join(PROJ_DIR, 'temp', 'temp.png');

// ── Unit helpers (pt to inches for PptxGenJS) ──
const pt = v => v / 72;

// ── Design System ──
const FONT = 'Noto Sans JP';
const TEXT_COLOR = '333333';

// ── Layout constants (measured from ref/4.png @ 1920x1080, 8px grid aligned) ──
const TITLE_X = 56;      // title text x
const TITLE_Y = 20;      // title text box top (bar center=35.6pt, box h=32 → mid=36pt)
const CONTENT_X = 40;    // body content left margin
const FOOTER_Y = 296;    // フッター禁止エリア手前
const RIGHT_EDGE = 696;  // 右端

function sanitizeText(s) {
  return s.replace(/^[-*]\s/, '\u2013 ');
}

// ── Common: draw title aligned to template's magenta bar ──
function drawTitle(slide, title) {
  slide.addText(title, {
    x: pt(TITLE_X), y: pt(TITLE_Y), w: pt(RIGHT_EDGE - TITLE_X), h: pt(32),
    fontSize: 24, fontFace: FONT,
    bold: true, color: TEXT_COLOR,
    lineSpacingMultiple: 1.2,
    valign: 'middle', margin: 0,
  });
}

// ── Build content slide (title + full-width diagram) ──
function buildContentSlide(pptx, s, diagPath) {
  const slide = pptx.addSlide();
  slide.background = { path: CONTENT_BG };

  drawTitle(slide, s.title);

  if (diagPath) {
    const diagY = 64;
    const diagH = FOOTER_Y - diagY - 8; // 224
    slide.addImage({
      path: path.resolve(diagPath),
      x: pt(CONTENT_X),              // 40
      y: pt(diagY),                   // 64
      w: pt(RIGHT_EDGE - CONTENT_X), // 656
      h: pt(diagH),                   // 224
    });
  }

  return { slide, layout: 'diagram-only' };
}

// ── Build cover slide ──
function buildCoverSlide(pptx, s) {
  const slide = pptx.addSlide();
  slide.background = { path: COVER_BG };

  slide.addText(s.title, {
    x: pt(80), y: pt(120), w: pt(580), h: pt(36),
    fontSize: 32, fontFace: FONT,
    bold: true, color: 'FFFFFF',
    lineSpacingMultiple: 1.4, valign: 'middle',
  });

  const subtitle = sanitizeText(s.subtitle || '');
  if (subtitle) {
    slide.addText(subtitle, {
      x: pt(106), y: pt(200), w: pt(549), h: pt(38),
      fontSize: 16, fontFace: FONT,
      color: 'FFFFFF', lineSpacingMultiple: 1.4, valign: 'middle',
    });
  }

  return slide;
}

// ── Build chapter slide ──
function buildChapterSlide(pptx, s) {
  const slide = pptx.addSlide();
  slide.background = { path: CHAPTER_BG };

  if (s.subtitle) {
    slide.addText(s.subtitle, {
      x: pt(79), y: pt(122), w: pt(200), h: pt(22),
      fontSize: 14, fontFace: FONT,
      bold: false, color: TEXT_COLOR,
      valign: 'middle',
    });
  }

  slide.addText(s.title, {
    x: pt(81), y: pt(156), w: pt(590), h: pt(32),
    fontSize: 24, fontFace: FONT,
    bold: true, color: TEXT_COLOR,
    lineSpacingMultiple: 1.4, valign: 'middle',
  });

  return slide;
}

// ── Draw author watermark on bottom-left of every slide ──
function drawAuthorWatermark(slide, authorText) {
  if (!authorText) return;
  slide.addText(authorText, {
    x: pt(15.4), y: pt(349.3), w: pt(80), h: pt(16),
    fontSize: 12, fontFace: 'Century Gothic',
    color: 'FFFFFF',
    valign: 'middle', align: 'center',
    margin: 0,
    rotate: 270,  // 270° CW = 90° CCW
  });
}

// ══════════════════════════════════════════════════
// PDF generation via Playwright
// ══════════════════════════════════════════════════
async function generatePdf(slides, pdfPath, diagramsDir, authorText) {
  const { chromium } = require('playwright');
  const { PDFDocument } = require('pdf-lib');
  const os = require('os');
  const W = 1920, H = 1080;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const pngBuffers = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];

    let diagUrl = '';
    if (s.type === 'content' && diagramsDir) {
      const candidate = path.join(diagramsDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
      if (fs.existsSync(candidate)) {
        diagUrl = 'file:///' + path.resolve(candidate).replace(/\\/g, '/');
      }
    }

    let bgFile;
    if (s.type === 'cover') bgFile = COVER_BG;
    else if (s.type === 'chapter') bgFile = CHAPTER_BG;
    else bgFile = CONTENT_BG;

    const bgUrl = 'file:///' + bgFile.replace(/\\/g, '/');
    const slideHtml = buildSlideHtml(s, bgUrl, diagUrl, W, H, authorText);

    const html = `<!DOCTYPE html>
<html><head><style>
html, body { margin: 0; padding: 0; }
.slide { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; font-family: 'Noto Sans JP', sans-serif; }
</style></head>
<body>${slideHtml}</body></html>`;

    const tmpHtml = path.join(os.tmpdir(), `slide_pdf_${Date.now()}_${i}.html`);
    fs.writeFileSync(tmpHtml, html, 'utf-8');
    await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'));

    const buf = await page.screenshot({ type: 'png' });
    pngBuffers.push(buf);
    fs.unlinkSync(tmpHtml);
  }

  await browser.close();

  const pdfDoc = await PDFDocument.create();
  for (const buf of pngBuffers) {
    const img = await pdfDoc.embedPng(buf);
    const pdfPage = pdfDoc.addPage([W, H]);
    pdfPage.drawImage(img, { x: 0, y: 0, width: W, height: H });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`  [PDF] ${pdfPath}`);
}

// ── Build HTML for one slide (for PDF rendering) ──
function buildSlideHtml(s, bgUrl, diagUrl, W, H, authorText) {
  const sc = W / 720;

  const watermarkHtml = authorText
    ? `<div style="position:absolute; left:${15.4*sc}px; top:${349.3*sc}px; width:${80*sc}px; height:${16*sc}px; display:flex; align-items:center; justify-content:center; transform:rotate(270deg); transform-origin:center center;">
    <span style="color:#fff; font-size:${12*sc}px; font-family:'Century Gothic',sans-serif; white-space:nowrap;">${esc(authorText)}</span>
  </div>`
    : '';

  if (s.type === 'cover') {
    const subtitle = sanitizeText(s.subtitle || '');
    return `<div class="slide" style="background:url('${bgUrl}') center/cover;">
  <div style="position:absolute; left:${80*sc}px; top:${120*sc}px; width:${580*sc}px; height:${36*sc}px; display:flex; align-items:center;">
    <h1 style="color:#fff; font-size:${32*sc}px; font-weight:bold; margin:0; line-height:1.4;">${esc(s.title)}</h1>
  </div>
  <div style="position:absolute; left:${106*sc}px; top:${200*sc}px; width:${549*sc}px; height:${38*sc}px; display:flex; align-items:center;">
    <p style="color:#fff; font-size:${16*sc}px; margin:0; line-height:1.4;">${esc(subtitle)}</p>
  </div>
  ${watermarkHtml}
</div>`;
  }

  if (s.type === 'chapter') {
    const subtitle = sanitizeText(s.subtitle || '');
    let html = `<div class="slide" style="background:url('${bgUrl}') center/cover;">`;
    if (subtitle) {
      html += `<div style="position:absolute; left:${79*sc}px; top:${122*sc}px; width:${200*sc}px; height:${22*sc}px; display:flex; align-items:center;">
    <span style="color:#${TEXT_COLOR}; font-size:${14*sc}px;">${esc(subtitle)}</span>
  </div>`;
    }
    html += `<div style="position:absolute; left:${81*sc}px; top:${156*sc}px; width:${590*sc}px; height:${32*sc}px; display:flex; align-items:center;">
    <h2 style="color:#${TEXT_COLOR}; font-size:${24*sc}px; font-weight:bold; margin:0; line-height:1.4;">${esc(s.title)}</h2>
  </div>`;
    html += watermarkHtml;
    html += `</div>`;
    return html;
  }

  const diagY = 64;
  const diagH = FOOTER_Y - diagY - 8;
  let html = `<div class="slide" style="background:url('${bgUrl}') center/cover;">`;
  html += htmlTitle(s, sc);
  if (diagUrl) {
    html += `<div style="position:absolute; left:${CONTENT_X*sc}px; top:${diagY*sc}px; width:${(RIGHT_EDGE - CONTENT_X)*sc}px; height:${diagH*sc}px; display:flex; align-items:center; justify-content:center;">
    <img src="${diagUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
  </div>`;
  }
  html += watermarkHtml;
  html += `</div>`;
  return html;
}

function htmlTitle(s, sc) {
  return `<div style="position:absolute; left:${TITLE_X*sc}px; top:${TITLE_Y*sc}px; width:${(RIGHT_EDGE-TITLE_X)*sc}px; height:${32*sc}px; display:flex; align-items:center;">
    <h2 style="color:#${TEXT_COLOR}; font-size:${24*sc}px; font-weight:bold; margin:0; line-height:1.2;">${esc(s.title)}</h2>
  </div>`;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node build_slides.js <slides.json> <output.pptx> [--diagrams <dir>] [--pdf <path>] [--author <name>]');
    process.exit(1);
  }

  const jsonPath = args[0];
  const outPptx = args[1];
  let diagramsDir = null;
  let pdfPath = null;
  let authorText = null;

  const diagIdx = args.indexOf('--diagrams');
  if (diagIdx >= 0 && diagIdx + 1 < args.length) diagramsDir = args[diagIdx + 1];
  const pdfIdx = args.indexOf('--pdf');
  if (pdfIdx >= 0 && pdfIdx + 1 < args.length) pdfPath = args[pdfIdx + 1];
  const authorIdx = args.indexOf('--author');
  if (authorIdx >= 0 && authorIdx + 1 < args.length) authorText = args[authorIdx + 1];

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const slides = data.slides;

  // ── Build PPTX ──
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'CUSTOM_16x9', width: 10, height: 5.625 });
  pptx.layout = 'CUSTOM_16x9';
  pptx.author = authorText || 'Slide Generator';
  pptx.title = slides[0]?.title || 'Presentation';

  const layoutCounts = {};

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];

    let diagPath = null;
    if (s.type === 'content' && diagramsDir) {
      const candidate = path.join(diagramsDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
      if (fs.existsSync(candidate)) diagPath = candidate;
    }

    let slide;
    if (s.type === 'cover') {
      slide = buildCoverSlide(pptx, s);
      const lbl = 'cover';
      layoutCounts[lbl] = (layoutCounts[lbl] || 0) + 1;
      console.log(`  [${i + 1}/${slides.length}] ${lbl}: ${s.title.slice(0, 40)}`);
    } else if (s.type === 'chapter') {
      slide = buildChapterSlide(pptx, s);
      const lbl = 'chapter';
      layoutCounts[lbl] = (layoutCounts[lbl] || 0) + 1;
      console.log(`  [${i + 1}/${slides.length}] ${lbl}: ${s.title.slice(0, 40)}`);
    } else {
      const result = buildContentSlide(pptx, s, diagPath);
      slide = result.slide;
      layoutCounts[result.layout] = (layoutCounts[result.layout] || 0) + 1;
      console.log(`  [${i + 1}/${slides.length}] ${result.layout}: ${s.title.slice(0, 40)}${diagPath ? ' +diagram' : ''}`);
    }

    drawAuthorWatermark(slide, authorText);
  }

  fs.mkdirSync(path.dirname(path.resolve(outPptx)), { recursive: true });
  await pptx.writeFile({ fileName: outPptx });
  console.log(`\n[OK] PPTX saved: ${outPptx} (${slides.length} slides)`);
  console.log(`[Layout distribution] ${JSON.stringify(layoutCounts)}`);

  // ── Generate PDF ──
  if (pdfPath) {
    console.log('\nGenerating PDF...');
    fs.mkdirSync(path.dirname(path.resolve(pdfPath)), { recursive: true });
    await generatePdf(slides, pdfPath, diagramsDir, authorText);
    console.log(`[OK] PDF saved: ${pdfPath}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
