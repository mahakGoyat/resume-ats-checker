import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-resume-radar">
      <img src="/scoremyresume-logo.jpg" alt="ScoreMyResume logo" width="36" height="36" fetchPriority="high" decoding="async" className="size-9 shrink-0 rounded-full object-cover ring-1 ring-[hsl(var(--primary)/.35)]" />
      <div>
        <div className="font-['Space_Grotesk'] text-[15px] font-bold tracking-[-.04em]">ScoreMyResume</div>
        <div className="font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">ATS resume checker</div>
      </div>
    </div>
  );
}

export function Header({ onReset }: { onReset: () => void }) {
  return (
    <header className="relative z-10 border-b border-[hsl(var(--border)/.8)] bg-[hsl(var(--background)/.88)] backdrop-blur-md">
      <div className="mx-auto flex min-h-[73px] max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12">
        <button type="button" onClick={onReset} className="focus-ring rounded-xl" data-testid="button-logo-reset"><Logo /></button>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="focus-ring rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]">Resume checker</Link>
          <Link href="/about" className="focus-ring rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]">About</Link>
          <Link href="/contact" className="rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]">Contact us</Link>
          <Link href="/blog" className="hidden rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] sm:inline-flex">Blog</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const footerLinks: { heading: string; items: { label: string; href: string }[] }[] = [
    {
      heading: 'Optimize By Role',
      items: [
        { label: 'For Freshers & Graduates', href: '/ats-resume-checker-freshers' },
        { label: 'For Software Engineers', href: '/software-engineer-resume-scanner' },
        { label: 'For Data Analysts', href: '/data-analyst-resume-review' },
        { label: 'For Digital Marketers', href: '/digital-marketing-resume-optimizer' },
      ],
    },
    {
      heading: 'Compatibility & Formats',
      items: [
        { label: 'Canva Resume Checker', href: '/canva-resume-ats-friendly' },
        { label: 'PDF vs Word Compatibility', href: '/best-file-format-for-ats' },
        { label: 'How to Add Keywords', href: '/how-to-optimize-resume-keywords' },
      ],
    },
    {
      heading: 'Resources & Privacy',
      items: [
        { label: 'Free ATS Resume Templates', href: '/free-ats-resume-templates' },
        { label: 'About & Contact Us', href: '/about-contact' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
      ],
    },
  ];
  const linkClass =
    'relative inline-block text-sm leading-6 text-[#94A3B8] transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-[#ff5b22] after:transition-transform after:duration-200 hover:text-[#ff5b22] hover:after:scale-x-100';
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0F172A] text-[#94A3B8]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Logo />
            <p className="mt-4 text-sm leading-7 text-[#94A3B8]">A free ATS resume checker that reads your document entirely in the browser. No uploads, no accounts, no tracking — just a clear report on how a hiring system would read your resume.</p>
          </div>
          <Link href="/" className="focus-ring group inline-flex w-fit items-center gap-2 rounded-xl bg-[#ff5b22] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90">Run a free scan <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[.22em] text-[#ff5b22]">{col.heading}</h2>
              <ul className="mt-5 space-y-3.5">
                {col.items.map((item) => (
                  <li key={item.href}><Link href={item.href} className={linkClass}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs leading-5 text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>© {new Date().getFullYear()} ATS Resume Checker. All rights reserved.</p>
          <p className="flex items-center gap-2"><span aria-hidden="true">🔒</span> 100% Secure. We do not store or track your uploaded resumes.</p>
        </div>
      </div>
    </footer>
  );
}

export function LandingChrome({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return <><Header onReset={() => setLocation('/')} />{children}<SiteFooter /></>;
}