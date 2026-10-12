import { Link, useLocation } from 'wouter';
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { KEYWORD_PAGES } from './keyword-content';
import { CITY_PAGES, CITY_NAME, CITY_ORDER } from './city-content';
import { LandingTemplateA, LandingTemplateB, LandingTemplateC, LandingTemplateD, LandingTemplateE, LandingTemplateF, LandingTemplateG, LandingTemplateH, LandingTemplateI, LandingTemplateJ, LandingTemplateK, LandingTemplateL, LandingTemplateM, LandingTemplateN, LandingTemplateO } from './templates';
import type { DataA, DataB, DataC, DataD, DataE, LandingData } from './templates';

function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function kebabToCamel(value: string): string {
  return value.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function resolveKeywordKey(slug: string): string | null {
  if (KEYWORD_PAGES[slug]) return slug;
  const camel = kebabToCamel(slug);
  if (camel !== slug && KEYWORD_PAGES[camel]) return camel;
  return null;
}

function pageFaqs(data: LandingData): { question: string; answer: string }[] | null {
  return 'faqs' in data && Array.isArray(data.faqs) && data.faqs.length > 0
    ? data.faqs.map((item) => ({ question: item.q, answer: item.a }))
    : null;
}

function renderTemplate(data: LandingData) {
  switch (data.template) {
    case 'A':
      return <LandingTemplateA data={data} />;
    case 'B':
      return <LandingTemplateB data={data} />;
    case 'C':
      return <LandingTemplateC data={data} />;
    case 'D':
      return <LandingTemplateD data={data} />;
    case 'E':
      return <LandingTemplateE data={data} />;
    case 'F':
      return <LandingTemplateF data={data} />;
    case 'G':
      return <LandingTemplateG data={data} />;
    case 'H':
      return <LandingTemplateH data={data} />;
    case 'I':
      return <LandingTemplateI data={data} />;
    case 'J':
      return <LandingTemplateJ data={data} />;
    case 'K':
      return <LandingTemplateK data={data} />;
    case 'L':
      return <LandingTemplateL data={data} />;
    case 'M':
      return <LandingTemplateM data={data} />;
    case 'N':
      return <LandingTemplateN data={data} />;
    case 'O':
      return <LandingTemplateO data={data} />;
    default:
      return <MissingSlug />;
  }
}

function MissingSlug() {
  const [, setLocation] = useLocation();
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
      <div className="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center sm:p-12">
        <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">That help page is not on the radar.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">The address may have a typo. Head back to the resume checker, or explore the help guides and city pages linked in the footer.</p>
        <button type="button" onClick={() => setLocation('/')} className="focus-ring mt-6 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Open the free checker</button>
      </div>
    </main>
  );
}

export function KeywordHelpPage({ slug }: { slug: string }) {
  const key = resolveKeywordKey(slug);
  const data = key ? KEYWORD_PAGES[key] : undefined;
  if (!data || !key) return <MissingSlug />;
  const canonicalSlug = camelToKebab(key);
  const faqs = pageFaqs(data);
  return (
    <>
      <Seo
        title={data.meta.title}
        description={data.meta.description}
        canonicalPath={`/resume-help/${canonicalSlug}`}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Resume help', path: '/resume-help' },
            { name: data.meta.title, path: `/resume-help/${canonicalSlug}` },
          ]),
          ...(faqs ? [faqJsonLd(faqs)] : []),
        ]}
      />
      {renderTemplate(data)}
    </>
  );
}

export function CityHelpPage({ slug }: { slug: string }) {
  const data = CITY_PAGES[slug];
  if (!data) return <MissingSlug />;
  const faqs = pageFaqs(data);
  return (
    <>
      <Seo
        title={data.meta.title}
        description={data.meta.description}
        canonicalPath={`/resume-help/city/${slug}`}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Resume help', path: '/resume-help' },
            { name: CITY_NAME[slug] ?? 'City guide', path: `/resume-help/city/${slug}` },
          ]),
          ...(faqs ? [faqJsonLd(faqs)] : []),
        ]}
      />
      {renderTemplate(data)}
    </>
  );
}

const KEYWORD_LINKS: { href: string; label: string }[] = [
  { href: '/resume-help/freshers', label: 'Resume help for freshers' },
  { href: '/resume-help/it-jobs', label: 'Tips for IT & tech roles' },
  { href: '/resume-help/government-jobs', label: 'Government job seekers' },
  { href: '/resume-help/digital-marketing', label: 'Digital marketing roles' },
  { href: '/resume-help/remote-jobs', label: 'Remote & work-from-home' },
];

export function HelpDirectory() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12">
      <div className="max-w-3xl">
        <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">resume help</div>
        <h1 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em] sm:text-5xl">Resume help guides and city pages</h1>
        <p className="mt-5 text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:text-base sm:leading-8">Advice for the job segments that trip resumes up most, and for the Haryana and NCR markets where hiring habits shape what a recruiter expects.</p>
      </div>
      <section className="mt-10 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10">
        <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">by audience</div>
        <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Help by job segment</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {KEYWORD_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 transition-colors hover:border-[hsl(var(--primary)/.5)]">
              <div className="font-['Space_Grotesk'] text-lg font-bold">{item.label}</div>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">by market</div>
            <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Help by city</h2>
          </div>
          <Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Check my resume free</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CITY_ORDER.map((city) => (
            <Link key={city.slug} href={`/resume-help/city/${city.slug}`} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 transition-colors hover:border-[hsl(var(--primary)/.5)]">
              <div className="font-['Space_Grotesk'] text-lg font-bold">{city.label}</div>
              <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{city.note}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}