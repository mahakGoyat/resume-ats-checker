const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const { parseResumeSections } = require('./out-test/resume-sections.js');
const { buildResumeDoc } = require('./out-test/resume-doc-model.js');
const { generateResumePdf } = require('./out-test/resume-pdf.js');
const { generateResumeDocx } = require('./out-test/resume-docx.js');

async function main() {
  const source = fs.readFileSync(path.join(__dirname, 'resume-test.txt'), 'utf8');
  const parsed = parseResumeSections(source);

  console.log('=== PARSED RESUME ===');
  console.log('name:', JSON.stringify(parsed.name));
  console.log('contact:', JSON.stringify(parsed.contact, null, 1));
  console.log('sections:', parsed.sections.map((s) => `${s.kind} (${s.content.split('\n').length} lines)`).join(', '));

  const blocks = buildResumeDoc(parsed);
  console.log('\n=== DOC BLOCKS ===');
  for (const b of blocks) {
    if (b.kind === 'item') console.log(`  item  bullet=${b.bullet ? 1 : 0} bold=${b.bold ? 1 : 0} sb=${b.spaceBefore ? 1 : 0} sa=${b.spaceAfter ? 1 : 0} right=${b.right ? JSON.stringify(b.right) : '-'} text=${JSON.stringify(b.text.slice(0, 70))}`);
    else console.log(`  ${b.kind}: ${JSON.stringify(b.kind === 'section' ? b.title : b.text)}`);
  }

  const pdfBytes = await generateResumePdf(parsed);
  fs.writeFileSync(path.join(OUT, 'resume-test.pdf'), Buffer.from(pdfBytes));
  console.log(`\n[PDF] wrote scripts/out/resume-test.pdf (${pdfBytes.length} bytes)`);

  const docxBlob = await generateResumeDocx(parsed);
  const docxBuf = Buffer.from(await docxBlob.arrayBuffer());
  fs.writeFileSync(path.join(OUT, 'resume-test.docx'), docxBuf);
  console.log(`[DOCX] wrote scripts/out/resume-test.docx (${docxBuf.length} bytes)`);

  await analyzePdf(path.join(OUT, 'resume-test.pdf'));
}

async function analyzePdf(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { OPS } = pdfjs;
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;

  const PAGE_H = 841.89;
  console.log('\n=== PDF LAYOUT REPORT ===');
  console.log(`pages: ${doc.numPages}`);

  const opNames = {};
  if (OPS) for (const [k, v] of Object.entries(OPS)) opNames[v] = k;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .map((it) => ({ str: it.str, size: it.transform[0], x: it.transform[4], baselineY: PAGE_H - it.transform[5], font: it.fontName }))
      .filter((it) => it.str.trim().length > 0)
      .sort((a, b) => b.baselineY - a.baselineY || a.x - b.x);

    console.log(`\n--- PAGE ${p} (${items.length} text items) ---`);
    const byRow = new Map();
    for (const it of items) {
      const key = Math.round(it.baselineY);
      if (!byRow.has(key)) byRow.set(key, []);
      byRow.get(key).push(it);
    }
    for (const [, row] of [...byRow.entries()].sort((a, b) => b[0] - a[0])) {
      const first = row[0];
      const text = row.map((r) => r.str).join('');
      const size = Math.round(first.size * 10) / 10;
      const font = (first.font || '').replace(/^g_d|_0$|0$|\d+/g, '').replace(/^[A-Za-z]{2,}-\d+/, '');
      const fname = String(first.font || '');
      console.log(`  y=${String(Math.round(first.baselineY)).padStart(3)} x=${String(Math.round(first.x)).padStart(3)} size=${String(size).padStart(4)} font=${fname.padEnd(18)} | ${text}`);
    }

    try {
      const ops = await page.getOperatorList();
      const strokes = [];
      for (let i = 0; i < ops.fnArray.length; i++) {
        const name = opNames[ops.fnArray[i]] || String(ops.fnArray[i]);
        if (/(Path|Stroke)/i.test(name)) strokes.push(name);
      }
      const unique = [...new Set(strokes)];
      const pathStrokes = unique.filter((n) => /Stroke|constructPath/i.test(n));
      if (pathStrokes.length) console.log(`  [vector paint ops present: ${pathStrokes.join(', ')}]`);
    } catch {
      // operator list inspection is best-effort
    }
  }
  try {
    await doc.cleanup();
  } catch {
    // best-effort
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});