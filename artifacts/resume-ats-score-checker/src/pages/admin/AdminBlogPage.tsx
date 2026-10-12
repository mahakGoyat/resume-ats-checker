import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, FilePlus2, FileText, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SuccessBanner } from '@/components/admin/SuccessBanner';
import { Switch } from '@/components/ui/switch';
import { supabase, type BlogPost, formatPostDate } from '@/lib/supabase';
import { useSavedNotice } from '@/lib/admin-store';
import { notifySaved } from '@/lib/admin-store';

export function AdminBlogPage() {
  const [location] = useLocation();
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { show, dismiss } = useSavedNotice();

  const loadPosts = async () => {
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
    loadPosts();
  }, []);

  const filter = useMemo(() => {
    const hash = location.split('#')[1];
    return hash === 'drafts' ? 'draft' : hash === 'published' ? 'published' : 'all';
  }, [location]);

  const visible = useMemo(() => {
    if (!posts) return null;
    if (filter === 'draft') return posts.filter((post) => !post.published);
    if (filter === 'published') return posts.filter((post) => post.published);
    return posts;
  }, [posts, filter]);

  const togglePublished = async (post: BlogPost, next: boolean) => {
    setPosts((current) => (current ? current.map((p) => (p.id === post.id ? { ...p, published: next } : p)) : current));
    try {
      const { error: err } = await supabase.from('blog_posts').update({ published: next }).eq('id', post.id);
      if (err) {
        console.error('[AdminBlog] publish toggle rejected by Supabase', { code: err.code, message: err.message, details: err.details, hint: err.hint }, { id: post.id, published: next });
        setPosts((current) => (current ? current.map((p) => (p.id === post.id ? { ...p, published: !next } : p)) : current));
        setError(`Couldn't update published status: ${err.message}`);
        return;
      }
    } catch (err) {
      console.error('[AdminBlog] publish toggle request threw an exception', err, { id: post.id, published: next });
      setPosts((current) => (current ? current.map((p) => (p.id === post.id ? { ...p, published: !next } : p)) : current));
      setError('An unexpected error occurred while updating published status.');
      return;
    }
    notifySaved();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('blog_posts').delete().eq('id', deleting.id);
      if (err) {
        console.error('[AdminBlog] post delete rejected by Supabase', { code: err.code, message: err.message, details: err.details, hint: err.hint }, { id: deleting.id });
        setError(`Couldn't delete this post: ${err.message}`);
        setDeleting(null);
        setDeleteBusy(false);
        return;
      }
    } catch (err) {
      console.error('[AdminBlog] delete request threw an exception', err, { id: deleting.id });
      setError('An unexpected error occurred while deleting.');
      setDeleting(null);
      setDeleteBusy(false);
      return;
    }
    setPosts((current) => (current ? current.filter((p) => p.id !== deleting.id) : current));
    setDeleting(null);
    setDeleteBusy(false);
    notifySaved();
  };

  return (
    <AdminLayout
      title="Blog"
      subtitle="Create, edit and publish journal posts"
      actions={
        <Link href="/admin/blog/new" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_hsl(var(--primary)/.3)] transition-transform hover:-translate-y-0.5">
          <FilePlus2 className="size-4" /> Add New Blog
        </Link>
      }
      onSave={() => {
        notifySaved();
        loadPosts();
      }}
    >
      <SuccessBanner show={show} onDismiss={dismiss} />

      {error && (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.08)] px-4 py-3 text-sm leading-6 text-[hsl(var(--foreground))] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5"><AlertCircle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" />{error}</div>
          <button type="button" onClick={loadPosts} className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold">Reload posts</button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 border-b border-[hsl(var(--border)/.8)]">
        {(['all', 'draft', 'published'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              window.location.hash = key === 'all' ? '' : key;
            }}
            className={`focus-ring relative rounded-t-lg px-4 py-2.5 text-xs font-bold capitalize transition-colors ${filter === key ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
          >
            {key === 'all' ? 'All posts' : `${key}s`}
            {filter === key && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[hsl(var(--primary))]" />}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">{visible === null ? '…' : `${visible.length} post${visible.length === 1 ? '' : 's'}`}</span>
      </div>

      {visible === null && !error && (
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <div className="h-5 w-3/5 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
              <div className="ml-auto h-8 w-24 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
            </div>
          ))}
        </div>
      )}

      {visible !== null && visible.length === 0 && !error && (
        <div className="mt-5 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText className="size-6" /></div>
          <h3 className="mt-5 font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">{filter === 'draft' ? 'No drafts yet.' : filter === 'published' ? 'Nothing published yet.' : 'No posts yet.'}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{filter === 'draft' ? 'Posts you save as drafts stay hidden until you mark them published.' : filter === 'published' ? 'When you publish a post it will appear here and on the live journal.' : 'Create your first post with the button above. Drafts stay hidden from the public journal until you mark them published.'}</p>
        </div>
      )}

      {visible !== null && visible.length > 0 && (
        <div className="mt-5 space-y-4">
          {visible.map((post) => (
            <div key={post.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-['Space_Grotesk'] text-lg font-bold tracking-[-.03em]">{post.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    <span>/blog/{post.slug}</span>
                    <span>{formatPostDate(post.created_at)}</span>
                    {post.category && <span className="rounded-full bg-[hsl(var(--secondary))] px-2 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">{post.category}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[.14em] ${post.published ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>{post.published ? 'Published' : 'Draft'}</span>
                <Switch checked={post.published} onCheckedChange={(next) => togglePublished(post, next)} aria-label={`Toggle published for ${post.title}`} />
                <div className="flex items-center gap-2">
                  <Link href={`/admin/blog/${post.id}`} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold hover:bg-[hsl(var(--secondary))]"><Pencil className="size-3.5" /> Edit</Link>
                  <button type="button" onClick={() => setDeleting(post)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.15)]"><Trash2 className="size-3.5" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-2xl">
            <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">Delete this post?</h3>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">“{deleting.title}” will be permanently removed. This can't be undone.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setDeleting(null)} disabled={deleteBusy} className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-bold hover:bg-[hsl(var(--secondary))] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleteBusy} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--destructive))] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{deleteBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {deleteBusy ? 'Deleting…' : 'Delete post'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}