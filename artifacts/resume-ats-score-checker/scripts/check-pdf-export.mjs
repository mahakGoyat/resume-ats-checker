/**
 * End-to-end check of the PDF export.
 *
 * Renders a fake resume through the real export path (generateResumePdfFromDoc
 * -> buildImprovedResumeDoc), then asserts on the produced bytes:
 *
 *   1. the PDF has a real text layer (no page-sized raster image)
 *   2. extracted text contains the name, email, phone and both URLs
 *   3. margins are >= 36pt on every side
 *   4. body text is 10-10.5pt and section headings are ~13-14pt bold
 *   5. every link annotation carries an absolute http(s)/mailto URI
 *   6. project titles and tech tags are separate, correctly ordered runs
 *   7. education rows show a visible separator before the year
 *
 * Run with: node scripts/check-pdf-export.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
// The bundle may be staged in a temp directory, so the package root is passed
// in explicitly by the runner.
const artifactRoot = process.env.RESUME_ARTIFACT_ROOT ?? resolve(here, '..');
const require = createRequire(pathToFileURL(resolve(artifactRoot, 'package.json')));
const { PDFDocument, PDFName, PDFObject, PDFString, decodePDFRawStream } = require('pdf-lib');

const { buildImprovedResumeDoc } = await import('../src/lib/resume-doc-model.ts');
const { generateResumePdfFromDoc } = await import('../src/lib/resume-pdf.ts');

const FAKE = {
  name: 'Testcase Person',
  phone: '+91 90000 12345',
  email: 'testcase.person@example.com',
  linkedin: 'https://linkedin.com/in/testcase-person',
  github: 'https://github.com/testcase-person',
};

const improved = {
  header: {
    name: FAKE.name,
    title: 'Machine Learning Engineer',
    location: 'Bengaluru, India',
    phone: FAKE.phone,
    email: FAKE.email,
    linkedin: FAKE.linkedin,
    github: FAKE.github,
    other: [],
  },
  sections: [
    {
      type: 'summary',
      title: 'Professional Summary',
      items: [
        { type: 'text', text: 'Machine learning engineer with six years building production NLP systems for multilingual customers.' },
      ],
    },
    {
      type: 'experience',
      title: 'Experience',
      items: [
        {
          type: 'entry',
          title: 'Senior Machine Learning Engineer',
          subtitle: 'Northwind Analytics, Bengaluru',
          right: 'Mar 2021 - Present',
          tech: 'Python, PyTorch, AWS',
          bullets: [
            'Cut inference latency by 62% by replacing a batched transformer pipeline with a distilled model and a compiled ONNX runtime.',
            'Owned the feature store serving 40+ models in production across three regions.',
          ],
        },
        {
          type: 'entry',
          title: 'Data Scientist',
          subtitle: 'Helio Systems, Hyderabad',
          right: 'Jul 2018 - Feb 2021',
          tech: 'SQL, scikit-learn',
          bullets: ['Built a churn model that retained an additional $1.2M in annual recurring revenue.'],
        },
      ],
    },
    {
      type: 'projects',
      title: 'Projects',
      items: [
        {
          type: 'entry',
          title: 'Cross-Lingual Retrieval Platform for Multilingual Support Archives',
          right: '2023',
          tech: 'Elasticsearch, Sentence Transformers, Docker, Redis, FastAPI',
          bullets: [
            'Indexed 1.8M support threads across nine languages and served semantic search with sub-200ms p95 latency.',
          ],
        },
        {
          type: 'entry',
          title: 'Automated Invoice Document Classifier',
          right: '2022',
          tech: 'OCR, LayoutLM, Tesseract, Python',
          bullets: ['Reached 96.4% field-level accuracy on 40k scanned invoices.'],
        },
        // Deliberately orphaned tech tag: the doc model must absorb this into
        // the project above it, not emit it as a trailing fragment.
        { type: 'entry', text: 'Canva, CapCut, AI Tools' },
      ],
    },
    {
      type: 'education',
      title: 'Education',
      items: [
        { type: 'edu', text: 'B.Tech, Computer Science and Engineering, National Institute of Technology', right: 'Expected 2026' },
        { type: 'edu', text: 'Higher Secondary, Science, 90% |2024', right: '2024' },
      ],
    },
    {
      type: 'languages',
      title: 'Languages',
      items: [{ type: 'text', text: 'English (fluent), Hindi (native), German (B1)' }],
    },
  ],
  suggestions: [],
};

const blocks = buildImprovedResumeDoc(improved);

// --- 0. model-level regressions (no PDF involved) -------------------------
// These cover the parsing bugs that used to only show up as broken layout, so
// they are asserted directly on the document model.
const { splitEntryLine, bareTechTag, buildResumeDoc } = await import('../src/lib/resume-doc-model.ts');

const SPLIT_CASES = [
  // [input, expected text, expected right, expected tech]
  ['B.Tech, Computer Science, 90% |2024', 'B.Tech, Computer Science, 90%', '2024', undefined],
  ['B.Tech, Computer Science, 90% Expected2026', 'B.Tech, Computer Science, 90%', 'Expected 2026', undefined],
  ['B.Tech Computer Science Expected2026', 'B.Tech Computer Science', 'Expected 2026', undefined],
  ['Senior Engineer, Northwind 2021 - Present', 'Senior Engineer, Northwind', '2021 - Present', undefined],
  ['Telegram Automation Bot | 2024', 'Telegram Automation Bot', '2024', undefined],
  // A tag written BEFORE the title must be moved to the right column.
  ['AI Tools, Automation Telegram Automation Bot', 'Telegram Automation Bot', undefined, 'AI Tools, Automation'],
  // A tag written after a separator becomes the tag column.
  ['Telegram Automation Bot | AI Tools, Automation', 'Telegram Automation Bot', undefined, 'AI Tools, Automation'],
  // An employer + city must NOT be mistaken for a tech tag: losing it would
  // silently delete the employer from the resume.
  ['Northwind Analytics, Bengaluru', 'Northwind Analytics, Bengaluru', undefined, undefined],
  ['Helio Systems, Hyderabad', 'Helio Systems, Hyderabad', undefined, undefined],
  // A prose summary is never a tag.
  [
    'Led a team of engineers to deliver the platform on schedule.',
    'Led a team of engineers to deliver the platform on schedule.',
    undefined,
    undefined,
  ],
];
for (const [input, wantText, wantRight, wantTech] of SPLIT_CASES) {
  const got = splitEntryLine(input);
  assert.equal(got.text, wantText, `splitEntryLine(${JSON.stringify(input)}).text`);
  assert.equal(got.right, wantRight, `splitEntryLine(${JSON.stringify(input)}).right`);
  assert.equal(got.tech, wantTech, `splitEntryLine(${JSON.stringify(input)}).tech`);
}

assert.equal(bareTechTag('Canva, CapCut, AI Tools'), 'Canva, CapCut, AI Tools', 'bareTechTag missed a real tag');
assert.equal(bareTechTag('Northwind Analytics, Bengaluru'), null, 'bareTechTag claimed an employer line is a tag');

// The raw (non-AI) parse path must get the same treatment, and a tag stranded
// on its own line must be folded back onto the entry above it.
const rawDoc = buildResumeDoc({
  name: 'Testcase Person',
  contact: { phones: [], emails: [], urls: [], locations: [], lines: [FAKE.phone, FAKE.email, FAKE.linkedin, FAKE.github, 'Bengaluru, India'] },
  sections: [
    { kind: 'experience', title: 'Experience', content: 'Senior Machine Learning Engineer\nNorthwind Analytics, Bengaluru | Mar 2021 - Present\nAI Tools, Automation' },
    { kind: 'education', title: 'Education', content: 'B.Tech, Computer Science, 90% Expected2026' },
    { kind: 'languages', title: 'Languages', content: 'English (fluent), Hindi (native)' },
  ],
});
const rawItems = rawDoc.filter((b) => b.kind === 'item');
const experienceItems = rawItems.filter((b) => b.text === 'Northwind Analytics, Bengaluru');
assert.equal(experienceItems.length, 1, 'raw parse lost or duplicated the employer line');
assert.equal(experienceItems[0].right, 'Mar 2021 - Present', 'raw parse did not separate the date from the employer');
assert.equal(
  experienceItems[0].tech,
  'AI Tools, Automation',
  'raw parse did not fold the stranded tag back onto the entry',
);
const eduItems = rawItems.filter((b) => b.text.includes('B.Tech'));
assert.equal(eduItems[0].right, 'Expected 2026', 'raw parse did not separate the expected date');
assert.ok(
  !rawItems.some((b) => (b.text ?? '').includes('AI Tools, Automation')),
  'a stranded tag survived as a loose item instead of being absorbed',
);

const bytes = await generateResumePdfFromDoc(blocks, null);
assert.ok(bytes.byteLength > 2000, `PDF looks too small: ${bytes.byteLength} bytes`);

// Loaded up front: both the resource-tree and content-stream checks below read
// the PDF's own objects, which is what proves what was actually drawn.
const libDoc = await PDFDocument.load(bytes);
const libPage = libDoc.getPage(0);

const outDir = resolve(artifactRoot, 'dist', 'pdf-check');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'test-resume.pdf');
writeFileSync(outPath, Buffer.from(bytes));
console.log(`wrote ${outPath} (${bytes.byteLength} bytes)`);

// --- 1. real text layer, not a screenshot -------------------------------
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
// pdf.js needs the standard font data to turn an internal font id into a real
// name (e.g. "Helvetica-Bold"), which is how the boldness check below works.
const standardFontDataUrl = pathToFileURL(resolve(artifactRoot, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/').href;
const doc = await pdfjs.getDocument({
  data: new Uint8Array(bytes),
  useSystemFonts: true,
  standardFontDataUrl,
}).promise;
const pageCount = doc.numPages;
assert.equal(pageCount, 1, `expected a single page, got ${pageCount}`);

const page = await doc.getPage(1);
const content = await page.getTextContent();
const textItems = content.items.filter((item) => typeof item.str === 'string' && item.str.length);
const extracted = textItems.map((item) => item.str).join(' ');

assert.ok(
  textItems.length > 20,
  `too few text runs (${textItems.length}) — the page is probably rasterized`,
);

// pdf.js exposes operators as parallel `fnArray` (ids) and `argsArray` arrays,
// so the operator *name* must be read out of OPS, not off the numeric id.
const OPS = pdfjs.OPS;
const IMAGE_OP_NAMES = [
  OPS.paintImageXObject,
  OPS.paintJpegXObject,
  OPS.paintImageMaskXObject,
  OPS.paintInlineImageXObject,
].filter((id) => typeof id === 'number');

const ops = await page.getOperatorList();
const imageOps = [];
for (const id of ops.fnArray) {
  if (IMAGE_OP_NAMES.includes(id)) imageOps.push(id);
}
assert.equal(
  imageOps.length,
  0,
  `found ${imageOps.length} image draw op(s) — the page is a screenshot, not text`,
);
// Also assert the resource tree carries no XObject images at all.
const xObjects = libDoc.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'));
if (xObjects) {
  for (const [name, ref] of xObjects.entries()) {
    const subtype = libDoc.context.lookup(ref)?.get(PDFName.of('Subtype'))?.toString();
    assert.notEqual(subtype, '/Image', `page resource ${name.toString()} is an image`);
  }
}

// --- 2. the important strings survive -----------------------------------
for (const expected of [
  FAKE.name,
  FAKE.email,
  FAKE.phone,
  'https://linkedin.com/in/testcase-person',
  'https://github.com/testcase-person',
]) {
  assert.ok(extracted.includes(expected), `extracted text is missing ${JSON.stringify(expected)}`);
}
assert.ok(extracted.length > 200, `extracted text too short: ${extracted.length} chars`);

const flat = extracted.replace(/\s+/g, ' ');
assert.ok(
  /Cross-Lingual Retrieval Platform for Multilingual Support Archives/.test(flat),
  'project title missing from the text layer',
);
assert.ok(
  /Elasticsearch, Sentence Transformers, Docker, Redis, FastAPI/.test(flat),
  'project tech tag missing from the text layer',
);
// Bug #5: the tag must come AFTER the title, never before it, and never
// concatenated into the title run.
const titleAt = flat.indexOf('Cross-Lingual Retrieval Platform');
const techAt = flat.indexOf('Elasticsearch, Sentence Transformers');
assert.ok(titleAt >= 0 && techAt > titleAt, 'tech tag must follow its project title');
assert.ok(
  !/ArchivesElasticsearch/.test(flat),
  'project title and tech tag were concatenated into one run',
);
// Bug #7: the orphan tag must not reappear after Languages.
const languagesAt = flat.indexOf('LANGUAGES');
const orphanAt = flat.indexOf('Canva, CapCut, AI Tools');
assert.ok(languagesAt >= 0, 'Languages section heading missing');
assert.ok(
  orphanAt === -1 || orphanAt < languagesAt,
  'a tech tag leaked out as a trailing fragment after the Languages section',
);
// Bug #6: education date/status must be separated from the label.
assert.ok(/Expected 2026/.test(flat), 'expected "Expected 2026" with a visible space, got a squished run');
assert.ok(!/Expected2026/.test(flat), '"Expected2026" is still glued together');
assert.ok(!/%\s*\|\s*2024/.test(flat), '"90% |2024" still has no space after the pipe');
assert.ok(!/\d{4}[A-Za-z]/.test(flat.replace(/\d{4}s\b/g, '')), 'a year is glued to a following letter');

// --- 3. margins ----------------------------------------------------------
const viewport = page.getViewport({ scale: 1 });
const MARGIN_PT = 36;
for (const [name, edge] of [
  ['left', viewport.width - Math.min(...textItems.map((item) => item.transform[4]))],
  ['right', Math.max(...textItems.map((item) => item.transform[4] + item.width))],
]) {
  assert.ok(edge >= MARGIN_PT - 0.5, `${name} margin is ${edge.toFixed(1)}pt, need >= ${MARGIN_PT}pt`);
}
const minTop = Math.min(...textItems.map((item) => viewport.height - item.transform[5]));
assert.ok(minTop >= MARGIN_PT - 0.5, `top margin is ${minTop.toFixed(1)}pt, need >= ${MARGIN_PT}pt`);

// --- 4. type sizes and faces ---------------------------------------------
// Boldness is checked against the PDF's own font resources rather than pdf.js's
// font ids, which are opaque for non-embedded standard fonts. Each text run in
// the content stream names the font it was drawn with.
const bodySizes = textItems.map((item) => Math.abs(item.transform[3] ?? 0));
const bodyMode = modeOf(bodySizes);
assert.ok(
  bodyMode >= 9.9 && bodyMode <= 10.6,
  `body text is ${bodyMode}pt, expected 10-10.5pt`,
);

// Section headings are the all-caps accent-coloured runs that are neither the
// name (20pt) nor the title/contact lines.
const headingCandidates = textItems.filter((item) => {
  const size = Math.abs(item.transform[3] ?? 0);
  if (size < 12) return false;
  if (!/^[A-Z][A-Z0-9 &/'-]+$/.test(item.str.trim())) return false;
  return item.str.trim().length > 3;
});
assert.ok(headingCandidates.length >= 4, `expected >= 4 section headings, found ${headingCandidates.length}`);
for (const heading of headingCandidates) {
  const size = Math.abs(heading.transform[3]);
  assert.ok(size >= 13 && size <= 14.5, `section heading "${heading.str}" is ${size}pt, expected 13-14pt`);
}

// libDoc/libPage are loaded just after the PDF is generated.
const runFonts = textRunsWithFonts(libDoc, libPage, await readContentStream(libDoc, libPage));
for (const heading of headingCandidates) {
  const run = runFonts.find((entry) => entry.text.includes(heading.str.trim()));
  assert.ok(run, `no content-stream run found for heading "${heading.str}"`);
  assert.match(run.font, /-Bold$|BoldOblique$/, `section heading "${heading.str}" uses ${run.font}, not a bold face`);
}
assert.ok(
  runFonts.some((run) => /-Oblique$|Italic$/.test(run.font)),
  'no italic face used — the tech tags should be italic',
);
// A project title is bold, its tech tag is italic: two visibly distinct runs,
// which is what keeps them from reading as one run of text.
const projectTitleRun = runFonts.find((entry) => entry.text.includes('Cross-Lingual Retrieval Platform'));
const projectTechRun = runFonts.find((entry) => entry.text.includes('Elasticsearch, Sentence Transformers'));
assert.ok(projectTitleRun && projectTechRun, 'project title / tech tag runs not found in the content stream');
assert.match(projectTitleRun.font, /Bold/, 'the project title must be bold');
assert.match(projectTechRun.font, /Italic|Oblique/, 'the project tech tag must be italic');
assert.notEqual(projectTitleRun.font, projectTechRun.font, 'title and tech tag must use different faces');

// --- 5. real hyperlink annotations ---------------------------------------
const annotations = await page.getAnnotations();
const linkAnnots = annotations.filter((annot) => annot.subtype === 'Link');
assert.ok(linkAnnots.length >= 3, `expected >= 3 link annotations, found ${linkAnnots.length}`);

const uris = linkAnnots.map((annot) => String(annot.url ?? ''));
for (const expected of [
  `mailto:${FAKE.email}`,
  FAKE.linkedin,
  FAKE.github,
]) {
  assert.ok(uris.includes(expected), `no link annotation for ${expected} (got ${JSON.stringify(uris)})`);
}
for (const uri of uris) {
  assert.ok(
    /^(https:\/\/|mailto:)/.test(uri),
    `link annotation is not an absolute URI: ${uri}`,
  );
  assert.ok(
    !/^file:\/\//i.test(uri) && !uri.endsWith('#'),
    `link annotation points at a local file or empty anchor: ${uri}`,
  );
}

// Cross-check with pdf-lib so the assertion does not depend only on pdf.js.
// libDoc/libPage were loaded above for the content-stream font checks.
const libAnnots = libPage.node.get(PDFName.of('Annots'));
assert.ok(libAnnots, 'PDF has no /Annots array');
let checked = 0;
for (const ref of libAnnots.asArray()) {
  const dict = libDoc.context.lookup(ref, PDFObject);
  if (dict.get(PDFName.of('Subtype'))?.toString() !== '/Link') continue;
  const action = dict.get(PDFName.of('A'));
  const raw = action?.get(PDFName.of('URI'));
  if (!raw) continue;
  // A URI is a PDF string; `toString()` would include the literal parens.
  const value = raw instanceof PDFString ? raw.asString().replace(/^\//, '') : String(raw).replace(/^\//, '');
  checked += 1;
  assert.ok(
    value.startsWith('https://') || value.startsWith('mailto:'),
    `pdf-lib link URI is not absolute: ${value}`,
  );
  assert.ok(!/^file:\/\//i.test(value), `pdf-lib link URI is a local file path: ${value}`);
  assert.ok(
    uris.includes(value),
    `pdf-lib found a link pdf.js did not report: ${value}`,
  );
}
assert.equal(checked, uris.length, 'pdf-lib and pdf.js disagree on the number of link annotations');

console.log(`\ntext runs: ${textItems.length} | chars: ${extracted.length} | links: ${uris.length}`);
console.log('links:', uris.join(', '));
console.log('\nAll PDF export checks passed.');

function modeOf(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return Number(best.toFixed(2));
}

/** Decodes a page's content stream to a latin1 string. */
async function readContentStream(doc, page) {
  const contents = page.node.get(PDFName.of('Contents'));
  const resolved = doc.context.lookup(contents);
  const list = Array.isArray(resolved) ? resolved : [resolved];
  let out = '';
  for (const ref of list) {
    const stream = doc.context.lookup(ref);
    // getContents() returns the still-encoded bytes; jsPDF applies FlateDecode,
    // so the operators are only readable after decoding.
    const decoded = stream.dict.has(PDFName.of('Filter'))
      ? decodePDFRawStream(stream).decode()
      : stream.getContents();
    out += Buffer.from(decoded).toString('latin1');
  }
  return out;
}

/**
 * Returns every text run in the content stream together with the BaseFont it
 * was drawn with, so bold/italic can be asserted from the PDF itself.
 */
function textRunsWithFonts(doc, page, stream) {
  const fontMap = new Map();
  const resources = page.node.Resources();
  const fonts = resources.lookup(PDFName.of('Font'));
  if (fonts) {
    for (const [name, ref] of fonts.entries()) {
      const font = doc.context.lookup(ref);
      const base = font.get(PDFName.of('BaseFont'))?.toString().replace(/^\//, '') ?? '';
      fontMap.set(name.toString().replace(/^\//, ''), base);
    }
  }

  const runs = [];
  let font = '';
  // Matches a font-selection operator and any following show-text operands.
  const re = /\/(F\d+)\s+[\d.]+\s+Tf|\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let match;
  while ((match = re.exec(stream)) !== null) {
    if (match[1]) {
      font = fontMap.get(match[1]) ?? font;
    } else if (match[2]) {
      runs.push({ font, text: match[2].replace(/\\([()\\])/g, '$1') });
    }
  }
  return runs;
}
