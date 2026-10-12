import { memo, useMemo } from 'react';
import type { ParsedResume, ResumeSection } from './resume-sections';
import { buildResumeDoc, cleanContactPart } from './resume-doc-model';
import type { ResumeDocBlock } from './resume-doc-model';
import { hrefFor, labelForContactPart } from './resume-pdf-links';

export const RESUME_PREVIEW_CONTAINER_ID = 'resume-preview-container';

const NON_TEXT_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060\uFEFF\uE000-\uF8FF]|[\u2600-\u27BF]|[\u{1F000}-\u{1FAFF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]/gu;

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE_RE = /\+?[\d(][\d\s()./-]{6,}\d/;
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|(?:linkedin\.com|github\.com)\/[^\s]+/i;
const LOCATIONISH_RE = /^[A-Za-z][A-Za-z0-9 .'-]*(?:,\s*[A-Za-z0-9][A-Za-z0-9 .'-]*)+$/;

const EDU_DATE_RE =
  /^\s*(?:(?:19|20)\d{2}(?:\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|present|current|ongoing))?|(?:[a-z]{3,9}\.?\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s+(?:[a-z]{3,9}\.?\s+)?(?:19|20)\d{2}|(?:currently|presently|graduating|expected|pursuing|studying|in progress|present|current|ongoing)[\w ]*|(?:19|20)\d{2})\s*$/i;

function cleanPlainText(text: string): string {
  return text.replace(NON_TEXT_RE, '');
}

function esc(text: string): string {
  return cleanPlainText(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatItemText(text: string): string {
  return esc(text).replace(/\n/g, '<br />');
}

function sectionBlock(section: Extract<ResumeDocBlock, { kind: 'section' }>): string {
  const isSkills = section.sectionKind === 'skills';
  const isEducation = section.sectionKind === 'education' || section.sectionKind === 'certifications';
  return `<div class="rs-section${isSkills ? ' rs-section-skills' : ''}${isEducation ? ' rs-section-education' : ''}"><h2 class="rs-heading">${esc(section.title.toUpperCase())}</h2></div>`;
}

function skillsBlock(block: Extract<ResumeDocBlock, { kind: 'skills' }>): string {
  const label = block.label.trim();
  const values = (block.values ?? []).map((value) => value.trim()).join(' · ');
  if (!values) return '';
  const labelMarkup = label ? `<span class="rs-skills-label">${esc(label)}</span>` : '';
  return `<div class="rs-skills-row">${labelMarkup}<span class="rs-skills-values">${esc(values)}</span></div>`;
}

/**
 * The tech tag is a separate, visually distinct run: italic and grey, never
 * concatenated onto the title. It sits on the entry's own row, right-aligned
 * when it shares a line with the title, and directly below it otherwise.
 */
function techMarkup(item: { tech?: string }): string {
  const tech = item.tech?.trim();
  if (!tech) return '';
  return `<span class="rs-item-tech">${esc(tech)}</span>`;
}

function itemBlock(block: ResumeDocBlock): string {
  const item = block as Extract<ResumeDocBlock, { kind: 'item' }>;
  const text = formatItemText(item.text);
  const bullet = item.bullet ? '• ' : '';
  const tech = techMarkup(item);
  if (item.right) {
    return `<li class="rs-item rs-item-row"><span class="rs-item-text${item.bold ? ' rs-bold' : ''}">${bullet}${text}</span><span class="rs-item-right">${esc(item.right)}${tech}</span></li>`;
  }
  return `<li class="rs-item${item.bold ? ' rs-bold' : ''}">${bullet}${text}${tech}</li>`;
}

function bodyBlock(block: ResumeDocBlock): string {
  const item = block as Extract<ResumeDocBlock, { kind: 'item' }>;
  const tech = techMarkup(item);
  if (item.right) {
    return `<div class="rs-plain rs-item-row"><span class="rs-item-text${item.bold ? ' rs-bold' : ''}">${formatItemText(item.text)}</span><span class="rs-item-right">${esc(item.right)}${tech}</span></div>`;
  }
  return `<div class="rs-plain${item.bold ? ' rs-bold' : ''}">${formatItemText(item.text)}${tech}</div>`;
}

function headingBlock(block: ResumeDocBlock): string {
  const item = block as Extract<ResumeDocBlock, { kind: 'item' }>;
  const tech = techMarkup(item);
  if (item.right) {
    return `<div class="rs-heading-row"><span class="rs-heading-text">${formatItemText(item.text)}</span><span class="rs-heading-right">${esc(item.right)}${tech}</span></div>`;
  }
  return `<div class="rs-heading-row"><span class="rs-heading-text">${formatItemText(item.text)}</span>${tech}</div>`;
}

function renderItemBlock(block: ResumeDocBlock): string {
  const item = block as Extract<ResumeDocBlock, { kind: 'item' }>;
  if (item.bullet) return itemBlock(block);
  return item.bold ? headingBlock(block) : bodyBlock(block);
}

function renderEducationItem(block: ResumeDocBlock): string {
  const item = block as Extract<ResumeDocBlock, { kind: 'item' }>;
  const text = formatItemText(item.text);
  const before = item.spaceBefore ? ' rs-edu-before' : '';
  const after = item.spaceAfter ? ' rs-edu-after' : '';
  const tech = techMarkup(item);
  if (item.right) {
    return `<div class="rs-edu-row${before}${after}"><span class="rs-edu-heading">${text}</span><span class="rs-edu-date">${esc(item.right)}${tech}</span></div>`;
  }
  if (EDU_DATE_RE.test(item.text)) {
    return `<div class="rs-edu-date rs-edu-standalone${before}${after}">${text}${tech}</div>`;
  }
  return `<div class="rs-plain rs-edu-institution${before}${after}">${text}${tech}</div>`;
}

/**
 * DO NOT use icon components (lucide-react MapPin/Phone/Mail/Linkedin/Github or
 * any other icon font/SVG) in this contact line. The PDF is now drawn by jsPDF's
 * own text layer, which only understands standard 14 fonts, so an icon has no
 * glyph to map to and previously exported as garbled characters. Always render
 * plain labeled text separated by "|", e.g.:
 *   Kaithal, Haryana, India | Phone: +91 85720 82217 | Email: ... |
 *   LinkedIn: ... | GitHub: ...
 */
/**
 * Contact parts that look like links render as real anchors. This is what makes
 * the PDF's link annotations point at the actual profile: jsPDF reads the href
 * off the rendered anchor, so a plain <span> here would export as a dead link.
 * The href always comes from `hrefFor`, which guarantees an absolute URI
 * (mailto: for email, https:// for sites) and never a relative path or "#".
 */
function contactPartMarkup(part: string, label: string): string {
  const href = hrefFor(part);
  const text = esc(label + part);
  if (!href) return `<span class="rs-contact-part">${text}</span>`;
  return `<a class="rs-contact-part rs-contact-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

function renderContact(block: ResumeDocBlock): string {
  const contact = block as Extract<ResumeDocBlock, { kind: 'contact' }>;
  const parts = contact.text
    .split(/\s*\|\s*/)
    .map((part) => cleanContactPart(part))
    .filter(Boolean);

  const categorized = parts.map((part) => {
    let rank = 5;
    let label = '';
    if (LOCATIONISH_RE.test(part) && !EMAIL_RE.test(part) && !PHONE_RE.test(part) && !URL_RE.test(part)) {
      rank = 1;
    } else if (PHONE_RE.test(part)) {
      rank = 2;
      label = 'Phone: ';
    } else if (EMAIL_RE.test(part)) {
      rank = 3;
      label = 'Email: ';
    } else if (URL_RE.test(part)) {
      rank = 4;
      label = labelForContactPart(part);
    }
    return { part, rank, label };
  });
  categorized.sort((left, right) => left.rank - right.rank);

  if (!categorized.length) return '';
  return `<p class="rs-contact">${categorized
    .map(({ part, label }) => contactPartMarkup(part, label))
    .join('<span class="rs-sep"> | </span>')}</p>`;
}

export function buildResumeHtmlFromDoc(blocks: ResumeDocBlock[], photoDataUrl?: string | null, options?: { rootId?: string }): string {
  const rootId = options?.rootId ?? RESUME_PREVIEW_CONTAINER_ID;
  let lastListOpen = false;
  let currentSectionKind: ResumeSection['kind'] = 'additional';
  const parts: string[] = [];

  const closeOpenList = () => {
    if (lastListOpen) {
      parts.push('</ul>');
      lastListOpen = false;
    }
  };

  for (const block of blocks) {
    if (block.kind === 'name') {
      closeOpenList();
      const photoMarkup = photoDataUrl
        ? '<img class="rs-photo" alt="" src="' + photoDataUrl + '" />'
        : '';
      parts.push(
        '<header class="rs-header' + (photoDataUrl ? ' rs-has-photo' : '') + '"><h1 class="rs-name">' +
          esc(block.text) +
          '</h1>' +
          photoMarkup +
          '</header>',
      );
    } else if (block.kind === 'title') {
      closeOpenList();
      parts.push(`<p class="rs-title">${esc(block.text)}</p>`);
    } else if (block.kind === 'contact') {
      closeOpenList();
      parts.push(renderContact(block));
    } else if (block.kind === 'section') {
      closeOpenList();
      currentSectionKind = block.sectionKind ?? 'additional';
      parts.push(sectionBlock(block));
    } else if (block.kind === 'skills') {
      closeOpenList();
      parts.push(skillsBlock(block));
    } else {
      const item = block as Extract<ResumeDocBlock, { kind: 'item' }>;
      const rendered = currentSectionKind === 'education' || currentSectionKind === 'certifications'
        ? renderEducationItem(block)
        : renderItemBlock(block);
      if (item.bullet) {
        if (!lastListOpen) {
          parts.push('<ul class="rs-list">');
          lastListOpen = true;
        }
        parts.push(rendered);
      } else {
        closeOpenList();
        parts.push(rendered);
      }
    }
  }
  closeOpenList();
  parts.unshift(`<div id="${rootId}" class="rs-root rs-scope">`);
  parts.push('</div>');
  return parts.join('\n');
}

export function buildResumeHtml(resume: ParsedResume, photoDataUrl?: string | null, options?: { rootId?: string }): string {
  const blocks = buildResumeDoc(resume);
  return buildResumeHtmlFromDoc(blocks, photoDataUrl, options);
}

export const ResumePreviewHtml = memo(function ResumePreviewHtml({ resume, photo, ...props }: { resume: ParsedResume; photo?: string | null; className?: string }) {
  const html = useMemo(() => buildResumeHtml(resume, photo ?? null), [resume, photo]);
  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />;
});

export const ResumePreviewHtmlFromDoc = memo(function ResumePreviewHtmlFromDoc({ blocks, photo, ...props }: { blocks: ResumeDocBlock[]; photo?: string | null; className?: string }) {
  const html = useMemo(() => buildResumeHtmlFromDoc(blocks, photo ?? null), [blocks, photo]);
  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />;
});