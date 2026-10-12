import { useEffect, useState } from 'react';
import { ExternalLink, FileText, LayoutDashboard, LoaderCircle, LogOut, Settings as SettingsIcon, Save } from 'lucide-react';
import { Link, useLocation, useRouter } from 'wouter';
import { Logo } from '@/components/site-chrome';
import { Seo } from '@/lib/seo';
import { supabase } from '@/lib/supabase';
import { notifySaved } from '@/lib/admin-store';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, match: (path: string) => path === '/admin' },
  { label: 'Blog', href: '/admin/blog', icon: FileText, match: (path: string) => path.startsWith('/admin/blog') },
  { label: 'Settings', href: '/admin/settings', icon: SettingsIcon, match: (path: string) => path.startsWith('/admin/settings') },
];

export function AdminLayout({ title, subtitle, actions, saveLabel = 'Save changes', onSave, children }: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  saveLabel?: string;
  onSave?: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [location, navigate] = useLocation();
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string | null } } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate('/admin/login', { replace: true });
        return;
      }
      setSession({ user: { email: data.session.user.email ?? null } });
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession) {
        navigate('/admin/login', { replace: true });
      } else {
        setSession({ user: { email: currentSession.user.email ?? null } });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.();
      notifySaved();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))]" style={{ paddingLeft: 0 }}>
        <Seo title={`Admin · ${title} — ScoreMyResume`} noindex />
        <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
          <LoaderCircle className="size-5 animate-spin text-[hsl(var(--primary))]" /> Checking session…
        </div>
      </div>
    );
  }

  const base = (router.base ?? '').replace(/\/$/, '');

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <Seo title={`Admin · ${title} — ScoreMyResume`} noindex />
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-[hsl(var(--border)/.8)] bg-[#0a0713] lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Link href="/" className="focus-ring rounded-xl"><Logo /></Link>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">content management system</p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => {
            const active = item.match(location);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`focus-ring relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${active ? 'bg-[hsl(var(--primary)/.92)] text-[hsl(var(--primary-foreground))] shadow-[0_6px_18px_hsl(var(--primary)/.3)]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)] hover:text-[hsl(var(--foreground))]'}`}>
                <Icon className="size-4.5" />
                <span className="flex-1">{item.label}</span>
                {active && <span className="size-1.5 rounded-full bg-[hsl(var(--primary-foreground))]" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-[hsl(var(--border)/.8)] px-3 py-4">
          <a href={`${base}/blog`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary)/.8)] hover:text-[hsl(var(--foreground))]"><ExternalLink className="size-3.5" /> View site</a>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2 text-left text-xs font-bold text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.1)]"><LogOut className="size-3.5" /> Log out</button>
          <div className="mt-2 flex items-center gap-2 px-3.5 pt-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--primary))] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[hsl(var(--primary))]" />
            </span>
            <div className="leading-tight">
              <div className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Signed in</div>
              <div className="text-xs font-bold text-[hsl(var(--foreground))]">Admin</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[hsl(var(--border)/.8)] bg-[hsl(var(--background)/.9)] backdrop-blur-md">
          <div className="flex min-h-[73px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="lg:hidden"><Logo /></div>
              <div>
                <h1 className="font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em] sm:text-2xl">{title}</h1>
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              <button type="button" onClick={handleSave} disabled={saving} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[#ff6a3d] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_hsl(var(--primary)/.35)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} {saving ? 'Saving…' : saveLabel}
              </button>
            </div>
          </div>
        </header>

        <aside className="sticky top-[73px] z-20 flex items-center gap-2 overflow-x-auto border-b border-[hsl(var(--border)/.8)] bg-[#0a0713] px-5 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = item.match(location);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`focus-ring flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${active ? 'bg-[hsl(var(--primary)/.92)] text-white' : 'text-[hsl(var(--muted-foreground))]'}`}>
                <Icon className="size-3.5" />{item.label}
              </Link>
            );
          })}
          <button type="button" onClick={handleLogout} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[hsl(var(--destructive))]"><LogOut className="size-3.5" /> Sign out</button>
        </aside>

        <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}