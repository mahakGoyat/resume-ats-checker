-- Admin/CMS panel columns for ScoreMyResume
-- Run this once in the Supabase SQL editor for the project that owns the
-- `blog_posts` table. It is safe to re-run (all statements are additive).

alter table public.blog_posts
  add column if not exists category text,
  add column if not exists author text,
  add column if not exists show_cover boolean not null default true,
  add column if not exists alt_text text,
  add column if not exists excerpt text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists faq jsonb not null default '[]'::jsonb,
  add column if not exists meta_title text,
  add column if not exists meta_description text;