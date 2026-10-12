import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { Header, SiteFooter } from '@/components/site-chrome';
import { Seo } from '@/lib/seo';
import { CoverImage } from '@/components/blog/CoverImage';
import { supabase, type BlogPost, coverImageAlt, formatPostDate, postExcerpt } from '@/lib/supabase';

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setPosts(null);
    const { data, error: err } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      return;
    }
    setPosts(data as BlogPost[]);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-[100dvh]">
      <Seo title="Blog — ScoreMyResume" description="Short, practical guides on ATS-friendly resumes: what hiring software reads, what to fix first, and honest advice for job seekers." canonicalPath="/blog" />
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
        <div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">page 3 · goodspace journal</div><h1 className="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.08em] sm:text-7xl">Better applications start with better clarity.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">Short, useful ideas for writing resumes, understanding job descriptions, and moving through your search with less noise. Updated regularly with practical guides you can actually use before your next application.</p></div>

        {error && (
          <div className="mt-12 flex flex-col items-start gap-4 rounded-[1.5rem] border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.08)] p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 size-5 shrink-0 text-[hsl(var(--primary))]" /><div><div className="font-bold text-[hsl(var(--foreground))]">Couldn't load the journal.</div><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{error}</p></div></div>
            <button type="button" onClick={load} className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold">Try again</button>
          </div>
        )}

        {!error && posts === null && (
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <div key={n} className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <div className="h-3 w-24 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
                <div className="mt-8 h-5 w-4/5 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
                <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
                <div className="mt-7 h-4 w-2/5 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
              </div>
            ))}
          </div>
        )}

        {!error && posts !== null && posts.length === 0 && (
          <div className="mt-12 rounded-[1.5rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText className="size-6" /></div>
            <h2 className="mt-5 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">No posts yet.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">The journal is being written. Check back soon for practical guides on resumes, keywords, and ATS-friendly formatting.</p>
          </div>
        )}

        {!error && posts !== null && posts.length > 0 && (
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {posts.map((post) => (
              <article className="flex flex-col rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_14px_45px_hsl(var(--primary)/.05)]" key={post.id}>
                {post.show_cover && post.cover_image_url ? <CoverImage src={post.cover_image_url} alt={coverImageAlt(post)} className="mb-5 aspect-[16/9] w-full rounded-xl object-cover" imgProps={{ loading: 'lazy', decoding: 'async' }} /> : <div className="mb-5 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">goodspace journal</span><FileText className="size-5 text-[hsl(var(--accent-foreground))]" /></div>}
                {post.category && <span className="mb-3 w-fit rounded-full bg-[hsl(var(--primary)/.12)] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">{post.category}</span>}
                <h2 className="font-['Space_Grotesk'] text-2xl font-bold leading-tight tracking-[-.05em]">{post.title}</h2>
                <p className="mt-4 flex-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{postExcerpt(post)}</p>
                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">{post.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded bg-[hsl(var(--secondary)/.7)] px-2 py-0.5 font-mono text-[9px] text-[hsl(var(--muted-foreground))]">#{tag}</span>)}</div>
                )}
                <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><span>{formatPostDate(post.created_at)}</span>{post.author ? <><span aria-hidden="true">·</span><span>{post.author}</span></> : null}</div>
                <Link href={`/blog/${post.slug}`} className="focus-ring mt-7 inline-flex items-center gap-2 self-start text-xs font-bold text-[hsl(var(--primary))]">Read article <ArrowRight className="size-4" /></Link>
              </article>
            ))}
          </div>
        )}

        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">resume help shortcuts</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">From the journal into the guides</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The ideas here are organised into one-page guides by audience and by market. Jump straight to the one that matches the application you are working on.</p></div><div className="mt-6 flex flex-wrap gap-2"><Link href="/resume-help/freshers" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Guide for freshers</Link><Link href="/resume-help/it-jobs" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">IT &amp; tech jobs</Link><Link href="/resume-help/government-jobs" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Government jobs</Link><Link href="/resume-help/digital-marketing" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Digital marketing roles</Link><Link href="/resume-help/remote-jobs" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Remote &amp; work-from-home</Link><Link href="/resume-help/city/gurugram" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Gurugram</Link><Link href="/resume-help/city/panchkula" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Panchkula</Link><Link href="/resume-help/city/faridabad" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Faridabad</Link><Link href="/resume-help/city/ambala" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.6)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/.6)] hover:text-[hsl(var(--primary))]">Ambala</Link></div></section>

        <section className="mt-12 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">about the journal</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Why we write these guides.</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>Most advice about ATS systems is either too technical or too convinced that software is the enemy. We believe the truth is simpler: systems read text, structure, and evidence, and so do the people who receive your application. Our guides explain those mechanics in plain language and pair every idea with something you can do today.</p><p>Each article is written by the same small team that builds the checker, so the suggestions you read here match the checks you see on the results page. If a tip seems outdated or a guide misses the problem you are facing, tell us on the contact page. The journal is a living document, updated as job boards, tools, and application practices change.</p></div></section>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck className="size-4 text-[hsl(var(--primary))]" /> Reading is free, and the tools we write about respect your privacy.</div>
      </main>
      <SiteFooter />
    </div>
  );
}