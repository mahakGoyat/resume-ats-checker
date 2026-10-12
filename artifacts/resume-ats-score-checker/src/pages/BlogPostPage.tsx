import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { Link } from 'wouter';
import { Header, SiteFooter } from '@/components/site-chrome';
import { Seo, articleJsonLd, breadcrumbJsonLd, faqJsonLd, absoluteUrl, type JsonLd } from '@/lib/seo';
import { CoverImage } from '@/components/blog/CoverImage';
import { supabase, type BlogPost, coverImageAlt, formatPostDate, isRichContent } from '@/lib/supabase';

export function BlogPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setPost(null);
      const { data, error: err } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      const found = data as BlogPost;
      setPost(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-[100dvh]">
        <Header onReset={() => undefined} />
        <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <div className="rounded-[1.5rem] border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.08)] p-7 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><AlertCircle className="size-6" /></div>
            <h1 className="mt-5 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">This article can't be opened.</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">{error}</p>
            <Link href="/blog" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold">Back to the journal <ArrowLeft className="size-4" /></Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        {!post ? (
          <div className="space-y-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
            <div className="h-7 w-4/5 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
            <div className="h-5 w-full animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
          </div>
        ) : (
          <article>
            <Seo
              title={post.meta_title || post.title || 'Blog post — ScoreMyResume'}
              description={post.meta_description || undefined}
              canonicalPath={`/blog/${post.slug}`}
              type="article"
              image={post.cover_image_url || undefined}
              jsonLd={[
                breadcrumbJsonLd([
                  { name: 'Blog', path: '/blog' },
                  { name: post.title || 'Article', path: `/blog/${post.slug}` },
                ]),
                articleJsonLd(post, absoluteUrl(`/blog/${post.slug}`)),
                ...(Array.isArray(post.faq) && post.faq.length > 0 ? [faqJsonLd(post.faq)] : []),
              ] as JsonLd[]}
            />
            <Link href="/blog" className="focus-ring inline-flex items-center gap-2 rounded-lg px-1 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"><ArrowLeft className="size-3.5" /> Back to the journal</Link>
            <div className="mt-8 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em]"><span className="text-[hsl(var(--primary))]">goodspace journal</span>{post.category ? <><span aria-hidden="true" className="text-[hsl(var(--muted-foreground)/.6)]">·</span><span className="text-[hsl(var(--primary))]">{post.category}</span></> : null}<span aria-hidden="true" className="text-[hsl(var(--muted-foreground)/.6)]">·</span><span className="text-[hsl(var(--muted-foreground))]">{formatPostDate(post.created_at)}</span>{post.author ? <><span aria-hidden="true" className="text-[hsl(var(--muted-foreground)/.6)]">·</span><span className="text-[hsl(var(--muted-foreground))]">{post.author}</span></> : null}</div>
            <h1 className="mt-3 font-['Space_Grotesk'] text-4xl font-bold leading-[1.05] tracking-[-.06em] sm:text-5xl">{post.title}</h1>
            {post.show_cover && post.cover_image_url ? <CoverImage src={post.cover_image_url} alt={coverImageAlt(post)} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" imgProps={{ width: 1200, height: 675, fetchPriority: 'high', decoding: 'async' }} /> : <div className="mt-8 grid h-24 w-full place-items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] text-[hsl(var(--muted-foreground))]"><FileText className="size-8" /></div>}
            {isRichContent(post.content) ? (
              <div className="mt-8 space-y-5 border-t border-[hsl(var(--border))] pt-8 text-base leading-8 text-[hsl(var(--foreground)/.85)]" dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <div className="mt-8 space-y-5 border-t border-[hsl(var(--border))] pt-8 text-base leading-8 text-[hsl(var(--foreground)/.85)]">{post.content.split('\n\n').map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}</div>
            )}
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="mt-9 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] px-3 py-1.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">#{tag}</span>)}</div>
            )}
            {Array.isArray(post.faq) && post.faq.length > 0 && (
              <div className="mt-10 rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-7">
                <div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">faq · frequently asked questions</div>
                <div className="mt-4 space-y-4">
                  {post.faq.map((item, index) => (
                    <div key={index} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-4">
                      <h3 className="font-['Space_Grotesk'] text-sm font-bold">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-9 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">Enjoying this guide? <Link href="/" className="font-bold text-[hsl(var(--primary))]">Check a resume free</Link> · <Link href="/free-tools/keyword-finder" className="font-bold text-[hsl(var(--primary))]">Find job keywords</Link> · <Link href="/about" className="font-bold text-[hsl(var(--primary))]">About GoodSpace</Link></div>
            <div className="mt-8 rounded-[1.5rem] border border-[hsl(var(--primary)/.18)] bg-[hsl(var(--primary)/.06)] p-6 sm:p-7"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">next up</div><div className="mt-3 font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">Turn this article into edits.</div><Link href="/" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Run a free ATS scan <ArrowRight className="size-4" /></Link></div>
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}