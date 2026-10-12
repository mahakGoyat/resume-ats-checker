import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BlogFaq = { question: string; answer: string };

export type BlogPost = {
  id: number;
  created_at: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url: string | null;
  published: boolean;
  category: string | null;
  author: string | null;
  show_cover: boolean;
  alt_text: string | null;
  excerpt: string | null;
  tags: string[];
  faq: BlogFaq[];
  meta_title: string | null;
  meta_description: string | null;
};

export function formatPostDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripHtml(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return text.replace(/\s+/g, ' ').replace(/\s+\n\s+/g, '\n').trim();
}

export function isRichContent(content: string): boolean {
  return /<(p|div|h[1-6]|ul|ol|li|strong|b|em|i|blockquote|img|span)\b/i.test(content);
}

export function coverImageAlt(post: Pick<BlogPost, 'alt_text' | 'title'>): string {
  const alt = post.alt_text?.trim();
  if (alt) return alt;
  return post.title?.trim() ? `Cover image for ${post.title.trim()}` : 'Cover image';
}

export function postExcerpt(post: Pick<BlogPost, 'excerpt' | 'content'>): string {
  const source = post.excerpt ?? stripHtml(post.content);
  return source.length > 170 ? `${source.slice(0, 170).trim()}…` : source;
}