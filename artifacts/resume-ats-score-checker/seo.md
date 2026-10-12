# SEO Audit & Fixes — ScoreMyResume (Resume ATS Score Checker)

Date: 24 Sep 2026
Scope: whole SPA (`artifacts/resume-ats-score-checker`)
Verified with: `pnpm --filter @workspace/resume-ats-score-checker run typecheck` (pass) and `run build` (pass, 44.7s).
Constraint respected: page copy was not changed in meaning; resume upload / scoring / analysis flow untouched; privacy-first architecture kept (all resume processing stays in the browser).

---

## 1. IMAGES

- **Renamed the logo** `public/logo.jpg` → `public/scoremyresume-logo.jpg` (descriptive, hyphenated, lowercase).
  - references updated: `index.html` (favicon, apple-touch-icon, og:image, twitter:image), `src/components/site-chrome.tsx` (Logo `img`), `src/lib/seo.tsx` (`DEFAULT_OG_IMAGE`).
  - `public/logo.jpg` no longer referenced anywhere in `src/`.
- **Alt attributes**
  - Logo in header/footer: `alt="ScoreMyResume logo"` (was already set).
  - Blog card cover (`BlogPage.tsx:69`): `alt={post.alt_text || \`Cover image for ${post.title}\`}`.
  - Blog post cover (`BlogPostPage.tsx:84`): same fallback.
  - Resume photo thumbnail (`App.tsx` improve page) and admin cover preview: decorative, `alt=""` intentionally (screen-reader skipped).
- **Width / height & aspect-ratio**
  - Header/footer logo: `width="36" height="36"`, `fetchPriority="high"`, `decoding="async"`.
  - Blog card cover: `loading="lazy" decoding="async" aspect-[16/9]` (replaces cropped fixed height → reserves layout space, CLS-safe).
  - Blog post cover: `width="1200" height="675"`, `fetchPriority="high"` (above the fold, eager), `aspect-[16/9]`.
- **Loading strategy**
  - Blog card images below the fold: lazy. Blog post hero cover: eager + high priority. Header logo: high priority.
- **Size audit**: logo is 27,120 bytes (~27 KB) — well under limits; no compression or conversion needed.
- **OG/favicon image exists**: single `scoremyresume-logo.jpg` used for favicon + social cards (documented; consider a dedicated 1200×630 OG image later).

## 2. META TAGS & HEAD

New: `src/lib/seo.tsx` — one client-side `Seo` component + `useSeo` hook that manage, per route:
`<title>`, meta `description`, meta `robots`, `link[rel=canonical]`, `og:site_name`, `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:locale`, and Twitter card tags, plus a single replaceable JSON-LD `<script id="seo-jsonld">`.

- `index.html` (server-default head): kept `lang="en"`, viewport; added `theme-color`, `X-UA-Compatible`, `og:site_name`, `og:locale`; started bumping og/twitter/favicon to the new logo path.
- Per-page titles/descriptions wired for: Home `/`, `/about` (canonical target for `/about-contact`), `/contact`, `/privacy` (canonical for `/privacy-policy`), `/free-tools`, `/free-tools/templates` (canonical for `/free-ats-resume-templates`), `/free-tools/keyword-finder`, `/blog`, `/resume-help`, `/score`, `/improve`.
- Blog post pages: title = `meta_title || title`, description = `meta_description`, canonical `/blog/:slug`.
- All 10 keyword + 10 city resume-help landing pages: title + description come from each page's existing `meta` object (already descriptive, `| ScoreMyResume` — completed earlier), now also get canonical, OG/Twitter, breadcrumbs and FAQ schema.
- 404 (themed `NotFound` in `App.tsx`): title "Page not found — ScoreMyResume", `noindex, nofollow`.

## 3. STRUCTURED DATA (JSON-LD)

Builders in `src/lib/seo.tsx`: `websiteJsonLd`, `organizationJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`, `articleJsonLd`.

- **Home** `/`: `WebSite` (with SearchAction) + `Organization` (`@id .../#organization`, logo, `sameAs`).
- **Blog post** `/blog/:slug`: `Article` (headline, description, image, datePublished/dateModified, author Person/Organization, publisher Organization) + `BreadcrumbList` (Blog → post) + optional `FAQPage` (from `post.faq`).
- **Resume-help keyword pages**: `BreadcrumbList` (Resume help → page) + optional `FAQPage` (from the page's `faqs` data — content copied verbatim, no rewording).
- **Resume-help city pages**: same (`/resume-help/city/:slug`).
- Structured data for blog listing and tools pages intentionally deferred (low value); noted for future work.

## 4. HEADING STRUCTURE

- Confirmed every page/route mounts exactly one `<h1>` (Home, Results/score, Improve, Blog list, Blog post, About, Contact, Privacy, Templates, Keyword Finder, Free Tools hub, Help Directory, all 10 resume-help templates via `HeroBand`, admin dashboard).
- **Blog FAQ questions**: `BlogPostPage.tsx` — FAQ question blocks were `<div>`; now `<h3>` (page h1 → FAQ h3, correct hierarchy).
- **Resume-help section titles**: `templates.tsx` `SectionTag` title was an unstyled-by-semantics `<span>`; now `<h2>` (marker chip keeps its own span). Existing `h3` "a little deeper" sub-headings stay.
- Default favicon-era fallback `src/pages/not-found.tsx` (old bootstrap page) was unreferenced and is now deleted — the themed `NotFound` is the only 404.
- **No-op**: blog card titles remain `h2` (correct under the single h1). Loading/skeleton states show no heading, so still one h1 per mounted page.

## 5. SITEMAP & ROBOTS

- **`scripts/generate-sitemap.mjs`** (new, dependency-free, edits before every build):
  - reads `SITE_URL` / `VITE_SITE_URL` from `.env` (fallback placeholder — see Notes);
  - emits `public/sitemap.xml`: 11 static routes + 10 `/resume-help/*` keyword slugs + 10 `/resume-help/city/*` slugs + live published blog slugs fetched from Supabase REST (`?select=slug&published=eq.true`) when env vars are present (best-effort, 8s timeout, never breaks the build);
  - also writes `public/robots.txt`.
  - wired into `package.json`: `"build": "node scripts/generate-sitemap.mjs && ...vite build"`.
- **`public/robots.txt`**: `User-agent: *` / `Allow: /` / `Disallow: /admin/` / `Sitemap: <base>/sitemap.xml`.
- **`noindex` admin**: all `/admin/*` routes (login, dashboard, blog list, post form, settings) now emit `noindex, nofollow` via `AdminLayout` + `AdminLoginPage`; robots.txt additionally disallows `/admin/`.
- Sitemap generated in this build: **31 URLs** & copied into `dist/public/`.

## 6. INTERNAL LINKING

- Blog list → post (existing), home checker CTA (existing), post → `/`, keyword-finder, `/about` (existing).
- `/blog` → resume-help guides by segment (`freshers`, `it-jobs`, `government-jobs`, `digital-marketing`, `remote-jobs`) (existing links now **work** again — see Routing).
- `/resume-help` directory links to all 10 keyword guides + 10 city guides (existing `KEYWORD_LINKS` + `CITY_ORDER`).
- Resume-help templates' footer/related rows unchanged.
- Legacy alias URLs are preserved as working routes with canonical pointing at the canonical path (so link equity consolidates).

## 7. URL & ROUTING (+ 404)

- **Bug fixed — broken keyword slug lookup**: keywords had mixed keys (`itJobs`, `governmentJobs`, ...) but the app was asked to resolve kebab URLs (`/resume-help/it-jobs`). Every kebab link (`/resume-help/it-jobs`, `/resume-help/government-jobs`, `/resume-help/digital-marketing`, `/resume-help/remote-jobs`) and the direct route `/digital-marketing-resume-optimizer` fell through to the "page not on the radar" screen.
  - `pages.tsx`: added `resolveKeywordKey` (tries the key as-is, then kebab→camel normalization), `camelToKebab` for canonical slugs, and `MissingSlug` only as a true fallback.
  - All 10 keyword guides now resolve from their lowercase-hyphenated public URLs.
- Canonics: legacy aliases (`/ats-resume-checker-freshers`, `/software-engineer-resume-scanner`, `/data-analyst-resume-review`, `/digital-marketing-resume-optimizer`, `/canva-resume-ats-friendly`, `/best-file-format-for-ats`, `/how-to-optimize-resume-keywords`, `/free-ats-resume-templates`, `/about-contact`, `/privacy-policy`) keep servicing links but canonicalize to `/resume-help/…` / `/free-tools/templates` / `/about` / `/privacy`.
- 404: single themed `NotFound` with helpful back-links and `noindex`.

## 8. PERFORMANCE

- **Code-split admin**: all five admin pages now `React.lazy` + `Suspense` (`App.tsx`) → separate chunks (~1–30 kB each) instead of inflating the first paint bundle.
- **Code-split resume export libs**: `generateResumePdf` (`html2pdf.js` ≈ 976 kB) and `generateResumeDocx` (`docx`) now dynamic-imported inside the Download handlers — not loaded until a user clicks a download.
- Result: `html2pdf`, `resume-pdf`, `resume-docx`, and every admin page are lazy chunks in the build (see build output listing).
- **Still in the main bundle by design** (core to the primary flow, kept for correctness): `pdfjs-dist` (reader), `tesseract.js` (OCR), `recharts`, `framer-motion`, and the shadcn/ui surface. Smallest main entry is still the biggest opportunity; further splitting is low-value/risky because these back the core upload→score path.
- Render-blocking: Google Fonts loaded via `preconnect` + normal stylesheet; keeping as-is (typed UX already uses it). No render-blocking admin fonts added.
- LCP images now have explicit dimensions (CLS-safe).

---

## What you still need to do (no code change required)

1. **Set `SITE_URL`** in the artifact's `.env` (e.g. `SITE_URL=https://your-domain.com`). Until then sitemap/robots use the default `https://resume-ats-checker-beta-six.vercel.app`. Rerun `pnpm run build` (or the dev server) after setting it, and deploy — sitemap/robots are regenerated on every build.
2. **Submit the sitemap** in Google Search Console: `https://<domain>/sitemap.xml`.
3. Optional later: a dedicated 1200×630 OG image; `hreflang`/multilingual; `ItemList` schema on `/blog` listing; `WebPage` schema on tools pages.