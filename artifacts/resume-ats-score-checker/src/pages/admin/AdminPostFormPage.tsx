import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileImage,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useLocation, useRouter } from 'wouter';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { Switch } from '@/components/ui/switch';
import { supabase, slugify, type BlogFaq, type BlogPost } from '@/lib/supabase';
import { BLOG_CATEGORIES, generateFaqAI, generateMetaAI, generateTagsAI } from '@/lib/admin-blog';
import { notifySaved } from '@/lib/admin-store';

const inputClass =
  'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--primary)/.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.2)]';

const labelClass = 'font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]';

const aiButtonClass =
  'focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.1)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/.18)] disabled:pointer-events-none disabled:opacity-60';

export function AdminPostFormPage({ postId }: { postId?: number }) {
  const [, navigate] = useLocation();
  const router = useRouter();
  const base = (router.base ?? '').replace(/\/$/, '');

  const [existing, setExisting] = useState<BlogPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(Boolean(postId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [published, setPublished] = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImageError, setCoverImageError] = useState(false);
  const [altText, setAltText] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [faqs, setFaqs] = useState<BlogFaq[]>([]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<'tags' | 'faq' | 'meta' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    (async () => {
      setLoadError(null);
      const { data, error: err } = await supabase.from('blog_posts').select('*').eq('id', postId).maybeSingle();
      if (cancelled) return;
      setLoadingPost(false);
      if (err) {
        setLoadError(err.message);
        return;
      }
      if (!data) {
        setLoadError('This post no longer exists.');
        return;
      }
      const post = data as BlogPost;
      setExisting(post);
      setTitle(post.title);
      setSlug(post.slug);
      setSlugEdited(true);
      setCategory(post.category ?? '');
      setAuthor(post.author ?? '');
      setPublished(post.published);
      setShowCover(post.show_cover);
      setCoverImageUrl(post.cover_image_url ?? '');
      setAltText(post.alt_text ?? '');
      setContent(post.content);
      setExcerpt(post.excerpt ?? '');
      setTags(Array.isArray(post.tags) ? post.tags : []);
      setFaqs(Array.isArray(post.faq) ? post.faq : []);
      setMetaTitle(post.meta_title ?? '');
      setMetaDescription(post.meta_description ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const fromTitle = () => {
    setSlug(slugify(title));
    setSlugEdited(true);
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (!tag || tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setTagInput('');
      return;
    }
    setTags((current) => [...current, tag]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((item) => item !== tag));
  };

  const uploadCover = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setError('That image is over 2.5 MB. Use a smaller file or paste an image URL instead.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImageUrl(String(reader.result));
      setCoverImageError(false);
    };
    reader.readAsDataURL(file);
  };

  const savePost = async (asDraft: boolean) => {
    const finalSlug = slugify(slug.trim()) || slug.trim();
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }
    if (!finalSlug) {
      setError('A URL slug is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      slug: finalSlug,
      category: category.trim() || null,
      author: author.trim() || null,
      published: asDraft ? false : published,
      show_cover: showCover,
      cover_image_url: showCover && coverImageUrl.trim() ? coverImageUrl.trim() : null,
      alt_text: altText.trim() || null,
      content,
      excerpt: excerpt.trim() || null,
      tags,
      faq: faqs.filter((item) => item.question.trim() || item.answer.trim()),
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
    };
    try {
      if (existing) {
        const { error: err } = await supabase.from('blog_posts').update(payload).eq('id', existing.id);
        if (err) {
          console.error('[AdminPostForm] blog_posts UPDATE rejected by Supabase', { code: err.code, message: err.message, details: err.details, hint: err.hint }, payload);
          setError(`Couldn't save changes: ${err.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { error: err } = await supabase.from('blog_posts').insert(payload);
        if (err) {
          console.error('[AdminPostForm] blog_posts INSERT rejected by Supabase', { code: err.code, message: err.message, details: err.details, hint: err.hint }, payload);
          setError(`Couldn't save the post: ${err.message}`);
          setSaving(false);
          return;
        }
      }
    } catch (err) {
      console.error('[AdminPostForm] Supabase request threw an exception', err, payload);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while saving.');
      setSaving(false);
      return;
    }
    setSaving(false);
    notifySaved();
    navigate('/admin/blog', { replace: true });
    window.scrollTo({ top: 0 });
  };

  const deletePost = async () => {
    if (!existing) return;
    setDeleteBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('blog_posts').delete().eq('id', existing.id);
      if (err) {
        console.error('[AdminPostForm] blog_posts DELETE rejected by Supabase', { code: err.code, message: err.message, details: err.details, hint: err.hint }, { id: existing.id });
        setError(`Couldn't delete this post: ${err.message}`);
        setAskDelete(false);
        setDeleteBusy(false);
        return;
      }
    } catch (err) {
      console.error('[AdminPostForm] Supabase delete request threw an exception', err, { id: existing.id });
      setError('An unexpected error occurred while deleting.');
      setAskDelete(false);
      setDeleteBusy(false);
      return;
    }
    setDeleteBusy(false);
    notifySaved();
    navigate('/admin/blog', { replace: true });
    window.scrollTo({ top: 0 });
  };

  const runAi = async (kind: 'tags' | 'faq' | 'meta') => {
    setAiBusy(kind);
    setAiError(null);
    const result =
      kind === 'tags'
        ? await generateTagsAI(title, content)
        : kind === 'faq'
          ? await generateFaqAI(title, content)
          : await generateMetaAI(title, content);
    setAiBusy(null);
    if (!result.ok) {
      setAiError(result.error);
      return;
    }
    if (kind === 'tags') {
      const data = result.data as { tags: string[] };
      setTags((current) => {
        const merged = [...current, ...data.tags];
        const unique = merged.filter((item, index) => merged.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);
        return unique.slice(0, 10);
      });
    } else if (kind === 'faq') {
      const data = result.data as { faqs: BlogFaq[] };
      setFaqs((current) => {
        const merged = [...data.faqs, ...current];
        return merged.filter((item, index) => merged.findIndex((x) => x.question.toLowerCase() === item.question.toLowerCase()) === index).slice(0, 8);
      });
    } else {
      const data = result.data as { metaTitle: string; metaDescription: string };
      setMetaTitle(data.metaTitle);
      setMetaDescription(data.metaDescription);
    }
  };

  const statusBadge = (
    <span className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.14em] ${published ? 'bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>
      {published ? 'Published' : 'Draft'}
    </span>
  );

  const actions = (
    <>
      <Link href="/admin/blog" className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"><ArrowLeft className="size-3.5" /> Back to blog list</Link>
      {statusBadge}
      {existing && (
        <button type="button" onClick={() => setAskDelete(true)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive)/.15)]"><Trash2 className="size-3.5" /> Delete</button>
      )}
    </>
  );

  const showAltField = showCover && Boolean(coverImageUrl.trim());

  const previewAltLabel = altText.trim() || title.trim() || 'cover image';

  if (loadingPost) {
    return (
      <AdminLayout title="Edit post" subtitle="Loading the post…" actions={actions}>
        <div className="mt-8 flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]"><LoaderCircle className="size-5 animate-spin text-[hsl(var(--primary))]" /> Loading post…</div>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout title="Edit post" subtitle="This post could not be opened" actions={actions}>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm leading-6 text-[hsl(var(--destructive))]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {loadError}
        </div>
        <Link href="/admin/blog" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold">Back to blog list</Link>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={existing ? 'Edit post' : 'New post'}
      subtitle={existing ? `Editing “${title || 'Untitled'}”` : 'Write a new journal post'}
      actions={actions}
      saveLabel="Save changes"
      onSave={() => savePost(false)}
    >
      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm leading-6 text-[hsl(var(--destructive))]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />{error}
        </div>
      )}
      {aiError && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm leading-6 text-[hsl(var(--destructive))]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />{aiError}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><FileText className="size-3.5" /> basics</div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="block lg:col-span-2">
              <span className={labelClass}>title</span>
              <input type="text" value={title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="e.g. What an ATS can actually read on your resume" className={`mt-2 ${inputClass}`} />
            </label>
            <div className="lg:col-span-2">
              <span className={labelClass}>url slug</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <input type="text" value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} placeholder="my-post-slug" className={`${inputClass} flex-1`} />
                <button type="button" onClick={fromTitle} className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] px-4 py-3 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"><RefreshCw className="size-3.5" /> From title</button>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Public URL: {base}/blog/{slugify(slug.trim()) || 'your-slug'}</p>
            </div>
            <label className="block">
              <span className={labelClass}>category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={`mt-2 ${inputClass}`}>
                <option value="">Select a category…</option>
                {BLOG_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>author</span>
              <input type="text" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="e.g. Alex Morgan" className={`mt-2 ${inputClass}`} />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><FileImage className="size-3.5" /> cover page</div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{showCover ? 'Active' : 'Inactive'}</span>
              <Switch checked={showCover} onCheckedChange={setShowCover} aria-label="Cover page toggle" />
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <input className="sr-only" id="cover-upload" type="file" accept="image/*" onChange={(event) => uploadCover(event.target.files?.[0])} />
              <label htmlFor="cover-upload" className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.06)] px-4 py-3 text-xs font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/.12)]">
                <ImagePlus className="size-4" /> Upload cover image
              </label>
              <label className="mt-3 block">
                <span className={labelClass}>image url</span>
                <input type="url" value={coverImageUrl.startsWith('data:') ? '(uploaded image)' : coverImageUrl} onChange={(event) => { setCoverImageUrl(event.target.value); setCoverImageError(false); }} placeholder="https://…" className={`mt-2 ${inputClass}`} disabled={coverImageUrl.startsWith('data:')} />
              </label>
              {coverImageUrl.startsWith('data:') && (
                <button type="button" onClick={() => setCoverImageUrl('')} className="focus-ring mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--destructive))]"><X className="size-3.5" /> Remove uploaded image</button>
              )}
              {showAltField && (
                <div className="mt-3">
                  <label className="block">
                    <span className={labelClass}>alt text</span>
                    <input type="text" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image for accessibility and SEO (e.g. 'Illustration of a resume being scanned by ATS software')" className={`mt-2 ${inputClass}`} />
                  </label>
                  <p className="mt-1.5 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Used by screen readers and search engines. Keep it short and descriptive. If left blank, the post title is used instead.</p>
                </div>
              )}
            </div>
            <div>
              <div className="aspect-video overflow-hidden rounded-xl border border-[hsl(var(--border)/.9)] bg-[hsl(var(--secondary)/.3)]">
                {showCover && coverImageUrl.trim() ? (
                  coverImageError ? (
                    <div className="grid h-full place-items-center p-4 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                      <span>
                        <span className="block font-bold text-[hsl(var(--foreground))]">{previewAltLabel}</span>
                        <span className="mt-1 block">This image could not load. Check the URL or upload a new one.</span>
                      </span>
                    </div>
                  ) : (
                    <img src={coverImageUrl} alt={previewAltLabel} className="h-full w-full object-cover" onError={() => setCoverImageError(true)} />
                  )
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div>
                      {altText.trim() && <div className="mb-2 text-[10px] font-bold text-[hsl(var(--primary))]">{altText.trim()}</div>}
                      <FileImage className="mx-auto size-6 text-[hsl(var(--muted-foreground)/.6)]" />
                      <div className="mt-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">No cover image yet</div>
                      <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground)/.8)]">Preview matches the real blog image size (16:9)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><FileText className="size-3.5" /> content</div>
          <div className="mt-5">
            <RichTextEditor value={content} onChange={setContent} />
          </div>
          <label className="mt-5 block">
            <span className={labelClass}>excerpt</span>
            <textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={4} placeholder="A short summary shown on blog cards. Leave blank to auto-generate from the content." className={`mt-2 resize-y ${inputClass}`} />
          </label>
          <p className="mt-1.5 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Big summary shown on cards when a reader hasn't opened the article yet.</p>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><TagIcon className="size-3.5" /> tags</div>
            <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{tags.length} tag{tags.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input type="text" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} placeholder="Add a tag…" className={`${inputClass} w-52`} />
            <button type="button" onClick={addTag} className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] px-4 py-3 text-xs font-bold transition-colors hover:text-[hsl(var(--foreground))]"><Plus className="size-3.5" /> Add</button>
            <button type="button" onClick={() => runAi('tags')} disabled={aiBusy !== null} className={`${aiButtonClass} ml-auto`}><Sparkles className="size-3.5" /> {aiBusy === 'tags' ? <LoaderCircle className="size-3.5 animate-spin" /> : null} Generate tags (AI)</button>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary)/.12)] px-2.5 py-1.5 font-mono text-[11px] text-[hsl(var(--primary))]">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="rounded hover:text-[hsl(var(--destructive))]"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><Sparkles className="size-3.5" /> faq</div>
            <button type="button" onClick={() => runAi('faq')} disabled={aiBusy !== null} className={aiButtonClass}><Sparkles className="size-3.5" /> {aiBusy === 'faq' ? <LoaderCircle className="size-3.5 animate-spin" /> : null} Generate FAQ (AI)</button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Questions are auto-suggested from the title. Only FAQs with a question and an answer are saved.</p>
          <div className="mt-4 space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">question {index + 1}</span>
                  <button type="button" onClick={() => setFaqs((current) => current.filter((_, i) => i !== index))} className="rounded-md p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--destructive))]"><Trash2 className="size-4" /></button>
                </div>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(event) => setFaqs((current) => current.map((item, i) => (i === index ? { ...item, question: event.target.value } : item)))}
                  placeholder="Frequently asked question"
                  className={`mt-2 ${inputClass}`}
                />
                <textarea
                  value={faq.answer}
                  onChange={(event) => setFaqs((current) => current.map((item, i) => (i === index ? { ...item, answer: event.target.value } : item)))}
                  rows={2}
                  placeholder="Concise answer"
                  className={`mt-2 resize-y ${inputClass}`}
                />
              </div>
            ))}
            {faqs.length === 0 && (
              <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.2)] px-4 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No FAQs yet. Use “Generate FAQ (AI)” or add one below.</div>
            )}
            <button type="button" onClick={() => setFaqs((current) => [...current, { question: '', answer: '' }])} className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] px-4 py-2.5 text-xs font-bold transition-colors hover:text-[hsl(var(--foreground))]"><Plus className="size-3.5" /> Add FAQ</button>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><Sparkles className="size-3.5" /> seo</div>
            <button type="button" onClick={() => runAi('meta')} disabled={aiBusy !== null} className={aiButtonClass}><Sparkles className="size-3.5" /> {aiBusy === 'meta' ? <LoaderCircle className="size-3.5 animate-spin" /> : null} Generate (AI)</button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Meta title overrides the post title in search results.</p>
          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className={labelClass}>meta title</span>
                <span className={`font-mono text-[10px] ${metaTitle.length > 60 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{metaTitle.length}/60</span>
              </div>
              <input type="text" value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} maxLength={70} placeholder="A search-friendly headline under 60 characters" className={`mt-2 ${inputClass}`} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className={labelClass}>meta description</span>
                <span className={`font-mono text-[10px] ${metaDescription.length > 160 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{metaDescription.length}/160</span>
              </div>
              <textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} maxLength={180} rows={3} placeholder="A short, click-worthy summary under 160 characters" className={`mt-2 resize-y ${inputClass}`} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-[hsl(var(--secondary)/.45)] px-4 py-3.5">
            <span>
              <span className="block text-sm font-bold text-[hsl(var(--foreground))]">Published</span>
              <span className="block text-[11px] text-[hsl(var(--muted-foreground))]">Only published posts appear on the public journal.</span>
            </span>
            <Switch checked={published} onCheckedChange={setPublished} aria-label="Toggle published" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => savePost(true)} disabled={saving} className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3.5 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] disabled:opacity-60">
              {saving ? <LoaderCircle className="mx-auto size-4 animate-spin" /> : <span className="inline-flex items-center justify-center gap-2"><FileText className="size-4" /> Save as draft</span>}
            </button>
            <button type="button" onClick={() => savePost(false)} disabled={saving} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[#ff6a3d] px-4 py-3.5 text-sm font-bold text-white shadow-[0_7px_20px_hsl(var(--primary)/.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>
      </div>

      {askDelete && existing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-2xl">
            <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-[-.04em]">Delete this post?</h3>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">“{title}” will be permanently removed. This can't be undone.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setAskDelete(false)} disabled={deleteBusy} className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-bold hover:bg-[hsl(var(--secondary))] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={deletePost} disabled={deleteBusy} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--destructive))] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{deleteBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {deleteBusy ? 'Deleting…' : 'Delete post'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}