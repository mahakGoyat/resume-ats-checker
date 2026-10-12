import { parseResumeSections, type ParsedResume, type ResumeSection } from './resume-sections';
import type { ImprovedResume } from './resume-ai';

export type ResumeDocItem = {
  kind: 'item';
  text: string;
  bold?: boolean;
  /** Right-hand column: dates, "Expected 2026", grades, locations. */
  right?: string;
  /** Right-hand column: the tech/skill tag belonging to this entry (italic, right-aligned). */
  tech?: string;
  bullet?: boolean;
  spaceBefore?: boolean;
  spaceAfter?: boolean;
};

export type ResumeDocBlock =
  | { kind: 'name'; text: string }
  | { kind: 'title'; text: string }
  | { kind: 'contact'; text: string }
  | { kind: 'section'; title: string; sectionKind?: ResumeSection['kind'] }
  | { kind: 'skills'; label: string; values: string[] }
  | ResumeDocItem;

const BULLET_RE = /^\s*[•●▪◦–—*\-+]\s+/;

// Bug #6 root cause: a status/date that was glued onto the previous word in the
// source ("Expected2026", "90% |2024") has no word boundary before the year, so
// the date regex above cannot see it and the whole run stays in the left column.
// Split a letter/digit boundary before a 4-digit year, and treat a leading
// status word as part of the right-hand date so the two never render as one run.
const GLUED_YEAR_RE = /(?<=[A-Za-z)])(?=(?:19|20)\d{2}\b)/g;
const STATUS_WORD_RE = /^(?:expected|anticipated|graduating|graduation|due|completion|completed|pursuing|ongoing|currently|current|present)\b/i;

/** The status-word alternation without its `^` anchor, for embedding. */
const STATUS_WORDS_SOURCE = STATUS_WORD_RE.source.replace(/^\^/, '');

/** "Jan"/"January" etc., without the trailing period. */
const MONTH_SOURCE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?';

/** One date bound: "2021" or "Mar 2021". */
const YEAR_BOUND = `(?:${MONTH_SOURCE}\\s+)?(?:19|20)\\d{2}`;

/** A year or a status period: "2024", "Mar 2021 - Present", "Present". */
const PERIOD_SOURCE =
  `${YEAR_BOUND}(?:\\s*(?:-|–|—|to)\\s*(?:${YEAR_BOUND}|present|current|ongoing))?` +
  `|present|current|ongoing`;

/** "Expected 2026", "2024 - 2026", "Present" — the right-hand column of a row. */
const DATE_OR_STATUS_RE = new RegExp(
  `^\\s*(?:${STATUS_WORDS_SOURCE}\\s+)?(?:${PERIOD_SOURCE})\\s*$`,
  'i',
);

// A tech tag is a comma list of tool names: "React, Node.js, PostgreSQL",
// "AI Tools, Automation", "Canva, CapCut, AI Tools".
//
// A bare "two or more short tokens" test is not enough — it also matches
// "Northwind Analytics, Bengaluru" (employer + city), and treating that as a
// tag would silently delete the employer from the resume. So a candidate must
// either contain a recognised technology keyword, or be entirely made of
// single-word short identifiers. Anything longer, prose-like, year-bearing or
// grade-bearing stays body text.
const TECH_KEYWORDS = new Set(
  (
    'ai ml nlp llm gpt genai mlops cv dl data science analytics ai tools automation ' +
    'react angular vue nextjs next js nuxt svelte html css sass tailwind bootstrap jquery ' +
    'node nodejs express nestjs next django flask fastapi rails laravel spring boot dotnet ' +
    'python java javascript typescript kotlin swift rust golang go ruby php scala r matlab ' +
    'c c++ cpp csharp objective sql nosql postgresql postgres mysql mongodb redis sqlite ' +
    'aws azure gcp cloud firebase vercel netlify heroku docker kubernetes k8s terraform ' +
    'ansible jenkins cicd linux unix bash git github gitlab bitbucket jira ' +
    'pandas numpy scipy sklearn scikit learn pytorch tensorflow keras tensorflow2 huggingface ' +
    'transformers pandas numpy matplotlib seaborn plotly opencv cv2 nltk spacy ' +
    'powerbi tableau excel looker databricks snowflake airflow dbt kafka spark hadoop ' +
    'elasticsearch elasticsearch kafka rabbitmq grafana prometheus splunk ' +
    'figma sketch photoshop illustrator canva capcut indesign premiere aftereffects ' +
    'flutter reactnative android ios swiftui jetpack compose xcode ' +
    'salesforce sap oracle netsuite workday hubspot stripe shopify woocommerce ' +
    'testing pytest jest cypress selenium junit tdd ci cd devops sre ' +
    'seo sem crm ga4 analytics ga analytics google meta ads hubspot mailchimp ' +
    'wordpress shopify web3 solidity blockchain nft crypto ethereum bitcoin ' +
    'api apis rest graphql grpc websocket oauth jwt auth authentication security ' +
    'mvp prototype wireframe ux ui uxui research communication teamwork leadership'
  )
    .split(/\s+/)
    .filter(Boolean),
);

const TECH_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9+#./&_-]{0,22}$/;

function techTagTokens(value: string): string[] {
  return value
    .split(/\s*[,;|·]\s*|\s+\/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function wordsOf(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.]+/u)
    .filter(Boolean);
}

/**
 * True when the value names a technology. The keyword list is a single
 * whitespace-separated string, so "AI Tools" is stored as two words; a match
 * therefore also has to consider a whole multi-word phrase.
 */
function hasTechKeyword(tokens: string[]): boolean {
  return tokens.some((token) => {
    const lower = token.toLowerCase();
    if (TECH_KEYWORDS.has(lower)) return true;
    const words = wordsOf(lower);
    return words.length > 1 && words.every((word) => TECH_KEYWORDS.has(word));
  });
}

/** True when every word of the value is a technology word. */
function isTechPhrase(value: string): boolean {
  const words = wordsOf(value);
  return words.length > 0 && words.every((word) => TECH_KEYWORDS.has(word));
}

function looksLikeTechTag(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 90) return false;
  const tokens = techTagTokens(value);
  if (tokens.length < 2 || tokens.length > 6) return false;
  if (/(?:19|20)\d{2}/.test(value)) return false;
  if (/%|\bGPA\b|\bCGPA\b|\bSGPA\b/i.test(value)) return false;
  if (/[.!?]$/.test(value)) return false;

  const allShortIdentifiers = tokens.every(
    (token) => TECH_TOKEN_RE.test(token) && token.length <= 14,
  );
  return hasTechKeyword(tokens) || allShortIdentifiers;
}

export type EntryLine = { text: string; right?: string; tech?: string };

/** "2021 - Present", "Jan 2021 – Feb 2023", "2019 to 2024". */
const DATE_RANGE_RE =
  /(?:\d{4}|[A-Za-z]{3,9}\.?\s+\d{4})\s*(?:[-–—]|to)\s*(?:\d{4}|[A-Za-z]{3,9}\.?\s+\d{4}|present|current|ongoing|now)\b/gi;

/**
 * A date range must never be treated as a " - " field separator, otherwise
 * "Senior Engineer, Northwind 2021 - Present" loses "2021 - " and the right
 * column ends up reading just "Present". Ranges are swapped for an opaque
 * placeholder before the line is split, then restored on the way out.
 */
const RANGE_PLACEHOLDER = '\u0000';

function protectDateRanges(source: string): { text: string; ranges: string[] } {
  const ranges: string[] = [];
  const text = source.replace(DATE_RANGE_RE, (match) => {
    ranges.push(match);
    return `${RANGE_PLACEHOLDER}${ranges.length - 1}${RANGE_PLACEHOLDER}`;
  });
  return { text, ranges };
}

function restoreDateRanges(text: string, ranges: string[]): string {
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => ranges[Number(index)] ?? '');
}

/**
 * Recovers a tech tag that was written with NO separator before the title:
 * "AI Tools, Automation Telegram Automation Bot".
 *
 * The boundary is not a comma boundary (the tag ends mid-token, after
 * "Automation"), so this walks word positions and takes the shortest prefix
 * that is a genuine tag. Guards against false positives: the remainder must be
 * a plausible title — at least two words, starting with a capital — so an
 * ordinary phrase like "AI Tools team building" is left intact.
 */
function splitLeadingTag(source: string): EntryLine | null {
  const words = source.split(' ');
  for (let end = 2; end < words.length; end += 1) {
    const candidate = words.slice(0, end).join(' ').replace(/[,;]+$/, '');
    const rest = words.slice(end).join(' ');
    if (!candidate || !rest) continue;
    // A recognised technology is required here. Without it, "B.Tech, Computer
    // Science, 90%" would read as a tag prefix and the degree would be cut in half.
    if (!hasTechKeyword(techTagTokens(candidate))) continue;
    if (!looksLikeTechTag(candidate)) continue;
    if (DATE_OR_STATUS_RE.test(rest) || looksLikeTechTag(rest)) continue;
    // The remainder must not itself read as part of a tag, otherwise
    // "Canva, CapCut, AI Tools" loses "AI Tools".
    if (isTechPhrase(rest)) continue;
    if (/(?:19|20)\d{2}|%/.test(rest)) continue;
    if (!/^[A-Z]/.test(rest)) continue;
    if (rest.split(' ').filter(Boolean).length < 2) continue;
    return { text: rest, tech: candidate };
  }
  return null;
}

/**
 * Splits a single entry line into its left title and its right-hand value.
 *
 * A right-hand value is either a date/status ("Expected 2026", "2024") or a tech
 * tag ("AI Tools, Automation"). Separators are "|", "·", " - ", " – ", " — ", a
 * tab, or 2+ spaces. A tag that was written *before* the title (the reversed
 * order that produced "AI Tools, Automation Telegram Automation Bot") is
 * detected and moved to the right-hand column, so the title always leads.
 */
export function splitEntryLine(line: string): EntryLine {
  const source = line.replace(GLUED_YEAR_RE, ' ').replace(/\s+/g, ' ').trim();
  if (!source) return { text: '' };

  const { text: guarded, ranges } = protectDateRanges(source);
  const finish = (result: EntryLine): EntryLine => ({
    text: restoreDateRanges(result.text, ranges).replace(/\s+/g, ' ').trim(),
    right: result.right === undefined ? undefined : restoreDateRanges(result.right, ranges).trim(),
    tech: result.tech === undefined ? undefined : restoreDateRanges(result.tech, ranges).trim(),
  });

  const separators = /\s*(?:\||\t|·|\s[-–—]\s| {2,})\s*/;

  // Leading tag: "React, Node.js - Telegram Automation Bot".
  const leading = guarded.split(separators);
  if (leading.length > 1) {
    const [first, ...rest] = leading;
    if (looksLikeTechTag(first) && rest.join(' ').trim()) {
      return finish({ text: rest.join(' ').trim(), tech: first.trim() });
    }
  }

  // Trailing date/status or tech tag: "Telegram Automation Bot | 2024".
  // The right-hand candidate is restored from its placeholder BEFORE matching,
  // so a range like "Mar 2021 - Present" still reads as a date.
  for (let index = leading.length - 1; index > 0; index -= 1) {
    const left = leading.slice(0, index).join(' ').trim();
    const rightRaw = leading.slice(index).join(' ').trim();
    if (!left || !rightRaw) continue;
    const right = restoreDateRanges(rightRaw, ranges);
    if (DATE_OR_STATUS_RE.test(right)) return finish({ text: left, right: normalizeStatus(right) });
    if (looksLikeTechTag(right)) return finish({ text: left, tech: right });
  }

  // No separator at all. A status/date still has to come off the end, e.g.
  // "B.Tech Computer Science, 90% Expected 2026" -> date on the right. This
  // only applies when the line genuinely had no " | " separator (leading.length
  // would be 2+ otherwise), and it runs on the original text: the whole range
  // ("2021 - Present") is protected as a placeholder and would otherwise be
  // invisible here. It is checked before the tag scan because a trailing date
  // is a far stronger signal.
  if (leading.length === 1) {
    const trailing = source.match(TRAILING_STATUS_RE);
    if (trailing && trailing.index !== undefined && trailing.index > 0) {
      const left = source.slice(0, trailing.index).trim();
      if (left) return finish({ text: left, right: normalizeStatus(source.slice(trailing.index)) });
    }
  }

  // Tag written with no separator at all: "AI Tools, Automation Telegram Bot".
  const leadingTag = splitLeadingTag(guarded);
  if (leadingTag) return finish(leadingTag);

  // The whole line is just a tag: "Canva, CapCut, AI Tools". There is no title
  // to pair it with, so it is reported with empty text and the caller folds it
  // back onto the entry above.
  if (looksLikeTechTag(guarded)) return finish({ text: '', tech: guarded });

  return finish({ text: guarded });
}

/** A date/status glued to the end of a line with no separator before it. */
const TRAILING_STATUS_RE = new RegExp(
  `(?:${STATUS_WORDS_SOURCE}\\s+)?(${PERIOD_SOURCE})\\s*$`,
  'i',
);

/**
 * Returns the tech tag when an entire line is nothing but a tag, otherwise null.
 * Used to fold a tag that the parser left stranded on its own line back onto
 * the entry above it, instead of letting it fall through as a loose fragment.
 */
export function bareTechTag(line: string): string | null {
  const text = line.replace(BULLET_RE, '').trim();
  if (!text) return null;
  return splitEntryLine(text).tech ?? null;
}

/** Attaches a stranded tag to the entry above it. Returns false if it cannot. */
function absorbTechTag(items: ResumeDocBlock[], tag: string): boolean {
  const last = items[items.length - 1];
  if (!last || last.kind !== 'item' || last.bullet) return false;
  last.tech = last.tech ? `${last.tech}, ${tag}` : tag;
  return true;
}

/** Keeps a status word glued to its year with a single visible space. */
function normalizeStatus(value: string): string {
  const spaced = value.replace(/\s+/g, ' ').replace(/(\b(?:19|20)\d{2})\b/, ' $1');
  // Collapsing has to happen after the split, otherwise the inserted space
  // doubles up on an already-spaced value ("Expected 2026" -> "Expected  2026").
  return spaced.replace(/\s+/g, ' ').trim();
}

const DETAIL_SECTIONS = new Set<ResumeSection['kind']>([
  'experience',
  'education',
  'projects',
  'certifications',
  'awards',
  'publications',
  'volunteer',
]);

const CITY_STATE_RE = /^[A-Z][A-Za-z .'-]*,\s*[A-Za-z]{2}\s*(?:\d{5}(?:-\d{4})?)?$/;
const REMOTE_RE = /^(?:remote|on[- ]?site|hybrid|telecommute)(?:\s*[,/•|-]\s*(?:us|usa|united states|[A-Z]{2}))?$/i;

// Contact fields are the most common destination for icon-glyph residue that
// PDF text extraction leaves behind (icons in the source file become junk like
// "Q", "MB", "&," or "(€)" — the exact characters html2canvas also produces for
// un-rasterized SVG icons). Clean each "|"-separated part down to the one
// recognizable field so preview, PDF and DOCX all render cleanly.
const CONTACT_NON_TEXT_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060\uFEFF\uE000-\uF8FF]|[\u2600-\u27BF]|[\u{1F000}-\u{1FAFF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]/gu;
const CONTACT_EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const CONTACT_PHONE_RE = /\+?[\d(][\d\s()./-]{6,}\d/;
const CONTACT_URL_RE = /(?:https?:\/\/|www\.)[^\s]+|(?:linkedin\.com|github\.com)\/[^\s]+/i;
const CONTACT_LOCATION_RE = /^[A-Za-z][A-Za-z0-9 .'-]*(?:,\s*[A-Za-z0-9][A-Za-z0-9 .'-]*)+$/;

function looksLikeLocation(line: string): boolean {
  const trimmed = line.trim();
  return CITY_STATE_RE.test(trimmed) || REMOTE_RE.test(trimmed);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function cleanLocation(raw: string): string {
  if (/^(?:remote|on[- ]?site|hybrid|telecommute)(?:\s*[,/•|-].*)?$/i.test(raw)) return raw;
  let value = raw;
  for (let attempt = 0; attempt < 4; attempt++) {
    const tokens = value.match(/^(\S+)\s*([\s\S]*)$/);
    if (!tokens) return '';
    const token = tokens[1];
    const rest = (tokens[2] ?? '').trim();
    const isJunk =
      token.length <= 3 &&
      (/[^A-Za-z]/.test(token) || /^[A-Z]{1,3}$/.test(token) || /\d/.test(token));
    if (isJunk) {
      value = rest;
      continue;
    }
    return CONTACT_LOCATION_RE.test(value) ? value : '';
  }
  return value;
}

/**
 * Reduces a "|"-separated contact part to its single recognizable field,
 * dropping any icon-glyph / mojibake residue that PDF text extraction or
 * html2canvas produces around it. Returns "" for a part that is pure junk.
 */
export function cleanContactPart(part: string): string {
  const clean = part.replace(CONTACT_NON_TEXT_RE, '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const email = clean.match(CONTACT_EMAIL_RE);
  if (email) return email[0].trim();
  const url = clean.match(CONTACT_URL_RE);
  if (url) return url[0].trim().replace(/[,.;]+$/, '');
  const phone = clean.match(CONTACT_PHONE_RE);
  if (phone) return phone[0].trim();
  return cleanLocation(clean);
}

function pushItem(items: ResumeDocBlock[], line: string, isDetail: boolean, spaceBefore: boolean, isFirstOfBlock: boolean) {
  const bullet = BULLET_RE.test(line);
  const text = line.replace(BULLET_RE, '').trim();
  if (!text) return;
  if (isDetail && !bullet) {
    // Route through the same splitter the improved path uses, so glued years
    // ("Expected2026", "90% |2024") and stray tech tags are handled identically
    // no matter which entry point built the document.
    const split = splitEntryLine(text);
    if (!split.text) {
      if (split.tech) absorbTechTag(items, split.tech);
      return;
    }
    items.push({ kind: 'item', text: split.text, bold: isFirstOfBlock, right: split.right, tech: split.tech, spaceBefore });
  } else {
    items.push({ kind: 'item', text, bullet, spaceBefore });
  }
}

function buildSectionBlocks(section: ResumeSection): ResumeDocBlock[] {
  const items: ResumeDocBlock[] = [];
  const isDetail = DETAIL_SECTIONS.has(section.kind);

  const pushLine = (line: string, spaceBefore: boolean, isFirstOfBlock: boolean, isLast: boolean) => {
    // A tag the parser stranded on its own line belongs to the entry above it.
    // Folding it back is what stops a stray "Canva, CapCut" from landing
    // under Languages at the bottom of the page.
    if (isDetail) {
      const tag = bareTechTag(line);
      if (tag && absorbTechTag(items, tag)) return;
    }
    pushItem(items, line, isDetail, spaceBefore, isFirstOfBlock);
    if (isLast) {
      const last = items[items.length - 1];
      if (last?.kind === 'item') last.spaceAfter = true;
    }
  };

  if (!isDetail) {
    const lines = section.content.trim().split('\n');
    lines.forEach((line, index) => {
      pushLine(line.trim(), false, false, index === lines.length - 1);
    });
    return items;
  }

  const blocks = section.content.trim().split(/\n{2,}/);
  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const spaceBefore = blockIndex > 0;
    lines.forEach((line, index) => {
      pushLine(line, spaceBefore, index === 0, index === lines.length - 1);
    });
  });
  return items;
}

export function buildResumeDoc(resume: ParsedResume): ResumeDocBlock[] {
  const blocks: ResumeDocBlock[] = [];
  if (resume.name) blocks.push({ kind: 'name', text: resume.name });

  const contactLines = resume.contact.lines.map((line) => line.trim()).filter(Boolean);
  let titleText = '';
  const remainingLines: string[] = [];
  for (const line of contactLines) {
    if (!titleText && !looksLikeLocation(line)) {
      titleText = line;
      continue;
    }
    remainingLines.push(line);
  }

  if (titleText) blocks.push({ kind: 'title', text: titleText });

  const locationLines = remainingLines.filter(looksLikeLocation);
  const miscLines = remainingLines.filter((line) => !looksLikeLocation(line));
  const contactParts = unique([
    ...resume.contact.phones.map((phone) => cleanContactPart(phone)),
    ...(resume.contact.email ? [cleanContactPart(resume.contact.email)] : []),
    ...(resume.contact.location ? [cleanContactPart(resume.contact.location)] : []),
    ...locationLines.map((line) => cleanContactPart(line)),
    ...miscLines.map((line) => cleanContactPart(line)),
    ...resume.contact.urls.map((url) => cleanContactPart(url)),
  ].filter((part): part is string => Boolean(part)));
  if (contactParts.length) blocks.push({ kind: 'contact', text: contactParts.join(' | ') });

  for (const section of resume.sections) {
    const items = buildSectionBlocks(section);
    if (!items.length) continue;
    blocks.push({ kind: 'section', title: section.title, sectionKind: section.kind });
    blocks.push(...items);
  }
  return blocks;
}

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

export function buildImprovedResumeDoc(improved: ImprovedResume): ResumeDocBlock[] {
  const blocks: ResumeDocBlock[] = [];
  const header = improved.header;
  const name = header.name.trim();
  if (name) blocks.push({ kind: 'name', text: name });
  const title = header.title.trim();
  if (title) blocks.push({ kind: 'title', text: title });

  const contactParts = unique([
    cleanContactPart(header.phone),
    cleanContactPart(header.email),
    cleanContactPart(header.linkedin),
    cleanContactPart(header.github),
    cleanContactPart(header.location),
    ...header.other.map((entry) => cleanContactPart(entry)),
  ].filter((part): part is string => Boolean(part)));
  if (contactParts.length) blocks.push({ kind: 'contact', text: contactParts.join(' | ') });

  for (const section of improved.sections) {
    if (!section.items.length) continue;
    const heading = section.title.trim() || humanSectionTitle(section.type);
    const sectionKind = sectionTypeToKind(section.type);
    blocks.push({ kind: 'section', title: heading, sectionKind });

    for (const [index, item] of section.items.entries()) {
      if (item.type === 'entry') {
        blocks.push(...buildEntryBlocks(item, sectionKind, section.items[index + 1]));
        continue;
      }
      if (item.type === 'skills-row') {
        blocks.push({ kind: 'skills', label: item.label?.trim() ?? '', values: item.values ?? [] });
        continue;
      }
      if (item.type === 'edu') {
        const split = splitEntryLine(item.text ?? '');
        blocks.push({
          kind: 'item',
          text: split.text,
          bold: true,
          right: item.right?.trim() || split.right || undefined,
          tech: item.tech?.trim() || split.tech || undefined,
          spaceBefore: true,
        });
        continue;
      }
      const text = item.text?.trim();
      if (text) blocks.push({ kind: 'item', text });
    }
  }
  return blocks;
}

/**
 * Emits one project/experience entry: bold title on the left, date and tech tag
 * on the right, then the bullets.
 *
 * Bug #5 and #7 root cause: the title and its tech tag were two independent
 * items, so the model could emit the tag as a separate trailing fragment (which
 * is how "Canva, CapCut, AI Tools" ended up after the Languages section) and
 * the tag could be concatenated into the title run. Here both live on the same
 * item, and a tech tag that the model emitted as a standalone item — with no
 * title, no date and no bullets of its own — is absorbed back into the entry
 * above it instead of being emitted out of place.
 */
function buildEntryBlocks(
  item: ImprovedResume['sections'][number]['items'][number],
  sectionKind: ResumeSection['kind'],
  next: ImprovedResume['sections'][number]['items'][number] | undefined,
): ResumeDocBlock[] {
  const titleSplit = splitEntryLine(item.title ?? '');
  const declaredRight = item.right?.trim();
  const declaredTech = item.tech?.trim();
  const subtitle = item.subtitle?.trim();
  const bullets = (item.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);

  // A subtitle that is only a tech list belongs on the title row, not on its
  // own line — that is what made "Telegram Automation Bot" read as a bare
  // title with the tools dropped below it.
  const subtitleIsTech = Boolean(subtitle) && looksLikeTechTag(subtitle ?? '');
  const tech = declaredTech || (subtitleIsTech ? (subtitle as string) : titleSplit.tech) || undefined;

  // The subtitle slot is a company/institution line. When the model produced
  // only a tech tag there, it is already captured in `tech` and must not be
  // emitted a second time as a trailing fragment.
  let subtitleText = subtitle;
  if (subtitleIsTech) subtitleText = '';

  // A model may emit a tech tag as its own entry item directly after the real
  // one. Absorb it instead of letting it float to the end of the document.
  const orphanTech =
    sectionKind === 'projects' && next?.type === 'entry' && !next.title?.trim() && !next.subtitle?.trim() &&
    !(next.bullets ?? []).length && Boolean(next.text?.trim()) && looksLikeTechTag(next.text ?? '')
      ? (next.text as string).trim()
      : '';

  const text = titleSplit.text || (item.title ?? '').trim();
  if (!text && !subtitleText && !tech) return [];

  const right = declaredRight || titleSplit.right || undefined;
  const techTag = tech || orphanTech || undefined;

  const blocks: ResumeDocBlock[] = [
    { kind: 'item', text, bold: true, right, spaceBefore: true },
  ];
  // The date shares the title row. The tech tag shares the subtitle row when
  // there is one, so both values survive — neither can displace the other.
  if (subtitleText) blocks.push({ kind: 'item', text: subtitleText, tech: techTag });
  else if (techTag) blocks.push({ kind: 'item', text: '', bold: true, tech: techTag });
  for (const bullet of bullets) blocks.push({ kind: 'item', text: bullet, bullet: true });
  return blocks;
}

function sectionTypeToKind(type: ImprovedResume['sections'][number]['type']): ResumeSection['kind'] {
  switch (type) {
    case 'education': return 'education';
    case 'certifications': return 'certifications';
    case 'experience': return 'experience';
    case 'projects': return 'projects';
    case 'summary': return 'summary';
    case 'skills': return 'skills';
    default: return 'additional';
  }
}

function humanSectionTitle(type: ImprovedResume['sections'][number]['type']): string {
  switch (type) {
    case 'summary': return 'Professional Summary';
    case 'skills': return 'Skills';
    case 'experience': return 'Experience';
    case 'education': return 'Education';
    case 'projects': return 'Projects';
    case 'certifications': return 'Certifications';
    default: return 'Additional Information';
  }
}

export function downloadBlob(bytes: Uint8Array | Blob, fileName: string, mimeType: string) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}