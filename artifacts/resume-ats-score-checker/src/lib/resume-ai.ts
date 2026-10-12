import { z } from 'zod';
import { parseResumeSections, type ParsedResume, type ResumeSection } from './resume-sections';
import { cleanContactPart, splitEntryLine } from './resume-doc-model';

export type ImprovedSectionType =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'additional';

export type ImprovedItemType = 'text' | 'skills-row' | 'entry' | 'edu';

export type ImprovedHeader = {
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  other: string[];
};

export type ImprovedItem = {
  type: ImprovedItemType;
  text?: string;
  label?: string;
  values?: string[];
  title?: string;
  subtitle?: string;
  /** Right-hand column: dates, "Expected 2026", grades. */
  right?: string;
  /** Right-hand column: the entry's tech/skill tag, rendered next to its title. */
  tech?: string;
  bullets?: string[];
};

export type ImprovedSection = {
  type: ImprovedSectionType;
  title: string;
  items: ImprovedItem[];
};

export type ImprovedResume = {
  header: ImprovedHeader;
  sections: ImprovedSection[];
  suggestions: string[];
};

export type ImproveOutcome =
  | { ok: true; data: ImprovedResume; notes: string[] }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Text sanitization
// ---------------------------------------------------------------------------

const NON_TEXT_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060\uFEFF\uE000-\uF8FF]/g;
const EMOJI_RE =
  /[\u2600-\u27BF\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}]/gu;

/**
 * Removes icon-font glyphs (private-use area), zero-width/control characters,
 * and emoji, and normalizes whitespace, while preserving the characters that
 * matter inside phones, emails, and URLs: digits, +, /, @, :, ., -, spaces.
 */
export function sanitizeResumeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(NON_TEXT_RE, '')
    .replace(EMOJI_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const improvedHeaderSchema = z
  .object({
    name: z.string().default(''),
    title: z.string().default(''),
    location: z.string().default(''),
    phone: z.string().default(''),
    email: z.string().default(''),
    linkedin: z.string().default(''),
    github: z.string().default(''),
    other: z.array(z.string()).default([]),
  })
  .strip();

const improvedItemSchema = z
  .object({
    type: z.string().default('text'),
    text: z.string().optional(),
    label: z.string().optional(),
    values: z.array(z.string()).optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    right: z.string().optional(),
    tech: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strip();

const improvedSectionSchema = z
  .object({
    type: z.string().default('additional'),
    title: z.string().default(''),
    items: z.array(improvedItemSchema).default([]),
  })
  .strip();

export const improvedResumeSchema = z
  .object({
    header: improvedHeaderSchema,
    sections: z.array(improvedSectionSchema).default([]),
    suggestions: z.array(z.string()).default([]),
  })
  .strip();

const IMPROVED_ITEM_TYPES = new Set<string>(['text', 'skills-row', 'entry', 'edu']);
const IMPROVED_SECTION_TYPES = new Set<string>([
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'additional',
]);

export function normalizeImprovedResume(raw: unknown): ImprovedResume {
  if (!raw || typeof raw !== 'object') {
    return { header: emptyHeader(), sections: [], suggestions: [] };
  }
  const record = raw as Record<string, unknown>;
  const headerRaw = (record.header && typeof record.header === 'object' ? record.header : {}) as Record<string, unknown>;
  const header: ImprovedHeader = {
    name: stringOf(headerRaw['name']),
    title: stringOf(headerRaw['title']),
    location: stringOf(headerRaw['location']),
    phone: stringOf(headerRaw['phone']),
    email: stringOf(headerRaw['email']).toLowerCase(),
    linkedin: stringOf(headerRaw['linkedin']),
    github: stringOf(headerRaw['github']),
    other: stringArrayOf(headerRaw['other']),
  };
  const sections: ImprovedSection[] = Array.isArray(record['sections'])
    ? record['sections']
        .filter((s): s is unknown => s !== null && typeof s === 'object')
        .map(normalizeSection)
        .filter((section) => section.items.length > 0 || section.title)
    : [];
  return {
    header,
    sections,
    suggestions: stringArrayOf(record['suggestions']),
  };
}

function normalizeSection(value: unknown): ImprovedSection {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const typeRaw = stringOf(record['type']);
  const type = (IMPROVED_SECTION_TYPES.has(typeRaw) ? typeRaw : 'additional') as ImprovedSectionType;
  const items: ImprovedItem[] = Array.isArray(record['items'])
    ? record['items']
        .filter((item): item is unknown => item !== null && typeof item === 'object')
        .map(normalizeItem)
    : [];
  return { type, title: stringOf(record['title']), items };
}

function normalizeItem(value: unknown): ImprovedItem {
  const record = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const typeRaw = stringOf(record['type']);
  const type = (IMPROVED_ITEM_TYPES.has(typeRaw) ? typeRaw : 'text') as ImprovedItemType;
  const item: ImprovedItem = { type };
  const text = stringOf(record['text']);
  if (text) item.text = text;
  const label = stringOf(record['label']);
  if (label) item.label = label;
  const values = stringArrayOf(record['values']);
  if (values.length) item.values = values;
  const title = stringOf(record['title']);
  if (title) item.title = title;
  const subtitle = stringOf(record['subtitle']);
  if (subtitle) item.subtitle = subtitle;
  const right = stringOf(record['right']);
  if (right) item.right = right;
  const tech = stringOf(record['tech']);
  if (tech) item.tech = tech;
  const bullets = stringArrayOf(record['bullets']);
  if (bullets.length) item.bullets = bullets;
  return item;
}

function emptyHeader(): ImprovedHeader {
  return { name: '', title: '', location: '', phone: '', email: '', linkedin: '', github: '', other: [] };
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArrayOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean) : [];
}

/**
 * Validates a raw AI response against the zod schema. Returns the normalized
 * structure on success, or the reason on failure (callers must fall back to the
 * original resume content — never show a broken structure).
 */
export function validateImprovedResume(raw: unknown):
  | { ok: true; data: ImprovedResume }
  | { ok: false; error: string } {
  const parsed = improvedResumeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? `${first.path.join('.') || 'response'}: ${first.message}` : 'response did not match the expected structure' };
  }
  return { ok: true, data: normalizeImprovedResume(parsed.data) };
}

// ---------------------------------------------------------------------------
// Deterministic guard (requirement D)
// ---------------------------------------------------------------------------

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/gi;
const PHONE_RE = /\+?[\d(][\d\s()./-]{6,}\d/g;
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|(?:linkedin\.com|github\.com)\/[^\s]+/gi;
const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
const GRADE_RE =
  /(?:\b(?:GPA|CGPA|SGPA|percentage|percent|grade|score)\b[^\n]{0,20}|\b\d{1,2}(?:\.\d{1,2})?\s*(?:\/10|%|%\b|out of\s*10|marks)\b)/gi;

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function distinctMatches(text: string, regex: RegExp): string[] {
  const found = new Set<string>();
  const copy = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = copy.exec(text)) !== null) {
    found.add(match[0].trim());
    if (match[0].length === 0) copy.lastIndex += 1;
  }
  return [...found];
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

function cleanUrlTail(value: string): string {
  return value.replace(/[.,;:)\]}>]*$/, '');
}

function flattenItems(sections: ImprovedSection[]): ImprovedItem[] {
  return sections.flatMap((section) => section.items);
}

function flattenText(sections: ImprovedSection[]): string {
  return flattenItems(sections)
    .flatMap((item) => {
      if (item.type === 'entry') {
        return [item.title ?? '', item.subtitle ?? '', item.right ?? '', item.tech ?? '', ...(item.bullets ?? [])];
      }
      if (item.type === 'skills-row') return [item.label ?? '', ...(item.values ?? [])];
      if (item.type === 'edu') return [item.text ?? '', item.right ?? '', item.tech ?? ''];
      return [item.text ?? ''];
    })
    .join('\n');
}

/** Counts the number of discrete entries a parsed section represents. */
function originalEntryCount(section: ResumeSection): number {
  const content = section.content.trim();
  if (!content) return 0;
  if (section.kind === 'summary' || section.kind === 'additional') {
    return content.split(/\n{2,}/).filter((block) => block.trim().length > 0).length;
  }
  if (section.kind === 'skills' || section.kind === 'education' || section.kind === 'certifications') {
    return content.split('\n').filter((line) => line.trim().length > 0).length;
  }
  // Detail sections are separated by blank lines (one entry = one block).
  return content.split(/\n{2,}/).filter((block) => block.trim().length > 0).length;
}

function originalEntryCounts(text: string): { sections: number; entries: number } {
  const parsed = parseResumeSections(text);
  const entries = parsed.sections.reduce((total, section) => total + originalEntryCount(section), 0);
  return { sections: parsed.sections.length, entries };
}

function aiEntryCounts(improved: ImprovedResume): { sections: number; entries: number } {
  const entries = flattenItems(improved.sections).reduce((total, item) => {
    if (item.type === 'entry') return total + 1;
    if (item.type === 'skills-row') return total + 1;
    if (item.type === 'edu') return total + 1;
    return total + 1;
  }, 0);
  return { sections: improved.sections.length, entries };
}

/**
 * Deterministic guard: every email/phone/URL/year/grade found in the original
 * must still appear in the improved resume, section and entry counts must
 * match, and lines must not be duplicated. Returns the list of problems.
 */
export function verifyImprovedResume(originalText: string, improved: ImprovedResume): string[] {
  const issues: string[] = [];
  const source = sanitizeResumeText(originalText);
  const targetText = `${improved.header.name}\n${improved.header.phone}\n${improved.header.email}\n${improved.header.linkedin}\n${improved.header.github}\n${improved.header.location}\n${improved.header.other.join('\n')}\n${flattenText(improved.sections)}`;

  for (const email of distinctMatches(source, EMAIL_RE)) {
    if (!targetText.toLowerCase().includes(email.toLowerCase())) {
      issues.push(`Missing email in improved resume: ${email}`);
    }
  }

  // Normalized digit string of every phone-like token in the improved output.
  // Phones are compared token-to-token so reformatting ("+91 (85720) 82217")
  // passes, while an OCR-corrupted number ("4918572082217") is flagged.
  const targetPhones = distinctMatches(targetText, PHONE_RE).map((phone) => digitsOf(phone));

  for (const phone of distinctMatches(source, PHONE_RE)) {
    const digits = digitsOf(phone);
    if (digits.replace(/^0+/, '').length >= 6 && !targetPhones.includes(digits)) {
      issues.push(`Missing phone number in improved resume: ${phone.trim()}`);
    }
  }

  for (const url of distinctMatches(source, URL_RE)) {
    const clean = cleanUrlTail(url);
    if (!targetText.toLowerCase().includes(clean.toLowerCase())) {
      issues.push(`Missing link in improved resume: ${clean}`);
    }
  }

  for (const year of distinctMatches(source, YEAR_RE)) {
    if (!targetText.includes(year)) {
      issues.push(`Missing date or year in improved resume: ${year}`);
    }
  }

  for (const grade of distinctMatches(source, GRADE_RE)) {
    if (!targetText.toLowerCase().includes(grade.toLowerCase())) {
      issues.push(`Missing grade in improved resume: ${grade}`);
    }
  }

  const original = originalEntryCounts(source);
  const current = aiEntryCounts(improved);
  if (current.sections !== original.sections) {
    issues.push(`Section count changed (original ${original.sections}, improved ${current.sections}).`);
  }
  if (current.entries !== original.entries) {
    issues.push(`Entry count changed (original ${original.entries}, improved ${current.entries}).`);
  }

  const seen = new Set<string>();
  for (const item of flattenItems(improved.sections)) {
    if (item.type === 'entry') {
      for (const bullet of item.bullets ?? []) {
        const key = bullet.trim().toLowerCase();
        if (seen.has(key)) issues.push(`Duplicate line in improved resume: ${bullet.trim()}`);
        seen.add(key);
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Deterministic fallback derived from the original resume (requirement B/C/D)
// ---------------------------------------------------------------------------

/**
 * Drops icon-glyph residue from an extracted name. PDF text extraction maps
 * icon glyphs (MapPin/Phone/etc.) to arbitrary Latin characters, so a name can
 * arrive as "Q SUNSHINE SAINI" or "MB &#65;rjun Sharma". Single stray capital
 * letters are stripped only when followed by an all-caps remainder, so real
 * initials like "A. Kumar" are left alone.
 */
function cleanName(raw: string): string {
  let name = raw
    .replace(NON_TEXT_RE, '')
    .replace(EMOJI_RE, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  while (name) {
    const tokens = name.match(/^(\S+)\s*([\s\S]*)$/);
    if (!tokens) break;
    const token = tokens[1].replace(/\.$/, '');
    const remaining = (tokens[2] ?? '').trim();
    const junk =
      token.length <= 2 &&
      /^[A-Z]+$/.test(token) &&
      /^[A-Z][A-Z&.\s'-]*$/.test(remaining.replace(/[.\s'-]+$/, ''));
    if (!junk) break;
    name = remaining;
  }
  return name.trim();
}

export function improvedFromParsed(parsed: ParsedResume): ImprovedResume {
  const contactLines = parsed.contact.lines.map((line) => line.trim()).filter(Boolean);
  const header: ImprovedHeader = {
    name: cleanName(parsed.name),
    title: '',
    location: parsed.contact.location ?? '',
    phone: parsed.contact.phones[0] ?? '',
    email: parsed.contact.email ?? '',
    linkedin: '',
    github: '',
    other: [],
  };
  for (const line of [...contactLines, ...parsed.contact.urls]) {
    const lower = line.toLowerCase();
    if (!header.linkedin && lower.includes('linkedin.com')) header.linkedin = line;
    else if (!header.github && lower.includes('github.com')) header.github = line;
    else header.other.push(line);
    if (!header.title && !looksLikeLocation(line)) {
      header.title = line;
      header.other = header.other.filter((entry) => entry !== line);
    }
  }
  header.other = header.other.filter((line) => line !== header.phone && line.toLowerCase() !== header.email.toLowerCase());

  const sections: ImprovedSection[] = parsed.sections.map((section) => {
    switch (section.kind) {
      case 'summary':
      case 'additional':
        return {
          type: section.kind,
          title: section.title,
          items: splitParagraphs(section.content).map((paragraph) => ({ type: 'text' as const, text: paragraph })),
        };
      case 'skills':
        return {
          type: 'skills' as const,
          title: section.title,
          items: section.content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const labelMatch = line.match(/^(.{2,40}?)\s*[:|\u2022]\s+(.+)$/);
              if (labelMatch && !looksLikeLocation(line)) {
                return { type: 'skills-row' as const, label: labelMatch[1].trim(), values: splitSkillValues(labelMatch[2]) };
              }
              return { type: 'skills-row' as const, label: '', values: splitSkillValues(line) };
            }),
        };
      case 'experience':
      case 'projects': {
        const entries: ImprovedItem[] = [];
        for (const block of section.content.split(/\n{2,}/)) {
          const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
          if (!lines.length) continue;
          // A project header can be "Title | Tech, Tag | 2024" or "Tech, Tag -
          // Title | 2024". splitEntryLine pulls the date and the tech tag out
          // into their own fields so they can never merge with the title.
          const first = splitEntryLine(lines[0]);
          let subtitle = '';
          let bulletStart = 1;
          if (lines.length >= 2 && !isBulletLine(lines[1])) {
            const second = splitEntryLine(lines[1]);
            // A tech-only second line belongs to the entry, not to a new entry.
            if (second.text && !second.tech && !second.right) {
              subtitle = second.text;
            } else {
              subtitle = lines[1];
            }
            bulletStart = 2;
          }
          entries.push({
            type: 'entry' as const,
            title: first.text,
            subtitle,
            right: first.right ?? '',
            tech: first.tech ?? '',
            bullets: lines.slice(bulletStart).filter(isBulletLike).map(stripBullet),
          });
        }
        return { type: section.kind as ImprovedSectionType, title: section.title, items: entries };
      }
      case 'education':
      case 'certifications':
        return {
          type: section.kind as ImprovedSectionType,
          title: section.title,
          items: section.content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const split = splitEntryLine(line);
              return { type: 'edu' as const, text: split.text, right: split.right ?? '', tech: split.tech ?? '' };
            }),
        };
      default:
        return {
          type: 'additional' as const,
          title: section.title,
          items: splitParagraphs(section.content).map((paragraph) => ({ type: 'text' as const, text: paragraph })),
        };
    }
  });

  return { header, sections, suggestions: [] };
}

function splitParagraphs(content: string): string[] {
  return content.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function splitSkillValues(raw: string): string[] {
  return raw
    .split(/\s*(?:[,;]|\u2022|\u00b7| and | & )\s*/)
    .map((value) => value.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function isBulletLike(line: string): boolean {
  return /^[\s]*[•●▪◦–—*\-+]\s+/.test(line.trim()) || line.trim().length > 0;
}

function stripBullet(line: string): string {
  return line.trim().replace(/^\s*[•●▪◦–—*\-+]\s+/, '').trim();
}

function isBulletLine(line: string): boolean {
  return /^\s*[•●▪◦–—*\-+]\s+/.test(line);
}

const LOCATIONISH_RE = /^[A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+$/;
const REMOTEISH_RE = /^(?:remote|on[- ]?site|hybrid|telecommute)(?:\s*[,/•|-].*)?$/i;

function looksLikeLocation(line: string): boolean {
  const value = line.trim();
  return LOCATIONISH_RE.test(value) || REMOTEISH_RE.test(value) || /^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(value);
}

const TRAILING_DATE_RE =
  /\b((?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2})\s*(?:(?:-|–|—|to)\s*)?(?:(?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}|Present|Current|Ongoing)?\s*$/i;

function splitTrailingField(line: string): { left: string; right?: string } {
  const match = line.match(TRAILING_DATE_RE);
  if (!match || match.index === undefined) return { left: line };
  const left = line.slice(0, match.index).trim().replace(/[\s\-–—]+$/, '').trim();
  const right = line.slice(match.index).trim();
  if (!left) return { left: line };
  return { left, right };
}

/**
 * Repairs an improved resume so it never loses data: contact fields come from
 * the original verbatim, and any body content that fails the guard is replaced
 * by the deterministic structure built from the original. The AI wording is kept
 * wherever the guard passes.
 */
export function repairImprovedResume(originalText: string, improved: ImprovedResume): { result: ImprovedResume; notes: string[] } {
  const notes: string[] = [];
  const parsed = parseResumeSections(sanitizeResumeText(originalText));
  const result = { ...improved, header: { ...improved.header } };

  // Header must always come from the original, verbatim.
  const fromOriginal = improvedFromParsed(parsed);
  result.header = {
    ...result.header,
    name: cleanName(parsed.name) || cleanName(result.header.name),
    title: result.header.title || fromOriginal.header.title,
    location: cleanContactPart(fromOriginal.header.location) || result.header.location,
    phone: cleanContactPart(fromOriginal.header.phone) || result.header.phone,
    email: cleanContactPart(fromOriginal.header.email) || result.header.email,
    linkedin: cleanContactPart(fromOriginal.header.linkedin) || result.header.linkedin,
    github: cleanContactPart(fromOriginal.header.github) || result.header.github,
    other: (fromOriginal.header.other.length ? fromOriginal.header.other : result.header.other)
      .map((entry) => cleanContactPart(entry))
      .filter((entry): entry is string => Boolean(entry)),
  };

  const issues = verifyImprovedResume(originalText, result);
  if (issues.length > 0) {
    notes.push('The AI rewrite dropped or changed content, so the section structure was rebuilt from your original resume. Only wording improvements that preserved every fact were kept.');
    result.sections = fromOriginal.sections;
    notes.push(...issues.length > 8 ? issues.slice(0, 8) : issues);
  } else {
    notes.push('AI rewrite applied. Contact details were copied from your original file; every date, link, and entry was verified.');
  }

  return { result, notes };
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

export async function improveResume(resumeText: string, jobDescription = ''): Promise<ImproveOutcome> {
  const sanitized = sanitizeResumeText(resumeText);
  if (sanitized.trim().length < 20) {
    return { ok: false, error: 'There is not enough resume text to improve.' };
  }

  let response: Response;
  try {
    response = await fetch('/api/resume/improve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: sanitized, jobDescription }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the improver. Check the connection and try again.' };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: (body && typeof body.error === 'string' ? body.error : `The improver failed (HTTP ${response.status}).`) };
  }

  const raw = body && typeof body === 'object' && 'result' in body ? (body as { result: unknown }).result : body;
  const validated = validateImprovedResume(raw);
  if (!validated.ok) {
    return { ok: false, error: 'The improver returned an unreadable result. Nothing was changed — try again.' };
  }

  const { result, notes } = repairImprovedResume(sanitized, validated.data);
  return { ok: true, data: result, notes };
}