import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Logo } from '@/components/site-chrome';
import { Seo } from '@/lib/seo';
import { supabase } from '@/lib/supabase';

export function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        navigate('/admin/blog', { replace: true });
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate('/admin/blog', { replace: true });
  };

  if (checkingSession) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[hsl(var(--background))]">
        <Seo title="Admin sign in — ScoreMyResume" noindex />
        <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]"><LoaderCircle className="size-5 animate-spin text-[hsl(var(--primary))]" /> Checking session…</div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--primary)/.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.2)]';

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <Seo title="Admin sign in — ScoreMyResume" noindex />
      <header className="border-b border-[hsl(var(--border)/.8)]">
        <div className="mx-auto flex min-h-[73px] max-w-7xl items-center justify-between px-5 py-3 sm:px-8 lg:px-12">
          <Link href="/" className="focus-ring rounded-xl"><Logo /></Link>
          <span className="rounded-full bg-[hsl(var(--accent)/.3)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--accent-foreground))]">admin</span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 pt-16 sm:px-8">
        <div className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[0_18px_50px_hsl(var(--primary)/.07)] sm:p-9">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><LockKeyhole className="size-6" /></div>
          <div className="mt-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">admin access</div>
            <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.05em]">Sign in to the dashboard</h1>
          </div>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">email</span>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className={`mt-2 ${inputClass}`} autoComplete="email" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">password</span>
              <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className={`mt-2 ${inputClass}`} autoComplete="current-password" />
            </label>
            {error && <div className="flex items-start gap-2.5 rounded-xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.08)] px-4 py-3 text-sm leading-6 text-[hsl(var(--foreground))]"><AlertCircle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" />{error}</div>}
            <button type="submit" disabled={loading} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />} {loading ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">Only the site administrator can sign in here. This page isn't linked from the public navigation.</p>
        </div>
      </main>
    </div>
  );
}