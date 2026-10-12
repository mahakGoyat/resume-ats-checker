import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';

export type Card = { title: string; text: string; icon: LucideIcon };
export type Tip = { title: string; text: string };
export type Qa = { q: string; a: string };
export type Pair = { title: string; challenge: string; solve: string };
export type Row = { title: string; text: string; icon: LucideIcon };
export type Cta = { label: string; title: string; text: string };
export type Related = { href: string; label: string }[];
export type PageMeta = { title: string; description: string };

export type LandingData =
  | (DataA & { template: 'A' })
  | (DataB & { template: 'B' })
  | (DataC & { template: 'C' })
  | (DataD & { template: 'D' })
  | (DataE & { template: 'E' })
  | (DataC & { template: 'F' })
  | (DataD & { template: 'G' })
  | (DataB & { template: 'H' })
  | (DataE & { template: 'I' })
  | (DataA & { template: 'J' })
  | (DataC & { template: 'K' })
  | (DataE & { template: 'L' })
  | (DataD & { template: 'M' })
  | (DataA & { template: 'N' })
  | (DataB & { template: 'O' });

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title;
    let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', meta.description);
  }, [meta.title, meta.description]);
}

const mainPad = 'mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12';

/* ================================================================== */
/*  Section marker — makes every block visually obvious                */
/* ================================================================== */
function SectionTag({ index, children, right }: { index: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-md bg-[hsl(var(--primary))] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary-foreground))]">{`§ ${index}`}</span>
      <span className="h-[2px] flex-1 rounded bg-[linear-gradient(90deg,hsl(var(--primary)/.55),hsl(var(--border)))]" />
      <h2 className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">{children}</h2>
      {right}
    </div>
  );
}

function Section({ index, title, tone = 0, children, className = '' }: { index: string; title: React.ReactNode; tone?: 0 | 1 | 2; children: React.ReactNode; className?: string }) {
  const bg = tone === 0 ? 'bg-[hsl(var(--card)/.6)]' : tone === 1 ? 'bg-[hsl(var(--secondary)/.4)]' : 'bg-transparent border-0 shadow-none';
  const outer = tone === 2 ? '' : 'border border-[hsl(var(--border))]';
  return (
    <section className={`mt-11 ${className}`}>
      <SectionTag index={index}>{title}</SectionTag>
      <div className={`mt-4 rounded-[1.75rem] p-6 sm:p-9 ${outer} ${bg}`}>{children}</div>
    </section>
  );
}

/* ================================================================== */
/*  Hero band with SVG illustration                                    */
/* ================================================================== */
function HeroBand({ badge, title, sub, graphic, accent = 'primary', ctaLabel = 'Check my resume free' }: { badge: string; title: string; sub: string; graphic: React.ReactNode; accent?: 'primary' | 'accent' | 'muted'; ctaLabel?: string }) {
  const grad = accent === 'accent'
    ? 'bg-[linear-gradient(145deg,hsl(var(--accent)/.16),hsl(var(--card)))]'
    : 'bg-[linear-gradient(145deg,hsl(var(--primary)/.18),hsl(var(--card)))]';
  const blob = accent === 'accent' ? 'bg-[hsl(var(--accent)/.14)]' : 'bg-[hsl(var(--primary)/.15)]';
  return (
    <header className={`relative overflow-hidden rounded-[2rem] border border-[hsl(var(--border))] ${grad} p-7 sm:p-11`}>
      <div className={`pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl ${blob}`} />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-[hsl(var(--accent)/.08)] blur-3xl" />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">{badge}</div>
          <h1 className="mt-4 text-pretty font-['Space_Grotesk'] text-4xl font-bold leading-[1.08] tracking-[-.04em] sm:text-5xl sm:leading-[1.05]">{title}</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:text-base sm:leading-8">{sub}</p>
          <Link href="/" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_14px_34px_hsl(var(--primary)/.28)]">{ctaLabel} <ArrowRight className="size-4" /></Link>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-[hsl(var(--muted-foreground))]"><CheckCircle2 className="size-3.5 text-[hsl(var(--primary))]" /> Free · runs in your browser · no account</div>
        </div>
        <div className="hidden place-items-center lg:grid">{graphic}</div>
      </div>
    </header>
  );
}

/* ================================================================== */
/*  SVG illustrations used as hero images                              */
/* ================================================================== */
function ArtCard({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 300 250" className="w-full max-w-[330px]" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <rect x="12" y="12" width="276" height="226" rx="26" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {children}
    </svg>
  );
}

function HeroDoc() {
  return (
    <ArtCard>
      <rect x="72" y="34" width="118" height="160" rx="14" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      <rect x="88" y="78" width="86" height="14" rx="7" fill="hsl(var(--primary)/.9)" />
      <line x1="88" y1="106" x2="150" y2="106" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <line x1="88" y1="124" x2="168" y2="124" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <line x1="88" y1="142" x2="140" y2="142" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <circle cx="220" cy="64" r="26" fill="hsl(var(--accent))" />
      <path d="M210 64 l7 7 l14 -14" stroke="hsl(var(--background))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="228" cy="186" r="16" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      <path d="M201 148 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1z" fill="hsl(var(--accent))" />
    </ArtCard>
  );
}

function HeroGauge() {
  return (
    <ArtCard>
      <path d="M48 176 A102 102 0 0 1 252 176" stroke="hsl(var(--secondary))" strokeWidth="20" strokeLinecap="round" />
      <path d="M48 176 A102 102 0 0 1 150 74" stroke="hsl(var(--primary))" strokeWidth="20" strokeLinecap="round" />
      <g transform="rotate(-48 150 176)">
        <rect x="146" y="56" width="8" height="104" rx="4" fill="hsl(var(--foreground))" />
      </g>
      <circle cx="150" cy="176" r="14" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="4" />
      <circle cx="196" cy="104" r="12" fill="hsl(var(--accent))" />
      <path d="M132 146 h22 v22 h-22z" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="3" />
      <line x1="132" y1="168" x2="168" y2="168" stroke="hsl(var(--border))" strokeWidth="3" strokeLinecap="round" />
      <line x1="132" y1="186" x2="160" y2="186" stroke="hsl(var(--border))" strokeWidth="3" strokeLinecap="round" />
      <text x="150" y="224" textAnchor="middle" fill="hsl(var(--primary))" fontFamily="Space Grotesk, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">ATS READY</text>
    </ArtCard>
  );
}

function HeroShield() {
  return (
    <ArtCard>
      <circle cx="150" cy="126" r="92" fill="none" stroke="hsl(var(--primary)/.18)" strokeWidth="1.5" strokeDasharray="6 8" />
      <path d="M150 52 L216 72 V128 C216 172 194 198 150 216 C106 198 84 172 84 128 V72 Z" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M124 130 l18 18 36 -42" stroke="hsl(var(--accent))" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="70" y="222" width="62" height="18" rx="9" fill="hsl(var(--accent)/.35)" />
      <rect x="168" y="222" width="62" height="18" rx="9" fill="hsl(var(--primary)/.25)" />
      <circle cx="212" cy="52" r="8" fill="hsl(var(--accent))" />
      <path d="M212 38 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill="hsl(var(--accent))" />
    </ArtCard>
  );
}

function HeroTarget() {
  return (
    <ArtCard>
      <circle cx="150" cy="126" r="74" fill="none" stroke="hsl(var(--secondary))" strokeWidth="14" />
      <circle cx="150" cy="126" r="56" fill="hsl(var(--secondary)/.35)" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="150" cy="126" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="14" />
      <circle cx="150" cy="126" r="12" fill="hsl(var(--accent))" />
      <line x1="150" y1="20" x2="150" y2="52" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
      <line x1="150" y1="200" x2="150" y2="232" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
      <line x1="46" y1="126" x2="78" y2="126" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
      <line x1="222" y1="126" x2="254" y2="126" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 62 l12 8 -4 13 -13 -1z" fill="hsl(var(--accent))" />
      <path d="M240 196 l12 8 -4 13 -13 -1z" fill="hsl(var(--accent))" />
    </ArtCard>
  );
}

function HeroSweep() {
  return (
    <ArtCard>
      <rect x="60" y="40" width="150" height="150" rx="16" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="2" />
      <line x1="80" y1="74" x2="160" y2="74" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <line x1="80" y1="96" x2="180" y2="96" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <line x1="80" y1="118" x2="150" y2="118" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <rect x="80" y="140" width="110" height="22" rx="8" fill="hsl(var(--primary)/.9)" />
      <line x1="60" y1="180" x2="210" y2="180" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round" />
      <circle cx="230" cy="60" r="18" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth="3" />
      <circle cx="230" cy="60" r="6" fill="hsl(var(--accent))" />
      <circle cx="226" cy="186" r="14" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" />
      <path d="M222 186 l4 4 8 -9" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </ArtCard>
  );
}

function HeroLaptop() {
  return (
    <ArtCard>
      <rect x="62" y="52" width="176" height="112" rx="14" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      <rect x="74" y="64" width="152" height="42" rx="6" fill="hsl(var(--primary)/.9)" />
      <line x1="80" y1="118" x2="150" y2="118" stroke="hsl(var(--secondary))" strokeWidth="7" strokeLinecap="round" />
      <line x1="80" y1="134" x2="170" y2="134" stroke="hsl(var(--secondary))" strokeWidth="7" strokeLinecap="round" />
      <path d="M42 164 h216 l22 46 h-260z" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="218" cy="92" r="18" fill="hsl(var(--accent))" />
      <path d="M209 92 l6 6 12 -13" stroke="hsl(var(--background))" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="216" cy="196" r="6" fill="hsl(var(--primary))" />
      <circle cx="236" cy="184" r="5" fill="hsl(var(--accent))" />
    </ArtCard>
  );
}

function HeroPin() {
  return (
    <ArtCard>
      <rect x="34" y="172" width="52" height="40" fill="hsl(var(--secondary)/.6)" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="44" y="84" width="44" height="88" fill="hsl(var(--secondary)/.75)" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="50" y="120" width="32" height="52" fill="hsl(var(--secondary)/.95)" />
      <rect x="108" y="120" width="56" height="92" fill="hsl(var(--secondary)/.6)" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="116" y="140" width="40" height="72" fill="hsl(var(--secondary)/.9)" />
      <rect x="180" y="60" width="64" height="152" fill="hsl(var(--secondary)/.7)" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="188" y="78" width="48" height="60" fill="hsl(var(--primary)/.9)" />
      <circle cx="216" cy="244" r="5" fill="hsl(var(--accent))" />
      <path d="M126 58 h48 v70 a24 24 0 1 1 -48 0z" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="150" cy="126" r="9" fill="hsl(var(--background))" />
      <path d="M208 70 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2z" fill="hsl(var(--accent))" />
      <path d="M86 40 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="hsl(var(--accent))" opacity=".85" />
    </ArtCard>
  );
}

/* ================================================================== */
/*  Shared CTA / FAQ / related rows                                    */
/* ================================================================== */
function CtaPrimary({ cta, align = 'center' }: { cta: Cta; align?: 'center' | 'left' }) {
  return (
    <div className={`mt-6 rounded-[1.75rem] bg-[hsl(var(--primary))] p-7 text-center text-[hsl(var(--primary-foreground))] sm:p-10 ${align === 'left' ? 'lg:text-left' : ''}`}>
      <div className={`mx-auto max-w-2xl ${align === 'left' ? 'lg:mx-0' : ''}`}>
        <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">{cta.label}</div>
        <h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em] sm:text-3xl">{cta.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[hsl(var(--primary-foreground)/.82)]">{cta.text}</p>
        <Link href="/" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--primary-foreground)/.35)] bg-[hsl(var(--primary-foreground))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary))]">Check my resume free <ArrowRight className="size-4" /></Link>
      </div>
    </div>
  );
}

function CtaDark({ cta }: { cta: Cta }) {
  return (
    <div className="rounded-[1.75rem] border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--card))] p-7 sm:p-10">
      <div className="max-w-3xl">
        <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">{cta.label}</div>
        <h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em] sm:text-3xl">{cta.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{cta.text}</p>
        <Link href="/" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Open the free ATS checker <ArrowRight className="size-4" /></Link>
      </div>
    </div>
  );
}

function RelatedRow({ items }: { items: Related }) {
  if (!items.length) return null;
  return (
    <div className="mt-11 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-6 sm:p-8">
      <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">continue exploring</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">{item.label}</Link>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared SEO blocks — keywords chips + deep-dive copy + FAQs          */
/*  Available on every template via optional fields on the data.        */
/* ================================================================== */
export type SeoExtra = { heading: string; paragraphs: string[] };
export type SeoBlocks = {
  keywords?: string[];
  keywordsNote?: string;
  faqs?: Qa[];
  extra?: SeoExtra[];
};

function KwChips({ words }: { words: string[] }) {
  if (!words.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word) => (
        <span key={word} className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/.5)] px-4 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">{word}</span>
      ))}
    </div>
  );
}

export function ExtraSections({ data, from = 2, showFaqs = true }: { data: SeoBlocks; from?: number; showFaqs?: boolean }) {
  const { keywords, keywordsNote, faqs, extra } = data;
  const blocks: React.ReactNode[] = [];
  let i = from;
  if (keywords && keywords.length) {
    i += 1;
    blocks.push(
      <Section key="kw" index={String(i).padStart(2, '0')} title="words worth matching">
        {keywordsNote ? <p className="mb-5 max-w-3xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{keywordsNote}</p> : null}
        <KwChips words={keywords} />
      </Section>
    );
  }
  if (extra && extra.length) {
    i += 1;
    blocks.push(
      <Section key="extra" index={String(i).padStart(2, '0')} title="a little deeper" tone={1}>
        <div className="space-y-9">
          {extra.map((block) => (
            <div key={block.heading}>
              <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">{block.heading}</h3>
              {block.paragraphs.map((p) => (
                <p key={p.slice(0, 28)} className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{p}</p>
              ))}
            </div>
          ))}
        </div>
      </Section>
    );
  }
  if (faqs && faqs.length && showFaqs) {
    i += 1;
    blocks.push(
      <Section key="faq" index={String(i).padStart(2, '0')} title="questions usually asked" tone={2}>
        <FaqBlock faqs={faqs} tone="secondary" />
      </Section>
    );
  }
  return <>{blocks}</>;
}

function FaqBlock({ faqs, tone }: { faqs: Qa[]; tone: 'card' | 'secondary' }) {
  return (
    <div className={`rounded-[1.75rem] border border-[hsl(var(--border))] p-7 sm:p-10 ${tone === 'card' ? 'bg-[hsl(var(--card))]' : 'bg-[hsl(var(--secondary)/.45)]'}`}>
      <div className="max-w-3xl">
        <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">quick answers</div>
        <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Questions usually asked from this page</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          {faqs.map((item) => (
            <p key={item.q}><strong className="text-[hsl(var(--foreground))]">{item.q}</strong> {item.a}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Template A — freshers / sonipat / bahadurgarh                      */
/*  hero + three-card grid + finishing CTA                             */
/* ================================================================== */
export type DataA = SeoBlocks & { meta: PageMeta; badge: string; title: string; sub: string; cards: Card[]; cta: Cta; related?: Related };
export function LandingTemplateA({ data }: { data: DataA }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroDoc />} />
      <Section index="01" title="what actually scores">
        <div className="grid gap-5 md:grid-cols-3">
          {data.cards.map((card, i) => (
            <div key={card.title} className="flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-6">
              <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><card.icon className="size-5" /></span><span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{`0${i + 1}`}</span></div>
              <div className="mt-5 font-['Space_Grotesk'] text-lg font-bold">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{card.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="finish the loop" tone={1}>
        <CtaPrimary cta={data.cta} align="left" />
      </Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template B — it-jobs / panchkula / palwal-sohna                    */
/*  hero + stat chip + numbered tip grid + CTA                         */
/* ================================================================== */
export type DataB = SeoBlocks & { meta: PageMeta; badge: string; title: string; sub: string; statValue: string; statLabel: string; statNote: string; tips: Tip[]; cta: Cta; related?: Related };
export function LandingTemplateB({ data }: { data: DataB }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroLaptop />} />
      <Section index="01" title={`${data.statLabel} — read this first`}>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--secondary)/.35)] p-5">
          <span className="font-['Space_Grotesk'] text-4xl font-bold text-[hsl(var(--primary))]">{data.statValue}</span>
          <span className="text-sm font-bold text-[hsl(var(--foreground))]">{data.statLabel}</span>
          <span className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{data.statNote}</span>
        </div>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.tips.map((tip, i) => (
            <li key={tip.title} className="flex gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.15)] font-mono text-xs font-bold text-[hsl(var(--primary))]">{`0${i + 1}`}</span>
              <div>
                <div className="text-sm font-bold text-[hsl(var(--foreground))]">{tip.title}</div>
                <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{tip.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section index="02" title="your next step" tone={1}><CtaDark cta={data.cta} /></Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template C — government-jobs / (hisar moved to K)                  */
/*  hero + challenge/fix pairs + FAQ                                   */
/* ================================================================== */
export type DataC = SeoBlocks & { meta: PageMeta; badge: string; title: string; sub: string; pairs: Pair[]; faqs: Qa[]; cta: Cta; faqFirst?: boolean; related?: Related };
export function LandingTemplateC({ data }: { data: DataC }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroShield />} ctaLabel="Check a resume before applying" />
      <Section index="01" title="challenges & the fix that works">
        <div className="space-y-4">
          {data.pairs.map((pair, i) => (
            <div key={pair.title} className="grid gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
              <span className="hidden font-mono text-xs text-[hsl(var(--muted-foreground))] md:block">{`0${i + 1}`}</span>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--foreground))]"><CheckCircle2 className="size-4 text-[hsl(var(--primary))]" /> {pair.title}</div>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{pair.challenge}</p>
              </div>
              <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))] md:max-w-sm"><strong className="text-[hsl(var(--primary))]">Fix — </strong>{pair.solve}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="questions usually asked" tone={1}>
        {data.faqs.length > 0 ? <FaqBlock faqs={data.faqs} tone="secondary" /> : null}
      </Section>
<div className="mt-11"><CtaDark cta={data.cta} /></div>
      <ExtraSections data={data} from={2} showFaqs={false} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template D — digital-marketing / (faridabad & rohtak moved)        */
/*  hero + quote strip + 2x2 cards + CTA                               */
/* ================================================================== */
export type DataD = SeoBlocks & { meta: PageMeta; badge: string; title: string; sub: string; quote: { text: string; attribution: string }; cards: Card[]; cta: Cta; related?: Related };
export function LandingTemplateD({ data }: { data: DataD }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroTarget />} accent="accent" />
      <Section index="01" title="the honest premise">
        <p className="max-w-3xl font-['Space_Grotesk'] text-xl font-bold leading-snug tracking-[-.04em] sm:text-2xl">"{data.quote.text}"</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">— {data.quote.attribution}</p>
      </Section>
      <Section index="02" title="what to tailor" tone={1}>
        <div className="grid gap-5 sm:grid-cols-2">
          {data.cards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-6">
              <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]"><card.icon className="size-5" /></span><div className="font-['Space_Grotesk'] text-lg font-bold">{card.title}</div></div>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{card.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-11"><CtaPrimary cta={data.cta} /></div>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template E — remote-jobs / (ambala & karnal moved)                 */
/*  hero + alternating icon rows + CTA                                 */
/* ================================================================== */
export type DataE = SeoBlocks & { meta: PageMeta; badge: string; title: string; sub: string; rows: Row[]; cta: Cta; related?: Related };
export function LandingTemplateE({ data }: { data: DataE }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroSweep />} ctaLabel="Run an ATS scan on your file" />
      <Section index="01" title="the sections in order">
        <div className="space-y-5">
          {data.rows.map((row, i) => (
            <div key={row.title} className={`grid items-center gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-6 md:grid-cols-[auto_1fr] ${i % 2 === 1 ? 'md:[direction:rtl]' : ''}`}>
              <div className={`grid size-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] md:[direction:ltr]`}><row.icon className="size-6" /></div>
              <div className="md:[direction:ltr]">
                <div className="font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">{row.title}</div>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{row.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="your next step" tone={1}><CtaDark cta={data.cta} /></Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template F — gurugram (city · accent hero + stats + pairs)         */
/* ================================================================== */
export function LandingTemplateF({ data }: { data: DataC }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} accent="accent" ctaLabel="Check your resume before you send" />
      <Section index="01" title="recurring fix patterns">
        <div className="grid gap-5 sm:grid-cols-2">
          {data.pairs.map((pair, i) => (
            <div key={pair.title} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-6">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--foreground))]"><CheckCircle2 className="size-4 text-[hsl(var(--accent))]" /> {pair.title}</div><span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{`0${i + 1}`}</span></div>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Problem — </strong>{pair.challenge}</p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--accent))]">Fix — </strong>{pair.solve}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="questions usually asked" tone={1}>
        {data.faqs.length > 0 ? <FaqBlock faqs={data.faqs} tone="card" /> : null}
      </Section>
      <div className="mt-11"><CtaPrimary cta={data.cta} /></div>
      <ExtraSections data={data} from={2} showFaqs={false} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template G — faridabad (city · checklist hero card + rows)         */
/* ================================================================== */
export function LandingTemplateG({ data }: { data: DataD }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} ctaLabel="Scan your existing resume" />
      <Section index="01" title="what this guide covers">
        <ul className="space-y-3">
          {data.cards.map((card, i) => (
            <li key={card.title} className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" /><span><strong className="text-[hsl(var(--foreground))]">{`0${i + 1}. `}</strong>{card.title} — {card.text}</span></li>
          ))}
        </ul>
      </Section>
      <Section index="02" title="the honest premise" tone={1}>
        <p className="max-w-3xl font-['Space_Grotesk'] text-xl font-bold leading-snug tracking-[-.04em] sm:text-2xl">"{data.quote.text}"</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">— {data.quote.attribution}</p>
      </Section>
      <Section index="03" title="past the checklist" tone={0}>
        <div className="grid gap-4 md:grid-cols-2">
          {data.cards.map((card) => (
            <div key={card.title} className="flex gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]"><card.icon className="size-5" /></span>
              <div><div className="text-sm font-bold">{card.title}</div><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{card.text}</p></div>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-11"><CtaDark cta={data.cta} /></div>
      <ExtraSections data={data} from={3} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template H — panchkula (city · stat panel + tip grid)              */
/* ================================================================== */
export function LandingTemplateH({ data }: { data: DataB }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} ctaLabel="Run a free ATS check" />
      <Section index="01" title="the tricity checklist">
        <div className="flex flex-col gap-5 rounded-2xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--secondary)/.4)] p-6 lg:flex-row lg:items-center">
          <span className="inline-flex shrink-0 items-baseline gap-1"><span className="font-['Space_Grotesk'] text-5xl font-bold tracking-[-.06em] text-[hsl(var(--primary))]">{data.statValue}</span><span className="font-mono text-xs uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">{data.statLabel}</span></span>
          <p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{data.statNote}</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {data.tips.map((tip, i) => (
            <div key={tip.title} className="flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.14)] font-mono text-sm font-bold text-[hsl(var(--primary))]">{`0${i + 1}`}</span>
                <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">tip</span>
              </div>
              <div className="mt-4 text-base font-bold text-[hsl(var(--foreground))]">{tip.title}</div>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{tip.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="your next step" tone={1}><CtaDark cta={data.cta} /></Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template I — ambala (city · timeline)                              */
/* ================================================================== */
export function LandingTemplateI({ data }: { data: DataE }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} ctaLabel="Open the free checker" />
      <Section index="01" title="take each step in order">
        <div className="relative">
          <div className="absolute bottom-3 left-[1.35rem] top-3 w-px bg-[hsl(var(--primary)/.3)]" />
          <ol className="space-y-7">
            {data.rows.map((row, i) => (
              <li key={row.title} className="relative pl-14">
                <div className="absolute left-0 top-0 grid size-11 place-items-center rounded-full border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--card))] text-[hsl(var(--primary))]"><row.icon className="size-5" /></div>
                <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">{`step ${i + 1}`}</div>
                <div className="mt-1 font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">{row.title}</div>
                <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{row.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>
      <div className="mt-11"><CtaDark cta={data.cta} /></div>
      <ExtraSections data={data} from={1} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template J — sonipat (city · index rail + card grid)               */
/* ================================================================== */
export function LandingTemplateJ({ data }: { data: DataA }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} accent="accent" ctaLabel="Check a resume free" />
      <Section index="01" title="the three blocks recruiters weigh">
        <div className="grid gap-5 md:grid-cols-3">
          {data.cards.map((card, i) => (
            <div key={card.title} className="rounded-2xl border border-[hsl(var(--border))] border-t-4 border-t-[hsl(var(--primary))] bg-[hsl(var(--card))] p-6">
              <div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]"><card.icon className="size-5" /></span><span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{`0${i + 1}`}</span></div>
              <div className="mt-5 font-['Space_Grotesk'] text-lg font-bold">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{card.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-11 grid gap-4 lg:grid-cols-3">
        {data.cards.map((card, i) => (
          <div key={card.title} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] px-5 py-4 text-sm font-bold text-[hsl(var(--muted-foreground))]"><span className="font-mono text-xs text-[hsl(var(--accent))]">{`0${i + 1}`}</span> {card.title}</div>
        ))}
      </div>
      <Section index="02" title="your next step" tone={1}><CtaDark cta={data.cta} /></Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template K — hisar (city · CTA up top + alternating pair bands)    */
/* ================================================================== */
export function LandingTemplateK({ data }: { data: DataC }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} ctaLabel="Run a free ATS check" />
      <div className="mt-11"><CtaPrimary cta={data.cta} /></div>
      <Section index="01" title="the recurring patterns">
        <div className="space-y-4">
          {data.pairs.map((pair, i) => (
            <div key={pair.title} className="grid gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
              <span className="hidden font-mono text-xs text-[hsl(var(--muted-foreground))] md:block">{`0${i + 1}`}</span>
              <div>
                <div className="text-sm font-bold text-[hsl(var(--foreground))]">{pair.title}</div>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{pair.challenge}</p>
              </div>
              <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))] md:max-w-sm"><strong className="text-[hsl(var(--primary))]">Fix — </strong>{pair.solve}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="questions usually asked" tone={1}>
        {data.faqs.length > 0 ? <FaqBlock faqs={data.faqs} tone="secondary" /> : null}
      </Section>
      <ExtraSections data={data} from={2} showFaqs={false} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template L — karnal (city · two-col icon card grid)                */
/* ================================================================== */
export function LandingTemplateL({ data }: { data: DataE }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} accent="accent" ctaLabel="Check your resume free" />
      <Section index="01" title="what to pay attention to">
        <div className="grid gap-5 md:grid-cols-2">
          {data.rows.map((row) => (
            <div key={row.title} className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-6 transition-colors hover:border-[hsl(var(--primary)/.4)]">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><row.icon className="size-5" /></span>
                <div>
                  <div className="font-['Space_Grotesk'] text-lg font-bold">{row.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{row.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="your next step" tone={1}><CtaDark cta={data.cta} /></Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template M — rohtak (city · oversized quote + numbered rows)       */
/* ================================================================== */
export function LandingTemplateM({ data }: { data: DataD }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} ctaLabel="Open the free ATS checker" />
      <Section index="01" title="the honest premise">
        <p className="max-w-3xl font-['Space_Grotesk'] text-2xl font-bold leading-snug tracking-[-.04em] sm:text-3xl">"{data.quote.text}"</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">— {data.quote.attribution}</p>
      </Section>
      <Section index="02" title="the checklist in order" tone={1}>
        <div className="space-y-4">
          {data.cards.map((card, i) => (
            <div key={card.title} className="flex items-start gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-5">
              <span className="font-['Space_Grotesk'] text-3xl font-bold text-[hsl(var(--primary)/.35)]">{`0${i + 1}`}</span>
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]"><card.icon className="size-5" /></div>
              <div>
                <div className="text-base font-bold">{card.title}</div>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-11"><CtaPrimary cta={data.cta} /></div>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template N — bahadurgarh (city · chips + full-width rows)          */
/* ================================================================== */
export function LandingTemplateN({ data }: { data: DataA }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} ctaLabel="Check my resume free" />
      <Section index="01" title="the blocks that count">
        <div className="flex flex-wrap gap-2">
          {data.cards.map((card, i) => (
            <span key={card.title} className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] px-4 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))]"><span className="text-[hsl(var(--primary))]">{`0${i + 1}`}</span> {card.title}</span>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {data.cards.map((card, i) => (
            <div key={card.title} className="grid items-center gap-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-6 md:grid-cols-[auto_1fr]">
              <span className="grid size-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><card.icon className="size-6" /></span>
              <div>
                <div className="flex items-center gap-3"><span className="font-mono text-xs text-[hsl(var(--primary))]">{`0${i + 1}`}</span><div className="font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">{card.title}</div></div>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="your next step" tone={1}><CtaDark cta={data.cta} /></Section>
      <ExtraSections data={data} from={2} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}

/* ================================================================== */
/*  Template O — palwal-sohna (city · stat pill + bordered tip rows)   */
/* ================================================================== */
export function LandingTemplateO({ data }: { data: DataB }) {
  usePageMeta(data.meta);
  return (
    <main className={`${mainPad} pt-12 sm:pt-16`}>
      <HeroBand badge={data.badge} title={data.title} sub={data.sub} graphic={<HeroPin />} accent="accent" ctaLabel="Run a free ATS check" />
      <Section index="01" title={`a useful number: ${data.statLabel}`}>
        <div className="inline-flex items-center gap-3 rounded-full border border-[hsl(var(--accent)/.4)] bg-[hsl(var(--secondary)/.4)] px-5 py-2.5">
          <span className="font-['Space_Grotesk'] text-2xl font-bold text-[hsl(var(--primary))]">{data.statValue}</span>
          <span className="text-xs font-bold text-[hsl(var(--foreground))]">{data.statLabel}</span>
          <span className="hidden text-[11px] leading-4 text-[hsl(var(--muted-foreground))] sm:block">{data.statNote}</span>
        </div>
        <div className="mt-6 space-y-3">
          {data.tips.map((tip, i) => (
            <div key={tip.title} className="flex items-start gap-5 rounded-2xl border border-[hsl(var(--border))] border-l-4 border-l-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.25)] p-6">
              <span className="font-mono text-xl font-bold text-[hsl(var(--primary))]">{`0${i + 1}`}</span>
              <div>
                <div className="text-base font-bold text-[hsl(var(--foreground))]">{tip.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{tip.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="mt-11"><CtaPrimary cta={data.cta} /></div>
      <ExtraSections data={data} from={1} />
      <RelatedRow items={data.related ?? []} />
    </main>
  );
}