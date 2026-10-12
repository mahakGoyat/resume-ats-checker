import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^['"]|['"]$/g, '');
    out[match[1]] = value;
  }
  return out;
}

function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
    return parseEnv(content);
  } catch {
    return {};
  }
}

const env = loadEnv();
const SITE_URL = (env.SITE_URL || env.VITE_SITE_URL || '').replace(/\/+$/, '');
const BASE_URL = SITE_URL || 'https://resume-ats-checker-beta-six.vercel.app';

const KEYWORD_SLUGS = [
  'freshers',
  'it-jobs',
  'government-jobs',
  'digital-marketing',
  'remote-jobs',
  'software-engineer',
  'data-analyst',
  'canva',
  'file-format',
  'keywords',
];

const CITY_SLUGS = [
  'gurugram',
  'faridabad',
  'panchkula',
  'ambala',
  'sonipat',
  'hisar',
  'karnal',
  'rohtak',
  'bahadurgarh',
  'palwal-sohna',
];

const STATIC_ROUTES = [
  '/',
  '/score',
  '/improve',
  '/about',
  '/contact',
  '/privacy',
  '/free-tools',
  '/free-tools/templates',
  '/free-tools/keyword-finder',
  '/blog',
  '/resume-help',
];

async function fetchPublishedBlogSlugs() {
  const supabaseUrl = env.VITE_SUPABASE_URL || '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey || !SITE_URL) return [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/blog_posts?select=slug&published=eq.true&order=created_at.desc`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/vnd.pgrst.object+json' },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    const slugs = Array.isArray(rows) ? rows.map((row) => row.slug).filter(Boolean) : [];
    console.log(`[sitemap] Fetched ${slugs.length} published blog slugs.`);
    return slugs;
  } catch (error) {
    console.warn(`[sitemap] Could not fetch blog slugs (${error instanceof Error ? error.message : error}). Using static routes only.`);
    return [];
  }
}

function xmlEscape(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const LAST_MOD = fs.existsSync(path.join(publicDir, 'sitemap.xml'))
  ? new Date().toISOString().slice(0, 10)
  : new Date().toISOString().slice(0, 10);

async function main() {
  const blogSlugs = await fetchPublishedBlogSlugs();
  const allPaths = [
    ...STATIC_ROUTES,
    ...KEYWORD_SLUGS.map((slug) => `/resume-help/${slug}`),
    ...CITY_SLUGS.map((slug) => `/resume-help/city/${slug}`),
    ...blogSlugs.map((slug) => `/blog/${slug}`),
  ];

  const urls = allPaths.map(
    (routePath) => `  <url>\n    <loc>${xmlEscape(`${BASE_URL}${routePath === '/' ? '/' : routePath}`)}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n  </url>`,
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);
  console.log(`[sitemap] Wrote sitemap.xml (${allPaths.length} URLs) and robots.txt using base ${BASE_URL}.`);
}

main().catch((error) => {
  console.error('[sitemap] Failed:', error);
  process.exit(1);
});