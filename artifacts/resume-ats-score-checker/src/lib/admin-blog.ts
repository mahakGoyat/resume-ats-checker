import { stripHtml, isRichContent, type BlogFaq } from './supabase';

export const BLOG_CATEGORIES = [
  'ATS & Recruiting',
  'Resume writing',
  'Career guidance',
  'Work habits',
  'Interview prep',
  'Job search',
  'Tech careers',
  'Productivity',
];

const AI_ENDPOINT = '/api/blog/ai';

type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function runAi<T>(path: string, body: Record<string, unknown>): Promise<AiResult<T>> {
  try {
    const response = await fetch(`${AI_ENDPOINT}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `AI request failed (HTTP ${response.status})`);
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'AI request failed' };
  }
}

export function promptSource(title: string, content: string): string {
  const body = stripHtml(content || '');
  return `BLOG POST TITLE:\n${title || '(untitled)'}\n\nBLOG POST CONTENT:\n${body.slice(0, 4000) || '(no content yet)'}`;
}

export function generateTagsAI(title: string, content: string) {
  return runAi<{ tags: string[] }>('tags', { title, content });
}

export function generateFaqAI(title: string, content: string) {
  return runAi<{ faqs: BlogFaq[] }>('faq', { title, content });
}

export function generateMetaAI(title: string, content: string) {
  return runAi<{ metaTitle: string; metaDescription: string }>('meta', { title, content });
}

const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'SPAN']);
const ALLOWED_ATTRS = new Map<string, string[]>([
  ['A', ['href', 'target', 'rel']],
  ['SPAN', ['style']],
  ['P', ['style']],
  ['DIV', ['style']],
  ['H1', ['style']],
  ['H2', ['style']],
  ['H3', ['style']],
]);

export function sanitizeRichHtml(input: string): string {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    const allowed = ALLOWED_ATTRS.get(el.tagName) ?? [];
    Array.from(el.attributes).forEach((attr) => {
      if (!allowed.includes(attr.name)) el.removeAttribute(attr.name);
    });
    if (el.tagName === 'A' && !el.getAttribute('href')) {
      el.replaceWith(...Array.from(el.childNodes));
    }
  }
  return doc.body.innerHTML.trim();
}

export function contentToHtml(content: string): string {
  if (isRichContent(content)) return content;
  return content
    .split(/\n{2,}/)
    .map((block) => `<p>${block.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('');
}