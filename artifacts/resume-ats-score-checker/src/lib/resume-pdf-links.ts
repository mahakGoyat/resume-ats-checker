/**
 * Contact-line link resolution.
 *
 * The contact line is a single " | "-joined string. This module splits it back
 * into its parts, decides the visible label for each, and — critically —
 * produces the ABSOLUTE href for every part that should be clickable.
 *
 * Bug #2 root cause: the export rendered link text but never carried a real
 * target, so the PDF only ever got a link annotation pointing at a local
 * file path with an empty anchor. `hrefFor` is the single place that decides a
 * target, and it always returns an absolute URI:
 *   email    -> mailto:you@example.com
 *   linkedin -> https://www.linkedin.com/in/...
 *   github   -> https://github.com/...
 *   other    -> https://... (a bare domain is upgraded to https)
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const DOMAIN_RE = /(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?/i;

export type ContactLinkPart = {
  /** Part as it appears in the contact line, cleaned. */
  text: string;
  /** Visible prefix, e.g. "LinkedIn: ". */
  label: string;
  /** Absolute href, or null when the part is not a link. */
  href: string | null;
};

const TRACKING_PARAMS = /^(utm_|ref$|source$|trk$|trackingId$)/i;

function stripTracking(url: string): string {
  const [base, query] = url.split('?');
  if (!query) return base;
  const kept = query
    .split('&')
    .filter((part) => part && !TRACKING_PARAMS.test(part.split('=')[0] ?? ''));
  return kept.length ? `${base}?${kept.join('&')}` : base;
}

/**
 * Resolves the absolute href for a contact part, or null when the part is not
 * a link (a phone number, a location, or free text). Never returns a relative
 * path, a bare "#", or an empty string.
 */
export function hrefFor(part: string): string | null {
  const text = part.trim();
  if (!text) return null;

  const email = text.match(EMAIL_RE);
  if (email) return `mailto:${email[0]}`;

  const withScheme = text.match(/https?:\/\/[^\s|]+/i);
  if (withScheme) {
    const url = stripTracking(withScheme[0]).replace(/[.,;:)\]}'"]+$/, '');
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  // Bare domain, with or without a path: linkedin.com/in/x, github.com/x.
  const domain = text.match(DOMAIN_RE);
  if (domain && /(?:linkedin|github|gitlab|behance|dribbble|medium|portfolio|dev\.to|notion|kaggle|leetcode|stackoverflow)/i.test(domain[0])) {
    return `https://${stripTracking(domain[0]).replace(/[.,;:)\]}'"]+$/, '')}`;
  }

  return null;
}

/** True when the part is a web link (not a mailto). */
export function isWebLink(part: string): boolean {
  const href = hrefFor(part);
  return Boolean(href && !href.startsWith('mailto:'));
}

/** The visible label for a contact part, matching the preview's wording. */
export function labelForContactPart(part: string): string {
  const text = part.trim();
  if (EMAIL_RE.test(text)) return 'Email: ';
  if (/linkedin\.com/i.test(text)) return 'LinkedIn: ';
  if (/github\.com/i.test(text)) return 'GitHub: ';
  if (/\+?[\d(][\d\s()./-]{6,}\d/.test(text)) return 'Phone: ';
  if (hrefFor(text)) return 'Web: ';
  return '';
}
