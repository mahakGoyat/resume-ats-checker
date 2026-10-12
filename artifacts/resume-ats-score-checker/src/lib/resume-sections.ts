export type ResumeSectionKind =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'publications'
  | 'volunteer'
  | 'interests'
  | 'additional';

export type ResumeContact = {
  email?: string;
  phones: string[];
  urls: string[];
  lines: string[];
  location?: string;
};

export type ResumeSection = {
  kind: ResumeSectionKind;
  title: string;
  content: string;
};

export type ParsedResume = {
  name: string;
  contact: ResumeContact;
  sections: ResumeSection[];
};

const SECTION_TITLES: Record<ResumeSectionKind, string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards & Honors',
  languages: 'Languages',
  publications: 'Publications',
  volunteer: 'Volunteer Experience',
  interests: 'Interests',
  additional: 'Additional Information',
};

const SECTION_ALIASES: Record<ResumeSectionKind, string[]> = {
  summary: [
    'summary',
    'professional summary',
    'profile',
    'professional profile',
    'about',
    'about me',
    'objective',
    'career objective',
    'summary of qualifications',
    'executive summary',
    'resume summary',
    'qualifications summary',
  ],
  experience: [
    'experience',
    'work experience',
    'employment',
    'employment history',
    'work history',
    'professional experience',
    'professional history',
    'relevant experience',
    'career history',
    'internship',
    'internships',
    'experience history',
    'professional background',
  ],
  education: [
    'education',
    'academic background',
    'academics',
    'education and training',
    'academic history',
    'educational background',
    'training and education',
    'education and certifications',
    'education & certifications',
    'education and credentials',
    'degree and certificates',
  ],
  skills: [
    'skills',
    'core skills',
    'technical skills',
    'key skills',
    'professional skills',
    'skills and abilities',
    'competencies',
    'areas of expertise',
    'technical abilities',
    'core competencies',
    'technical expertise',
    'skill set',
    'technical and professional skills',
    'technical & professional skills',
    'skills and technologies',
    'tools and technologies',
    'professional skills and technologies',
    'technical stack',
  ],
  projects: [
    'projects',
    'personal projects',
    'professional projects',
    'side projects',
    'project experience',
    'academic projects',
    'key projects',
    'notable projects',
    'project highlights',
  ],
  certifications: [
    'certifications',
    'certification',
    'certificates',
    'licenses',
    'licenses and certifications',
    'licenses and certificates',
    'professional certifications',
    'credentials',
    'certifications and licenses',
  ],
  awards: [
    'awards',
    'honors',
    'awards and honors',
    'awards and achievements',
    'achievements',
    'accomplishments',
    'honors and awards',
    'professional achievements',
  ],
  languages: ['languages', 'language proficiency', 'languages and skills', 'language skills'],
  publications: ['publications', 'research', 'research experience', 'papers', 'publications and research'],
  volunteer: ['volunteer', 'volunteering', 'volunteer experience', 'community', 'community involvement', 'civic involvement', 'volunteer work'],
  interests: ['interests', 'hobbies', 'hobbies and interests', 'interests and activities', 'activities', 'interests and hobbies'],
  additional: ['additional', 'additional information', 'other', 'references', 'additional skills', 'miscellaneous', 'details'],
};

function normalizeHeader(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/^[\d\s.\)\-_:]+/, '')
    .replace(/[^\w\s&+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SECTION_LOOKUP = new Map<string, ResumeSectionKind>();
for (const [kind, aliases] of Object.entries(SECTION_ALIASES) as [ResumeSectionKind, string[]][]) {
  for (const alias of aliases) SECTION_LOOKUP.set(normalizeHeader(alias), kind);
}

const BULLET_RE = /^\s*[•●▪◦–—*\-+]\s+/;
const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE_RE = /\+?[\d(][\d\s()./-]{6,}\d/;
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|(?:linkedin\.com|github\.com)\/[^\s]+/gi;

function cleanUrl(raw: string): string {
  return raw.trim().replace(/[,.，。;]+$/, '');
}

function isYearLike(raw: string): boolean {
  const compact = raw.replace(/[^\d]/g, '');
  return /^(19|20)\d{2,8}$/.test(compact);
}

function looksLikeContactLine(line: string): boolean {
  return EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line);
}

const QUALIFIER_WORDS = [
  'technical',
  'professional',
  'core',
  'key',
  'relevant',
  'academic',
  'career',
  'personal',
  'advanced',
  'notable',
  'other',
];

function resolveSectionKind(normalized: string): ResumeSectionKind | null {
  const exact = SECTION_LOOKUP.get(normalized);
  if (exact) return exact;

  const parts = normalized
    .split(/\s*(?:&|\band\b|,|\+)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  for (const part of parts) {
    const direct = SECTION_LOOKUP.get(part);
    if (direct) return direct;
  }

  const qualifierRe = new RegExp(`^(?:${QUALIFIER_WORDS.join('|')})\\s+`);
  for (const part of parts) {
    const stripped = part.replace(qualifierRe, '').trim();
    if (stripped.length >= 2) {
      const viaStrip = SECTION_LOOKUP.get(stripped);
      if (viaStrip) return viaStrip;
    }
  }
  return null;
}

function detectSectionKind(line: string): ResumeSectionKind | null {
  if (BULLET_RE.test(line)) return null;
  const normalized = normalizeHeader(line);
  if (normalized.length < 2 || normalized.length > 60) return null;
  return resolveSectionKind(normalized);
}

function extractMatches(text: string, regex: RegExp): string[] {
  const results: string[] = [];
  const copy = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = copy.exec(text)) !== null) {
    if (match[0]) results.push(match[0]);
    if (match[0].length === 0) copy.lastIndex += 1;
  }
  return results;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function parsePhones(text: string): string[] {
  return unique(extractMatches(text, PHONE_RE))
    .map((raw) => raw.trim())
    .filter((raw) => !isYearLike(raw) && raw.replace(/[^\d+]/g, '').length >= 6);
}

function parseUrls(text: string): string[] {
  return unique(extractMatches(text, URL_RE).map(cleanUrl)).filter(Boolean);
}

const LOCATIONISH_RE = /^[A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+$/;
const REMOTEISH_RE = /^(?:remote|on[- ]?site|hybrid|telecommute)(?:\s*[,/•|-].*)?$/i;

function looksLikeLocationish(segment: string): boolean {
  return LOCATIONISH_RE.test(segment.trim()) || REMOTEISH_RE.test(segment.trim());
}

function contactResidueSegments(line: string, excludeName?: string): string[] {
  const cleaned = line
    .replace(EMAIL_RE, ' ')
    .replace(PHONE_RE, ' ')
    .replace(URL_RE, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned
    .split(/\s*\|\s*/)
    .map((segment) => segment.trim())
    .filter(
      (segment) =>
        Boolean(segment) &&
        !isYearLike(segment) &&
        !(excludeName && segment.toLowerCase() === excludeName.toLowerCase()),
    );
}

function parseContact(headerText: string, fullText: string, excludeName?: string): ResumeContact {
  const email = EMAIL_RE.exec(headerText) ?? EMAIL_RE.exec(fullText);
  let phones = parsePhones(headerText);
  if (!phones.length) phones = parsePhones(fullText);
  const urls = parseUrls(fullText);
  const lines: string[] = [];
  const locationParts: string[] = [];
  const seen = new Set<string>();
  for (const raw of headerText.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const contactLike = EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line);
    if (contactLike) {
      const segments = contactResidueSegments(line, excludeName);
      for (const segment of segments) {
        const key = looksLikeLocationish(segment) ? `L:${segment.toLowerCase()}` : `M:${segment.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (looksLikeLocationish(segment)) {
          locationParts.push(segment);
        } else {
          lines.push(segment);
        }
      }
      continue;
    }
    if (isYearLike(line) || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    lines.push(line);
  }
  const location = unique(locationParts).join(', ') || undefined;
  return { email: email?.[0], phones, urls, lines, location };
}

function cleanNameCandidate(line: string): string {
  return line.replace(/^\d+[\.\)\s]*/, '').trim();
}

function nameCandidateScore(line: string): number {
  const candidate = cleanNameCandidate(line);
  if (!candidate || looksLikeContactLine(line) || isYearLike(line)) return -1;
  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return -1;
  let score = 0;
  if (/^[A-Z][A-Z&'\s.-]+$/.test(candidate)) score += 8;
  else if (/^[A-Z][A-Za-z'.]+(?:[ -][A-Z][A-Za-z'.]+)+/.test(candidate)) score += 3;
  if (candidate === candidate.toUpperCase()) score += 2;
  if (words.length >= 2 && words.length <= 4) score += 2;
  if (candidate.includes(',')) score -= 6;
  if (/[&@0-9+()]/.test(candidate)) score -= 4;
  if (candidate.includes('|')) score -= 5;
  return score;
}

function extractName(headerLines: string[]): string {
  let best = '';
  let bestScore = -1;
  let bestIndex = Infinity;
  headerLines.forEach((line, index) => {
    const score = nameCandidateScore(line);
    if (score < 0) return;
    if (score > bestScore || (score === bestScore && index < bestIndex)) {
      best = cleanNameCandidate(line);
      bestScore = score;
      bestIndex = index;
    }
  });
  if (best) return best;

  const first = headerLines[0] ?? '';
  const stripped = first
    .replace(EMAIL_RE, ' ')
    .replace(PHONE_RE, ' ')
    .replace(URL_RE, ' ')
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of stripped) {
    if (nameCandidateScore(part) > 0) return cleanNameCandidate(part);
  }
  return cleanNameCandidate(stripped.join(' '));
}

export function parseResumeSections(text: string): ParsedResume {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const headerLines: string[] = [];
  const sections: ResumeSection[] = [];
  let current: ResumeSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) current.content += '\n';
      continue;
    }
    const kind = detectSectionKind(line);
    if (kind) {
      current = { kind, title: line.trim(), content: '' };
      sections.push(current);
      continue;
    }
    if (current) {
      current.content += line + '\n';
    } else {
      headerLines.push(line);
    }
  }

  for (const section of sections) section.content = section.content.trim();
  const structured = sections.filter((section) => section.content.length > 0);

  const name = extractName(headerLines);
  const remainingHeader = headerLines.slice();
  if (name) {
    const nameIndex = remainingHeader.findIndex((line) => cleanNameCandidate(line) === name);
    if (nameIndex >= 0) remainingHeader.splice(nameIndex, 1);
  }
  let headerText = remainingHeader.join('\n').trim();

  if (!structured.length) {
    const remaining = headerText;
    headerText = '';
    const bodyLines = lines.map((l) => l.trim()).filter(Boolean).join('\n');
    const bodyWithoutName = name ? bodyLines.split('\n').filter((l) => l.trim() !== name).join('\n') : bodyLines;
    if (bodyWithoutName.trim()) structured.push({ kind: 'additional', title: SECTION_TITLES.additional, content: bodyWithoutName.trim() });
  }

  return { name, contact: parseContact(headerText, lines.join('\n'), name), sections: structured };
}

export function resumeBaseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'resume';
}