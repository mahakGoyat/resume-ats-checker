import { useEffect } from 'react';
import { type BlogPost, postExcerpt } from '@/lib/supabase';

export const SITE_NAME = 'ScoreMyResume';
export const DEFAULT_OG_IMAGE = '/scoremyresume-logo.jpg';

export const DEFAULT_TITLE = 'ScoreMyResume — Free ATS Resume Checker';
export const DEFAULT_DESCRIPTION =
  'Free ATS resume checker. ScoreMyResume reads your resume in the browser and shows how an applicant tracking system would read it — keyword matching, formatting help, and a clear improvement plan. No uploads, no accounts.';

function siteOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export type JsonLd = Record<string, unknown>;

export function websiteJsonLd(url: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${url}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationJsonLd(url: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name: SITE_NAME,
    url,
    logo: { '@type': 'ImageObject', url: absoluteUrl(DEFAULT_OG_IMAGE) },
    sameAs: [],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function articleJsonLd(post: BlogPost, url: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.meta_title || post.title,
    description: post.meta_description || postExcerpt(post),
    image: post.cover_image_url ? [absoluteUrl(post.cover_image_url), absoluteUrl(DEFAULT_OG_IMAGE)] : [absoluteUrl(DEFAULT_OG_IMAGE)],
    datePublished: post.created_at,
    dateModified: post.created_at,
    mainEntityOfPage: url,
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
      logo: { '@type': 'ImageObject', url: absoluteUrl(DEFAULT_OG_IMAGE) },
    },
  };
}

export function useSeo(opts: {
  title?: string;
  description?: string;
  noindex?: boolean;
  canonicalPath?: string;
  canonicalUrl?: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: JsonLd | JsonLd[] | null;
}) {
  const { title, description, noindex, canonicalPath, canonicalUrl, image, type, jsonLd } = opts;
  useEffect(() => {
    const pageTitle = title || DEFAULT_TITLE;
    const pageDescription = description || DEFAULT_DESCRIPTION;
    const canonical = canonicalUrl || absoluteUrl(canonicalPath || window.location.pathname);
    const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);

    document.title = pageTitle;
    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', canonical);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:type', type || 'website');
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:locale', 'en_IN');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
    upsertMeta('name', 'twitter:image', ogImage);

    const rules = jsonLd ? (Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : [jsonLd]) : [];
    let script = document.head.querySelector<HTMLScriptElement>('#seo-jsonld');
    if (rules.length > 0) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'seo-jsonld';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(rules.length === 1 ? rules[0] : rules);
    } else if (script) {
      script.remove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, noindex, canonicalPath, canonicalUrl, image, type, JSON.stringify(jsonLd ?? null)]);
}

export function Seo(props: Parameters<typeof useSeo>[0]) {
  useSeo(props);
  return null;
}