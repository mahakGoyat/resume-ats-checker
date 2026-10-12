import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, FileText, Layers, ScrollText, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase, type BlogPost } from '@/lib/supabase';
import { useSavedNotice } from '@/lib/admin-store';
import { SuccessBanner } from '@/components/admin/SuccessBanner';
import { notifySaved } from '@/lib/admin-store';

export function AdminDashboardPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { show, dismiss } = useSavedNotice();

  const load = async () => {
    setError(null);
    setPosts(null);
    const { data, error: err } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setPosts(data as BlogPost[]);
  };

  useEffect(() => {
    load();
  }, []);

  const total = posts?.length ?? 0;
  const drafts = posts?.filter((post) => !post.published).length ?? 0;
  const published = posts?.filter((post) => post.published).length ?? 0;

  const cardBase =
    'group relative overflow-hidden rounded-2xl border border-[hsl(var(--border)/.9)] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)] transition-transform duration-300 hover:-translate-y-1';

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Overview of your public journal"
      actions={
        <Link href="/admin/blog/new" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_hsl(var(--primary)/.3)] transition-transform hover:-translate-y-0.5">
          <FileText className="size-4" /> Add New Blog
        </Link>
      }
      onSave={() => {
        notifySaved();
        load();
      }}
    >
      <div className="space-y-0">
        <SuccessBanner show={show} onDismiss={dismiss} />

        {error && (
          <div className="mt-6 flex flex-col items-start gap-4 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm leading-6 text-[hsl(var(--destructive))] sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div className="flex items-start gap-2.5"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>
            <button type="button" onClick={load} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--foreground))]">Retry</button>
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className={cardBase}>
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]"><Layers className="size-5" /></div>
              <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">all</span>
            </div>
            <div className="mt-5 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em]">{posts === null ? '…' : total}</div>
            <div className="mt-1 text-sm font-bold text-[hsl(var(--foreground))]">Total Blogs</div>
            <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">{posts === null ? 'Loading…' : `${published} published / ${drafts} drafts`}</p>
            <Link href="/admin/blog" className="focus-ring mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))]">Open blog list <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>

          <div className={cardBase}>
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--accent)/.25)] text-[hsl(var(--accent-foreground))]"><FileText className="size-5" /></div>
              <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">unpublished</span>
            </div>
            <div className="mt-5 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em]">{posts === null ? '…' : drafts}</div>
            <div className="mt-1 text-sm font-bold text-[hsl(var(--foreground))]">Draft Blogs</div>
            <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Unpublished posts waiting to go live</p>
            <Link href="/admin/blog#drafts" className="focus-ring mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))]">Open drafts <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>

          <div className={cardBase}>
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]"><ScrollText className="size-5" /></div>
              <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">live</span>
            </div>
            <div className="mt-5 font-['Space_Grotesk'] text-4xl font-bold tracking-[-.06em]">{posts === null ? '…' : published}</div>
            <div className="mt-1 text-sm font-bold text-[hsl(var(--foreground))]">Published Blogs</div>
            <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Live posts currently visible on the site</p>
            <Link href="/admin/blog#published" className="focus-ring mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))]">Open published <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>

          <div className={`${cardBase} border-[hsl(var(--primary)/.28)] bg-[linear-gradient(150deg,hsl(var(--card)),hsl(var(--secondary)/.5))]`}>
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[#ff6a3d] text-white shadow-[0_6px_16px_hsl(var(--primary)/.3)]"><Sparkles className="size-5" /></div>
              <span className="rounded-full bg-[hsl(var(--primary)/.12)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--primary))]">quick access</span>
            </div>
            <div className="mt-5 font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">Open blog section</div>
            <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Manage, edit and publish your posts</p>
            <Link href="/admin/blog" className="focus-ring mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))]">Blog <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}