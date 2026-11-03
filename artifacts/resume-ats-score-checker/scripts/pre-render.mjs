import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'public');

// Load .env for local development
function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
    const out = {};
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^['"]|['"]$/g, '');
      out[match[1]] = value;
    }
    for (const [k, v] of Object.entries(out)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    // .env not present; rely on process.env (Vercel)
  }
}
loadEnv();

const SITE_URL = 'https://resume-ats-checker-beta-six.vercel.app';
const SITE_NAME = 'ScoreMyResume';
const DEFAULT_DESCRIPTION =
  'Free ATS resume checker. ScoreMyResume reads your resume in the browser and shows how an applicant tracking system would read it — keyword matching, formatting help, and a clear improvement plan. No uploads, no accounts.';
const DEFAULT_OG_IMAGE = '/scoremyresume-logo.jpg';

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeHTMLEntities(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function jsonLdScript(data) {
  return `<script type="application/ld+json" id="seo-jsonld">${xmlEscape(JSON.stringify(data))}</script>`;
}

function buildHead({ title, description, canonicalPath, ogType = 'website', jsonLd, image }) {
  const canonical = `${SITE_URL}${canonicalPath}`;
  const ogImage = image ? `${SITE_URL}${image}` : `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  const parts = [
    `<title>${htmlEscape(title)}</title>`,
    `<meta name="description" content="${htmlEscape(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${xmlEscape(canonical)}" />`,
    `<meta property="og:site_name" content="${htmlEscape(SITE_NAME)}" />`,
    `<meta property="og:title" content="${htmlEscape(title)}" />`,
    `<meta property="og:description" content="${htmlEscape(description)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${xmlEscape(canonical)}" />`,
    `<meta property="og:image" content="${xmlEscape(ogImage)}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${htmlEscape(title)}" />`,
    `<meta name="twitter:description" content="${htmlEscape(description)}" />`,
    `<meta name="twitter:image" content="${xmlEscape(ogImage)}" />`,
  ];
  if (jsonLd) parts.push(jsonLdScript(jsonLd));
  return parts.join('\n    ');
}

function wrapHtml({ headTags, bodyHtml, assetTags, noscript }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    ${headTags}
    ${assetTags}
  </head>
  <body>
    ${noscript}
    <div id="root">${bodyHtml}</div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

function noscriptHtml() {
  return `<noscript>
    <div style="padding:2rem; font-family: system-ui, -apple-system, sans-serif; color:#1f2937;">
      <h1>ScoreMyResume — Free ATS Resume Checker</h1>
      <p>ScoreMyResume reads your resume in the browser and shows how an applicant tracking system would read it — keyword matching, formatting help, and a clear improvement plan. No uploads, no accounts.</p>
      <p><a href="/">Resume checker</a> · <a href="/blog">Blog</a> · <a href="/resume-help">Resume help guides</a> · <a href="/about">About</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a></p>
    </div>
  </noscript>`;
}

// Asset tags extracted from built index.html
function extractAssetTags(indexHtml) {
  const headEnd = indexHtml.indexOf('</head>');
  if (headEnd === -1) return '';
  const headContent = indexHtml.slice(0, headEnd);
  // Keep meta tags we'll replace, but keep script/link/preconnect tags
  const lines = headContent.split('\n');
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('<link rel="preconnect"') ||
      trimmed.startsWith('<link href="https://fonts.googleapis.com"') ||
      trimmed.startsWith('<link rel="icon"') ||
      trimmed.startsWith('<link rel="apple-touch-icon"') ||
      trimmed.startsWith('<script async src="https://www.googletagmanager.com"') ||
      trimmed.startsWith('<script>') && trimmed.includes('gtag') ||
      trimmed.startsWith('</script>') && line.includes('gtag')
    ) {
      kept.push(line);
    }
  }
  return kept.join('\n    ');
}

// ============ Route content data ============

const STATIC_PAGES = [
  {
    path: '/',
    title: 'ScoreMyResume — Free ATS Resume Checker',
    description: DEFAULT_DESCRIPTION,
    canonicalPath: '/',
    bodyHtml: `
<section class="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
  <div class="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-12">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">free · browser-only · no account</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.05em] sm:text-7xl">See how an ATS reads your resume.</h1>
    <p class="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">Upload your resume as a PDF, DOCX, image, or text file. Get a five-signal score — length, keyword optimization, content, organization, and scanning — with clear next steps. Everything runs locally in your browser. Nothing is uploaded or stored.</p>
  </div>
</section>`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: DEFAULT_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  },
  {
    path: '/about',
    title: 'About ScoreMyResume — A free, private ATS resume checker',
    description: 'ScoreMyResume reads resumes entirely in the browser — nothing is uploaded or stored. Learn about the team behind GoodSpace and why the checker is built for privacy first.',
    canonicalPath: '/about',
    bodyHtml: `
<section class="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
  <div class="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-12">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">our story</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.05em] sm:text-7xl">Built for privacy, designed for clarity.</h1>
    <p class="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">ScoreMyResume began with a single frustration: watching talented friends apply for months and never learn why their resumes went unanswered. The first version was a local script that counted words, sections, and keywords and printed a plain list of worries. It was crude, but it produced the same insight every candidate deserved: the record of your work is readable, and the reasons it falls short are not a mystery.</p>
    <p class="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">From that script grew the browser-based checker, then the templates, then the keyword finder. Each feature followed the same rule: build it locally, explain its thinking, keep it free. The team stayed intentionally small so that nobody's data was a tradeable asset, and every product decision could be made in service of the candidate rather than a dashboard.</p>
  </div>
</section>`,
  },
  {
    path: '/contact',
    title: 'Contact — ScoreMyResume',
    description: 'Questions about the ScoreMyResume ATS resume checker, the resume help guides, or the GoodSpace blog? Reach out through the contact page.',
    canonicalPath: '/contact',
    bodyHtml: `
<section class="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
  <div class="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-12">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">get in touch</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.05em] sm:text-7xl">Have a question? We read every message.</h1>
    <p class="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">Questions about the ScoreMyResume ATS resume checker, the resume help guides, or the GoodSpace blog? Reach out through the contact page. We respond to every message and fix broken routes quickly.</p>
    <p class="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))]">Email: <strong>contact@goodspace.app</strong></p>
  </div>
</section>`,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — ScoreMyResume',
    description: 'ScoreMyResume never uploads, stores, or tracks your resume. Read how the browser-only ATS checker keeps your data private.',
    canonicalPath: '/privacy',
    bodyHtml: `
<section class="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
  <div class="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-12">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">your data stays yours</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.05em] sm:text-7xl">Privacy policy</h1>
    <p class="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">ScoreMyResume never uploads, stores, or tracks your resume. The score, the checking steps, and the report sections all run inside the browser. We structured the product this way from the first version, because a resume is one of the most sensitive documents a person owns. There was no good reason to route it through a server, so we did not.</p>
  </div>
</section>`,
  },
  {
    path: '/blog',
    title: 'Blog — ScoreMyResume',
    description: 'Practical writing for hiring software: how applicant tracking systems read resumes, what to fix first, and honest guidance for job seekers.',
    canonicalPath: '/blog',
    bodyHtml: null, // populated dynamically from Supabase
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_URL}/blog`,
      description: 'Practical writing for hiring software: how applicant tracking systems read resumes, what to fix first, and honest guidance for job seekers.',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/blog/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  },
  {
    path: '/resume-help',
    title: 'Resume Help Guides & City Pages — ScoreMyResume',
    description: 'Free resume help for freshers, IT, government jobs, digital marketing, remote roles — plus city-specific advice for Haryana and NCR.',
    canonicalPath: '/resume-help',
    bodyHtml: null, // populated dynamically with directory content
  },
];

const KEYWORD_PAGES = [
  {
    slug: 'freshers',
    title: 'Resume Checker for Freshers — First Job Resume Tips | ScoreMyResume',
    description: 'Free resume check for freshers: no work history yet? See how education, projects, internships and role keywords should carry your first resume past an ATS.',
    canonicalPath: '/resume-help/freshers',
    badge: 'no experience yet · that is the point',
    heading: 'Build a first resume that still parses cleanly',
    sub: `Freshers face an unfair trade: you have the least material to work with, yet your first resume is read by the same software that screens twenty-year veterans. Because you cannot lean on a career section, every other part of your document has to do the heavy lifting, and the sections you choose matter more than the years you do not have. This page covers how a fresher resume gets read, and how to arrange education, projects and training so a parser finds them instantly.`,
    cards: [
      { title: 'Let education and projects carry the weight', text: `Without a long employment history, your Education, Projects and Certifications blocks become your evidence. Give each one a real heading, full dates, and details a machine can file, so the scaffold looks like the backbone of the document, not a placeholder.` },
      { title: 'Keep section names the software expects', text: `Recruiters skim, but parsers look for familiar labels such as Education, Projects, Skills and Internships. A fresher resume with clever headings reads well to a person and poorly to a machine; the checker catches that mismatch before you send it.` },
      { title: 'Mine the posting for the role language', text: `A fresher posting usually repeats the same two or three skills in every bullet. Match those exact terms in your Projects and Skills sections, phrased honestly, and the keyword signal climbs with zero invented experience.` },
    ],
    faqs: [
      { q: 'What should a fresher resume contain when I have no work experience?', a: 'Lean on Education, Projects, Skills and Internships. Put your degree, passing year and relevant coursework near the top, then let two or three dated projects carry the bulk. Keep everything under plain headings so both an ATS resume scan and a recruiter find the same sections quickly.' },
      { q: 'How do I write a first job resume that still passes an ATS?', a: 'Use standard section names and a single-column layout, and repeat the exact skills the posting asks for inside project bullets rather than in a lone skills list. Save the file as a text-layer PDF, then run your ATS resume through a free resume checker to confirm it parses before you apply.' },
      { q: 'Is it okay to submit a resume with no experience at all?', a: 'Yes, most fresher openings expect exactly that. A resume with no experience should still show education, projects, training and skills in a readable order, because reviewers and parsing tools screen those sections rather than your missing career history. Structure it cleanly and the gap stops mattering.' },
    ],
  },
  {
    slug: 'it-jobs',
    title: 'ATS Resume Checker for IT & Tech Jobs | ScoreMyResume',
    description: 'Tech resumes love skill piles and tables — both trip up ATS parsers. Practical tips to make an IT resume scan cleanly while keeping the depth engineers want.',
    canonicalPath: '/resume-help/it-jobs',
    badge: 'for developers, testers, analysts & infra folks',
    heading: 'An IT resume that an ATS can actually read',
    sub: `Tech resumes fail differently from other resumes: not because they are empty, but because they are overloaded. Long skill lists, nested tables, two-column layouts, acronyms that appear only in the skills pile, and project descriptions that never say what the tool did. The opposite problem shows up too, a one-line skills section that never mentions the stack a job posting repeats. Both extremes lose points on the same five signals this checker scores.`,
    tips: [
      { title: 'Repeat role terms inside bullets, not only in a skills block', text: `Past a skills section, a parser still wants to see the stack in context. Writing "built React dashboards consuming a GraphQL API" inside a project bullet matches a posting that asks for React, and it reads like experience instead of a list.` },
      { title: 'Give every tool a sentence around it', text: `Saying "AWS" gets filed, but saying "migrated a nightly batch job to AWS Lambda" tells the parser and the reader how you used it. One line of context turns a buzzword into a claim a human can verify.` },
      { title: 'Flatten columns and tables before uploading', text: `Many tech resumes use sidebars for skills or certifications. A two-column layout can merge tool names into the wrong field when extracted. One column, plain headings, and your skill tags become a normal Skills block.` },
      { title: 'Mirror the posting vocabulary', text: `If the listing says "software engineer" and your header says "developer," or it says "Python" and you wrote "py," the match is weaker than it needs to be. Use the title and terms the posting uses, where honest.` },
    ],
  },
  {
    slug: 'government-jobs',
    title: 'Resume & Application Tips for Government Job Seekers | ScoreMyResume',
    description: 'Government applications mix forms, affidavits and education certificates with resumes. Honest, practical advice on formatting the resume part so it survives both portals.',
    canonicalPath: '/resume-help/government-jobs',
    badge: 'examinations, forms, certificates and one résumé',
    heading: 'Making the résumé part of a government application survive the portal',
    sub: `Government recruiting rarely works like a normal ATS cycle. There is a fast-filter stage of forms, eligibility checks, category declarations and certificate uploads, and then somewhere inside the application a résumé field that actually gets read, mostly by a person. This page is about that résumé field: how to keep it plain, current and correctly labelled so a clerk, an examiner and a department portal can all agree on what it says.`,
    pairs: [
      { title: 'The form is mandatory, the résumé is still yours', challenge: 'Many candidates assume the online form replaces the document. In practice the form holds the eligibility record, while the résumé carries your achievements, training and experience in a readable order.', solve: 'Treat them as complementary: let the form state facts precisely, and let the résumé add the detail the form never asks for, dated and structured under plain headings.' },
      { title: 'Acronyms only after you spell them once', challenge: 'Department abbreviations like HSSC, HSSPP or the many board initials mean nothing to a screening reader outside that office, and everything to someone inside it.', solve: 'Write the full name on first use with the short form in brackets, then use the short form in later bullets. The name signals your familiarity and the acronym makes the document skimmable.' },
    ],
    faqs: [
      { q: 'Do government reviewers actually use an ATS?', a: 'Some ministries and state agencies do, especially for posts receiving thousands of applications. Others lean on manual screens. The safest document satisfies both: parseable structure that is also easy for a human to skim.' },
      { q: 'Should I include caste, category or age details on the résumé?', a: 'Declaration fields belong on the form, not the résumé, and requirements vary by notification. When in doubt, follow the specific notification for that post; privacy-wise, keep such identifiers off the document unless a field invites them.' },
    ],
  },
  {
    slug: 'digital-marketing',
    title: 'Resume Checker for Digital Marketing Roles | ScoreMyResume',
    description: 'Marketing resumes must prove creativity and measure it. Tips to keep portfolio links, platforms and campaign results scannable for both a person and an ATS.',
    canonicalPath: '/resume-help/digital-marketing',
    badge: 'creative job, measurable document',
    heading: 'A digital marketing resume that proves results, not just vocabulary',
    sub: `Digital marketing hires are asked for two contradictory things: a resume that shows campaign instincts, and a resume that a filtering tool can sort. The way to satisfy both is to stop selling adjectives and start filing numbers. Platform names, channel names and outcome figures belong in the same bullets, so a parser files the nouns and a hiring manager sees the proof.`,
    cards: [
      { title: 'Give each platform a context line', text: `"Meta ads" files as a keyword; "scaled Meta prospecting campaigns for a D2C brand" files as experience. Mention the channel inside the achievement, not only in a tools row, and the paragraph reads like evidence.` },
      { title: 'Lead with outcome, then the channel', text: `Recruiters skim for growth. A bullet that opens with a real, honest result and closes with the channel and budget size carries the most information per line, for both the machine and the reader.` },
      { title: 'Keep the portfolio one clean line', text: `A clickable URL typed as text at the top of your contact block survives parsing. A QR code, an image button or a shortened link hidden in a design mark often does not reach the recruiter's preview.` },
      { title: 'Match the posting channel list', text: `If the role lists SEO, content, email and social, use those exact channel words in your relevant bullets. Role-specific synonyms like "organic growth" connect the dots; the exact phrase makes the match explicit.` },
    ],
  },
  {
    slug: 'remote-jobs',
    title: 'ATS-Friendly Resume for Remote & Work-From-Home Jobs | ScoreMyResume',
    description: 'Remote roles filter for timezone, tools and async discipline. Practical ATS tips to make work-from-home signals visible in your resume structure.',
    canonicalPath: '/resume-help/remote-jobs',
    badge: 'remote-ready · async · timezone-visible',
    heading: 'A work-from-home resume that signals readiness at a glance',
    sub: `Remote hiring adds a filter regular roles do not have: location discipline. Recruiters screen for a convincing line about where you work, the hours you overlap, the tools you collaborate in and how you prove productivity without a desk to watch. A remote resume earns its place by answering those four questions in the first third of the document, without sacrificing the parsing quality a screening tool expects.`,
    rows: [
      { title: 'Put availability where a scanner finds it', text: `A line under your header stating the work mode and overlap window — "open to remote, IST with overlap to US-East" — answers the single most-filtered question in remote hiring. If the job is strictly remote, name the mode explicitly.` },
      { title: 'Show the collaboration stack in context', text: `Mentioning Slack, Zoom, Jira, Notion and similar tools in project bullets shows experience with the distributed workflow itself, not just a skills list. Double benefit: the tool names are exactly what remote postings repeat.` },
      { title: 'Lead outcomes, because hours are invisible', text: `Remote reviewers judge output, not office time. Structure each role bullet around what changed, for whom, and how it was measured, so the document stands on evidence you can defend in a video call.` },
      { title: 'Remove anything that says commute', text: `Office addresses, local-only credentials and references to on-site presence add noise to a remote application. Keep the city line for timezone context and cut the rest from the resume itself.` },
      { title: 'Mirror the posting mode language', text: `If a role says "fully remote" or "hybrid", repeat that phrasing honestly in your summary line. Matching the mode term keeps your resume inside the recruiter's keyword net for remote roles specifically.` },
    ],
  },
  {
    slug: 'software-engineer',
    title: 'Software Engineer Resume Scanner — ATS Tips for Engineers | ScoreMyResume',
    description: 'A software engineer resume must balance systems depth with parsing. Tips on stack-in-context bullets, flattened layouts and title mirroring for ATS screens.',
    canonicalPath: '/resume-help/software-engineer',
    badge: 'developers · SDEs · engineers · architects',
    heading: 'An engineer resume the ATS parses and the interviewer respects',
    sub: `Engineering resumes live in a narrow band: too much depth and a parser buries the signal in nested tables; too little and the stack never appears outside a skills list. Screening tools read headers, dates, and the text nearest your project titles, so the winning move is to put tools into bullet context, keep the file mechanically clean, and let the same sentence serve the parser and the person reviewing it.`,
    tips: [
      { title: 'Write the stack into each project bullet', text: `"Built React dashboards consuming a GraphQL API" out-parses a skills row that only says React. The parser files the technology inside a project, and the interviewer sees that you used it, not just that you listed it.` },
      { title: 'Flatten sidebars before you upload', text: `Many engineering resumes put skills in a two-column sidebar. Extracted, that layout can merge tool names or split accent keywords. One column with a plain Skills block keeps your tools where the parser and recruiter both expect them.` },
      { title: 'Mirror the posting title and stack language', text: `If the role says "Java" and your resume says "J2SE", or the posting says "senior software engineer" and your header says "backend developer", weaken the match unnecessarily. Use the posting's exact terms where your experience is honest.` },
      { title: 'Keep dates and environments as literal text', text: `Timeline graphics and environment icons look impressive and extract badly. Write months and years normally, and mention cloud platforms, runtimes and CI tools inside bullets so they survive extraction with their context.` },
      { title: 'Demote the word-cloud skills header', text: `A long alphabet of technologies at the end adds length without evidence. Keep a short Skills block with the stack you actually use, and let project bullets carry the depth. The score moves when scannable depth replaces volume.` },
    ],
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst Resume Review — SQL, Excel & BI Tips | ScoreMyResume',
    description: 'Data analyst resumes lean on charts and icon rows that ATS parsers skip. Keep SQL, Excel, BI tools and every metric as scannable text with these fixes.',
    canonicalPath: '/resume-help/data-analyst',
    badge: 'numbers first, formatting second',
    heading: 'A data analyst resume that proves analysis in plain text',
    sub: `Data analyst candidates make one ironic mistake: they decorate the resume with charts, gauges and icon grids, which is exactly the content a scanner cannot read. The tools and figures that decide shortlists need to exist as selectable text. This page walks through turning every visual shorthand into literal, parseable evidence without losing the analytical signal.`,
    tips: [
      { title: 'Replace gauge charts with a scored number row', text: `A dashboard-style graphic may look impressive to a person, but it extracts as nothing. Write the same figure as text — "cut order-fill time 18% across 40 warehouses" — and both the parser and the reader get the evidence.` },
      { title: 'Name SQL, Excel and one BI tool in context', text: `Say "queried 2M-row tables in SQL Server and built a Power BI dashboard for finance" instead of adding tools to a list. The context sentence files the tools and proves you used them together.` },
      { title: 'Spell metrics with units and timeframes', text: `"Converted 22% of trial users in Q3" beats "increased conversions". Units, percentages and periods make the claim auditable in an interview and give the keyword scan concrete nouns.` },
      { title: 'Mirror the exact analyst vocabulary', text: `If the posting repeats "data cleaning", "A/B testing" or "forecasting", use those phrases in your relevant bullets. Synonyms show understanding; the exact phrase makes the match explicit to the screener.` },
      { title: 'Keep portfolio links as typed URLs', text: `Tableau public URLs, dashboards and GitHub repos belong as plain text in your contact block. Image buttons and QR codes often stop at the parser, so the recruiter preview loses the only proof link on the page.` },
    ],
  },
  {
    slug: 'canva',
    title: 'Canva Resume Checker — Make a Canva CV ATS-Friendly | ScoreMyResume',
    description: 'Canva templates look great but often fail ATS parsing. Step-by-step fixes to export a Canva resume that keeps its design and gains a readable text layer.',
    canonicalPath: '/resume-help/canva',
    badge: 'pretty template, invisible text is the trap',
    heading: 'Make a Canva resume that keeps its looks and passes the parser',
    sub: `Canva produces some of the most attractive resume templates on the internet, and some of the hardest for an ATS to read. The usual culprit is export: a beautifully designed PDF that is really a full-page image, or a template built around columns, icons and decorative fonts that collapse during extraction. You can keep 90% of the design and fix 100% of the compatibility with the ordered checks on this page.`,
    rows: [
      { title: 'Export as PDF, not PNG or JPG', text: `Choose the PDF download (usually "PDF Standard") so vector text survives. A PNG or JPG export turns the whole resume into one unreadable image for a parser, regardless of how clean the design looks.` },
      { title: 'Switch the template to a single column', text: `Most portfolio-style Canva resumes are two columns. In the editor, drag the blocks into one column or pick a single-column template. Extraction reads top to bottom, and a two-column layout scrambles the order.` },
      { title: 'Replace decorative fonts for headings', text: `Keep one expressive font for your name only, and use standard fonts like Inter, Lato or Arial for section headings and body text. Software rarely fails on the name; it trips on unreadable heading glyphs.` },
      { title: 'Strip icon-only labels and charts', text: `Replace icon bullets and progress-bar skills with plain text. "Tableau · advanced" reads; a five-dot gauge reads as nothing. Every element that cannot be selected as text should become words.` },
      { title: 'Verify the text layer before sending', text: `After export, open the PDF, select all and copy into a text editor. If words come through in a sensible order, the file is safe. Then run the finished file through this free checker to confirm it scans clean.` },
    ],
  },
  {
    slug: 'file-format',
    title: 'Best File Format for ATS — PDF vs Word vs DOCX | ScoreMyResume',
    description: 'Which resume file format passes an ATS? Compare PDF text-layer, DOCX, legacy .doc, image scans and Google Drive exports, with a clear pick for every scenario.',
    canonicalPath: '/resume-help/file-format',
    badge: 'the file decides more than most people think',
    heading: 'PDF vs Word: the format that keeps your resume readable',
    sub: `Before any recruiter reads a word, the file has to open, extract and hold a text layer. The format you choose decides that first step, and it is the step most resumes fail at. This page compares the formats job portals actually accept, and gives a concrete pick for each scenario without pretending there is a single universally perfect choice.`,
    cards: [
      { title: 'Text-layer PDF as the default', text: `A PDF exported from the same app you typed in keeps a real text layer, one page flow, and constant formatting. It is the safest default for most applications, provided the export is not a scan or an image.` },
      { title: 'DOCX as the close second', text: `Word's modern format opens everywhere and many portals parse it reliably. It also invites accidental two-column or table layouts more often than a focused PDF export does, so check the plain-text preview before you upload.` },
      { title: 'Legacy .doc and standalone scans are risky', text: `Old .doc files and standalone image scans are the two formats that most often produce empty parses. If you only have a scan, the resume is effectively a photo and the checker will tell you so directly.` },
      { title: 'Google Docs export without the mess', text: `If you edit in Google Docs, choose File → Download → PDF Document, then verify the text layer. Avoid "Web page" exports, which rearrange sections, and screenshots, which carry no text at all.` },
    ],
  },
  {
    slug: 'keywords',
    title: 'How to Add Resume Keywords That ATS Uses | ScoreMyResume',
    description: 'Resume keywords decide the match score. A practical method to mine postings, place exact phrases, and keep every keyword honest and in-context.',
    canonicalPath: '/resume-help/keywords',
    badge: 'match the posting, never invent the skill',
    heading: 'How to add resume keywords an ATS will score in your favor',
    sub: `Keyword optimization is the difference between a resume that describes you and a resume that matches the role. The practical version is simple: read what the posting repeats, place those exact phrases where your experience supports them, and keep every term in a sentence so the parser files it as evidence instead of a list. This page turns that loop into four repeatable steps.`,
    cards: [
      { title: 'Mine the posting for its repeated terms', text: `Open the job description and list every tool, skill and responsibility that appears more than once. Those repetitions are the screener's checklist. The keyword finder on this site automates the count and ranks them for you.` },
      { title: 'Place exact phrases inside bullets', text: `A rule to remember: the keyword belongs in a bullet, not only in a skills block. "Led SQL performance audits" files the term and proves real use, which reads far better than a lone SQL badge in the sidebar.` },
      { title: 'Keep the stacking honest', text: `Use the exact wording only where your experience genuinely supports it. Invented matches can pass a scanner and still collapse in the interview question that follows, which is the one place no keyword helps.` },
      { title: 'Re-measure after every edit', text: `Tailoring is a session, not a one-time task: paste the posting, edit, re-scan and watch the keyword bar respond. That loop — read, place, verify — is the whole method behind a good match percentage.` },
    ],
  },
];

const CITY_PAGES = [
  {
    slug: 'gurugram',
    label: 'Gurugram',
    title: 'ATS Resume Tips for Gurugram Job Seekers | ScoreMyResume',
    description: 'Gurugram is the NCR IT, consulting and BFSI hub. Practical resume advice for the city’s competitive corporate gateways, from Cyber City to Manesar.',
    canonicalPath: '/resume-help/city/gurugram',
    badge: 'gurugram · gurgaon · NCR corporate corridor',
    heading: 'Gurugram: every role has a queue, so the resume must survive the filter',
    sub: `Gurugram hires at a scale almost no other Indian city matches. The corporate towers along Cyber City, Udyog Vihar, Golf Course Road and the Manesar belt pull talent from Delhi and across the NCR, and a single posting routinely collects hundreds of applications in a day. That volume is exactly why so many Gurugram recruiters rely on resume filtering before a person ever opens the file. A candidate from another town, mid-industry-switch, or fresh from campus all face the same gate: a document that parses cleanly, matches the role language, and still reads like a genuine professional summary. This page is written for that gate.`,
    pairs: [
      { title: 'The corporate gateway is software first', challenge: 'Gurugram MNCs and consultancies lean on the same recruiting stack, from application portals to automated shortlisting. The resume that looks best in print can be the one that files worst in extraction.', solve: 'Keep the layout conventional: one column, familiar headings, literal dates and text-only contact details, so the machine files what the shortlister later prints.' },
      { title: 'MNC and startup vocabulary split the city', challenge: 'A global consulting firm and a Manesar scale-up want different language for the same work. The consulting resume needs frameworks and compliance terms; the startup resume needs velocity and outcome language.', solve: 'Tailor the keyword set to each posting. Keep one strong base version, then swap the role-term bullets to the sector vocabulary the current shortlist actually asks for.' },
      { title: 'The commuter candidate is judged on the document twice', challenge: 'Many Gurugram applicants live in Delhi, Faridabad, Rewari or further out. On paper, the location line is the first impression before scheduling ever begins.', solve: 'State a realistic base or work mode honestly in the contact line. A truthful two-line profile beats a vague summary when the conversation turns to joining time and daily travel.' },
    ],
    faqs: [
      { q: 'How does Gurugram hiring differ from startup hiring elsewhere?', a: 'The city runs both extremes at once: process-heavy corporate recruiting and fast decision-making startups. The same resume rarely optimizes for both, so keep a corporate version and a startup version, and check each against the posting before sending.' },
      { q: 'Should I mention my hometown or relocation status?', a: 'Yes, and honestly. Gurugram recruiters commonly ask about relocation and joining time because housing and traffic shape decisions. A short "open to Gurugram / NCR roles" line prevents a promising profile being dropped at screening.' },
    ],
  },
  {
    slug: 'faridabad',
    label: 'Faridabad',
    title: 'ATS Resume Tips for Faridabad Job Seekers | ScoreMyResume',
    description: 'Manufacturing backbone with a growing IT and BPO layer. Practical resume advice for Faridabad’s industrial and services hiring mix.',
    canonicalPath: '/resume-help/city/faridabad',
    badge: 'faridabad · NCR industrial & services mix',
    heading: 'Faridabad: manufacturing roots, services future, one resume in two dialects',
    sub: `Faridabad sits on the Delhi border with a split personality. Heavy manufacturing, fabrication and engineering plants still absorb a large share of local hiring, while BPO, IT services and corporate support roles have filled the same job boards for years. A Faridabad job seeker often has to write one resume that speaks both dialects: plant-floor discipline with measurable output, and the cleaner, keyword-driven language of a services role. This page walks through keeping that balance without letting either audience feel ignored.`,
    cards: [
      { title: 'Quantify plant work like a services candidate would', text: `"Supervised sheet-metal line" becomes evidence when you add shifts handled, output improved, or rework reduced. Measurement language is the common currency that lets an industrial profile compete inside a services ATS.` },
      { title: 'Mirror the exact role title from the posting', text: `Whether a board says "production supervisor" or "operations executive," use its phrasing in your most relevant bullet. Faridabad portals fill with standardized titles, and matching them raises keyword match directly.` },
      { title: 'Keep certifications and training visible', text: `Industrial postings often ask for trade certificates, machine operation courses or safety training. List them under Training with the issuing body and year, so a screening checklist can tick them off.` },
      { title: 'Bridge the Delhi commute honestly', text: `Faridabad feeds Delhi jobs too, so state your openness on the location line: "Faridabad-based, open to NCR." Recruiters on both sides read that single line as your joining-time signal.` },
    ],
  },
  {
    slug: 'panchkula',
    label: 'Panchkula',
    title: 'ATS Resume Tips for Panchkula Job Seekers | ScoreMyResume',
    description: 'Tricity white-collar market. Resume advice for Panchkula’s professional and administrative hiring.',
    canonicalPath: '/resume-help/city/panchkula',
    badge: 'panchkula · tricity white-collar',
    heading: 'Panchkula: professional resumes for the tricity market',
    sub: `Panchkula is part of the Chandigarh tricity, with a strong layer of government, IT, and professional services hiring. Resumes here need to read cleanly for both government portals and private sector ATS systems. Format discipline and clean section headings carry the most weight.`,
    cards: [
      { title: 'Use standard section headings', text: `Government and private sector portals in the tricity all look for familiar labels: Education, Experience, Skills, Certifications. Clever or decorative headings confuse parsers and cost points.` },
      { title: 'Keep dates literal and verifiable', text: `Write months and years as plain text. Tricity hiring desks verify dates against certificates and experience letters, so every date on your resume should match a document you can produce.` },
    ],
  },
  {
    slug: 'ambala',
    label: 'Ambala',
    title: 'ATS Resume Tips for Ambala Job Seekers | ScoreMyResume',
    description: 'Services & trade market. Resume advice for Ambala’s commercial and service-sector hiring.',
    canonicalPath: '/resume-help/city/ambala',
    badge: 'ambala · services & trade',
    heading: 'Ambala: service-sector resumes that parse cleanly',
    sub: `Ambala’s economy runs on services, trade, and small-scale industry. Resumes for Ambala employers need to be clean, conventional, and easy to scan — whether the reader is a local business owner or a screening portal. Plain headings, literal dates, and honest contact details carry the most weight.`,
    cards: [
      { title: 'Keep the layout one column', text: `Single-column resumes parse reliably across all portals. Avoid sidebars, tables, and two-column designs that scramble during extraction.` },
      { title: 'List certifications with issuing body and year', text: `Trade certificates, diplomas, and training courses should each have their own dated line with the issuing body named in full.` },
    ],
  },
  {
    slug: 'sonipat',
    label: 'Sonipat',
    title: 'ATS Resume Tips for Sonipat Job Seekers | ScoreMyResume',
    description: 'Education & industry market. Resume advice for Sonipat’s growing industrial and education-sector hiring.',
    canonicalPath: '/resume-help/city/sonipat',
    badge: 'sonipat · education & industry',
    heading: 'Sonipat: industrial and education resumes that survive the filter',
    sub: `Sonipat combines a large education sector with growing industrial hiring. Resumes here need to work for both campus placement portals and industrial application systems. Clean formatting, standard headings, and honest dates are the foundation.`,
    cards: [
      { title: 'Education leads until experience catches up', text: `For freshers and recent graduates, Education above Experience is the convention that reads best. Once you have two years of real work, flip the order.` },
      { title: 'Frame campus projects as responsibility plus outcome', text: `Campus projects, fests and societies are legitimate experience. Frame each as responsibility plus outcome, the same grammar a professional resume uses.` },
    ],
  },
  {
    slug: 'hisar',
    label: 'Hisar',
    title: 'ATS Resume Tips for Hisar Job Seekers | ScoreMyResume',
    description: 'Hisar’s agri-industrial economy keeps HR desks busy. Resume advice for agro, dairy, industrial and professional roles in and around Hisar.',
    canonicalPath: '/resume-help/city/hisar',
    badge: 'hisar · agri-industrial heart of Haryana',
    heading: 'Hisar: where agro-industrial experience and modern HR screening meet',
    sub: `Hisar's economy runs on agriculture and industry: agro processing, dairy, steel, polytechnic engineering, and the professional layer around them. What is newer is the hiring style. Even mid-sized Hisar employers now run structured recruitment with defined vacancy text, so the resume you send gets screened the same way it would in a bigger city, while still needing the verifiable, certificate-heavy detail the district market expects.`,
    pairs: [
      { title: 'Agro and dairy terms need their standard spellings', challenge: 'Processors, cooperatives and exporters use precise product vocabulary. A shortened or local variant may mismatch the vacancy text and the parser both.', solve: 'Use the standard full term of each product, crop or plant, with the short form only after first use, exactly as the posting spells it.' },
      { title: 'Polytechnic and engineering profiles file under the right sections', challenge: 'A diploma or degree plus workshop training often gets crammed into one education line, burying the machine-level credential a plant recruiter wants.', solve: 'Separate formal education from training and apprenticeship into labelled blocks, each with institute, trade and passing year in literal text.' },
    ],
    faqs: [
      { q: 'Do Hisar employers really check resumes by software?', a: 'Many run structured processes, especially through consultants and the larger agro and industrial groups. Even without software, a standard one-page format makes a paper shortlist far easier to scan.' },
      { q: 'Should I include plant sizes and capacities?', a: 'Yes, where you can state them honestly. Tonnage, acreage, team counts and throughput figures answer the two questions every agro-industrial shortlister asks first: scale and control.' },
    ],
  },
  {
    slug: 'karnal',
    label: 'Karnal',
    title: 'ATS Resume Tips for Karnal Job Seekers | ScoreMyResume',
    description: 'Karnal mixes government institutions, research agencies and corporate agri roles. Resume advice for a market that values formal certificates.',
    canonicalPath: '/resume-help/city/karnal',
    badge: 'karnal · government, research & corporate agriculture',
    heading: 'Karnal: a resume for institutions that file everything by name',
    sub: `Karnal is a town of institutions: research agencies, government offices, cooperative and corporate agriculture wings, and the education system feeding them. Recruitment here tends to be formal, application through portals or forms, with the resume as the readable proof behind the checklist. The pattern that wins in Karnal is the same pattern that scores high: plain headings, full names spelled once, dates in literal text, and every certificate attributable.`,
    rows: [
      { title: 'Spell full institution names before any acronym', text: `Karnal conversations are full of initials for institutes and agencies. Write the full name on first use with the short form in brackets, then the acronym in later bullets, so a reviewer outside that institution still understands.` },
      { title: 'Separate research participation from employment', text: `Project involvement, field trials, surveys and training stints often sit next to, but not inside, formal employment. Give them their own dated block so eligibility reviewers do not misread a stint as a job.` },
      { title: 'Corporate agri roles want commercial language too', text: `Cooperative and corporate jobs read for business terms: procurement volumes, dealer reach, collection timelines. Weave those into bullets alongside the institutional vocabulary when applying commercially.` },
      { title: 'One standard document for every bureau', text: `Because the same applicant may target research, government and corporate wings in one cycle, keep one neutral, conventional document and create role-specific copies from it rather than five divergent files.` },
    ],
  },
  {
    slug: 'rohtak',
    label: 'Rohtak',
    title: 'ATS Resume Tips for Rohtak Job Seekers | ScoreMyResume',
    description: 'Rohtak pairs an administrative hub with a huge university and fresher population. Resume advice for fresh grads and professional candidates.',
    canonicalPath: '/resume-help/city/rohtak',
    badge: 'rohtak · administrative hub & first-job pipeline',
    heading: 'Rohtak: fresh graduates and city administrative roles, same standard',
    sub: `Rohtak holds an odd double identity. It is an administrative centre with district and regional offices, a growing professional services layer, and one of the largest university and fresher populations in the state, feeding an enormous first-job pipeline every year. A Rohtak resume is therefore usually one of two things: a fresh graduate's first document, or a working professional's structured file. Both win with the same basics: standard headings, honest dates, and keywords that match the vacancy text, whatever the sector.`,
    cards: [
      { title: 'Use the university network honestly on paper', text: `If you studied at or near Rohtak, campus projects, fests and societies are legitimate experience. Frame each as responsibility plus outcome, the same grammar a professional resume uses.` },
      { title: 'Education leads until experience catches up', text: `For freshers, Education above Experience is the convention that reads best. Once you have two years of real work, flip the order.` },
      { title: 'Administrative roles reward format discipline', text: `District and regional office hiring expects dates, names and designations to be exact. A tidy one-to-two-page file with literal dates beats a denser document every time.` },
      { title: 'Mirror the job-board title', text: `Whether a posting says "executive," "officer" or "coordinator," use its exact designation in your relevant bullet. Rohtak portals sort by title keywords first.` },
    ],
  },
  {
    slug: 'bahadurgarh',
    label: 'Bahadurgarh',
    title: 'ATS Resume Tips for Bahadurgarh Job Seekers | ScoreMyResume',
    description: 'Delhi-border industry market. Resume advice for Bahadurgarh’s industrial and logistics hiring.',
    canonicalPath: '/resume-help/city/bahadurgarh',
    badge: 'bahadurgarh · Delhi-border industry',
    heading: 'Bahadurgarh: industrial resumes on the Delhi border',
    sub: `Bahadurgarh sits on the Delhi border with strong industrial and logistics hiring. Resumes here need to serve both local employers and Delhi-bound commuters. Format discipline, honest location lines, and clear role titles carry the most weight.`,
    cards: [
      { title: 'State your location openly', text: `Write "Bahadurgarh-based, open to NCR roles" in your contact block. Recruiters on both sides of the border read this as your joining-time signal.` },
      { title: 'Mirror the posting title exactly', text: `Whether a board says "production supervisor" or "operations executive," use its phrasing in your most relevant bullet. Matching standardized titles raises keyword match directly.` },
    ],
  },
  {
    slug: 'palwal-sohna',
    label: 'Palwal & Sohna',
    title: 'ATS Resume Tips for Palwal & Sohna Job Seekers | ScoreMyResume',
    description: 'Faridabad–Gurugram corridor market. Resume advice for Palwal and Sohna’s industrial and services hiring.',
    canonicalPath: '/resume-help/city/palwal-sohna',
    badge: 'palwal · sohna · Faridabad–Gurugram corridor',
    heading: 'Palwal & Sohna: corridor resumes between Faridabad and Gurugram',
    sub: `Palwal and Sohna sit on the Faridabad–Gurugram corridor, with industrial and services hiring feeding both cities. Resumes here need to work for local employers and commuters heading to either city. Clean formatting, standard headings, and honest location details carry the most weight.`,
    cards: [
      { title: 'Keep contact details as plain text', text: `Your name, email, and phone need to be copyable text. Inside a photo, a graphic, or a header image, they may never reach the recruiter's preview.` },
      { title: 'State openness to NCR roles', text: `Palwal and Sohna feed both Faridabad and Gurugram. A line like "open to NCR roles" in your contact block signals your availability to employers on both sides.` },
    ],
  },
];

const FOOTER_ROUTES = [
  {
    path: '/ats-resume-checker-freshers',
    title: 'Resume Checker for Freshers — First Job Resume Tips | ScoreMyResume',
    description: 'Free resume check for freshers: no work history yet? See how education, projects, internships and role keywords should carry your first resume past an ATS.',
    canonicalPath: '/resume-help/freshers',
    bodyHtml: null, // renders same as keyword page freshers
  },
  {
    path: '/software-engineer-resume-scanner',
    title: 'Software Engineer Resume Scanner — ATS Tips for Engineers | ScoreMyResume',
    description: 'A software engineer resume must balance systems depth with parsing. Tips on stack-in-context bullets, flattened layouts and title mirroring for ATS screens.',
    canonicalPath: '/resume-help/software-engineer',
    bodyHtml: null,
  },
  {
    path: '/data-analyst-resume-review',
    title: 'Data Analyst Resume Review — SQL, Excel & BI Tips | ScoreMyResume',
    description: 'Data analyst resumes lean on charts and icon rows that ATS parsers skip. Keep SQL, Excel, BI tools and every metric as scannable text with these fixes.',
    canonicalPath: '/resume-help/data-analyst',
    bodyHtml: null,
  },
  {
    path: '/digital-marketing-resume-optimizer',
    title: 'Resume Checker for Digital Marketing Roles | ScoreMyResume',
    description: 'Marketing resumes must prove creativity and measure it. Tips to keep portfolio links, platforms and campaign results scannable for both a person and an ATS.',
    canonicalPath: '/resume-help/digital-marketing',
    bodyHtml: null,
  },
  {
    path: '/canva-resume-ats-friendly',
    title: 'Canva Resume Checker — Make a Canva CV ATS-Friendly | ScoreMyResume',
    description: 'Canva templates look great but often fail ATS parsing. Step-by-step fixes to export a Canva resume that keeps its design and gains a readable text layer.',
    canonicalPath: '/resume-help/canva',
    bodyHtml: null,
  },
  {
    path: '/best-file-format-for-ats',
    title: 'Best File Format for ATS — PDF vs Word vs DOCX | ScoreMyResume',
    description: 'Which resume file format passes an ATS? Compare PDF text-layer, DOCX, legacy .doc, image scans and Google Drive exports, with a clear pick for every scenario.',
    canonicalPath: '/resume-help/file-format',
    bodyHtml: null,
  },
  {
    path: '/how-to-optimize-resume-keywords',
    title: 'How to Add Resume Keywords That ATS Uses | ScoreMyResume',
    description: 'Resume keywords decide the match score. A practical method to mine postings, place exact phrases, and keep every keyword honest and in-context.',
    canonicalPath: '/resume-help/keywords',
    bodyHtml: null,
  },
];

// ============ HTML generators ============

function keywordPageHtml(page) {
  const cardsHtml = (page.cards || []).map(c => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(c.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]">${htmlEscape(c.text)}</p>
    </div>`).join('');

  const tipsHtml = (page.tips || []).map(t => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(t.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]">${htmlEscape(t.text)}</p>
    </div>`).join('');

  const rowsHtml = (page.rows || []).map(r => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(r.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]">${htmlEscape(r.text)}</p>
    </div>`).join('');

  const pairsHtml = (page.pairs || []).map(p => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(p.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]"><strong>Challenge:</strong> ${htmlEscape(p.challenge)}</p>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]"><strong>Solution:</strong> ${htmlEscape(p.solve)}</p>
    </div>`).join('');

  const faqsHtml = (page.faqs || []).map(f => `
    <div class="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <h3 class="font-['Space_Grotesk'] text-sm font-bold">${htmlEscape(f.q)}</h3>
      <p class="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">${htmlEscape(f.a)}</p>
    </div>`).join('');

  return `
<section class="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 lg:px-12">
  <div class="max-w-3xl">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">resume help</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em] sm:text-5xl">${htmlEscape(page.heading)}</h1>
    <p class="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg sm:leading-8">${htmlEscape(page.sub)}</p>
  </div>
  <section class="mt-11 rounded-[1.75rem] border border-[hsl(var(--border))] p-6 sm:p-9">
    <div class="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">§ ${page.badge}</div>
    <div class="mt-4 rounded-[1.75rem] p-6 sm:p-9 bg-[hsl(var(--card)/.6)] border border-[hsl(var(--border))]">
      ${cardsHtml}${tipsHtml}${rowsHtml}${pairsHtml}
    </div>
  </section>
  ${page.faqs && page.faqs.length > 0 ? `
  <section class="mt-11 rounded-[1.75rem] border border-[hsl(var(--border))] p-6 sm:p-9 bg-[hsl(var(--secondary)/.4)]">
    <div class="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">faq</div>
    <div class="mt-4 space-y-3">${faqsHtml}</div>
  </section>` : ''}
</section>`;
}

function cityPageHtml(page) {
  const pairsHtml = (page.pairs || []).map(p => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(p.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]"><strong>Challenge:</strong> ${htmlEscape(p.challenge)}</p>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]"><strong>Solution:</strong> ${htmlEscape(p.solve)}</p>
    </div>`).join('');

  const cardsHtml = (page.cards || []).map(c => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(c.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]">${htmlEscape(c.text)}</p>
    </div>`).join('');

  const rowsHtml = (page.rows || []).map(r => `
    <div class="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-9">
      <h3 class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(r.title)}</h3>
      <p class="mt-2 text-base leading-7 text-[hsl(var(--muted-foreground))]">${htmlEscape(r.text)}</p>
    </div>`).join('');

  const faqsHtml = (page.faqs || []).map(f => `
    <div class="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <h3 class="font-['Space_Grotesk'] text-sm font-bold">${htmlEscape(f.q)}</h3>
      <p class="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">${htmlEscape(f.a)}</p>
    </div>`).join('');

  return `
<section class="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 lg:px-12">
  <div class="max-w-3xl">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">resume help</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em] sm:text-5xl">${htmlEscape(page.heading)}</h1>
    <p class="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg sm:leading-8">${htmlEscape(page.sub)}</p>
  </div>
  <section class="mt-11 rounded-[1.75rem] border border-[hsl(var(--border))] p-6 sm:p-9">
    <div class="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">§ ${page.badge}</div>
    <div class="mt-4 rounded-[1.75rem] p-6 sm:p-9 bg-[hsl(var(--card)/.6)] border border-[hsl(var(--border))]">
      ${pairsHtml}${cardsHtml}${rowsHtml}
    </div>
  </section>
  ${page.faqs && page.faqs.length > 0 ? `
  <section class="mt-11 rounded-[1.75rem] border border-[hsl(var(--border))] p-6 sm:p-9 bg-[hsl(var(--secondary)/.4)]">
    <div class="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">faq</div>
    <div class="mt-4 space-y-3">${faqsHtml}</div>
  </section>` : ''}
</section>`;
}

function blogIndexHtml(posts) {
  const postsHtml = posts.map(p => `
    <article class="flex flex-col rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_14px_45px_hsl(var(--primary)/.05)]">
      ${p.cover_image_url ? `<div class="mb-5 aspect-[16/9] w-full rounded-xl object-cover" style="background:#e2e8f0;color:#64748b;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:10px;text-transform:uppercase;">${htmlEscape(p.title)}</div>` : `<div class="mb-5 flex items-center justify-between"><span class="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">goodspace journal</span><span class="size-5 text-[hsl(var(--accent-foreground))]">📄</span></div>`}
      ${p.category ? `<span class="mb-3 w-fit rounded-full bg-[hsl(var(--primary)/.12)] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">${htmlEscape(p.category)}</span>` : ''}
      <h2 class="font-['Space_Grotesk'] text-2xl font-bold leading-tight tracking-[-.05em]">${htmlEscape(p.title)}</h2>
      <p class="mt-4 flex-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">${htmlEscape(p.excerpt || '')}</p>
      <div class="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><span>${htmlEscape(p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : '')}</span>${p.author ? `<span aria-hidden="true">·</span><span>${htmlEscape(p.author)}</span>` : ''}</div>
      <a href="/blog/${p.slug}" class="focus-ring mt-7 inline-flex items-center gap-2 self-start text-xs font-bold text-[hsl(var(--primary))]">Read article <span class="size-4">→</span></a>
    </article>`).join('');

  return `
<section class="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
  <div class="max-w-3xl">
    <div class="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">page 3 · goodspace journal</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.08em] sm:text-7xl">Better applications start with better clarity.</h1>
    <p class="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">Short, useful ideas for writing resumes, understanding job descriptions, and moving through your search with less noise. Updated regularly with practical guides you can actually use before your next application.</p>
  </div>
  <div class="mt-12 grid gap-5 lg:grid-cols-3">${postsHtml}</div>
  <section class="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10">
    <div class="max-w-3xl"><div class="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">resume help shortcuts</div><h2 class="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">From the journal into the guides</h2><p class="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The ideas here are organised into one-page guides by audience and by market. Jump straight to the one that matches the application you are working on.</p></div>
    <div class="mt-6 flex flex-wrap gap-2">
      <a href="/resume-help/freshers" class="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))]">Guide for freshers</a>
      <a href="/resume-help/it-jobs" class="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))]">IT &amp; tech jobs</a>
      <a href="/resume-help/government-jobs" class="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))]">Government jobs</a>
      <a href="/resume-help/digital-marketing" class="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))]">Digital marketing roles</a>
      <a href="/resume-help/remote-jobs" class="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))]">Remote &amp; work-from-home</a>
    </div>
  </section>
</section>`;
}

function blogPostHtml(post) {
  const faqsHtml = (post.faq || []).map(f => `
    <div class="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <h3 class="font-['Space_Grotesk'] text-sm font-bold">${htmlEscape(f.question)}</h3>
      <p class="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">${htmlEscape(f.answer)}</p>
    </div>`).join('');

  const decodedContent = decodeHTMLEntities(post.content || '');
  const isRich = /<(p|div|h[1-6]|ul|ol|li|strong|b|em|i|blockquote|img|span)\b/i.test(decodedContent);
  const contentHtml = isRich
    ? decodedContent
    : decodedContent.split('\n\n').map(p => `<p class="text-base leading-8 text-[hsl(var(--foreground)/.85)]">${htmlEscape(p)}</p>`).join('');

  return `
<article class="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
  <div class="mt-8 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em]"><span class="text-[hsl(var(--primary))]">goodspace journal</span>${post.category ? `<span aria-hidden="true" class="text-[hsl(var(--muted-foreground)/.6)]">·</span><span class="text-[hsl(var(--primary))]">${htmlEscape(post.category)}</span>` : ''}<span aria-hidden="true" class="text-[hsl(var(--muted-foreground)/.6)]">·</span><span class="text-[hsl(var(--muted-foreground))]">${post.created_at ? new Date(post.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : ''}</span>${post.author ? `<span aria-hidden="true" class="text-[hsl(var(--muted-foreground)/.6)]">·</span><span class="text-[hsl(var(--muted-foreground))]">${htmlEscape(post.author)}</span>` : ''}</div>
  <h1 class="mt-3 font-['Space_Grotesk'] text-4xl font-bold leading-[1.05] tracking-[-.06em] sm:text-5xl">${htmlEscape(post.title)}</h1>
  ${post.cover_image_url ? `<div class="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" style="background:#e2e8f0;color:#64748b;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:10px;text-transform:uppercase;">${htmlEscape(post.title)}</div>` : `<div class="mt-8 grid h-24 w-full place-items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] text-[hsl(var(--muted-foreground))]"><span class="size-8">📄</span></div>`}
  <div class="mt-8 space-y-5 border-t border-[hsl(var(--border))] pt-8">${contentHtml}</div>
  ${(post.tags || []).length > 0 ? `<div class="mt-9 flex flex-wrap gap-2">${(post.tags).map(t => `<span class="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] px-3 py-1.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">#${htmlEscape(t)}</span>`).join('')}</div>` : ''}
  ${post.faq && post.faq.length > 0 ? `
  <div class="mt-10 rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-7">
    <div class="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">faq · frequently asked questions</div>
    <div class="mt-4 space-y-4">${faqsHtml}</div>
  </div>` : ''}
</article>`;
}

function helpDirectoryHtml() {
  const keywordLinks = KEYWORD_PAGES.map(p => `
    <a href="/resume-help/${p.slug}" class="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 transition-colors hover:border-[hsl(var(--primary)/.5)]">
      <div class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(p.title.replace(/\s*\|.*/, ''))}</div>
    </a>`).join('');

  const cityLinks = CITY_PAGES.map(c => `
    <a href="/resume-help/city/${c.slug}" class="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 transition-colors hover:border-[hsl(var(--primary)/.5)]">
      <div class="font-['Space_Grotesk'] text-lg font-bold">${htmlEscape(c.label)}</div>
      <p class="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">${htmlEscape(c.description)}</p>
    </a>`).join('');

  return `
<section class="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12">
  <div class="max-w-3xl">
    <div class="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">resume help</div>
    <h1 class="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em] sm:text-5xl">Resume help guides and city pages</h1>
    <p class="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:text-base sm:leading-8">Advice for the job segments that trip resumes up most, and for the Haryana and NCR markets where hiring habits shape what a recruiter expects.</p>
  </div>
  <section class="mt-10 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10">
    <div class="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">by audience</div>
    <h2 class="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Help by job segment</h2>
    <div class="mt-6 grid gap-4 md:grid-cols-2">${keywordLinks}</div>
  </section>
  <section class="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div><div class="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">by market</div><h2 class="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Help by city</h2></div>
      <a href="/" class="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Check my resume free</a>
    </div>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${cityLinks}</div>
  </section>
</section>`;
}

// ============ Supabase fetch ============

async function fetchPublishedBlogPosts() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) {
    console.warn('[pre-render] Supabase not configured. Skipping blog post pre-rendering.');
    return [];
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/blog_posts?select=*&published=eq.true&order=created_at.desc`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    const posts = Array.isArray(rows) ? rows : [];
    console.log(`[pre-render] Fetched ${posts.length} published blog posts.`);
    return posts;
  } catch (error) {
    console.warn(`[pre-render] Could not fetch blog posts (${error instanceof Error ? error.message : error}). Skipping blog post pre-rendering.`);
    return [];
  }
}

// ============ Main ============

async function main() {
  // Read built index.html for asset tags
  const indexHtmlPath = path.join(distDir, 'index.html');
  let indexHtml = '';
  let assetTags = '';
  if (fs.existsSync(indexHtmlPath)) {
    indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    assetTags = extractAssetTags(indexHtml);
  }

  // Fetch blog posts
  const blogPosts = await fetchPublishedBlogPosts();

  // Build all routes
  const routes = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    if (page.path === '/blog') {
      routes.push({
        path: page.path,
        title: page.title,
        description: page.description,
        canonicalPath: page.canonicalPath,
        bodyHtml: blogIndexHtml(blogPosts),
        jsonLd: page.jsonLd,
      });
    } else if (page.path === '/resume-help') {
      routes.push({
        path: page.path,
        title: page.title,
        description: page.description,
        canonicalPath: page.canonicalPath,
        bodyHtml: helpDirectoryHtml(),
      });
    } else {
      routes.push(page);
    }
  }

  // Keyword pages
  for (const page of KEYWORD_PAGES) {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Resume help', item: `${SITE_URL}/resume-help` },
        { '@type': 'ListItem', position: 2, name: page.title, item: `${SITE_URL}${page.canonicalPath}` },
      ],
    };
    if (page.faqs && page.faqs.length > 0) {
      routes.push({
        path: page.canonicalPath,
        title: page.title,
        description: page.description,
        canonicalPath: page.canonicalPath,
        bodyHtml: keywordPageHtml(page),
        jsonLd: [
          breadcrumb,
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ],
      });
    } else {
      routes.push({
        path: page.canonicalPath,
        title: page.title,
        description: page.description,
        canonicalPath: page.canonicalPath,
        bodyHtml: keywordPageHtml(page),
        jsonLd: breadcrumb,
      });
    }
  }

  // City pages
  for (const page of CITY_PAGES) {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Resume help', item: `${SITE_URL}/resume-help` },
        { '@type': 'ListItem', position: 2, name: page.label, item: `${SITE_URL}${page.canonicalPath}` },
      ],
    };
    if (page.faqs && page.faqs.length > 0) {
      routes.push({
        path: page.canonicalPath,
        title: page.title,
        description: page.description,
        canonicalPath: page.canonicalPath,
        bodyHtml: cityPageHtml(page),
        jsonLd: [
          breadcrumb,
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: page.faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ],
      });
    } else {
      routes.push({
        path: page.canonicalPath,
        title: page.title,
        description: page.description,
        canonicalPath: page.canonicalPath,
        bodyHtml: cityPageHtml(page),
        jsonLd: breadcrumb,
      });
    }
  }

  // Footer URL routes (map to keyword pages)
  const footerRouteMap = {
    '/ats-resume-checker-freshers': 'freshers',
    '/software-engineer-resume-scanner': 'software-engineer',
    '/data-analyst-resume-review': 'data-analyst',
    '/digital-marketing-resume-optimizer': 'digital-marketing',
    '/canva-resume-ats-friendly': 'canva',
    '/best-file-format-for-ats': 'file-format',
    '/how-to-optimize-resume-keywords': 'keywords',
  };
  for (const [routePath, slug] of Object.entries(footerRouteMap)) {
    const kwPage = KEYWORD_PAGES.find(p => p.slug === slug);
    if (kwPage) {
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Resume help', item: `${SITE_URL}/resume-help` },
          { '@type': 'ListItem', position: 2, name: kwPage.title, item: `${SITE_URL}/resume-help/${slug}` },
        ],
      };
      if (kwPage.faqs && kwPage.faqs.length > 0) {
        routes.push({
          path: routePath,
          title: kwPage.title,
          description: kwPage.description,
          canonicalPath: `/resume-help/${slug}`,
          bodyHtml: keywordPageHtml(kwPage),
          jsonLd: [
            breadcrumb,
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: kwPage.faqs.map(f => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        });
      } else {
        routes.push({
          path: routePath,
          title: kwPage.title,
          description: kwPage.description,
          canonicalPath: `/resume-help/${slug}`,
          bodyHtml: keywordPageHtml(kwPage),
          jsonLd: breadcrumb,
        });
      }
    }
  }

  // Blog post pages
  for (const post of blogPosts) {
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 2, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.meta_title || post.title,
        description: post.meta_description || (post.excerpt || ''),
        image: post.cover_image_url ? [`${SITE_URL}${post.cover_image_url}`, `${SITE_URL}${DEFAULT_OG_IMAGE}`] : [`${SITE_URL}${DEFAULT_OG_IMAGE}`],
        datePublished: post.created_at,
        dateModified: post.created_at,
        mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        author: post.author
          ? { '@type': 'Person', name: post.author }
          : { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: `${SITE_URL}/`,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}${DEFAULT_OG_IMAGE}` },
        },
      },
    ];
    if (post.faq && post.faq.length > 0) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    }
    routes.push({
      path: `/blog/${post.slug}`,
      title: post.meta_title || post.title,
      description: post.meta_description || '',
      canonicalPath: `/blog/${post.slug}`,
      bodyHtml: blogPostHtml(post),
      jsonLd: jsonLd.length === 1 ? jsonLd[0] : jsonLd,
      image: post.cover_image_url,
    });
  }

  // Write all route HTML files
  let written = 0;
  for (const route of routes) {
    const dirPath = path.join(distDir, route.path === '/' ? '' : route.path);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, 'index.html');

    const headTags = buildHead({
      title: route.title,
      description: route.description,
      canonicalPath: route.canonicalPath,
      jsonLd: route.jsonLd,
      image: route.image,
    });

    const html = wrapHtml({
      headTags,
      bodyHtml: route.bodyHtml || '',
      assetTags,
      noscript: noscriptHtml(),
    });

    fs.writeFileSync(filePath, html, 'utf8');
    written++;
    console.log(`[pre-render] Wrote ${route.path} → ${filePath}`);
  }

  console.log(`[pre-render] Wrote ${written} pre-rendered HTML files.`);
}

main().catch((error) => {
  console.error('[pre-render] Failed:', error);
  process.exit(1);
});
