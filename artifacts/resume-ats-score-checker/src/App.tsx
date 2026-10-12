import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Copy,
  Download,
  FileDown,
  FileText,
  FileSearch,
  Gauge,
  Link as LinkIcon,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RotateCcw,
  ScanText,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { Switch as ToggleSwitch } from '@/components/ui/switch';
import { parseResumeSections, resumeBaseName } from '@/lib/resume-sections';
import { buildImprovedResumeDoc, downloadBlob } from '@/lib/resume-doc-model';
import { extractResumePhoto } from '@/lib/resume-photo';
import { improveResume, sanitizeResumeText, type ImprovedResume } from '@/lib/resume-ai';
import { ResumePreviewHtml, ResumePreviewHtmlFromDoc } from '@/lib/resume-html.tsx';
import { Seo, websiteJsonLd, organizationJsonLd, absoluteUrl, type JsonLd, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from '@/lib/seo';
import { usePageViewTracking } from '@/lib/analytics';
import { HelpDirectory, KeywordHelpPage, CityHelpPage } from '@/pages/resume-help/pages';
import { Header, SiteFooter, LandingChrome } from '@/components/site-chrome';
import { BlogPage } from '@/pages/BlogPage';
import { BlogPostPage } from '@/pages/BlogPostPage';

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminBlogPage = lazy(() => import('@/pages/admin/AdminBlogPage').then((m) => ({ default: m.AdminBlogPage })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminPostFormPage = lazy(() => import('@/pages/admin/AdminPostFormPage').then((m) => ({ default: m.AdminPostFormPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));

type Phase = 'idle' | 'reading' | 'analyzing' | 'results';
type LoadingStage = 'reading' | 'extracting' | 'analyzing';
type CheckStatus = 'pass' | 'warn' | 'fail';
type Check = { label: string; detail: string; status: CheckStatus };
type CategoryScore = { label: 'Length' | 'Keyword Optimization' | 'Content' | 'Organization' | 'Misc.'; value: number; detail: string };
type Analysis = {
  score: number;
  parsing: number;
  relevance: number;
  categoryScores: CategoryScore[];
  checks: Check[];
  matched: string[];
  missing: string[];
  suggestions: string[];
};

type AiTextIssue = { category: string; severity: 'critical' | 'major' | 'minor'; detail: string; line?: string };
type AiRewriteSuggestion = { original: string; rewrite: string; reason: string };
type AiTextAnalysis = {
  grammarIssues: AiTextIssue[];
  weakBulletPoints: AiTextIssue[];
  missingQuantifiableAchievements: AiTextIssue[];
  missingKeywords: string[];
  rewriteSuggestions: AiRewriteSuggestion[];
  strengths: string[];
};
type AiFormatAnalysis = { formatScore: number; issues: string[]; suggestions: string[] };
type AiAnalysis = {
  textAnalysis: AiTextAnalysis | null;
  formatAnalysis: AiFormatAnalysis | null;
  errors: string[];
};

const queryClient = new QueryClient();

// Bundle the worker with Vite so it always matches the installed pdf.js version.
// Without this, pdf.js falls back to a missing worker URL and logs
// "No GlobalWorkerOptions.workerSrc specified." in the browser.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_EXTRACTED_TEXT_LENGTH = 80;
const NO_READABLE_TEXT_MESSAGE =
  'We could not find readable text in this file. Try a clearer image or export the resume as PDF, DOCX, or plain text.';

const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'being', 'below', 'between',
  'could', 'during', 'first', 'from', 'have', 'into', 'more', 'other', 'their',
  'there', 'these', 'those', 'through', 'using', 'where', 'which', 'while',
  'with', 'your', 'will', 'that', 'this', 'years', 'year', 'work', 'team',
  'role', 'looking', 'required', 'preferred', 'experience', 'ability',
]);

function getKeywords(text: string) {
  return getKeywordCounts(text).map(([word]) => word);
}

function getKeywordCounts(text: string) {
  const words: string[] = text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) ?? [];
  const counts = new Map<string, number>();
  words.forEach((word) => {
    const normalized = word.replace(/[.,]$/, '');
    if (!STOP_WORDS.has(normalized) && normalized.length > 3) {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    ;
}

const TOOL_KEYWORDS = new Set(['javascript', 'typescript', 'react', 'node.js', 'node', 'python', 'sql', 'excel', 'figma', 'aws', 'azure', 'docker', 'git', 'tableau', 'salesforce', 'powerpoint', 'html', 'css']);
const ACTION_KEYWORDS = new Set(['manage', 'lead', 'build', 'create', 'design', 'develop', 'deliver', 'analyze', 'improve', 'drive', 'support', 'coordinate', 'implement', 'launch', 'plan', 'write', 'communicate']);

function getKeywordCategory(word: string) {
  if (TOOL_KEYWORDS.has(word)) return 'Tools';
  if (ACTION_KEYWORDS.has(word)) return 'Responsibilities';
  return 'Core skills';
}

async function recognizeImage(source: Blob | HTMLCanvasElement, onProgress?: (message: string) => void) {
  onProgress?.('Reading text from the image');
  const worker = await createWorker('eng');
  const result = await worker.recognize(source);
  await worker.terminate();
  return result.data.text.trim();
}

async function extractPdfPageLines(page: import('pdfjs-dist').PDFPageProxy): Promise<string[]> {
const content = await page.getTextContent();
      const positioned = content.items.flatMap((item) => {
        if (!('str' in item) || typeof item.str !== 'string') return [];
        const transform = Array.isArray(item.transform) ? item.transform : [];
        const y = typeof transform[5] === 'number' ? transform[5] : 0;
        const x = typeof transform[4] === 'number' ? transform[4] : 0;
        return [{ str: item.str, y, x }];
      });
  // Sort top-to-bottom by baseline (descending y in PDF coordinates), then
  // left-to-right within a line. Items at the same height belong on the same
  // line, so right-aligned names/dates stay together instead of being merged
  // into the following paragraph.
  positioned.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: string[] = [];
  let currentY: number | null = null;
  for (const item of positioned) {
    if (currentY === null || Math.abs(item.y - currentY) > 3) {
      rows.push(item.str);
      currentY = item.y;
    } else if (item.str) {
      rows[rows.length - 1] += ' ' + item.str;
    }
  }
  return rows.map((row) => row.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

async function extractResumeText(file: File, onProgress?: (message: string) => void) {
  const buffer = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith('.pdf')) {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      onProgress?.(`Reading page ${index} of ${pdf.numPages}`);
      const page = await pdf.getPage(index);
      const pageText = (await extractPdfPageLines(page)).join('\n');
      pages.push(pageText);
    }
    const extractedText = pages.filter(Boolean).join('\n').trim();
    if (extractedText.length >= MIN_EXTRACTED_TEXT_LENGTH) {
      console.log('[Resume ATS] Raw extracted text:', extractedText);
      return sanitizeResumeText(extractedText);
    }

    onProgress?.('No text layer found â€” scanning the PDF locally');
    const worker = await createWorker('eng');
    const scannedPages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      onProgress?.(`Scanning page ${index} of ${pdf.numPages}`);
      const page = await pdf.getPage(index);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) continue;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      scannedPages.push(result.data.text.trim());
    }
    await worker.terminate();
    const scannedText = scannedPages.filter(Boolean).join('\n').trim();
    console.log('[Resume ATS] OCR extracted text:', scannedText);
    return sanitizeResumeText(scannedText);
  }

  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name)) {
    const extractedText = await recognizeImage(file, onProgress);
    console.log('[Resume ATS] Raw extracted text:', extractedText);
    return sanitizeResumeText(extractedText);
  }

  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    onProgress?.('Extracting text from the document');
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default ?? mammothModule;
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const extractedText = result.value.trim();
    console.log('[Resume ATS] Raw extracted text:', extractedText);
    return sanitizeResumeText(extractedText);
  }

  onProgress?.('Reading the uploaded text file');
  const extractedText = (await file.text()).trim();
  console.log('[Resume ATS] Raw extracted text:', extractedText);
  return sanitizeResumeText(extractedText);
}

function analyzeResume(resumeText: string, jobText: string): Analysis {
  const resume = resumeText.toLowerCase();
  const jobKeywords = getKeywords(jobText);
  const matched = jobKeywords.filter((word) => resume.includes(word));
  const missing = jobKeywords.filter((word) => !resume.includes(word)).slice(0, 6);
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(resume);
  const hasPhone = /\+?\d[\d\s().-]{7,}/.test(resume);
  const hasHeadings = /(experience|education|skills|summary|projects)/i.test(resume);
  const hasDates = /\b(20\d{2}|19\d{2})\b/.test(resume);
  const hasLongLines = resumeText.split('\n').some((line) => line.length > 180);
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const bulletCount = (resumeText.match(/(^|\n)\s*[â€¢â—â–ªâ—¦*-]\s+/g) ?? []).length;
  const hasExperience = /(experience|employment|work history|professional history)/i.test(resume);
  const lengthScore = wordCount === 0 ? 0 : wordCount < 180 ? 58 : wordCount <= 900 ? 92 : 72;
  const contentScore = Math.min(100, 42 + (hasEmail ? 12 : 0) + (hasPhone ? 10 : 0) + (hasExperience ? 18 : 0) + Math.min(18, bulletCount * 3));
  const organizationScore = Math.min(100, 38 + (hasHeadings ? 28 : 0) + (hasDates ? 16 : 0) + (hasExperience ? 12 : 0) + (hasLongLines ? 0 : 6));
  const miscScore = Math.min(100, 48 + (resumeText.length > 450 ? 18 : 0) + (!hasLongLines ? 14 : 0) + (hasEmail && hasPhone ? 20 : 0));
  const baseParsing = Math.min(98, 48 + (hasEmail ? 13 : 0) + (hasPhone ? 11 : 0) + (hasHeadings ? 13 : 0) + (hasDates ? 9 : 0) - (hasLongLines ? 8 : 0));
  const relevance = jobText.trim() ? Math.min(96, 48 + Math.round((matched.length / Math.max(jobKeywords.length, 1)) * 48)) : 74;
  const categoryScores: CategoryScore[] = [
    { label: 'Length', value: lengthScore, detail: wordCount < 180 ? 'Add enough detail to show scope, outcomes, and relevant experience.' : wordCount <= 900 ? 'Your resume length is within a comfortable scanning range.' : 'Consider trimming repetition so the strongest evidence is easier to find.' },
    { label: 'Keyword Optimization', value: relevance, detail: jobText.trim() ? `${matched.length} of ${jobKeywords.length} role signals appear in your resume.` : 'Add a job description for a tailored keyword comparison.' },
    { label: 'Content', value: contentScore, detail: hasExperience && bulletCount ? 'Your experience and action bullets give the resume useful evidence.' : 'Add an Experience section with clear action-and-result bullets.' },
    { label: 'Organization', value: organizationScore, detail: hasHeadings && hasDates ? 'Standard sections and dates make your timeline easier to follow.' : 'Use clear section headings and month/year dates for each role.' },
    { label: 'Misc.', value: miscScore, detail: hasEmail && hasPhone ? 'Contact details and text density look easy to scan.' : 'Make contact details complete and keep bullets concise.' },
  ];
  const score = Math.round(categoryScores.reduce((total, item) => total + item.value, 0) / categoryScores.length);
  const checks: Check[] = [
    { label: 'Text is selectable', detail: resumeText.length > 450 ? 'Your resume has a healthy text layer.' : 'Very little text was found. Check that this is not a scanned image.', status: resumeText.length > 450 ? 'pass' : 'warn' },
    { label: 'Contact details found', detail: hasEmail && hasPhone ? 'Email and phone number are easy to locate.' : hasEmail ? 'Email found; add a phone number for completeness.' : 'We could not confidently find an email address.', status: hasEmail && hasPhone ? 'pass' : hasEmail ? 'warn' : 'fail' },
    { label: 'Recognizable section headings', detail: hasHeadings ? 'Standard headings give parsers useful structure.' : 'Add clear headings like Experience, Skills, and Education.', status: hasHeadings ? 'pass' : 'warn' },
    { label: 'Chronology is discoverable', detail: hasDates ? 'Dates were found alongside your resume content.' : 'Add month and year to each role so your timeline is clear.', status: hasDates ? 'pass' : 'warn' },
    { label: 'No dense text blocks', detail: hasLongLines ? 'A few lines look dense; shorter bullets are easier to scan.' : 'Your line lengths look comfortable for parsing and reading.', status: hasLongLines ? 'warn' : 'pass' },
  ];
  const suggestions = [
    ...(missing.length ? [`Mirror the role's language naturally: add ${missing.slice(0, 3).join(', ')} where your experience supports it.`] : []),
    ...(!hasLongLines ? [] : ['Break long bullets into one clear action and one measurable outcome.']),
    ...(!hasPhone ? ['Add a phone number in your header so a recruiter can reach you quickly.'] : []),
    'Keep your strongest evidence near the top of each role: action, context, and result.',
  ].slice(0, 3);
  return { score, parsing: baseParsing, relevance, categoryScores, checks, matched: matched.length ? matched : ['communication', 'leadership', 'strategy'], missing, suggestions };
}

function PrivacyPill() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/.16)] bg-[hsl(var(--card)/.7)] px-3 py-1.5 text-[11px] font-semibold text-[hsl(var(--primary))]" data-testid="status-privacy">
      <LockKeyhole className="size-3.5" />
      Analyzed in your browser Â· never stored permanently
    </div>
  );
}

function UploadZone({ file, onFile, disabled }: { file: File | null; onFile: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const handleFile = (candidate?: File) => {
    if (!candidate) return;
    if (candidate.size > 8 * 1024 * 1024) {
      setFileError('That file is over 8 MB. Try a lighter export.');
      return;
    }
    setFileError('');
    onFile(candidate);
  };
  return (
    <div>
      <div
        className={`group relative overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-all duration-300 sm:p-8 ${dragging ? 'scale-[1.01] border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.12)]' : 'border-[hsl(var(--primary)/.24)] bg-[hsl(var(--card)/.6)] hover:border-[hsl(var(--primary)/.5)] hover:bg-[hsl(var(--card))]'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}
        data-testid="dropzone-resume"
      >
        <div className="absolute -right-10 -top-10 size-28 rounded-full bg-[hsl(var(--accent)/.15)] blur-2xl transition-transform duration-500 group-hover:scale-150" />
        <div className="relative flex flex-col items-center text-center">
          <div className={`mb-4 grid size-14 place-items-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] transition-transform duration-300 ${dragging ? 'scale-110 -translate-y-1' : 'group-hover:-translate-y-1'}`}>
            {file ? <FileText className="size-7" /> : <CloudUpload className="size-7" />}
          </div>
          {file ? (
            <>
              <div className="flex items-center gap-2 text-sm font-bold" data-testid="text-selected-file">{file.name}<CheckCircle2 className="size-4 text-[hsl(var(--primary))]" /></div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{(file.size / 1024).toFixed(0)} KB Â· ready to read</div>
              <button type="button" className="focus-ring mt-4 text-xs font-bold text-[hsl(var(--primary))] underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-4" onClick={() => inputRef.current?.click()} data-testid="button-change-file">Choose a different file</button>
            </>
          ) : (
            <>
              <div className="font-['Space_Grotesk'] text-lg font-bold tracking-[-.03em]">Drop your resume here</div>
              <p className="mt-1 max-w-[280px] text-sm leading-6 text-[hsl(var(--muted-foreground))]">PDF, DOCX, photo, or text file up to 8 MB. We read it locally in your browser.</p>
              <button type="button" className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-[0_4px_0_hsl(var(--primary)/.2)] transition-transform hover:-translate-y-0.5 active:translate-y-0" onClick={() => inputRef.current?.click()} data-testid="button-choose-file">
                <Upload className="size-4" /> Choose file
              </button>
            </>
          )}
          <input ref={inputRef} className="sr-only" type="file" accept="*/*" onChange={(event) => handleFile(event.target.files?.[0])} data-testid="input-resume-file" />
        </div>
      </div>
      {fileError && <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert" data-testid="error-file"><AlertCircle className="size-3.5" />{fileError}</div>}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const arcLength = Math.PI * 100;
  return (
    <div className="relative w-full max-w-[360px] shrink-0">
      <svg viewBox="0 0 260 155" className="w-full">
        <path d="M 30 125 A 100 100 0 0 1 230 125" fill="none" stroke="hsl(var(--primary) / .10)" strokeWidth="18" strokeLinecap="round" />
        <path className="score-ring" d="M 30 125 A 100 100 0 0 1 230 125" fill="none" stroke="hsl(var(--primary))" strokeWidth="18" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={arcLength - (arcLength * score) / 100} />
        <path d="M 30 125 A 100 100 0 0 1 230 125" fill="none" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={arcLength - (arcLength * score) / 100} />
        <text x="130" y="101" textAnchor="middle" className="fill-[hsl(var(--foreground))] font-['Space_Grotesk'] text-[29px] font-bold">{score}/100</text>
        <text x="130" y="123" textAnchor="middle" className="fill-[hsl(var(--muted-foreground))] text-[11px]">overall ATS score</text>
      </svg>
      <div className="absolute left-1/2 top-[56%] -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]" data-testid="text-score-status">{score >= 80 ? 'strong foundation' : score >= 60 ? 'room to improve' : 'needs attention'}</div>
    </div>
  );
}

function HeroScorePreview() {
  return (
    <div className="hero-score-frame">
      <div className="hero-score-window">
        <div className="flex items-center justify-between border-b border-[#e6e1dc] px-5 py-4"><div className="font-['Space_Grotesk'] text-sm font-bold text-[#202539]">Resume Score</div><X className="size-4 text-[#7c7c83]" /></div>
        <div className="px-5 pb-5 pt-4">
          <div className="mb-4 text-xs font-bold text-[#323542]">Overview</div>
          <div className="grid items-center gap-5 sm:grid-cols-[1fr_.9fr]">
            <div className="relative mx-auto w-full max-w-[240px]">
              <div className="hero-score-arc"><div className="hero-score-arc-cutout"><div className="font-['Space_Grotesk'] text-2xl font-bold text-[#202539]">88/100</div><div className="text-[10px] text-[#777a84]">15 Issues</div></div></div>
            </div>
            <div className="space-y-3">
              {[['Length', '80%', '#55cdb2'], ['Keyword Optimization', '80%', '#62d0b6'], ['Content', '60%', '#ff9c63'], ['Organization', '60%', '#d45d91'], ['Misc.', '60%', '#ff885d']].map(([label, value, color]) => <div className="flex items-center gap-2 text-[10px] text-[#626671]" key={label}><span className="size-2 rounded-full" style={{ backgroundColor: color }} /><span className="flex-1">{label}</span><span className="font-mono">{value}</span></div>)}
            </div>
          </div>
          <div className="mt-5 border-t border-[#e6e1dc] pt-4"><div className="flex items-center justify-between text-xs font-bold text-[#323542]"><span>Length</span><span className="rounded-full bg-[#ddf3e9] px-2 py-1 text-[10px] text-[#2c9b73]">80%</span></div><ul className="mt-3 space-y-2 text-[10px] leading-4 text-[#59606d]"><li>â€¢ Adding one more line to your resume is not going to help you stand out as a senior</li><li>â€¢ Adding your most recent job alone is not going to make you stand out in the current job market</li><li>â€¢ Best shot / fighting chance</li></ul></div>
        </div>
      </div>
    </div>
  );
}

function LoadingView({ stage, fileName, message }: { stage: LoadingStage; fileName?: string; message: string }) {
  const steps = [
    { label: 'File received', detail: fileName ?? 'Your resume' },
    { label: 'Reading resume', detail: 'Extracting words and sections' },
    { label: 'Checking structure', detail: 'Finding contact details and headings' },
    { label: 'Building your score', detail: 'Preparing clear next steps' },
  ];
  const activeIndex = stage === 'reading' ? 1 : stage === 'extracting' ? 2 : 3;
  return (
    <main className="grid min-h-[calc(100dvh-73px)] place-items-center px-5 py-12">
      <div className="w-full max-w-xl">
        <div className="mx-auto mb-7 grid size-20 place-items-center rounded-3xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-[0_16px_45px_hsl(var(--primary)/.12)]">
          <div className="relative"><LoaderCircle className="size-9 animate-spin" /><span className="absolute -right-2 -top-2 size-3 rounded-full bg-[hsl(var(--accent))] pulse-soft" /></div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">live resume check</div>
          <h1 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.05em] sm:text-4xl">Your resume is being checked</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]" aria-live="polite">{message}</p>
        </div>
        <div className="mt-8 space-y-2 text-left" aria-label="Resume checking progress">
          {steps.map((step, index) => {
            const complete = index < activeIndex;
            const active = index === activeIndex;
            return (
              <div key={step.label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${active ? 'border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.11)] shadow-[0_8px_24px_hsl(var(--primary)/.08)]' : 'border-[hsl(var(--border)/.7)] bg-[hsl(var(--card)/.7)]'}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${complete ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : active ? 'border border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                  {complete ? <Check className="size-3.5" /> : active ? <LoaderCircle className="size-3.5 animate-spin" /> : <span className="font-mono text-[10px]">{String(index + 1).padStart(2, '0')}</span>}
                </span>
                <span className="min-w-0 flex-1"><span className={`block text-sm font-bold ${active ? 'text-[hsl(var(--foreground))]' : ''}`}>{step.label}</span><span className="mt-0.5 block truncate text-[11px] text-[hsl(var(--muted-foreground))]">{step.detail}</span></span>
                <span className={`font-mono text-[9px] uppercase tracking-wider ${complete ? 'text-[hsl(var(--primary))]' : active ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{complete ? 'done' : active ? 'now' : 'next'}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--primary)/.1)]"><div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] transition-all duration-700" style={{ width: `${Math.max(25, ((activeIndex + 1) / steps.length) * 100)}%` }} /></div>
        <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-[hsl(var(--muted-foreground))]"><ShieldCheck className="size-3.5 text-[hsl(var(--primary))]" /> Nothing is uploaded or stored permanently.</div>
      </div>
    </main>
  );
}

const FAQ_ITEMS = [
  { question: 'What is the Resume Checker?', answer: 'It is a browser-based ATS readiness check that looks at the text, structure, contact details, length, bullets, and job-description language a typical hiring system can read.' },
  { question: 'Who is the Resume Checker for?', answer: 'It is for anyone applying for a role who wants a quick, practical read before sending a resume to a recruiter or an online application portal.' },
  { question: 'How do I access the Resume Checker tool?', answer: 'No account is needed. Upload a PDF, DOCX, image, or text file from the homepage, optionally paste a job description, and select Analyze my resume.' },
  { question: 'What file formats does the Resume Checker accept?', answer: 'The checker accepts PDF, DOCX, common resume images, and readable text files up to 8 MB. Image files and scanned PDFs are read locally with browser OCR.' },
  { question: 'How does the Resume Checker evaluate my resume?', answer: 'The score combines machine-readable text, contact details, recognizable sections, chronology, content density, and the match between your resume and the job description.' },
  { question: 'How long does it take to get a good ATS score?', answer: 'There is no universal target, but a clear structure and specific evidence usually make the biggest difference. Use the report as a prioritized checklist, not a pass-or-fail verdict.' },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">good questions deserve clear answers</div>
        <h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em] sm:text-5xl">Frequently asked questions</h2>
      </div>
      <div className="mt-9 space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div className={`overflow-hidden rounded-2xl border transition-colors ${isOpen ? 'border-[hsl(var(--primary)/.32)] bg-[hsl(var(--card))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)]'}`} key={item.question}>
              <button type="button" onClick={() => setOpen(isOpen ? null : index)} className="focus-ring flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6" aria-expanded={isOpen}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full transition-colors ${isOpen ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Plus className={`size-4 transition-transform ${isOpen ? 'rotate-45' : ''}`} /></span>
                <span className="flex-1 text-sm font-bold sm:text-base">{item.question}</span>
                <ChevronDown className={`size-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <div className="border-t border-[hsl(var(--border)/.7)] px-5 pb-5 pl-16 text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:px-6 sm:pl-[4.5rem]">{item.answer}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FreeToolsPage() {
  const [, setLocation] = useLocation();
  const [jobText, setJobText] = useState('');
  const [copied, setCopied] = useState(false);
  const keywords = useMemo(() => getKeywords(jobText), [jobText]);
  const templateText = `YOUR NAME\nCity, Country Â· email@example.com Â· +91 00000 00000 Â· linkedin.com/in/yourname\n\nSUMMARY\nWrite a two-line summary focused on the role you want.\n\nEXPERIENCE\nCompany Name â€” Role | 2022â€“Present\nâ€¢ Action verb + what you changed + measurable result.\nâ€¢ Add tools, scope, and outcomes that match the target role.\n\nSKILLS\nTools, technologies, methods, and domain strengths\n\nEDUCATION\nDegree â€” University | Year`;
  const downloadTemplate = () => {
    const blob = new Blob([templateText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'goodspace-resume-template.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const copyKeywords = async () => {
    if (!keywords.length) return;
    await navigator.clipboard.writeText(keywords.join(', '));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => setLocation('/')} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-[hsl(var(--primary)/.16)] bg-[hsl(var(--primary))] px-6 py-12 text-[hsl(var(--primary-foreground))] shadow-[0_22px_70px_hsl(var(--primary)/.16)] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border-[24px] border-[hsl(var(--accent)/.45)]" />
          <div className="pointer-events-none absolute -bottom-28 right-24 size-64 rounded-full border-[16px] border-[hsl(var(--primary-foreground)/.08)]" />
          <div className="relative max-w-2xl">
            <div className="font-mono text-[10px] uppercase tracking-[.24em] text-[hsl(var(--accent))]">free tools Â· always private</div>
            <h1 className="mt-4 max-w-2xl font-['Space_Grotesk'] text-4xl font-bold leading-[.98] tracking-[-.07em] sm:text-7xl">Everything you need to move your career forward.</h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-[hsl(var(--primary-foreground)/.74)] sm:text-base">Start with a stronger resume, find the language inside a job description, and make your next application more intentional.</p>
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_50px_hsl(var(--primary)/.06)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileDown className="size-5" /></div>
                <h2 className="mt-6 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Free resume template</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A simple, ATS-friendly starting point with room for proof, outcomes, and the keywords that matter.</p>
              </div>
              <span className="rounded-full bg-[hsl(var(--accent)/.3)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--accent-foreground))]">free</span>
            </div>
            <div className="mt-7 rounded-2xl border border-dashed border-[hsl(var(--primary)/.22)] bg-[hsl(var(--background)/.7)] p-4 font-mono text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">
              <div className="font-bold text-[hsl(var(--foreground))]">YOUR NAME</div>
              <div className="mt-2 h-1.5 w-24 rounded-full bg-[hsl(var(--primary)/.2)]" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2"><span>SUMMARY</span><span>EXPERIENCE</span><span>SKILLS</span><span>EDUCATION</span></div>
            </div>
            <button type="button" onClick={downloadTemplate} className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5"><Download className="size-4" /> Download free template</button>
          </article>

          <article className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_50px_hsl(var(--primary)/.06)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileSearch className="size-5" /></div>
                <h2 className="mt-6 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Job description keyword finder</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Paste a role description to surface the words worth checking against your resume.</p>
              </div>
              <span className="rounded-full bg-[hsl(var(--accent)/.3)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--accent-foreground))]">free</span>
            </div>
            <textarea value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="Paste a job description here..." className="focus-ring mt-7 min-h-32 w-full resize-y rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.7)] p-3 text-sm leading-6 outline-none focus:border-[hsl(var(--primary)/.5)]" aria-label="Job description for keyword finder" />
            <div className="mt-4 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>{keywords.length ? `${keywords.length} role keywords found` : 'Your keywords will appear here'}</span>{keywords.length > 0 && <button type="button" onClick={copyKeywords} className="focus-ring inline-flex items-center gap-1 font-bold text-[hsl(var(--primary))]">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy list'}</button>}</div>
            <div className="mt-4 flex min-h-16 flex-wrap content-start gap-2">
              {keywords.map((keyword) => <span key={keyword} className="rounded-lg border border-[hsl(var(--primary)/.15)] bg-[hsl(var(--primary)/.07)] px-2.5 py-1.5 font-mono text-[11px] text-[hsl(var(--primary))]">{keyword}</span>)}
            </div>
          </article>
        </section>
        <div className="mt-10 flex justify-center"><Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold transition-colors hover:bg-[hsl(var(--secondary))]">Back to Resume Checker <ArrowRight className="size-4" /></Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}

function FreeToolsHubPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-[hsl(var(--primary)/.16)] bg-[hsl(var(--primary))] px-6 py-12 text-[hsl(var(--primary-foreground))] shadow-[0_22px_70px_hsl(var(--primary)/.16)] sm:px-12 sm:py-16"><div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border-[24px] border-[hsl(var(--accent)/.45)]" /><div className="relative max-w-2xl"><div className="font-mono text-[10px] uppercase tracking-[.24em] text-[hsl(var(--accent))]">free tools Â· always private</div><h1 className="mt-4 max-w-2xl font-['Space_Grotesk'] text-4xl font-bold leading-[.98] tracking-[-.07em] sm:text-7xl">Choose a tool for your next application.</h1><p className="mt-6 max-w-xl text-sm leading-7 text-[hsl(var(--primary-foreground)/.74)] sm:text-base">Pick a resume format or pull the important language out of a job description. Both tools are free, browser-based, and designed to help you move with more clarity.</p></div></section>
        <section className="mt-12 grid gap-5 lg:grid-cols-2"><Link href="/free-tools/templates" className="tool-choice-card group"><div className="flex items-start justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileDown className="size-5" /></div><ArrowRight className="size-5 text-[hsl(var(--primary))] transition-transform group-hover:translate-x-1" /></div><div className="mt-8 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">tool 01 Â· resume templates</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Find a resume format that fits your story.</h2><p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Browse multiple ATS-friendly formatsâ€”from classic single-column to modern and executive layoutsâ€”and download the one that feels right.</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">Browse templates <ArrowRight className="size-4" /></span></Link><Link href="/free-tools/keyword-finder" className="tool-choice-card group"><div className="flex items-start justify-between"><div className="grid size-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileSearch className="size-5" /></div><ArrowRight className="size-5 text-[hsl(var(--primary))] transition-transform group-hover:translate-x-1" /></div><div className="mt-8 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">tool 02 Â· keyword finder</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">See the language inside any job description.</h2><p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Paste a job description to find repeated skills, tools, and responsibilities before you tailor your resume.</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">Open keyword finder <ArrowRight className="size-4" /></span></Link></section>
      <section className="mt-12 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-7 sm:p-10 lg:grid-cols-[.85fr_1.15fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">free and private</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Every tool works in your browser.</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>None of the free tools require an account, a payment, or an upload to a remote server. Your resume, your job description, and your keyword selection stay on your device from start to finish. We built them this way because career documents deserve the same privacy you would expect from any serious conversation about your work.</p><p>That simplicity has a practical benefit too: speed. Everything runs locally, so there is no upload queue, no waiting for a cloud process, and no throttled free tier. Open a tool, load a file or paste some text, and the answer appears in seconds.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">getting started</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Which tool should you start with?</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>If you have a job description in hand and a resume you intend to send, start with the <Link href="/free-tools/keyword-finder" className="font-bold text-[hsl(var(--primary))]">keyword finder</Link>. It turns the common instruction to tailor your application into a concrete list of repeated terms, which is the highest-signal edit most resumes need. If your resume is the thing you are unsure about, start with the <Link href="/free-tools/templates" className="font-bold text-[hsl(var(--primary))]">templates</Link> to lock in clean structure, then run the resume through the main checker to confirm the parses and expressions read well.</p><p>The two tools are designed to be used in either order. Templates give your document a reliable skeleton, keywords give it the right vocabulary, and the checker confirms both at once. There is no wrong starting point; picking any task and finishing it is more useful than planning forever. People who paste a job description first usually land on the finder; people who feel stuck on layout usually land on the templates. Both groups meet at the main checker for the final pass, and both finish with a file that parses cleanly and a list of honest language to carry into the interview.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">how they fit together</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A three-step workflow most candidates like</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The free tools work best as a small pipeline rather than isolated utilities. This order takes most applicants from a generic resume to a tailored one in under an hour.</p></div><div className="mt-8 space-y-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Step one: choose a template.</strong> Open the templates page, pick the format that matches your seniority and industry, and download a plain-text or formatted version. A single-column layout with real text is the safest foundation because it parses cleanly in almost every system.</p><p><strong className="text-[hsl(var(--foreground))]">Step two: run the keyword finder.</strong> Paste the job description and copy the ranked list of repeated skills, tools, and responsibilities. Strip out anything that is not true for you, then fold the honest terms into the relevant sections of your resume using your own phrasing.</p><p><strong className="text-[hsl(var(--foreground))]">Step three: check the finished file.</strong> Upload the edited resume to the main ATS checker, with the job description in hand, and confirm that length, keywords, content, and organization all score well. The report will still list a few unmatched terms; those are prompts to check your wording, not commands to invent experience. Every step above is a session, not a project: the whole loop fits in one tea break, and it is designed to be repeated until the bars sit in the healthy range.</p></div></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="font-['Space_Grotesk'] text-xl font-bold">What the templates give you</div><p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Four downloadable formats designed for scanning: Classic ATS for reliability, Modern Professional for visual hierarchy, Executive for leadership roles, and Minimal for quiet, compact resumes. Descriptions and download names make it easy to tell formats apart, and each one keeps the standard headings systems recognize.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="font-['Space_Grotesk'] text-xl font-bold">What the keyword finder gives you</div><p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A ranked list of the language a job description repeats, filtered into core skills, tools, and responsibilities. The most frequent terms rise to the top, matching the way automated screens tend to weight repeated role language. One click copies the whole list for editing.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">privacy questions</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Plain answers about where your data goes</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">Does the keyword finder upload my job description?</strong> No. The text is processed in your browser and stays on your device. You can refresh at any time and it disappears.</p><p><strong className="text-[hsl(var(--foreground))]">Are the templates tied to an account?</strong> No. They download directly with no registration, and nothing about your selection is recorded anywhere.</p><p><strong className="text-[hsl(var(--foreground))]">Is there a premium tier where privacy is weaker?</strong> No. The suite is free and private without needing to upgrade out of either promise. Optional AI analysis on the main checker is the only feature that contacts a network, and it explains exactly what is sent before you use it.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">coming next</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What we are considering, and how to vote</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>Ideas on the current list include a side-by-side resume comparison, a cover letter checker, an interview question prompt list from the skills in your resume, and regional resume format presets. Nothing here is promised, and everything depends on whether it genuinely helps the people who send applications.</p><p>Your request is your vote. Write to us on the contact page with the tool you want, describe the moment it would help, and the most requested ideas rise to the top of the roadmap. We would rather build one tool people use every week than three they open once.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">who uses these</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Built different ways, useful the same way</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">Students writing a first resume.</strong> The templates remove the blank-page problem and the keyword finder makes the first tailoring attempt concrete instead of abstract.</p><p><strong className="text-[hsl(var(--foreground))]">Career changers translating old experience.</strong> The category split in the finder highlights where familiar tools and responsibilities appear, which is exactly the vocabulary a new field expects.</p><p><strong className="text-[hsl(var(--foreground))]">Mature professionals running a weekend pipeline.</strong> Download a fresh format, pull keywords from a handful of listings, and re-check each tailored version quickly before sending.</p><p><strong className="text-[hsl(var(--foreground))]">Anyone who values privacy.</strong> No account, no tracking, no upload queue. You can paste sensitive job research and company names knowing nothing leaves the window.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">honest limits</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What these tools cannot do, said plainly</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>No tool here guarantees an interview, a callback, or a job. A template makes a document legible, keywords make it relevant, and the checker confirms both, but the role itself is decided by people at a real desk. Any service that promises outcomes it cannot deliver is not being helpful, it is selling anxiety.</p><p>The tools also read text and structure, not truth. They cannot tell whether a bullet describes work you performed or merely imagined; only an interview can test that. That is why every suggestion on this site repeats one rule: tailor with your real experience, never with invented claims.</p><p>Finally, blank-page paralysis, salary negotiation, and the emotional weight of a long search are outside a resume tool's reach. If your search feels unmanageable, a supported conversation with people you trust will do more than any checker, and we cheerfully point you in that direction.</p><p>And whenever you come back, these tools are still free, still local, and still built for one job at a time.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">which one first</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A sixty-second test to pick your starting tool</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Answer two quick questions and the choice becomes obvious rather than a coin flip.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Do you have a finalised resume and a specific listing?</strong> Start with the keyword finder, tailor your language, then run the checker on the finished file with the same description to confirm the bars.</p><p><strong className="text-[hsl(var(--foreground))]">Is your resume more of a draft, or do you feel unsure how to lay it out?</strong> Start with a template to lock in structure, then follow the same checker step. Structure arrives first, vocabulary second, verification third.</p><p><strong className="text-[hsl(var(--foreground))]">Both paths converge.</strong> Whichever you choose, the end point is the same: a clean file with honest language and a five-signal score you can read at a glance. The only wrong answer is leaving the resume untouched because you could not decide where to begin.</p></div></section>
        <section className="mt-6 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-3xl font-bold text-[hsl(var(--primary))]">2</div><div className="mt-2 text-sm font-bold">free tools today</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Resume templates and a job description keyword finder, with more on the way based on your feedback.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-3xl font-bold text-[hsl(var(--primary))]">0</div><div className="mt-2 text-sm font-bold">accounts or payments</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">No gatekeeping. Close any page and come back whenever the search resumes.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-3xl font-bold text-[hsl(var(--primary))]">100%</div><div className="mt-2 text-sm font-bold">local processing</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Files and pasted text never travel to our servers for the free tools.</p></div></section>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck className="size-4 text-[hsl(var(--primary))]" /> The free tools are part of the GoodSpace suite explained on our about page.</div>
        <section className="mt-8 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">resume help</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Guides for the situations that trip resumes up</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The tools above work for any document; these guides go deeper on the audience and market behind each application, whether you are a fresher, in tech, targeting a government post, or job hunting from a specific Haryana or NCR city.</p></div><div className="mt-6 flex flex-wrap gap-2"><Link href="/resume-help/freshers" className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">First-job resumes</Link><Link href="/resume-help/it-jobs" className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">IT & tech roles</Link><Link href="/resume-help/government-jobs" className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">Government applications</Link><Link href="/resume-help/digital-marketing" className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">Digital marketing</Link><Link href="/resume-help/remote-jobs" className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">Remote & WFH</Link><Link href="/resume-help" className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary)/.45)] hover:text-[hsl(var(--primary))]">All guides & city pages</Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

const RESUME_TEMPLATES = [
  { name: 'Classic ATS', label: 'Clean & reliable', description: 'A straightforward single-column format built for easy scanning.', variant: 'classic', fileName: 'goodspace-classic-ats-resume.txt' },
  { name: 'Modern Professional', label: 'Balanced & modern', description: 'A polished layout with a stronger visual hierarchy for experienced applicants.', variant: 'modern', fileName: 'goodspace-modern-professional-resume.txt' },
  { name: 'Executive', label: 'Focused & confident', description: 'A bold header and spacious sections for leadership and senior roles.', variant: 'executive', fileName: 'goodspace-executive-resume.txt' },
  { name: 'Minimal', label: 'Simple & calm', description: 'A quiet, compact format that keeps attention on your achievements.', variant: 'minimal', fileName: 'goodspace-minimal-resume.txt' },
] as const;

function TemplatePreview({ variant }: { variant: string }) {
  return (
    <div className={`template-preview template-preview-${variant}`}>
      <div className="template-sheet">
        <div className="template-name">YOUR NAME</div>
        <div className="template-contact">email@example.com Â· +91 00000 00000 Â· linkedin.com/in/yourname</div>
        <div className="template-rule" />
        <div className="template-columns">
          <div className="template-main"><div className="template-heading">EXPERIENCE</div><div className="template-line template-line-wide" /><div className="template-line" /><div className="template-line template-line-short" /><div className="template-heading template-heading-gap">PROJECTS</div><div className="template-line template-line-wide" /><div className="template-line" /><div className="template-line template-line-short" /></div>
          <div className="template-side"><div className="template-heading">SKILLS</div><div className="template-line" /><div className="template-line template-line-short" /><div className="template-heading template-heading-gap">EDUCATION</div><div className="template-line" /><div className="template-line template-line-short" /></div>
        </div>
      </div>
    </div>
  );
}

function downloadResumeTemplate(template: (typeof RESUME_TEMPLATES)[number]) {
  const templateText = `${template.name.toUpperCase()}\n\nYOUR NAME\nCity, Country Â· email@example.com Â· +91 00000 00000 Â· linkedin.com/in/yourname\n\nSUMMARY\nWrite a focused two-line summary for the role you want.\n\nEXPERIENCE\nCompany Name â€” Role | 2022â€“Present\nâ€¢ Action verb + what you changed + measurable result.\nâ€¢ Add tools, scope, and outcomes that match the target role.\n\nSKILLS\nTools, technologies, methods, and domain strengths\n\nEDUCATION\nDegree â€” University | Year`;
  const blob = new Blob([templateText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = template.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ResumeTemplatesPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">free tools Â· resume templates</div><h1 className="mt-3 font-['Space_Grotesk'] text-5xl font-bold leading-[.96] tracking-[-.08em] sm:text-7xl">A better format is a better starting point.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[hsl(var(--muted-foreground))]">Choose a clean, editable resume format that makes your experience easy to scan. Every option keeps the structure simple and ATS-friendly.</p></div><Link href="/free-tools" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-xs font-bold hover:bg-[hsl(var(--secondary))]">All free tools <ArrowRight className="size-4" /></Link></div>
        <section className="mt-12 grid gap-5 sm:grid-cols-2">{RESUME_TEMPLATES.map((template, index) => <article className="template-card" key={template.name}><TemplatePreview variant={template.variant} /><div className="mt-6 flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">format 0{index + 1}</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">{template.name}</h2></div><span className="rounded-full bg-[hsl(var(--accent)/.35)] px-2.5 py-1 font-mono text-[10px] text-[hsl(var(--accent-foreground))]">free</span></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{template.description}</p><button type="button" onClick={() => downloadResumeTemplate(template)} className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5"><Download className="size-4" /> Download format</button></article>)}</section>
        <section className="mt-8 grid gap-4 rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.35)] p-6 sm:grid-cols-3 sm:p-8"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">keep it readable</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use familiar headings, real text, and enough breathing room for recruiters and parsers.</p></div><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">show evidence</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Turn responsibilities into concise bullets with context, action, and measurable outcomes.</p></div><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">tailor honestly</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use keywords that reflect your real experience instead of copying every phrase from a listing.</p></div></section>
        <section className="mt-8 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-7 sm:p-10 lg:grid-cols-[.85fr_1.15fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">how to choose</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Which resume format should you pick?</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>Format matters less than people think and more than it should. The most important requirement is that your resume scans cleanly: one column, real text, and familiar headings. Once those basics are in place, the choice between formats comes down to your industry and your seniority.</p><p>The Classic ATS format is the safest default for corporate roles, government applications, and any portal powered by older software. Modern Professional suits design and tech roles where a little visual hierarchy communicates polish. Executive adds the space and confidence that leadership experience benefits from, and Minimal keeps a quiet, focused layout for anyone whose evidence should do all the talking.</p></div></section>
        <section className="mt-6 grid gap-5 sm:grid-cols-4"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Classic ATS</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Best when you apply through large portals, government systems, or roles where experience alone should win.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Modern</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Adds subtle hierarchy for creative and product roles while keeping the structure parser-friendly.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Executive</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Spacious and confident, built for leadership, boards, and senior advisory positions.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Minimal</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Quiet and compact, ideal when your outcomes should carry the entire story.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-10"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">next step</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Download a format, then check it for free.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--primary-foreground)/.8)]">Templates are a starting point. After you fill one in, run it through the ATS checker to confirm the structure parses cleanly and catch any wording that deserves one more edit.</p></div><Link href="/" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary))] shadow-[0_6px_18px_hsl(var(--primary)/.25)] transition-transform hover:-translate-y-0.5">Check my resume free <ArrowRight className="size-4" /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

function KeywordFinderPage() {
  const [jobText, setJobText] = useState('');
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('All');
  const keywordItems = useMemo(() => getKeywordCounts(jobText).map(([word, count]) => ({ word, count, category: getKeywordCategory(word) })), [jobText]);
  const visibleKeywords = filter === 'All' ? keywordItems : keywordItems.filter((item) => item.category === filter);
  const categories = ['All', 'Core skills', 'Tools', 'Responsibilities'];
  const topKeyword = keywordItems[0]?.word ?? 'â€”';
  const copyKeywords = async () => {
    if (!keywordItems.length) return;
    try {
      await navigator.clipboard.writeText(keywordItems.map((item) => item.word).join(', '));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6"><div className="max-w-3xl"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]"><FileSearch className="size-3.5" /> free tools Â· keyword finder</div><h1 className="mt-3 font-['Space_Grotesk'] text-5xl font-bold leading-[.96] tracking-[-.08em] sm:text-7xl">Find the words your next role keeps repeating.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[hsl(var(--muted-foreground))]">Paste a job description and get a practical list of repeated language. Use it as a checklist while tailoring your resumeâ€”never as a reason to claim experience you do not have.</p></div><Link href="/free-tools" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-xs font-bold hover:bg-[hsl(var(--secondary))]">All free tools <ArrowRight className="size-4" /></Link></div>
        <section className="mt-12 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">01 Â· paste the role</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Job description</h2></div><span className="text-xs text-[hsl(var(--muted-foreground))]">{jobText.length}/5,000 characters</span></div><textarea value={jobText} onChange={(event) => setJobText(event.target.value.slice(0, 5000))} placeholder="Paste the full job description here..." className="focus-ring mt-6 min-h-48 w-full resize-y rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.7)] p-4 text-sm leading-7 outline-none focus:border-[hsl(var(--primary)/.5)]" aria-label="Job description for keyword finder" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Repeated words are ranked first. Common filler words are filtered out.</p><div className="flex gap-2">{jobText && <button type="button" onClick={() => { setJobText(''); setFilter('All'); }} className="focus-ring rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold hover:bg-[hsl(var(--secondary))]">Clear</button>}<button type="button" disabled={!keywordItems.length} onClick={copyKeywords} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:cursor-not-allowed disabled:opacity-40">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy keyword list'}</button></div></div></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-3"><div className="stat-card"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">keywords found</div><div className="mt-2 font-['Space_Grotesk'] text-3xl font-bold text-[hsl(var(--primary))]">{keywordItems.length}</div></div><div className="stat-card"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">most repeated</div><div className="mt-2 truncate font-['Space_Grotesk'] text-2xl font-bold">{topKeyword}</div></div><div className="stat-card"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">role text</div><div className="mt-2 font-['Space_Grotesk'] text-3xl font-bold text-[hsl(var(--accent))]">{jobText.trim() ? `${jobText.trim().split(/\s+/).length} words` : 'â€”'}</div></div></section>
        <section className="mt-8 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">02 Â· review the signal</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Your keyword map</h2></div><span className="text-xs text-[hsl(var(--muted-foreground))]">{visibleKeywords.length} shown</span></div><div className="mt-5 flex flex-wrap gap-2">{categories.map((category) => <button type="button" key={category} onClick={() => setFilter(category)} className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${filter === category ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'}`}>{category}{category !== 'All' && <span className="ml-1 opacity-70">({keywordItems.filter((item) => item.category === category).length})</span>}</button>)}</div>{visibleKeywords.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleKeywords.map((item) => <div className="keyword-result-card" key={item.word}><div className="flex items-center justify-between gap-3"><span className="font-['Space_Grotesk'] text-lg font-bold">{item.word}</span><span className="rounded-full bg-[hsl(var(--accent)/.35)] px-2 py-1 font-mono text-[10px] text-[hsl(var(--accent-foreground))]">{item.count}Ã—</span></div><div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><span>{item.category}</span><span>{Math.min(100, item.count * 22)}% signal</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${Math.min(100, item.count * 22)}%` }} /></div></div>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[hsl(var(--border))] px-6 py-12 text-center"><ScanText className="mx-auto size-8 text-[hsl(var(--primary))]" /><h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold">Your keyword map will appear here.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Paste a job description above to surface the skills, tools, and responsibilities worth checking.</p></div>}</section>
        <div className="mt-8 flex items-start gap-2 text-xs leading-6 text-[hsl(var(--muted-foreground))]"><ShieldCheck className="mt-1 size-4 shrink-0 text-[hsl(var(--primary))]" />This tool runs in your browser. Your job description is not uploaded or stored permanently.</div>
        <section className="mt-8 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-[.85fr_1.15fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">more about keywords</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How to use the keyword list well</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>Repeated words in a job description are a strong hint about what the role does every day. Our finder ranks phrases by how often the description repeats them, so the most characteristic language rises to the top. That ordering is more useful than a simple alphabetical list, because frequency is exactly what automated matching tends to notice too.</p><p>Use the list as a checklist against your real experience. For every term, ask whether you can point to a task, a project, or an outcome that proves it. If yes, make sure the word appears somewhere natural in your resume, usually in the relevant bullet. If not, leave it out. The tool is designed to reduce guesswork, not to encourage invented experience.</p></div></section>
        <section className="mt-6 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Ranked by repetition</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Frequency is a practical proxy for importance. The words a listing says the most are usually the words a screening system weights the most.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Filtered by category</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Tools, responsibilities, and core skills are separated so you can spot gaps at a glance instead of staring at one long list.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Copied in one click</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Save the list next to your resume while editing, then delete it from your clipboard when the application is sent.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-2"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">step by step</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How to turn the list into a better resume</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Read the list twice.</strong> The first pass is for recognition: which terms describe what you already do? The second pass is for honesty: which terms would you struggle to prove in an interview? Everything in group two leaves the list.</p><p><strong className="text-[hsl(var(--foreground))]">Match terms to bullets, not just a skills list.</strong> A keyword in the skills section helps, but the same term inside a relevant responsibility reads as evidence. For the strongest results, each important term should appear in at least one bullet that shows the outcome behind it.</p><p><strong className="text-[hsl(var(--foreground))]">Use synonyms sparingly.</strong> A job description says the system searches for certain words, and job descriptions often repeat exact phrases. Using the same vocabulary the employer chose is normally the safe path; inventing new phrasing for the same idea risks being missed.</p><p><strong className="text-[hsl(var(--foreground))]">Re-run after editing.</strong> After you adjust your resume, paste the description back into this finder, then run the full ATS check on the checker page. The matched list should grow, and the unmatched list should shrink to terms you consciously decided to leave out.</p></div></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">reading the results</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What the categories reveal about the role</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The finder separates every term into one of three buckets, and the mix of those buckets tells you something about the job before you even apply.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Core skills.</strong> The everyday vocabulary of the position, often the terms a screener weights first. If your resume has nothing in this category, the role may be a stretch, or your wording may simply use different words for the same ability. Reword honestly and re-check.</p><p><strong className="text-[hsl(var(--foreground))]">Tools.</strong> The named software, platforms, and frameworks. Tools are the easiest to verify quickly, and they are also the easiest place to be caught bluffing. Only include tools you have actually used in a professional context.</p><p><strong className="text-[hsl(var(--foreground))]">Responsibilities.</strong> The verbs and outcomes the role centres on, such as leading, reporting, forecasting, or onboarding. These terms map most directly to the bullets in your experience section and are worth matching phrase for phrase.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">limitations</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Keep these honest caveats in mind</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">Frequency is not meaning.</strong> A term repeated because the description was written by committee may rank high without being vital. Read the list as a starting map, then apply judgment.</p><p><strong className="text-[hsl(var(--foreground))]">The finder reads text, not your career.</strong> It cannot weigh whether you performed a role or merely listed it. That weighing is exactly what the interview is for, and no keyword list changes it.</p><p><strong className="text-[hsl(var(--foreground))]">No match is a note, not a failure.</strong> An unmatched term is a prompt to check your wording or consciously choose to skip it. A resume that honestly skips nine out of ten terms may or may not fit the role; the checker will show you, and you decide.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">privacy reminder</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Everything in this tool stays in this window</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The text you paste is tokenized in your browser and discarded when you leave or refresh. There is no account, no upload queue, and no history of the roles you have researched. That is intentional: the job-description keywords you search for are private career research, and we have no reason to see it. You can use the finder as often as you like, for as many roles as you like, and the only copy of what you looked at is the one in your head.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">advanced patterns</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Three patterns experienced candidates use</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Once the basics are comfortable, these habits get even more value from the same tool.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Compare two role variants for one company.</strong> Paste the description from a team lead role and a senior individual-contributor role for similar jobs. The keyword difference between them is a mini job map: leadership language usually appears in one set, technical tools in the other.</p><p><strong className="text-[hsl(var(--foreground))]">Harvest keywords from three similar listings at once.</strong> Paste the three descriptions together and let repetition do the work. Terms that survive across all three are the truest picture of the role and the safest to emphasise on your resume.</p><p><strong className="text-[hsl(var(--foreground))]">Use the list as interview preparation, not just resume editing.</strong> The responsibilities bucket is a forecast of the questions you will face. Coming to the interview with your own answers to each repeated responsibility is a deceptively simple edge.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">cleaning the list</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Trim the rough edges before you copy</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Drop near-duplicates.</strong> If the description says both 'JavaScript' and 'JS', keep the term you would actually write on your resume and ignore the alias. Matching one clean version beats splitting signal across two spellings.</p><p><strong className="text-[hsl(var(--foreground))]">Keep only terms you can name on a call.</strong> A word you cannot explain in a sentence and support with an example is a liability, not an asset. The list is a mirror of the role, and your resume should only echo the honest parts.</p><p><strong className="text-[hsl(var(--foreground))]">Preserve multi-word phrases you recognise.</strong> Terms like 'cross-functional collaboration' carry meaning a bare word loses. When the description repeats a full phrase, keep the phrase together on your resume so it reads the same way to a screener.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-10"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">put it to work</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Found the language? Check your resume against it.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--primary-foreground)/.8)]">The ATS checker compares your resume with any job description you provide and shows exactly which role signals already appear in your document.</p></div><Link href="/" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary))] shadow-[0_6px_18px_hsl(var(--primary)/.25)] transition-transform hover:-translate-y-0.5">Run the ATS check <ArrowRight className="size-4" /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Home({ onAnalysisComplete, onReset: clearApp }: { onAnalysisComplete: (analysis: Analysis, file: File, jobDescription: string, resumeText: string) => void; onReset: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('reading');
  const [loadingMessage, setLoadingMessage] = useState('Opening your file locally. Nothing leaves this tab.');
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [localKeywordPlan, setLocalKeywordPlan] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const hasJob = jobDescription.trim().length > 30;
  const keywordCount = useMemo(() => getKeywords(jobDescription).length, [jobDescription]);

  const runAnalysis = async () => {
    if (!file) {
      setError('Add your resume first so we have something to check.');
      return;
    }
    setError('');
    setPhase('reading');
    setLoadingStage('reading');
    setLoadingMessage('Opening your file locally. Nothing leaves this tab.');
    try {
      const extractedText = await extractResumeText(file, (message) => {
        setLoadingStage('extracting');
        setLoadingMessage(message);
      });
      await new Promise((resolve) => setTimeout(resolve, 650));
      setPhase('analyzing');
      setLoadingStage('analyzing');
      setLoadingMessage('Comparing length, keywords, content, organization, and readability.');
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (extractedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
        throw new Error(NO_READABLE_TEXT_MESSAGE);
      }
      const nextAnalysis = analyzeResume(extractedText, jobDescription);
      setAnalysis(nextAnalysis);
      setResumeText(extractedText);
      onAnalysisComplete(nextAnalysis, file, jobDescription, extractedText);
      setPhase('results');
      setLocation('/score');
    } catch (caught) {
      setPhase('idle');
      setError(caught instanceof Error ? caught.message : 'We could not read that file. Try a clearer image or export it as PDF, DOCX, or plain text.');
    }
  };

  const reset = () => {
    setPhase('idle');
    setFile(null);
    setJobDescription('');
    setAnalysis(null);
    setResumeText('');
    setLocalKeywordPlan([]);
    setError('');
    clearApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (phase === 'reading' || phase === 'analyzing') return <><Header onReset={reset} /><LoadingView stage={loadingStage} fileName={file?.name} message={loadingMessage} /><SiteFooter /></>;
  if (phase === 'results' && analysis) return <><Header onReset={reset} /><Results analysis={analysis} file={file} resumeText={resumeText} onReset={reset} resultRef={{ current: null }} keywordPlan={localKeywordPlan} setKeywordPlan={setLocalKeywordPlan} /></>;

  return (
    <div className="home-page min-h-[100dvh] overflow-hidden">
      <Header onReset={reset} />
      <main className="relative overflow-hidden pb-20">
        <section className="home-hero relative overflow-hidden">
          <div className="home-orb home-orb-left" />
          <div className="home-orb home-orb-right" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:px-12 lg:py-24">
            <div className="rise-in">
              <h1 className="max-w-2xl font-['Space_Grotesk'] font-bold leading-[.95] tracking-[-.07em] text-white">
                <span className="hero-heading-primary block text-[#ff5b22] lg:whitespace-nowrap">Free Resume Checker:</span>
                <span className="hero-heading-secondary mt-2 block">Resumes that Stand Out</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">Get your resume checked in seconds. Match the right keywords, fix the details that matter, and move closer to your next interview.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/70"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">PDF Â· DOCX Â· PHOTO</span><span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">No account</span><span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">Private by design</span></div>
              <div className="mt-8 rounded-2xl bg-[#fffceb] p-4 text-[#1d2336] shadow-[0_20px_70px_rgba(102,0,255,.28)] sm:p-5">
                <div className="mb-4 flex items-center justify-between"><div><div className="text-sm font-bold">Check your resume score</div><div className="mt-1 text-[11px] text-[#6c6f79]">Upload your latest resume to begin.</div></div><Sparkles className="size-5 text-[#ff5b22]" /></div>
                <UploadZone file={file} onFile={(picked) => { setFile(picked); setError(''); }} />
                <div className="mt-4"><label className="text-[11px] font-bold" htmlFor="job-description">Job description <span className="font-normal text-[#6c6f79]">(optional)</span></label><textarea id="job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the role description for a tailored match..." className="focus-ring mt-2 min-h-20 w-full resize-y rounded-xl border border-[#e5dfd1] bg-white p-3 text-xs leading-5 outline-none focus:border-[#ff5b22]" data-testid="textarea-job-description" /></div>
                 <div className="mt-2 flex items-center justify-between text-[10px] text-[#6c6f79]"><span>{hasJob ? `${keywordCount} role signals found` : 'Any file type, up to 8 MB'}</span><span>{jobDescription.length}/5,000</span></div>
                {error && <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700" role="alert" data-testid="error-analysis"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
                <button type="button" onClick={runAnalysis} className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e84b27] px-4 py-3.5 text-sm font-bold text-white shadow-[0_5px_0_#b83419] transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="button-analyze">Check your resume score <ArrowRight className="size-4" /></button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[620px] rise-in rise-in-1">
              <div className="absolute -right-2 -top-5 z-10 rounded-lg bg-[#ffb41f] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#25182e] shadow-[4px_4px_0_rgba(0,0,0,.25)] sm:right-4">instant resume score</div>
              <HeroScorePreview />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20 lg:px-12">
          <div className="mx-auto max-w-2xl text-center"><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[#ff5b22]">simple from start to finish</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em] text-white sm:text-5xl">How to use our free ATS resume checker</h2></div>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {[{ step: '01', icon: Upload, title: 'Resume upload', body: 'Upload your resume as a PDF, DOCX, photo, or text file. Drag and drop it here or select it from your device.', kind: 'upload' }, { step: '02', icon: Gauge, title: 'Get your resume score', body: 'Our checker reviews structure, keywords, formatting, and content relevance in seconds.', kind: 'score' }, { step: '03', icon: Target, title: 'Optimize your resume', body: 'See what hiring software is looking for and use personalized suggestions to improve your score.', kind: 'optimize' }].map(({ step, icon: Icon, title, body, kind }) => <article className="home-step-card" key={title}><div className="home-step-preview">{kind === 'upload' ? <><CloudUpload className="size-8 text-[#ff5b22]" /><div className="mt-3 text-xs font-bold text-white">Drop your resume here</div><div className="mt-1 text-[10px] text-white/45">Any file Â· up to 8 MB</div></> : kind === 'score' ? <><div className="home-mini-score">88<span>/100</span></div><div className="mt-2 flex gap-1"><span className="h-1.5 w-8 rounded-full bg-[#ff5b22]" /><span className="h-1.5 w-12 rounded-full bg-[#7e45ff]" /><span className="h-1.5 w-6 rounded-full bg-[#ffb41f]" /></div></> : <><CheckCircle2 className="size-8 text-[#b7d42c]" /><div className="mt-3 text-xs font-bold text-white">15 issues found</div><div className="mt-1 text-[10px] text-white/45">Clear fixes, better signal</div></>}</div><div className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#ff5b22]"><Icon className="size-3.5" /> {step}</div><h3 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{body}</p></article>)}
          </div>
        </section>
      </main>
      <FAQSection />
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-4 sm:px-8 lg:px-12">
        <div className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10">
          <div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ff5b22]">why it matters</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em] text-white sm:text-4xl">Why an ATS resume checker is worth your time today</h2><p className="mt-4 text-sm leading-7 text-white/60">Most large companies do not read every resume by hand. Applicant tracking systems, usually shortened to ATS, collect applications, organize them, and filter them before a human recruiter ever sees the details. Understanding how these systems parse your document is one of the fastest ways to make sure your experience is not lost in transit.</p></div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div><h3 className="font-['Space_Grotesk'] text-xl font-bold text-white">Recruiters see a screen, not your file</h3><p className="mt-2 text-sm leading-6 text-white/55">When you apply online, your resume is almost always converted to plain text and placed into a database. The recruiter reads a standard preview. If the ATS struggles to find your name, summary, and experience, important information never reaches the decision maker. A quick ATS check shows whether your resume will survive that conversion.</p></div>
            <div><h3 className="font-['Space_Grotesk'] text-xl font-bold text-white">Keywords decide the first filter</h3><p className="mt-2 text-sm leading-6 text-white/55">Every job description repeats certain skills, tools, and responsibilities. Automated filters frequently look for these exact phrases. When your resume uses the same language naturally, it becomes much easier for the system to recognise that you match the role. Tailoring your resume to each listing is not about tricking software; it is about clear communication.</p></div>
            <div><h3 className="font-['Space_Grotesk'] text-xl font-bold text-white">A check is a starting point, not a judgement</h3><p className="mt-2 text-sm leading-6 text-white/55">A resume score will never capture your full career. What it can do is point to structure, missing details, and weak wording before you send an application. Treat the report as a practical checklist: fix the sections, add the evidence, and move on with more confidence.</p></div>
          </div>
        </div>
      </section>
      <section className="border-t border-[hsl(var(--border)/.6)] bg-[hsl(var(--card)/.35)]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ff5b22]">what we check</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em] sm:text-4xl">Inside the free ATS resume score: what we look at</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Our checker reads your file locally in the browser and evaluates five practical signals that affect how a hiring system can understand your resume.</p></div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[{ title: 'Machine-readable text', body: 'A real text layer is the foundation of any ATS-friendly resume. If your resume is a scanned image without hidden text, the system may read nothing at all. We check that your file contains selectable, parseable text and warn you when it does not.' }, { title: 'Contact details', body: 'Recruiters need a way to reach you. Our checker looks for a valid email address and a phone number in the header area, because these details are the ones most commonly read and copied into tracking systems.' }, { title: 'Recognizable sections', body: 'Experience, education, skills, and summary headings give parsers useful structure. Familiar section names make it obvious where each part of your career lives, so your timeline is understood quickly.' }, { title: 'Chronology and dates', body: 'Month and year on each role helps both people and software follow your story. Missing dates confuse the parser and weaken the impression of progression, while clear dates show steady growth.' }, { title: 'Content density and bullets', body: 'Long, heavy paragraphs are harder for everyone to scan. Short action-and-result bullets let a reader move quickly, and they let automated filters pull the strongest phrases out of your experience.' }, { title: 'Job description match', body: 'Paste a job description and we compare its repeated language with your resume. The result is a practical keyword list you can use to tailor your application honestly and efficiently.' }].map((item) => <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" key={item.title}><div className="font-['Space_Grotesk'] text-lg font-bold">{item.title}</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.body}</p></div>)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ff5b22]">ats resume tips</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em] sm:text-4xl">Ten practical tips to raise your ATS score</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Most improvements take less than an hour and do not require a complete rewrite. These are the habits we see most often in resumes that parse cleanly and read well.</p></div>
          <ol className="space-y-3">
            {['Save a plain, single-column layout with real text so nothing depends on fonts or graphics.', 'Use familiar headings: Summary, Experience, Skills, Education, and Projects.', 'Put your name and contact details at the top, written as regular text, not inside a table or image.', 'Include month and year for every role so your timeline is easy to follow.', 'Write bullets that combine an active verb, the context, and a measurable result.', 'Repeat the tools and phrases from the job description only where your experience supports them.', 'Avoid headers, footers, and text boxes that some parsers quietly skip.', 'Keep bullet lines under two sentences and under roughly 160 characters.', 'Add quantifiable outcomes such as percentages, revenue, users, or efficiency gains.', 'Read your resume as plain text before applying and fix anything that reads strangely.'].map((tip, index) => <li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]" key={tip}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">{String(index + 1).padStart(2, '0')}</span>{tip}</li>)}
          </ol>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ff5b22]">what a scan can tell you</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A score answers practical questions, not existential ones</h2></div><div className="grid gap-4"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Yes: is my resume readable by a parser?</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The text-layer check answers this directly. If your file is a scanned image, a photograph, or a PDF without hidden text, the checker will say so, and that single finding explains most low scores.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Yes: do I match the language of the role?</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Paste a job description and the report lists which repeating role signals already appear in your resume and which are missing. That turns the vague instruction to tailor into a concrete, honest checklist.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">No: the score does not predict interviews.</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">No tool can promise an interview, and any tool that does is lying. Use the report to improve your application and prepare your story; the conversation itself remains your own.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">And yes: a clean file usually beats a decorated one.</div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Simple layouts with real text, familiar headings, and clear dates outperform clever design in most systems. The checker rewards exactly the things that help both machines and busy recruiters.</p></div></div></div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--secondary)/.4)] p-7 text-center sm:p-10"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#ff5b22]">start with one file</div><h2 className="max-w-2xl font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Reading about resumes helps. Checking your own changes things.</h2><p className="max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">Every tip on this page works on a real document in under an hour. Open the checker, upload your latest resume, and let the report show you exactly which edits matter most for the next application you send. It is free, it is private, and the report stays in this browser. The ten tips above and the five signals on the report card speak the same language, so the guidance on this page and the findings in your report reinforce each other instead of conflicting.</p></div>
      </section>
      <SiteFooter />
    </div>
  );
}

function EmptyAnalysisPage({ title, description }: { title: string; description: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => setLocation('/')} />
      <main className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <div className="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-12">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Gauge className="size-7" /></div>
          <h1 className="mt-6 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">{description}</p>
          <Link href="/" className="focus-ring mt-7 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Check a resume first <ArrowRight className="size-4" /></Link>
        </div>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">about this page</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Why the score page sent you here</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>This page is the results screen for the resume checker, and you arrived before any document was analyzed. There is nothing to show yet, so instead of a blank report we want to explain what will appear once you run your first scan, and what to bring along so the score is as useful as it can be.</p><p>The report only appears in this browser session. When you upload a resume from the home page, the checker reads the text locally, compares it to a job description if you provide one, and the score page renders the findings. If you close the tab or start a new scan, the report is replaced by a fresh analysis, which is exactly the behaviour we designed on purpose.</p><p>You can return here from the home page at any time, and the page is built to explain before it acts. Nothing about your session persists between visits, so each arrival starts fresh, exactly as a privacy-conscious tool should.</p><p>Some visitors bookmark this page as their starting point and use the links above to reach the checker and guides from here. That works fine too; the page is designed to look complete even when there is no report yet.</p><p>One more thing before you go: when you do run a scan, briefly note the score and set a reminder to re-check after your edits. A score that climbs two categories across two re-scans is progress you can describe in an interview, and that is the best outcome this tool offers.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">before you scan</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What to have ready when you check a resume</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A good scan needs one thing above all: a file the app can actually read. The three most common formats all work, and each has slightly different strengths.</p></div><div className="mt-8 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">A text-based PDF.</strong> This is the format we recommend for most candidates. A PDF exported from a word processor contains a hidden text layer, which is exactly what both the checker and most applicant tracking systems parse. If your PDF was created from scanned pages or printed then photographed, the text layer may be missing, and the app will warn you about it.</p><p><strong className="text-[hsl(var(--foreground))]">A Word document.</strong> DOCX files store text as real, selectable characters, which makes them some of the easiest documents to read. This format is also fine for the job: many companies ask for a Word copy, and the checker accepts it without conversion.</p><p><strong className="text-[hsl(var(--foreground))]">A photograph or scan.</strong> Images work, but the results depend entirely on the quality of the photo. Clear, well-lit, straight-on shots of a printed resume usually read well; blurry or angled photos may lose whole sections. If an image fails, export the original as a PDF and try again.</p></div></section>
        <section className="mt-6 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">A score from five signals</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Length, keyword match, content, organization, and scanning details are averaged into one number, with each category shown as its own bar.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Clear next steps</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Every finding is paired with a suggestion you can act on, and the improvement page turns the list into a checklist you can mark off.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Completely local</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your resume never leaves the browser for the free scan, and nothing is stored permanently after you close the tab.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">common questions</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Fast answers before you start</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">Why is my score page empty?</strong> Because no analysis has run in this browser session. Open the checker, upload a document, and this page will fill itself after the scan completes.</p><p><strong className="text-[hsl(var(--foreground))]">Do I need a job description?</strong> No. Without one, the keyword section returns a neutral baseline. With one, you get a matched and unmatched keyword list specific to that role.</p><p><strong className="text-[hsl(var(--foreground))]">Is a score ever a guarantee of an interview?</strong> No. The report measures legibility and matching, not your worth. Use it to improve your application, and let the interview do the rest.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] bg-[hsl(var(--primary))] p-7 text-center text-[hsl(var(--primary-foreground))] sm:p-10"><div className="mx-auto max-w-2xl"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent))]">ready when you are</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Upload once, and this page becomes your report.</h2><p className="mt-3 text-sm leading-7 text-[hsl(var(--primary-foreground)/.78)]">Head back to the checker, drop in your resume, optionally paste a job description, and you will see every finding described in plain language.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">first run</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What a typical first scan looks like, minute by minute</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">If you have never run a scan before, here is the sequence you can expect, so nothing on the results page comes as a surprise.</p></div><div className="mt-8 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Upload.</strong> You choose a file from the upload zone on the home page, or drag one onto it. The zone accepts PDF, DOCX, images, and plain text up to a reasonable size, and it works entirely in your browser.</p><p><strong className="text-[hsl(var(--foreground))]">Optionally paste a job description.</strong> This is how the keyword match becomes tailored. Without it, the report is still complete, but the matched-and-unmatched keyword sections rest on a neutral baseline.</p><p><strong className="text-[hsl(var(--foreground))]">Reading and analysis.</strong> Two short steps run locally: opening the file and extracting text, then comparing length, keywords, content, organization, and scanning details. Each step shows a clear message, so you always know where the process stands.</p><p><strong className="text-[hsl(var(--foreground))]">The report.</strong> A score appears with five category bars, a list of suggestions, matched and unmatched keywords, and a keyword plan you can build. The improvement page turns those findings into a checklist.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">the categories</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Meet the five signal bars</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">Length.</strong> Rewards a document with enough evidence to evaluate. Extremely short files rarely carry enough detail, and very long ones bury the strongest work. A range around one to two pages scores comfortably.</p><p><strong className="text-[hsl(var(--foreground))]">Keyword optimization.</strong> Compares your resume with the job description when one is provided. Matched language raises the bar; unconvincing or missing role terms lower it. This is the bar most influenced by tailoring.</p><p><strong className="text-[hsl(var(--foreground))]">Content.</strong> Checks the building blocks recruiters expect: contact details, an experience section, and clear bullets. Low scores here are usually missing sections, not weak sentences.</p><p><strong className="text-[hsl(var(--foreground))]">Organization.</strong> Covers headings, dates, and line structure that help a system file your history correctly. Tables, text boxes, and decorative layouts are the classic culprits when this bar dips.</p><p><strong className="text-[hsl(var(--foreground))]">Miscellaneous scanning.</strong> A small catch-all for file-level quirks that trip up parsers, weighted lightly so one oddity cannot dominate the verdict.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">after the score</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What the improve page adds after a scan</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The results page is the diagnosis; the improve page is the treatment. Understanding the difference makes both more useful.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">one more question</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A frequent follow-up, answered honestly</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Do I need AI to improve my resume?</strong> No. The optional AI deep-dive adds a second opinion in natural language, but the score, the checklist, and the suggestions are already complete without it. It is there for people who find a second read reassuring, and it explains exactly what it sends before running.</p><p><strong className="text-[hsl(var(--foreground))]">Can I use the checker for a cover letter?</strong> The tools focus on resumes today. The templates and the keyword finder still help with outcome language and matching, and a cover letter checker is one of the ideas we track on the roadmap.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">what to fix first</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A sensible order for your first editing pass</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">When the report arrives, resist the urge to rewrite everything. A measured order makes each edit count twice.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Export the file correctly first.</strong> If the checker warns about missing text, no wording improvement matters until the file carries a readable text layer. Re-export as a PDF or DOCX from the source document, then re-scan.</p><p><strong className="text-[hsl(var(--foreground))]">Fix structure before polish.</strong> Familiar headings, month and year on every role, contact details as text, and short bullets come before sentence-level wording. Structure errors compound; wording errors stand alone.</p><p><strong className="text-[hsl(var(--foreground))]">Then match the honest keywords.</strong> With a job description in place, move the repeated role terms into the relevant bullets in your own phrasing. Never add experience you cannot defend.</p><p><strong className="text-[hsl(var(--foreground))]">Re-check after each pass.</strong> The checker is designed to be run repeatedly. Watch the category bars respond to specific changes, and stop when the report is healthy and honest rather than chasing perfection.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">a final note</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">The report is a mirror, not a verdict</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">When this page eventually fills with your score, remember what the number actually is: a description of how clearly a machine can read your document and how closely its language matches a role. It is not a measure of your value as an applicant, and it should never feel like one. Even a low score is simply a starting point for edits, and the fastest way to soften it is to run the checker again after applying the suggestions you can honestly claim. Your career history is the evidence; this tool just helps it read clearly.</p><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">If this is your first visit, know that the quiet room you are standing in is the safest place to start: nothing has been uploaded, nothing has been stored, and nothing about your career has changed hands. When you are ready, the home page will turn this empty report into the most useful ten seconds of your application process.</p><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The results screen, once it fills, will offer three places to act: the suggestion list for immediate edits, the matched and unmatched keyword lists for honest tailoring, and the improve page for a running checklist. All three are views of the same reading, so there is no separate homework page and no hidden data; the report is simply the score, the reasons, and the next move, together. A score, once generated, always restates its own reasoning, so there is no mystery to chase and no hidden formula to guess; every number on the report points back to one of the five bars and to one next edit.</p></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ImprovePage({ analysis, file, resumeText, keywordPlan, setKeywordPlan, onReset, jobDescription }: { analysis: Analysis | null; file: File | null; resumeText: string; keywordPlan: string[]; setKeywordPlan: React.Dispatch<React.SetStateAction<string[]>>; onReset: () => void; jobDescription?: string }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [editedText, setEditedText] = useState(resumeText);
  const [improved, setImproved] = useState<ImprovedResume | null>(null);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [improveNotes, setImproveNotes] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [includePhoto, setIncludePhoto] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | 'txt' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!file) {
      setPhotoReady(false);
      setPhoto(null);
      return;
    }
    extractResumePhoto(file).then((result) => {
      if (cancelled) return;
      setPhoto(result);
      setPhotoReady(Boolean(result));
    });
    return () => { cancelled = true; };
  }, [file]);
  if (!analysis) return <EmptyAnalysisPage title="Your improvement plan is waiting." description="Upload a resume on the checker page first. We will turn its score into a focused, local editing checklist." />;
  const tasks = [...new Set([...analysis.checks.filter((item) => item.status !== 'pass').map((item) => `${item.label}: ${item.detail}`), ...analysis.suggestions, ...analysis.missing.slice(0, 4).map((word) => `Check whether â€œ${word}â€ honestly belongs in your experience or skills section.`)])];
  const textChanged = editedText.trim() !== resumeText.trim();
  const fixScore = Math.min(100, analysis.score + completed.length * 5 + (textChanged ? 3 : 0));
  const toggleTask = (task: string) => setCompleted((current) => current.includes(task) ? current.filter((item) => item !== task) : [...current, task]);
  const toggleKeyword = (word: string) => setKeywordPlan((current) => current.includes(word) ? current.filter((item) => item !== word) : [...current, word]);
  const baseName = resumeBaseName(file?.name ?? 'resume');
  const previewResume = useMemo(() => parseResumeSections(editedText), [editedText]);
  const previewBlocks = useMemo(() => (improved ? buildImprovedResumeDoc(improved) : null), [improved]);
  const runAiImprove = async () => {
    setImproving(true);
    setImproveError(null);
    setImproveNotes([]);
    const outcome = await improveResume(editedText.trim(), jobDescription ?? '');
    if (outcome.ok) {
      setImproved(outcome.data);
      setImproveNotes(outcome.notes);
    } else {
      setImproved(null);
      setImproveError(outcome.error);
    }
    setImproving(false);
  };
  const clearAiImprove = () => {
    setImproved(null);
    setImproveError(null);
    setImproveNotes([]);
  };
  const downloadPdf = async () => {
    setDownloading('pdf');
    setExportError(null);
    try {
      if (improved) {
        const { generateResumePdfFromDoc } = await import('@/lib/resume-pdf');
        const bytes = await generateResumePdfFromDoc(buildImprovedResumeDoc(improved), includePhoto && photo ? photo : null);
        downloadBlob(bytes, `${baseName}-improved.pdf`, 'application/pdf');
      } else {
        const parsed = parseResumeSections(editedText);
        const { generateResumePdf } = await import('@/lib/resume-pdf');
        const bytes = await generateResumePdf(parsed, includePhoto && photo ? photo : null);
        downloadBlob(bytes, `${baseName}-improved.pdf`, 'application/pdf');
      }
    } catch (error) {
      const isRenderRemoval = error instanceof Error && (error.name === 'NotFoundError' || /removeChild/i.test(error.message));
      console.error('[Resume ATS] Failed to generate PDF:', error);
      setExportError(isRenderRemoval ? 'The PDF renderer lost the preview element mid-render. Your edits are safe â€” click Download as PDF again.' : 'We could not generate the PDF. Your edits are safe â€” make sure the text is valid and try again.');
    } finally {
      setDownloading(null);
    }
  };
  const downloadDocx = async () => {
    setDownloading('docx');
    setExportError(null);
    try {
      if (improved) {
        const { generateResumeDocxFromDoc } = await import('@/lib/resume-docx');
        const blob = await generateResumeDocxFromDoc(buildImprovedResumeDoc(improved), includePhoto && photo ? photo : null);
        downloadBlob(blob, `${baseName}-improved.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      } else {
        const parsed = parseResumeSections(editedText);
        const { generateResumeDocx } = await import('@/lib/resume-docx');
        const blob = await generateResumeDocx(parsed, includePhoto && photo ? photo : null);
        downloadBlob(blob, `${baseName}-improved.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
    } catch (error) {
      console.error('[Resume ATS] Failed to generate DOCX:', error);
      setExportError('We could not generate the Word document. Make sure the text is valid and try again.');
    } finally {
      setDownloading(null);
    }
  };
  const downloadTxt = () => downloadResumeText(editedText, `${baseName}-improved.txt`);
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={onReset} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">page 2 Â· improve your resume</div><h1 className="mt-3 max-w-3xl font-['Space_Grotesk'] text-4xl font-bold tracking-[-.07em] sm:text-6xl">Turn your score into a better resume.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">{file?.name} Â· Work through the checklist below. Nothing is uploaded or saved.</p></div>
          <Link href="/score" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-xs font-bold hover:bg-[hsl(var(--secondary))]">Back to score <ArrowRight className="size-4" /></Link>
        </div>
        <section className="mt-9 rounded-[1.75rem] border border-[hsl(var(--primary)/.25)] bg-[linear-gradient(145deg,hsl(var(--card)),hsl(var(--secondary)/.38))] p-6 shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">manual editor</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Fix your resume text</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Edit anything you want below. Use the checklist as a guide, then download a clean, formatted PDF or Word version. Your edits are re-parsed into sections (Experience, Education, Skillsâ€¦) at download time.</p></div><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-3 py-1.5 font-mono text-[10px] text-[hsl(var(--primary))]">{editedText.length.toLocaleString()} characters</span></div>
          <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.06)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={runAiImprove} disabled={improving || !editedText.trim()} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50">{improving ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{improving ? 'Improving with AI…' : 'Improve my resume with AI'}</button>
              {improved && <button type="button" onClick={clearAiImprove} className="focus-ring rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-xs font-bold hover:bg-[hsl(var(--secondary))]">Back to my own text</button>}
              <span className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Rewrites wording only — same facts, same sections, your contact details copied verbatim.</span>
            </div>
            {improveError && <p className="mt-3 text-xs font-semibold text-[hsl(var(--destructive))]">{improveError}</p>}
            {improveNotes.length > 0 && <ul className="mt-3 space-y-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{improveNotes.map((note) => <li key={note} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--primary))]" /><span>{note}</span></li>)}</ul>}
          </div>
          <textarea value={editedText} onChange={(event) => { setEditedText(event.target.value); if (improved) clearAiImprove(); }} className="focus-ring mt-6 min-h-[22rem] w-full resize-y rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.65)] p-4 font-mono text-xs leading-6 text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary)/.55)]" aria-label="Editable resume text" placeholder="Your extracted resume text will appear here." />
          {photoReady && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 sm:flex-row sm:items-center">
              {photo && <img src={photo} alt="" className="size-12 shrink-0 rounded-full border border-[hsl(var(--border))] object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3"><label htmlFor="include-photo" className="cursor-pointer text-sm font-bold text-[hsl(var(--foreground))]">Include profile photo</label><ToggleSwitch id="include-photo" checked={includePhoto} onCheckedChange={setIncludePhoto} /></div>
                <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Best-effort extract from your original file. Off by default â€” many ATS best practices recommend no photo.</p>
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-3 text-xs text-[hsl(var(--muted-foreground))] lg:flex-row lg:items-center lg:justify-between">
            <span className={exportError ? 'font-semibold text-[hsl(var(--destructive))]' : ''}>{exportError ?? (textChanged ? 'Unsaved manual edits are ready to download â€” every file is generated fresh from this text.' : 'Make your first edit to create a corrected version.')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={downloadPdf} disabled={downloading !== null || !editedText.trim()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50">{downloading === 'pdf' ? <LoaderCircle className="size-4 animate-spin" /> : <FileDown className="size-4" />} Download as PDF</button>
              <button type="button" onClick={downloadDocx} disabled={downloading !== null || !editedText.trim()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3 font-bold text-[hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50">{downloading === 'docx' ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />} Download Word (DOCX)</button>
              <button type="button" onClick={downloadTxt} disabled={downloading !== null || !editedText.trim()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-3 font-mono text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary)/.4)] disabled:pointer-events-none disabled:opacity-50"><Download className="size-4" /> .txt</button>
            </div>
          </div>
        </section>
        <section className="mt-9 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_18px_50px_hsl(var(--primary)/.07)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">live preview</div>
              <h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">See the formatted resume</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">This preview is built from the same structured data as the downloads, so the PDF you save matches it â€” same order, same headings, same bullets.</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--primary)/.1)] px-3 py-1.5 font-mono text-[10px] text-[hsl(var(--primary))]">PDF = preview</span>
          </div>
          <div className="mt-6">
            {editedText.trim() ? <div className="resume-preview-shell">{improved ? <ResumePreviewHtmlFromDoc blocks={previewBlocks ?? []} photo={includePhoto && photo ? photo : null} /> : <ResumePreviewHtml resume={previewResume} photo={includePhoto && photo ? photo : null} />}</div> : <div className="grid min-h-40 place-items-center rounded-[1.1rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/.4)] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Your formatted resume preview will appear here once there is some text to lay out.</div>}
          </div>
        </section>
        <section className="mt-9 grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
          <div className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_18px_50px_hsl(var(--primary)/.07)] sm:p-8">
            <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">resume fix score</div>
            <div className="mt-5"><ScoreGauge score={fixScore} /></div>
            <div className="mt-3 rounded-2xl bg-[hsl(var(--secondary)/.65)] p-4 text-center"><div className="text-xs font-bold">Potential lift</div><div className="mt-1 font-['Space_Grotesk'] text-2xl font-bold text-[hsl(var(--primary))]">+{fixScore - analysis.score} points</div><div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Mark fixes complete as you edit.</div></div>
          </div>
          <div className="rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">your editing checklist</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Fix what matters first.</h2></div><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-3 py-1.5 font-mono text-[10px] font-bold text-[hsl(var(--primary))]">{completed.length}/{tasks.length} done</span></div>
            <div className="mt-6 space-y-3">{tasks.map((task, index) => { const done = completed.includes(task); return <button type="button" key={task} onClick={() => toggleTask(task)} className={`focus-ring flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${done ? 'border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.07)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] hover:bg-[hsl(var(--secondary)/.5)]'}`}><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${done ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--primary)/.35)] text-transparent'}`}><Check className="size-3.5" /></span><span className={`text-sm leading-6 ${done ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}`}><span className="mr-2 font-mono text-[10px] text-[hsl(var(--primary))]">0{index + 1}</span>{task}</span></button>; })}</div>
          </div>
        </section>
        <section className="mt-6 rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">keyword plan</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Keep the right language close.</h2></div><span className="text-xs text-[hsl(var(--muted-foreground))]">Click to remove a term</span></div>
          <div className="mt-5 flex flex-wrap gap-2">{(keywordPlan.length ? keywordPlan : analysis.missing).map((word) => <button type="button" key={word} onClick={() => toggleKeyword(word)} className="focus-ring rounded-lg bg-[hsl(var(--accent)/.5)] px-3 py-2 font-mono text-[11px] font-medium text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/.7)]">{word} <span className="ml-1">Ã—</span></button>)}</div>
        </section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-9 lg:grid-cols-[.85fr_1.15fr]">
          <div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">editing guide</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Get the most out of the improvement page</h2></div>
          <div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            <p>Work through the checklist in the order it appears. Each task maps to something specific from your report, so completing it should produce a visible change in the resume fix score. Mark items done as you finish them, and remember the score is a guide: it rewards the concrete, structural improvements you can actually make today.</p>
            <p>The editor on this page works with the text extracted from your original file. You can rewrite any bullet, add missing keywords where they honestly apply, or reorganise sections before downloading. Every export, whether PDF, Word, or plain text, is generated fresh from your edited text, so what you see in the live preview is exactly what you will send.</p>
            <p>If you added a job description during the scan, use the keyword plan at the bottom as a final pass. Review each term, confirm it reflects real work you performed, and remove anything that does not belong in your story.</p>
          </div>
        </section>
        <section className="mt-6 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Edit in small passes</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Rewriting a whole resume in one sitting hides progress. Fix the top checklist items first, download, and refine in a second pass tomorrow.</p></div>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Keep it true</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Sharper wording and added keywords only help if they describe work you can defend in an interview with honest, specific examples.</p></div>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Check before you send</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Run the finished version through the checker one last time with the target job description, then apply with a clear head.</p></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">page 4 Â· about us</div><h1 className="mt-3 max-w-3xl font-['Space_Grotesk'] text-5xl font-bold leading-[.95] tracking-[-.08em] sm:text-7xl">Career tools should feel human.</h1></div><div className="max-w-xl space-y-4 text-base leading-8 text-[hsl(var(--muted-foreground))]"><p>GoodSpace is a small set of practical tools for people who want clearer applications without handing sensitive career documents to another black box.</p><p>Job searching already asks people to make dozens of decisions under pressure. We are here to make one part of that processâ€”understanding and improving your resumeâ€”feel calmer, clearer, and more useful.</p></div></div>
        <section className="mt-12 grid gap-5 md:grid-cols-3"><div className="rounded-[1.5rem] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><ShieldCheck className="size-6 text-[hsl(var(--accent))]" /><h2 className="mt-8 font-['Space_Grotesk'] text-2xl font-bold">Privacy first</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--primary-foreground)/.72)]">Your resume is read in this browser. We do not need an account, a payment, or a copy of your file. That means you can explore, compare, and start over without wondering where your career history went.</p></div><div className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><Target className="size-6 text-[hsl(var(--primary))]" /><h2 className="mt-8 font-['Space_Grotesk'] text-2xl font-bold">Useful over flashy</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Every score is paired with a reason and a next step, so you can spend less time guessing what to change. We focus on familiar structure, readable evidence, and language that helps both people and hiring systems.</p></div><div className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><Lightbulb className="size-6 text-[hsl(var(--accent-foreground))]" /><h2 className="mt-8 font-['Space_Grotesk'] text-2xl font-bold">Built for momentum</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Small improvements add up. GoodSpace helps you make the next edit, then the next one, with a focused checklist instead of a vague feeling that your resume needs work.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">how we work</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Less mystery. More useful next steps.</h2></div><div className="space-y-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>We translate the small signals that can affect an application into plain language: whether your text is selectable, whether your sections are easy to recognize, and whether your experience connects to the role you want.</p><p>That does not replace your judgment or guarantee an interview. It gives you a clearer starting point, so the time you spend editing goes toward evidence that is true, specific, and easy to find.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">our promise</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Make the invisible parts of applying for work easier to understand.</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A resume is more than a score. It is a record of your work, and it deserves tools that explain their thinking, respect your data, and leave you more confident than when you arrived. Whether you are making your first resume or refining the tenth version, the goal is the same: help you show your work with more clarity.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/contact" className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Contact us</Link><Link href="/privacy" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold">Read our privacy policy</Link></div></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-7 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">why we built goodspace</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">The story behind a calmer job search</h2></div><Link href="/blog" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-xs font-bold hover:bg-[hsl(var(--secondary))]">Read our blog <ArrowRight className="size-4" /></Link></div>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">GoodSpace started with a simple observation. Most of us were taught to write one resume and send it everywhere, yet every job opening is a different conversation. Recruiters, hiring software, and even our own nerves each read the same document in different ways. The missing piece was usually not effort; it was clarity about what the resume actually communicates before the interview begins.</p>
            <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">We built a tool that reads your resume the way a system would, shows you what it finds in plain language, and suggests focused next steps instead of a vague verdict. By processing everything in your browser, we kept one principle intact: your career history stays yours. You can explore freely, compare outputs, and start over without handing your data to another black box.</p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-4xl font-extrabold text-[hsl(var(--primary))]">100%</div><div className="mt-2 text-xs font-bold">browser-based analysis</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">No account, no upload queue, no waiting for a server to read private documents.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-4xl font-extrabold text-[hsl(var(--primary))]">5+</div><div className="mt-2 text-xs font-bold">signals reviewed</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Text, structure, clarity, keywords, and chronology combine into one practical score.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-4xl font-extrabold text-[hsl(var(--primary))]">3+</div><div className="mt-2 text-xs font-bold">free tools</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Resume checking, formatting templates, and a job description keyword finder.</p></div></div>
        </section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-2">
          <div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">what we believe</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Five principles behind every decision</h2></div>
          <div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            <p><strong className="text-[hsl(var(--foreground))]">Your data is yours.</strong> The resume checker runs locally. We avoid building features that would force you to upload a sensitive document to see a score.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Explain, do not mystify.</strong> Every score is paired with the reason behind it, so you can decide what to change rather than follow a brittle formula blindly.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Useful over flashy.</strong> A simple, quiet tool that saves an hour of guessing beats a dashboard full of numbers nobody can act on.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Truth over tricks.</strong> We will never suggest you invent experience. Tailoring means showing your real evidence in language the reader recognises.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Small steps matter.</strong> A stronger bullet here, a clearer heading there. Momentum comes from a sequence of manageable, honest improvements.</p>
          </div>
        </section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">who it is for</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">GoodSpace is built for people mid-search, first-time, and everyone in between</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">We design for the moment someone looks at a job description and their current resume and does not know how to connect the two. That moment happens at every career stage, so the tools avoid assumptions about seniority.</p></div><div className="mt-8 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">01</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">First-time candidates</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Students and career changers often have great experience but no structure to present it. Templates and the simplicity checklist turn scattered history into readable sections.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">02</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Active job seekers</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">When applications are a weekly routine, speed matters. Keyword finder lists, downloadable formats, and quick re-scans keep the momentum going without endless rework.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">03</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Professionals between roles</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Senior applicants carry long histories that need careful editing. The checker helps them let go of outdated phrasing and emphasise impact without losing the details that matter.</p></div></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-2"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">our route so far</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">From a hard conversation to a growing toolkit</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>GoodSpace began with a single frustration: watching talented friends apply for months and never learn why their resumes went unanswered. The first version was a local script that counted words, sections, and keywords and printed a plain list of worries. It was crude, but it produced the same insight every candidate deserved: the record of your work is readable, and the reasons it falls short are not a mystery.</p><p>From that script grew the browser-based checker, then the templates, then the keyword finder. Each feature followed the same rule: build it locally, explain its thinking, keep it free. The team stayed intentionally small so that nobody's data was a tradeable asset, and every product decision could be made in service of the candidate rather than a dashboard.</p><p>We are not interested in being the biggest resume business. We are interested in being the one that explains itself, respects your documents, and leaves you more confident than when you arrived. If a better tool comes along, we would tell you to use it.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">the roadmap</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What we are working on, in plain terms</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>Our current focus is making the improvement page feel less like homework: better grouping of suggestions, clearer wording for each check, and a stronger connection between a low category bar and the exact edit that moves it. After that come new tools for cover letters and interview preparation, both designed around the same local-processing promise.</p><p>None of this is marketing language. The roadmap is shaped to a large degree by the contacts we receive, and we publish what changes each month in the journal. If you want a feature to move up the list, the most effective action is a specific message about when it would have helped you.</p></div></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Free, and that stays</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The checker, the templates, and the keyword finder have no paywall and no account. If a premium tier ever makes sense, the free tools will stay free and private.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Small by design</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">A compact team keeps decisions fast and honest. We are not funded by selling your data, and we prefer fewer but better tools over a crowded suite.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Open to feedback</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The contact page is not a formality. Message volume decides much of the roadmap, and contributors who describe their moment get answered personally.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">our standards</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">The yardsticks we hold ourselves to</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A product about job search can drift into the very noise it claims to reduce. These are the checks we run before calling any change finished.</p></div><div className="mt-7 grid gap-4 text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:grid-cols-2"><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><strong className="text-[hsl(var(--foreground))]">Does it explain itself?</strong> If a number appears, a sentence nearby must say what drove it. Scores without reasons are not allowed on this ship.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><strong className="text-[hsl(var(--foreground))]">Is it honest about limits?</strong> We say what a score cannot do every time we present one, because overpromising erodes trust faster than underdelivering.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><strong className="text-[hsl(var(--foreground))]">Does it respect the document?</strong> Features that force an upload for no real reason are rejected. The local-processing promise is a product requirement, not a marketing badge.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><strong className="text-[hsl(var(--foreground))]">Does it save time?</strong> Every tool should end with the user closer to sending an application than to reading more advice they will not act on.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">why local</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Why local processing is more than a privacy badge</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Processing on your device is usually framed as a privacy choice, and it is. But it also changes the product in ways people notice without realising the cause: there is no upload queue, so results appear instantly; there is no account, so there is nothing to forget or lock you out; there is no file size bureaucracy past a reasonable limit; and there is no throttle on the free tier because there is no server bill per scan.</p><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">That combination produces tools that feel calm to use. You can experiment repeatedly, compare versions, and close the tab knowing the only copy of your research is the one you chose to keep. Privacy, speed, and simplicity turn out to be the same decision when you design it right.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">before you write</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">The route back to the tools</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>The checker lives at the home page and needs nothing but a file: upload, watch the reading steps, and read your five-signal report with suggestions you can act on today. The free tools sit one level out: templates on one page, the keyword finder on another, both reachable from this footer and the navigation bar.</p><p>If you read this far, you already understand the product better than most users will. Use that understanding: run a scan now, make the first honest edit the report suggests, and re-run to watch the bars move. That loop, repeated a few times, is the entire secret behind a resume that parses cleanly and reads clearly.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-10"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--accent))]">start now</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Check a resume in under thirty seconds.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--primary-foreground)/.78)]">No sign-up, no uploads, no jargon. Drag your resume in, optionally add a job description, and get a score with clear next steps you can act on today.</p></div><Link href="/" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary))] shadow-[0_6px_18px_hsl(var(--primary)/.25)] transition-transform hover:-translate-y-0.5">Try the free checker <ArrowRight className="size-4" /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ContactPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <div className="text-center"><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">page 5 Â· contact us</div><h1 className="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.08em] sm:text-7xl">Weâ€™re listening.</h1><p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[hsl(var(--muted-foreground))]">Found a confusing score, have an idea, or simply want to say hello? Send us a note and weâ€™ll get back to you.</p></div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2"><a href="mailto:contact@goodspace.app" className="focus-ring rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 transition-transform hover:-translate-y-1"><CircleHelp className="size-6 text-[hsl(var(--primary))]" /><h2 className="mt-8 font-['Space_Grotesk'] text-2xl font-bold">General questions</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Ask about the checker, your score, or how to use the improvement page.</p><div className="mt-6 text-sm font-bold text-[hsl(var(--primary))]">contact@goodspace.app <ArrowRight className="ml-1 inline size-4" /></div></a><Link href="/privacy" className="focus-ring rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.55)] p-7 transition-transform hover:-translate-y-1"><LockKeyhole className="size-6 text-[hsl(var(--primary))]" /><h2 className="mt-8 font-['Space_Grotesk'] text-2xl font-bold">Privacy questions</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Read how local resume parsing works and what the app does not store.</p><div className="mt-6 text-sm font-bold text-[hsl(var(--primary))]">Read privacy policy <ArrowRight className="ml-1 inline size-4" /></div></Link></div>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10">
          <div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">send us a note</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What happens after you write to us?</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Every message is read by a real person on our small team. We reply within two working days, and we treat feedback about scores, wording, or performance as the most valuable input we receive. Here is how to get the fastest, most useful answer.</p></div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">01</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Describe the moment</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Tell us what you were doing when something looked confusing, such as which file type you uploaded and what score or warning you saw.</p></div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">02</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Add helpful details</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A browser name, a short screenshot description, or the words the checker flagged all help us reproduce and fix issues faster.</p></div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">03</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Do not send your resume</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">You never need to attach a career document. Describe the issue in words; we will work from there.</p></div>
          </div>
        </section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3">
          <div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">quick answers</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Frequently asked contact questions</h2></div>
          <div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2">
            <p><strong className="text-[hsl(var(--foreground))]">How long do replies take?</strong> We respond within two working days. Review, public-holiday, and launch messages can occasionally take a little longer, and we will always let you know if that is the case.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Can you review my specific resume?</strong> We intentionally do not accept resumes by email. The free checker already reads your file privately in the browser, and posting your document anywhere weakens the privacy promise we make.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Do you offer consultations or coaching?</strong> Not today. We focus on free tools and clear guides. If that changes, the blog and this page will be the first places we announce it.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Will you fix something in my specific report?</strong> We cannot touch a report that lives only in your browser, and we deliberately have no way to see it. But if you describe the finding, we will explain why the check fired, what it means, and whether the wording should change.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Do you publish the emails you receive?</strong> Never, and we do not join any mailing list for you. Feedback updates are published as release notes in the journal, always without names, and a request to stay entirely off the record is honoured if you write it on the first line.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Can employers or education companies partner with you?</strong> We are open to thoughtful partnerships that respect job seekers. Write with the subject 'partnership' and describe what you have in mind.</p>
          </div>
        </section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">how we respond</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What we do after your message arrives</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>A note to contact@goodspace.app lands with our small team and is read once or twice a day. You will not get a bot answer, a ticket number, or a form letter. Each message gets a personal reply, and we treat the details you describe as material for the product itself. When several people write about the same confusing score or missing tool, that thread becomes a candidate for the next update.</p><p>If your message is a question about whether something works, we answer it directly and point you to the exact place to try it. If it is a suggestion, we tell you honestly whether it fits our roadmap. If it is a bug report, we reproduce it when we can and let you know what changed. We rarely reply with a link to a help center, because the fastest answer is usually the one we write ourselves.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="flex flex-wrap items-end justify-between gap-4"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">what we can help with</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A realistic look at how far our support can go</h2></div></div><div className="mt-6 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">We can help with the tools we build.</strong> Questions about a score, a template, the keyword finder, or why a file did not parse are exactly what we are here for. Describe the moment and we will reproduce and explain it.</p><p><strong className="text-[hsl(var(--foreground))]">We can help you use the results.</strong> If a suggestion on the improvement page is unclear or a keyword seems unfair, tell us which one and why. The wording of every check is editable, and feedback directly changes it.</p><p><strong className="text-[hsl(var(--foreground))]">We cannot review your resume for you.</strong> We deliberately do not accept career documents by email, because the privacy promise depends on your file never leaving your device. The free checker already reads it locally, and that is the boundary we keep.</p><p><strong className="text-[hsl(var(--foreground))]">We cannot guarantee applications get seen.</strong> Scores measure legibility and matching, not outcomes. No tool can promise an interview, and any service that does should make you suspicious.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">writing tips</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How to get the fastest, most useful answer</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Good messages share a simple shape. Open with what you were doing, add one concrete detail, and end with the question. Below are two examples of research-worthy letters.</p></div><div className="mt-6 grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-6"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">example 01 Â· a clear bug report</div><p className="mt-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">"On Firefox, I uploaded a scanned PDF and the checker warned that no text was found. I expected at least partial content. Is scanned PDF support planned? My file was a two-page image export."</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-6"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">example 02 Â· a roadmap idea</div><p className="mt-3 text-xs leading-6 text-[hsl(var(--muted-foreground))]">"I would love a way to compare two versions of my resume side by side and see which score improved. Even a simple before-and-after on the results page would help me trust the checklist."</p></div></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">before you write</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Where most questions are already answered</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">A question about how scores and keywords work?</strong> The results page explains matched and unmatched keywords in place, and the <Link href="/blog" className="font-bold text-[hsl(var(--primary))]">journal</Link> walks through how the checker scores your resume end to end.</p><p><strong className="text-[hsl(var(--foreground))]">Privacy or data questions?</strong> The <Link href="/privacy" className="font-bold text-[hsl(var(--primary))]">privacy policy</Link> names every feature, what it touches, and how to verify the claims yourself with a network tab.</p><p><strong className="text-[hsl(var(--foreground))]">Format or layout questions?</strong> The <Link href="/free-tools/templates" className="font-bold text-[hsl(var(--primary))]">templates page</Link> explains which format each option suits, and the keyword guide covers language matching.</p><p><strong className="text-[hsl(var(--foreground))]">How to improve a specific score?</strong> The <Link href="/improve" className="font-bold text-[hsl(var(--primary))]">improve page</Link> becomes a checklist after your scan, and the journal article on the checker explains each of the five signal bars.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">response priorities</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How quickly different topics get handled</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">We answer everything, but not everything is treated the same. A simple order helps us balance speed with depth.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Bug reports and broken pages (fastest).</strong> Anything that prevents someone from checking a resume jumps the queue, because a broken tool helps nobody and we want it fixed first.</p><p><strong className="text-[hsl(var(--foreground))]">Privacy questions.</strong> Treated as product feedback with a firm commitment: if a concern is real, we address the fix publicly, not just the email. Confidence in our privacy claims matters more than winning an argument.</p><p><strong className="text-[hsl(var(--foreground))]">Suggestions and roadmap ideas.</strong> Read, logged, and answered with an honest yes or no. Popular requests are discussed in the journal, so you can follow what changed because you asked.</p><p><strong className="text-[hsl(var(--foreground))]">General questions (fast).</strong> Two working days at most. If a question takes longer, you will hear from us so it is never silent.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">ready to write</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Three ways to use this page today</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Not sure what counts as a worthwhile message? Almost everything counts. These three shapes cover most of the notes we receive and value.</p></div><div className="mt-7 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">option 01</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Report a moment</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">"I uploaded a scanned PDF and the score dropped everywhere. Was that expected?" One concrete moment is the most actionable feedback we receive.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">option 02</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Request a feature</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">"I would use a cover letter checker every week. Do you plan one?" Popular requests literally move the roadmap, and we answer honestly either way.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">option 03</div><h3 className="mt-3 font-['Space_Grotesk'] text-lg font-bold">Say it plainly</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">"Your privacy page convinced me to try the checker. Thank you." No format is required; a human reads every note either way. Write long or short, formal or loose; the value to us is the same, because the detail that helps is the moment you describe, not the style you use. A note that fits on a phone screen is perfect; extra length adds nothing.</p><p>One more tip: if you are ever unsure whether a detail matters, include it. Cutting an extra sentence later is easier than remembering it later, and a dated example is worth more than a general impression.</p></div></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">what we do with it</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How your words change the product</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p>A message is more than a reply: it is research. When three people describe the same confusing score, that finding is shared with the whole team and usually becomes a change to the check wording, a new section on this site, or a journal article that explains the answer for everyone.</p><p>We also keep the loop public. If your feedback leads to an update, the release notes in the journal mention the request without naming you. That way the community sees that writing in works, and the next person with the same question finds the answer without having to ask.</p><p>The one thing we never do is add you to a marketing list. Messages are not a licence to sell anything, and opting out of replies is always silently respected. If you would like your message to stay entirely off the record, say so in the first line and that is exactly how it will be treated.</p></div></section>
        <section className="mt-6 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Reach us in one line</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">A single sentence with your question is enough to start the conversation. Details can come in the follow-up.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">No resume attachments</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Keep your file private. Describe the issue in words and the checker remains the only place that reads your document.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Expect a human</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">No bots, no ticket wall. Our small team reads every note and replies with a name, not a department.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] bg-[hsl(var(--primary))] p-7 text-center text-[hsl(var(--primary-foreground))] sm:p-10"><div className="mx-auto max-w-2xl"><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent))]">tell us what to build</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Your ideas shape the roadmap.</h2><p className="mt-3 text-sm leading-7 text-[hsl(var(--primary-foreground)/.78)]">Feedback about the checker, the templates, or the keyword finder goes straight into our planning. The most requested improvements rise to the top, so if something feels missing, say so.</p></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header onReset={() => undefined} />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
        <div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">privacy policy</div><h1 className="mt-3 font-['Space_Grotesk'] text-5xl font-bold tracking-[-.08em] sm:text-7xl">Your resume stays yours.</h1><p className="mt-6 text-base leading-8 text-[hsl(var(--muted-foreground))]">GoodSpace is designed so the Resume ATS Checker can work without sending your document to a server.</p></div>
        <div className="mt-12 space-y-4">{[{ title: 'What we process', body: 'When you choose a PDF, DOCX, image, or text file, your browser reads the content locally so the app can calculate a score and show suggestions. The word "processing" in a privacy policy usually makes people nervous, so let us be specific: opening a file, extracting its text, and counting keywords are things your own browser can do without any help from a server.' }, { title: 'What we do not store', body: 'The app does not permanently store your resume file, extracted resume text, job description, score, or keyword plan. There is no database of applicant documents, no cloud profile tied to your name, and no upload folder waiting to be breached. When you close the tab, the working copy disappears with it.' }, { title: 'What you control', body: 'You can close the tab or start over at any time. The analysis remains in memory only while you are using the page. Refreshing, navigating to a new scan, or clicking start over clears the current edition, and nothing is written to disk outside your own browser session.' }, { title: 'Third-party services', body: 'The checker does not require an account, payment, analytics integration, or external resume-processing service. The optional AI deep-dive feature uses an AI provider, but it sends only the extracted resume text and one rendered image of the first page. Complete files, contact details stored as anything other than that text, and job descriptions remain on your side.' }].map((item) => <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-7" key={item.title}><h2 className="font-['Space_Grotesk'] text-xl font-bold">{item.title}</h2><p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{item.body}</p></section>)}</div>
        <div className="mt-8 rounded-2xl bg-[hsl(var(--primary))] p-6 text-sm leading-7 text-[hsl(var(--primary-foreground)/.8)]"><ShieldCheck className="mb-3 size-6 text-[hsl(var(--accent))]" />This privacy promise is also shown beside the upload control and score report, so you do not have to search for it.</div>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10">
          <div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">privacy in practice</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How private-by-design actually works here</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Privacy is rarely a single setting. It is a series of decisions made during design. These are the decisions that shape how GoodSpace handles career documents, and why we made each one.</p></div>
          <div className="mt-8 space-y-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            <p><strong className="text-[hsl(var(--foreground))]">Everything you upload for a scan stays on your device.</strong> The score, the checking steps, and the report sections all run inside the browser. We structured the product this way from the first version, because a resume is one of the most sensitive documents a person owns. There was no good reason to route it through a server, so we did not.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Optional features say so explicitly.</strong> The only part of the checker that contacts a network is the AI deep-dive, and it leaves the page with a clear explanation of exactly what is sent. We never silently enable background syncing, and we will not add a feature that requires uploading your file without telling you first.</p>
            <p><strong className="text-[hsl(var(--foreground))]">We keep the emails light and the marketing honest.</strong> There are no persistent cookies dropped by the resume scanner, no ad trackers pasted into the report, and no newsletter checkbox buried inside an upload form. When a page says 'never stored permanently,' it is a statement about the code, not a slogan about our intentions.</p>
          </div>
        </section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">your rights</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Questions, corrections, and updates</h2></div></div>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:grid-cols-2"><p>If you have a question about how a feature handles your data, email us at <a href="mailto:contact@goodspace.app" className="font-bold text-[hsl(var(--primary))]">contact@goodspace.app</a>. We treat privacy questions as product feedback: if a genuine concern exists, we want to hear it and fix it, not defend it.</p><p>This policy can change if the product changes. The date below shows the last revision, and material changes are announced on this page and in the blog before they take effect. Your data practices are something we want you to re-check, the same way the checker asks you to re-check your resume.</p></div>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/contact" className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">Ask a privacy question</Link><Link href="/about" className="focus-ring rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold">About GoodSpace</Link></div>
        </section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">feature by feature</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">A data map: what each feature touches</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Instead of one vague promise, here is exactly what happens with your information inside each part of the suite. For anything not listed, the safe assumption is that nothing is collected until a specific notice says otherwise.</p><p>Questions about this policy are handled through the contact page, the same way every other question about the suite is. If you suspect a gap between what this page promises and what a page does, that is the fastest place to tell us.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Resume checker.</strong> Reads the file locally, extracts text in memory, calculates a score, and renders a report. Nothing is uploaded. The working copy exists only for the life of the tab.</p><p><strong className="text-[hsl(var(--foreground))]">Improvement page.</strong> Turns the current report into an editable checklist. All of it lives in the same in-memory session; closing the tab clears it.</p><p><strong className="text-[hsl(var(--foreground))]">Template downloads.</strong> Plain text and formatted files are generated in the browser and handed to your download manager. No copy of the file touches our servers.</p><p><strong className="text-[hsl(var(--foreground))]">Keyword finder.</strong> Job description text is tokenized and categorised locally. There is no history of your searches, no saved role list, and nothing that links to your identity.</p><p><strong className="text-[hsl(var(--foreground))]">AI deep-dive.</strong> The only network-bound feature. It sends the extracted resume text plus one image of the first page to an AI provider, with a clear notice before it runs. Files, full documents, and contact details beyond that text are not included.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">common worries</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Questions we are asked and short answers</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">Does local processing mean not even analytics get collected?</strong> Correct. The scanner does not wire trackers into the report or upload flow, and no resume-derived data is aggregated.</p><p><strong className="text-[hsl(var(--foreground))]">Can a future update start uploading files?</strong> Not without telling you. Sending a processed resume would be such a fundamental change that it would be announced on this page and the blog long before it shipped, and it would be an opt-in feature, not a silent default.</p><p><strong className="text-[hsl(var(--foreground))]">What about the job description I paste?</strong> Without the AI deep-dive, the description never leaves your browser. With it, the description stays with you; only the resume text and first-page image are sent.</p><p><strong className="text-[hsl(var(--foreground))]">Is reading a file in the browser safe?</strong> File reading happens in your tab's memory using your browser's normal APIs. Nothing is written to disk unless you choose to download a template or an exported text copy.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">how to verify</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">You do not have to take our word for it</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Because the product runs in your browser, you can test the privacy promise directly. Open the developer tools with the network tab recording, upload a resume, and watch what happens. For a normal scan, the panel stays quiet. That is not a demo; it is the design. The one exception is the AI deep-dive, which should show a single request to the AI provider, and only after the notice says it will.</p><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">We keep this page deliberately long, because a privacy policy that cannot say the concrete words about what is and is not sent is not a policy, it is a placeholder. When something here becomes outdated, it is a bug to fix, not a footnote to defend.</p></div></section>
        <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">how this policy works</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">The principles behind every sentence</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">The browser is the boundary.</strong> A career document is one of the most sensitive files a person owns. Drawing the line at the browser means there is nothing to breach, leak, or subpoena on our side.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Plain language over legal padding.</strong> Privacy notices are usually written to protect the author; we write this one to be read. Wherever a technical term is unavoidable, a following sentence explains it, and the whole page fits the reading time of a coffee break.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Persistent data is a planned feature, not an assumption.</strong> When we someday add something that logically requires server storage, it will be a separate, clearly labelled feature with its own notice, not a silent widening of this policy's scope.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Default, not guarantee.</strong> Privacy is strongest when it is the default behaviour rather than a setting users must find. Everything on this page defaults to the private path, which is why the explanations read like features rather than exceptions.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Local does not mean immortal.</strong> In-memory data lives exactly as long as the tab that owns it. A session that is closed, refreshed, or shared to a new device clears the working copy, and there is no backup, archive, or recovery copy anywhere else.</p><p><strong className="text-[hsl(var(--foreground))]">Claim only what the code does.</strong> When we say a feature sends nothing, that is a statement we verify in the network logs before publishing. We would rather underclaim and surprise pleasantly than overclaim and be found out.</p><p><strong className="text-[hsl(var(--foreground))]">Change requires disclosure.</strong> Material changes to how your data is handled would be announced here and in the journal before they take effect, and would be optional, not baked in silently.</p><p><strong className="text-[hsl(var(--foreground))]">Questions are product inputs.</strong> Every privacy question we receive either confirms the policy already covers the case or exposes a gap worth fixing. Both outcomes make the next version of this page more honest. Every sentence here is written to be re-read, not to be signed blindly.</p></div></section>
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">privacy policy Â· last updated september 2026</p>
      </main>
      <SiteFooter />
    </div>
  );
}

function KeywordChip({ word, tone, added, onAdd }: { word: string; tone: 'matched' | 'missing'; added: boolean; onAdd: () => void }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-medium ${tone === 'matched' ? 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent)/.45)] text-[hsl(var(--accent-foreground))]'}`}>
      <span>{word}</span>
      <button type="button" onClick={onAdd} className={`focus-ring grid size-5 place-items-center rounded-full transition-colors ${added ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--foreground)/.12)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))]'}`} aria-label={`${added ? 'Remove' : 'Add'} ${word} to keyword plan`}>
        {added ? <Check className="size-3" /> : <Plus className="size-3" />}
      </button>
    </div>
  );
}

function downloadResumeText(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function renderFirstPageAsImage(file: File): Promise<{ base64: string; mimeType: string } | null> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      return base64 ? { base64, mimeType: 'image/jpeg' } : null;
    }
    if (file.type.startsWith('image/')) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      return { base64, mimeType: file.type };
    }
  } catch (err) {
    console.warn('[Resume ATS] Could not render first page as image:', err);
  }
  return null;
}

async function fetchAiAnalysis(resumeText: string, jobDescription: string, file: File | null): Promise<AiAnalysis> {
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  if (file) {
    const rendered = await renderFirstPageAsImage(file);
    if (rendered) {
      imageBase64 = rendered.base64;
      imageMimeType = rendered.mimeType;
    }
  }
  const response = await fetch('/api/resume/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescription, imageBase64, imageMimeType }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `AI analysis failed (HTTP ${response.status})`);
  }
  return response.json() as Promise<AiAnalysis>;
}

function Results({ analysis, file, resumeText, onReset, resultRef, keywordPlan, setKeywordPlan, aiAnalysis, aiLoading, aiError, onTriggerAi }: { analysis: Analysis; file: File | null; resumeText: string; onReset: () => void; resultRef: React.RefObject<HTMLDivElement | null>; keywordPlan: string[]; setKeywordPlan: React.Dispatch<React.SetStateAction<string[]>>; aiAnalysis?: AiAnalysis | null; aiLoading?: boolean; aiError?: string; onTriggerAi?: () => void }) {
  const [expandedCheck, setExpandedCheck] = useState<number | null>(0);
  const issueCount = analysis.checks.filter((item) => item.status !== 'pass').length;
  const toggleKeyword = (word: string) => setKeywordPlan((current) => current.includes(word) ? current.filter((item) => item !== word) : [...current, word]);
  return (
    <>
    <main ref={resultRef} className="mx-auto max-w-7xl px-5 pb-20 pt-9 sm:px-8 sm:pt-14 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rise-in">
        <div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><CheckCircle2 className="size-3.5" /> Analysis complete</div><h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em] sm:text-5xl">Your resume score</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{file?.name} Â· just now Â· analyzed in this browser</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/improve" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5"><Lightbulb className="size-3.5" /> Improve my resume</Link><button type="button" onClick={onReset} className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-3.5 py-2.5 text-xs font-bold transition-colors hover:bg-[hsl(var(--secondary))]" data-testid="button-reset-results"><RotateCcw className="size-3.5" /> Start over</button></div>
      </div>

      <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_50px_hsl(var(--primary)/.07)] rise-in rise-in-1">
        <div className="border-b border-[hsl(var(--border)/.7)] px-6 py-4 sm:px-8"><div className="font-['Space_Grotesk'] text-xl font-bold">Overview</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{issueCount ? `${issueCount} areas worth a closer look` : 'Your core ATS signals are in good shape'}</div></div>
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div className="max-w-xl"><ScoreGauge score={analysis.score} /></div>
          <div className="space-y-4">
            {analysis.categoryScores.map((item, index) => <div className="flex items-center gap-3" key={item.label}><div className="w-32 shrink-0 text-xs font-semibold sm:w-44">{item.label}</div><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full ${index < 2 ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]'}`} style={{ width: `${item.value}%` }} /></div><div className="w-10 text-right font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{item.value}%</div></div>)}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 sm:p-8 rise-in rise-in-2">
          <div className="flex items-start justify-between gap-4"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">your next moves</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Small edits, real lift.</h2></div><div className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--accent)/.35)] text-[hsl(var(--accent-foreground))]"><Lightbulb className="size-4" /></div></div>
          <div className="mt-6 space-y-3">{analysis.suggestions.map((suggestion, index) => <div className="flex gap-3 text-sm leading-6" key={suggestion} data-testid={`text-suggestion-${index}`}><span className="font-mono text-xs text-[hsl(var(--primary))]">0{index + 1}</span><span>{suggestion}</span></div>)}</div>
        </div>
        <div className="rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-6 sm:p-8 rise-in rise-in-3">
          <div className="flex items-center justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">signal check</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">What the parser noticed</h2></div><span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 font-mono text-[10px] font-medium text-[hsl(var(--primary))]">{analysis.checks.filter((item) => item.status === 'pass').length}/{analysis.checks.length} clear</span></div>
          <div className="mt-4">{analysis.checks.map((item, index) => {
            const isOpen = expandedCheck === index;
            return <div className="border-b border-[hsl(var(--border)/.7)] last:border-0" key={item.label}>
              <button type="button" onClick={() => setExpandedCheck(isOpen ? null : index)} className="focus-ring flex w-full items-center gap-3 py-4 text-left" aria-expanded={isOpen} data-testid={`row-check-${index}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${item.status === 'pass' ? 'bg-[hsl(var(--primary)/.11)] text-[hsl(var(--primary))]' : item.status === 'warn' ? 'bg-[hsl(var(--accent)/.45)] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]'}`}>{item.status === 'pass' ? <Check className="size-3.5" /> : item.status === 'warn' ? <Lightbulb className="size-3.5" /> : <X className="size-3.5" />}</span>
                <span className="flex-1 text-sm font-bold">{item.label}</span><span className="font-mono text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{item.status === 'pass' ? 'Clear' : 'Review'}</span><ChevronDown className={`size-4 text-[hsl(var(--muted-foreground))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <p className="pb-4 pl-10 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.detail}</p>}
            </div>;
          })}</div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_50px_hsl(var(--primary)/.05)] sm:p-8 rise-in rise-in-3">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><LinkIcon className="size-3.5" /> tailored relevance</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Matched & unmatched keywords</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use the plus button to add a term to your personal keyword plan. Add only language that honestly reflects your experience.</p></div><div className="rounded-full bg-[hsl(var(--primary)/.1)] px-3 py-1.5 font-mono text-xs font-bold text-[hsl(var(--primary))]">{analysis.relevance}% match</div></div>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[hsl(var(--border))] p-5"><div className="flex items-center justify-between"><h3 className="text-base font-bold">Matched keywords</h3><span className="text-xs text-[hsl(var(--muted-foreground))]">{analysis.matched.length} found</span></div><div className="mt-4 flex flex-wrap gap-2">{analysis.matched.length ? analysis.matched.map((word) => <KeywordChip key={word} word={word} tone="matched" added={keywordPlan.includes(word)} onAdd={() => toggleKeyword(word)} />) : <p className="text-sm text-[hsl(var(--muted-foreground))]">Add a job description to compare role language.</p>}</div></div>
          <div className="rounded-2xl border border-[hsl(var(--border))] p-5"><div className="flex items-center justify-between"><h3 className="text-base font-bold">Unmatched keywords</h3><span className="text-xs text-[hsl(var(--muted-foreground))]">{analysis.missing.length} to review</span></div><div className="mt-4 flex flex-wrap gap-2">{analysis.missing.length ? analysis.missing.map((word) => <KeywordChip key={word} word={word} tone="missing" added={keywordPlan.includes(word)} onAdd={() => toggleKeyword(word)} />) : <p className="text-sm text-[hsl(var(--muted-foreground))]">No missing role terms were spotted.</p>}</div></div>
        </div>
        {keywordPlan.length > 0 && <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.18)] bg-[hsl(var(--primary)/.06)] p-5"><div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]"><CheckCircle2 className="size-4" /> Your keyword plan</div><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Review these terms while editing your resume.</p><div className="mt-3 flex flex-wrap gap-2">{keywordPlan.map((word) => <span key={word} className="rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1.5 font-mono text-[11px] text-[hsl(var(--primary-foreground))]">{word}</span>)}</div></div>}
        <div className="mt-6 flex items-start gap-2 border-t border-[hsl(var(--border)/.7)] pt-5 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><CircleHelp className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--primary))]" /> A missing keyword is a prompt to check your wording, not a reason to add experience you do not have.</div>
      </section>
      <AiInsightsSection aiAnalysis={aiAnalysis ?? null} aiLoading={aiLoading ?? false} aiError={aiError ?? ''} onTriggerAi={onTriggerAi ?? (() => undefined)} />
      <section className="improve-cta mt-6 rounded-[1.5rem] border border-[hsl(var(--primary)/.35)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--accent))]">now fix it</div><h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em] sm:text-3xl">Turn these findings into a better resume.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Manually edit your resume, mark each fix as complete, and download a clean PDF or Word version when you are ready.</p></div>
          <Link href="/improve" className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[#7657ff] px-5 py-3.5 text-sm font-bold text-white shadow-[0_7px_20px_hsl(var(--primary)/.2)] transition-transform hover:-translate-y-0.5"><Lightbulb className="size-4" /> Fix it â€” improve my resume</Link>
        </div>
      </section>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck className="size-4 text-[hsl(var(--primary))]" /> This report was generated locally. Your resume is not sent to a server or stored permanently.</div>
      <section className="mt-8 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-6 sm:p-9 lg:grid-cols-[.85fr_1.15fr]">
        <div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">reading your report</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">How to use this score</h2></div>
        <div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
          <p>The score is an average of five signals: length, keyword optimization, content, organization, and miscellaneous scanning details. Each category bar shows where your resume stands on that measure, so a low overall number is not a mystery. Find the lowest bar, open its explanation, and start there.</p>
          <p>The untouched keywords listed in the tailored relevance section are prompts to check your wording, not commands to invent experience. If a term genuinely describes something you have done, add it in the relevant bullet using your own phrasing. If it does not, leave it out. The improvement page turns these findings into a checklist you can mark off as you edit.</p>
          <p>Finally, remember that a resume score measures legibility and matching, not your worth as a candidate. After you apply the fixes, run the checker once more and watch the signal improve. Then close the tab, knowing your document travelled nowhere and nothing was stored.</p>
        </div>
      </section>
      <section className="mt-6 grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Fix the low bars first</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The smallest category usually matches the easiest win. One strong edit can move an entire category by several points.</p></div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Re-run after editing</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Scores are snapshots of one version. Edit, check again, and repeat until the structure parses cleanly and the wording reads clearly.</p></div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Keep your judgment</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">No number replaces a real employer conversation. Use the report to prepare, and let your record of work do the talking in the interview.</p></div>
      </section>
      <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">the five signals</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">What each part of this score actually measures</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Your score is an average, and averages hide detail. Reading the categories separately is more useful, because each one suggests a different kind of edit.</p></div><div className="mt-7 space-y-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Length.</strong> Rewards a document with enough evidence to evaluate. Very short resumes struggle to show impact, and very long ones bury it. A comfortable one-to-two-page range scores well, and the check never punishes brevity for its own sake.</p><p><strong className="text-[hsl(var(--foreground))]">Keyword optimization.</strong> Compares your resume with the job description when you provide one. This is the number most tied to tailoring: matched language raises it, unmatched role terms lower it, and an honest mismatch tells you something real about fit.</p><p><strong className="text-[hsl(var(--foreground))]">Content.</strong> Looks for the building blocks a recruiter expects: contact details, an experience section, and clear bullets. A low score here usually means missing sections rather than weak writing.</p><p><strong className="text-[hsl(var(--foreground))]">Organization.</strong> Covers headings, dates, and line structure that help a parser file your history correctly. Errors here often come from tables, text boxes, or decorative layout that machines cannot follow.</p><p><strong className="text-[hsl(var(--foreground))]">Miscellaneous scanning.</strong> A small catch-all for the file-level details that trip up parsers, measured at a lighter weight so an odd formatting quirk does not dominate the verdict.</p></div></section>
      <section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10 lg:grid-cols-3"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">edge cases</div><h2 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em]">Scores that look odd, explained</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))] lg:col-span-2"><p><strong className="text-[hsl(var(--foreground))]">A scanned image file.</strong> If your PDF is really a picture, the text extraction returns almost nothing and the length and content signals drop together. Export the document from its source rather than printing to a scanner.</p><p><strong className="text-[hsl(var(--foreground))]">A short executive resume.</strong> Senior candidates often keep a one-page resume with dense bullets. The length check is weight-aware, so a focused page can still score well if the content and organization signals carry the weight.</p><p><strong className="text-[hsl(var(--foreground))]">No job description provided.</strong> The keyword section returns a neutral baseline instead of judging you. The report will still show you matched and unmatched lists only when a description is present.</p><p><strong className="text-[hsl(var(--foreground))]">A low overall score with one perfect category.</strong> Every category bar is shown for a reason. Find the lowest bar, open its explanation, and start there; one strong edit can move an entire category by several points.</p></div></section>
      <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">make a plan</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Turn one report into an ordered week of edits</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A single editing session rarely fixes everything, and it does not need to. These three rules keep the work manageable, even when the list of findings looks long.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Do the structural fixes first.</strong> Text that is missing or unscannable makes every other signal weak. Fix the file type, the headings, and the dates before polishing wording, because polish cannot fix a file a parser cannot read.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Keep one version in the improve page.</strong> Use the checklist to track which suggestions you have applied, add the keywords you honestly match to your plan, and download the finished copy when the bars look healthy. The whole loop stays in this browser session, so nothing you try is burned.</p><p><strong className="text-[hsl(var(--foreground))]">Then target the lowest category bar.</strong> Re-check after each edit and watch the bar move. Editing becomes satisfying when you can see a number respond to a specific change instead of waiting to feel like your resume improved.</p><p><strong className="text-[hsl(var(--foreground))]">Stop when the report is clean, not perfect.</strong> A score in the healthy range with honest language is a strong application. Chasing the last few points by force-fitting keywords defeats the purpose and shows up in interviews. Two healthy re-checks, each followed by one focused edit, are worth more than a single marathon session.</p>
            <p><strong className="text-[hsl(var(--foreground))]">Read the report from the top once.</strong> The overview, the category bars, and the suggestion list tell one coherent story. Skimming them in order turns an average into a plan, and a plan into the next edit you know why you are making.</p></div></section>
    </main>
    <SiteFooter />
    </>
  );
}

function AiIssuesList({ title, issues }: { title: string; issues: AiTextIssue[] }) {
  const list = issues ?? [];
  if (!list.length) return null;
  const severityTone = (severity: string) => severity === 'critical' ? 'text-[hsl(var(--destructive))]' : severity === 'major' ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]';
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] p-5">
      <div className="flex items-center justify-between"><h3 className="text-base font-bold">{title}</h3><span className="text-xs text-[hsl(var(--muted-foreground))]">{list.length} found</span></div>
      <div className="mt-4 space-y-3">
        {list.map((issue, index) => (
          <div className="flex gap-2 text-sm leading-6" key={index}>
            <span className={`mt-1 shrink-0 font-mono text-[9px] uppercase ${severityTone(issue.severity)}`}>{issue.severity}</span>
            <div className="min-w-0">
              <p className="text-[hsl(var(--foreground)/.85)]">{issue.detail}</p>
              {issue.line && <p className="mt-1 rounded-lg bg-[hsl(var(--secondary)/.5)] px-2 py-1 font-mono text-[11px] italic text-[hsl(var(--muted-foreground))]">â€œ{issue.line}â€</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiInsightsSection({ aiAnalysis, aiLoading, aiError, onTriggerAi }: { aiAnalysis: AiAnalysis | null; aiLoading: boolean; aiError: string; onTriggerAi: () => void }) {
  const [openRewrite, setOpenRewrite] = useState<number | null>(null);
  const text = aiAnalysis?.textAnalysis ?? null;
  const format = aiAnalysis?.formatAnalysis ?? null;
  const grammarIssues = text?.grammarIssues ?? [];
  const weakBulletPoints = text?.weakBulletPoints ?? [];
  const missingQuantifiableAchievements = text?.missingQuantifiableAchievements ?? [];
  const missingKeywords = text?.missingKeywords ?? [];
  const rewriteSuggestions = text?.rewriteSuggestions ?? [];
  const strengths = text?.strengths ?? [];
  const formatIssues = format?.issues ?? [];
  const formatSuggestions = format?.suggestions ?? [];
  const hasTextResults = !!text;
  const hasFormatResults = !!format;
  const hasAnyResults = hasTextResults || hasFormatResults;

  return (
    <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--primary)/.3)] bg-[linear-gradient(150deg,hsl(var(--card)),hsl(var(--secondary)/.4))] p-6 shadow-[0_18px_50px_hsl(var(--primary)/.08)] sm:p-8 rise-in rise-in-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><Sparkles className="size-3.5" /> AI deep-dive</div>
          <h2 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em] sm:text-3xl">Expert review with AI</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Optional: send your resume text for a detailed rewrite review and a visual formatting check of the first page.</p>
        </div>
        <span className="rounded-full bg-[hsl(var(--primary)/.1)] px-3 py-1.5 font-mono text-[10px] text-[hsl(var(--primary))]">enhancement layer</span>
      </div>

      {!hasAnyResults && !aiLoading && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            <Sparkles className="size-4 shrink-0 text-[hsl(var(--accent-foreground))]" />
            <span>Click to send your resume text (and first-page image) for AI suggestions. Only text and one rendered page image are sent â€” full files are never uploaded or stored.</span>
          </div>
          <button type="button" onClick={onTriggerAi} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[#7657ff] px-4 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_hsl(var(--primary)/.25)] transition-transform hover:-translate-y-0.5"><Sparkles className="size-4" /> Run AI review</button>
        </div>
      )}

      {aiLoading && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
          <LoaderCircle className="size-5 animate-spin text-[hsl(var(--primary))]" /> Running AI review â€” this can take up to a minute...
        </div>
      )}

      {aiError && !aiLoading && !hasAnyResults && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm leading-6 text-[hsl(var(--destructive))]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />{aiError}{aiAnalysis?.errors?.length ? <div className="mt-1 text-xs">{aiAnalysis.errors.map((e) => <div key={e}>â€¢ {e}</div>)}</div> : null}
        </div>
      )}

      {aiAnalysis && aiError && hasAnyResults && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-xs leading-5 text-[hsl(var(--destructive))]" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>{aiAnalysis.errors.length ? aiAnalysis.errors.map((e) => <div key={e}>â€¢ {e}</div>) : aiError}</div>
        </div>
      )}

      {hasAnyResults && (
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          {hasTextResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><FileText className="size-3.5" /> text analysis</div>
              <AiIssuesList title="Grammar & language issues" issues={grammarIssues} />
              <AiIssuesList title="Weak bullet points" issues={weakBulletPoints} />
              <AiIssuesList title="Missing quantifiable achievements" issues={missingQuantifiableAchievements} />
              {missingKeywords.length > 0 && (
                <div className="rounded-2xl border border-[hsl(var(--border))] p-5">
                  <h3 className="text-base font-bold">Missing keywords vs. job description</h3>
                  <div className="mt-4 flex flex-wrap gap-2">{missingKeywords.map((word) => <span key={word} className="rounded-lg bg-[hsl(var(--accent)/.5)] px-2.5 py-1.5 font-mono text-[11px] text-[hsl(var(--accent-foreground))]">{word}</span>)}</div>
                </div>
              )}
              {strengths.length > 0 && (
                <div className="rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-5">
                  <h3 className="text-base font-bold text-[hsl(var(--primary))]">Whatâ€™s working well</h3>
                  <div className="mt-3 space-y-2">{strengths.map((strength, index) => <div className="flex gap-2 text-sm leading-6" key={index}><Check className="mt-1 size-4 shrink-0 text-[hsl(var(--primary))]" /><span>{strength}</span></div>)}</div>
                </div>
              )}
              {rewriteSuggestions.length > 0 && (
                <div className="rounded-2xl border border-[hsl(var(--border))] p-5">
                  <h3 className="text-base font-bold">Concrete rewrite suggestions</h3>
                  <div className="mt-3 space-y-3">
                    {rewriteSuggestions.map((item, index) => {
                      const open = openRewrite === index;
                      return (
                        <div className={`overflow-hidden rounded-xl border ${open ? 'border-[hsl(var(--primary)/.35)]' : 'border-[hsl(var(--border))]'}`} key={index}>
                          <button type="button" onClick={() => setOpenRewrite(open ? null : index)} className="focus-ring flex w-full items-center gap-3 p-3 text-left">
                            <span className="font-mono text-[10px] text-[hsl(var(--primary))]">{String(index + 1).padStart(2, '0')}</span>
                            <span className="flex-1 truncate text-xs italic text-[hsl(var(--muted-foreground))]">{item.original}</span>
                            <ChevronDown className={`size-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform ${open ? 'rotate-180' : ''}`} />
                          </button>
                          {open && (
                            <div className="border-t border-[hsl(var(--border)/.7)] p-4">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Before</div>
                              <p className="mt-1 text-sm italic text-[hsl(var(--muted-foreground))]">{item.original}</p>
                              <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">After</div>
                              <p className="mt-1 text-sm leading-6 text-[hsl(var(--foreground)/.9)]">{item.rewrite}</p>
                              <div className="mt-3 flex items-start gap-2 rounded-lg bg-[hsl(var(--secondary)/.5)] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--accent-foreground))]" /><span>{item.reason}</span></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasFormatResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><ScanText className="size-3.5" /> visual formatting analysis</div>
              <div className="rounded-2xl border border-[hsl(var(--border))] p-5">
                <div className="flex items-center justify-between"><h3 className="text-base font-bold">Format score</h3>{format?.formatScore != null && <span className="font-['Space_Grotesk'] text-2xl font-bold text-[hsl(var(--primary))]">{format?.formatScore}/100</span>}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]" style={{ width: `${format?.formatScore ?? 0}%` }} /></div>
                <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">How ATS-friendly the first-page visual layout looks (clean single column, readable fonts, no graphics).</p>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border))] p-5">
                <h3 className="text-base font-bold">Formatting issues</h3>
                <div className="mt-3 space-y-2">{formatIssues.map((issue, index) => <div className="flex gap-2 text-sm leading-6 text-[hsl(var(--foreground)/.85)]" key={index}><span className="font-mono text-[10px] text-[hsl(var(--primary))]">0{index + 1}</span><span>{issue}</span></div>)}</div>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-5">
                <h3 className="text-base font-bold text-[hsl(var(--primary))]">Formatting suggestions</h3>
                <div className="mt-3 space-y-2">{formatSuggestions.map((suggestion, index) => <div className="flex gap-2 text-sm leading-6 text-[hsl(var(--foreground)/.85)]" key={index}><Lightbulb className="mt-1 size-3.5 shrink-0 text-[hsl(var(--accent-foreground))]" /><span>{suggestion}</span></div>)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 border-t border-[hsl(var(--border)/.7)] pt-4 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--primary))]" />
        <span>AI insights are an additional enhancement on top of the local score. Only resume text and one rendered page image are sent to the AI providers; full files are not uploaded or stored. AI output can be imperfect â€” use judgment before editing.</span>
      </div>
    </section>
  );
}

function NotFound() {
  const [, setLocation] = useLocation();
  return <><main className="mx-auto max-w-4xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24"><div className="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[0_18px_50px_hsl(var(--primary)/.06)] sm:p-12"><h1 className="font-['Space_Grotesk'] text-6xl font-bold text-[hsl(var(--primary))] sm:text-8xl">404</h1><p className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.05em] sm:text-3xl">That page is not part of the radar.</p><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">The link may be outdated, or the address may have a small mistake. You can return to the checker, read a guide, or browse the free tools from the sections below. There is also a full address map at the bottom of this page if you want every route in one place. The four quick links at the top are the shortest path back to work, and they work even when nothing else does.</p><button type="button" onClick={() => setLocation('/')} className="focus-ring mt-6 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-go-home">Back to checker</button></div><section className="mt-6 grid gap-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">you might be looking for</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Four pages that do most of the work</h2></div><div className="space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><Link href="/" className="font-bold text-[hsl(var(--primary))]">The resume checker.</Link> Upload your resume as a PDF, DOCX, image, or text file, optionally paste a job description, and get a five-signal score with clear next steps. Everything runs locally in your browser, and nothing is stored permanently.</p><p><Link href="/blog" className="font-bold text-[hsl(var(--primary))]">The journal.</Link> Plain-language guides about how applicant tracking systems read resumes, how to tailor a document without starting over, and how to make your experience easier to skim.</p><p><Link href="/free-tools" className="font-bold text-[hsl(var(--primary))]">The free tools.</Link> Ats-friendly resume templates you can download and a keyword finder that pulls the repeating language out of any job description.</p><p><Link href="/about" className="font-bold text-[hsl(var(--primary))]">About GoodSpace.</Link> Who we are, why we build career tools that run locally, and the five principles behind every product decision.</p></div></section><section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">while you are here</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Ten edits that raise an ATS score quickly</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">If a broken link brought you to this page, consider the detour useful. These are the ten changes we recommend most often, none of which requires a full rewrite.</p></div><ol className="mt-7 grid gap-3 sm:grid-cols-2"><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">01</span>Save the file as text-based PDF from your word processor so a real text layer exists.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">02</span>Use familiar headings: Summary, Experience, Skills, Education, and Projects.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">03</span>Keep contact details near the top as regular text, not inside images or tables.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">04</span>Add month and year to every role so the timeline reads without guessing.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">05</span>Write bullets that combine an active verb, the context, and a measurable outcome.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">06</span>Repeat the tools from the job description only where your experience supports them.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">07</span>Avoid headers, footers, and text boxes that some parsers quietly skip.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">08</span>Keep bullets under two sentences and roughly 160 characters per line.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">09</span>Add concrete numbers: percentages, revenue, users, or efficiency gains where honest.</li><li className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] font-mono text-[11px] font-bold text-[hsl(var(--primary))]">10</span>Read the exported text as plain text before applying and fix anything that reads strangely.</li></ol></section><section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">still stuck</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">If a link from a message or guide brought you here</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Pages move as the product grows, and occasionally an old link points somewhere new. The address bar may also have a stray character. A few patterns we frequently see: a doubled section of the URL, a trailing slash where one is not expected, or a misspelled tool name. Cutting the address back to goodspace.app usually clears it.</p><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">If you are certain the page should exist, tell us at <a href="mailto:contact@goodspace.app" className="font-bold text-[hsl(var(--primary))]">contact@goodspace.app</a> with the address you typed and what you expected to find. We fix broken routes quickly, and we read every report.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">resume refresher</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Useful detour: where compatible resumes usually go wrong</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The mistakes below account for a large share of the low scores applicants see. Read them here, then open the checker and confirm your resume avoids every one.</p></div><div className="mt-7 grid gap-4 md:grid-cols-2"><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Scanned images passed off as PDFs.</strong> If the file is really a picture, the system has no text to read. Export from the original document instead of printing, and if you must scan, keep the photo straight and well-lit.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Creative headings nobody recognises.</strong> A parser looks for familiar names like Experience and Education. Distinctive labels might please the eye but confuse the machine, so keep headings conventional.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Contact details trapped in images.</strong> Your name, email, and phone need to be copyable text. Inside a photo, a graphic, or a header image, they may never reach the recruiter's preview.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Missing dates on every role.</strong> Without month and year, a system cannot build your timeline, and recruiters cannot judge progression. Dates are small but the signal they carry is large.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Paragraphs that carry three ideas.</strong> A skimmer reads the first words of each line. Split long paragraphs into short bullets of one or two sentences so the strongest phrase does not hide in the middle.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Results missing from every bullet.</strong> Experience described without outcomes reads as a list of duties. Add the size of the change: percentages, revenue, users, or time saved.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">The same verb opening every line.</strong> Led, managed, and helped repeated ten times dulls even real achievement. Vary the verb to keep the strongest information in the strongest position.</p><p className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><strong className="text-[hsl(var(--foreground))]">Ignoring the job description.</strong> The quickest score improvement is honest tailoring. Match the tools and responsibilities the listing repeats, and let the keyword finder do the ranking for you.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">your next step</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Do not let a wrong turn cost you the session</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Whether you landed here by a stale bookmark or a typo does not matter much. What matters is that the tools you actually need are one click away, they are free, and they run privately in this browser. The checker, the templates, the keyword finder, and the journal are listed in the footer on every page, so you always have a road back.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">quick answers</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Questions people ask while standing on a 404 page</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">Confusion is the only honest traffic this page receives, so we wired it up to answer the questions that usually follow.</p></div><div className="mt-7 space-y-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]"><p><strong className="text-[hsl(var(--foreground))]">Is my resume safe if I upload it?</strong> Yes. The checker reads your file in this browser and does not store it permanently. You can watch the network tab stay silent during a normal scan if you want proof.</p><p><strong className="text-[hsl(var(--foreground))]">Which file type should I use?</strong> A text-based PDF or a DOCX file has the most reliable text layer. Images and scans work only when the photo is clear, straight, and well-lit.</p><p><strong className="text-[hsl(var(--foreground))]">Do I really need to tailor for every role?</strong> You need to match the repeated language of the role where your experience supports it. The keyword finder ranks those terms, and the checker shows your match percentage after each edit.</p><p><strong className="text-[hsl(var(--foreground))]">Why do you not accept resumes by email?</strong> Because sending a career document anywhere weakens the privacy boundary we promise. The checker already does the job privately on your device.</p><p><strong className="text-[hsl(var(--foreground))]">Is there a list of everything on the site?</strong> The footer on every page lists the checker, the journal, the about and contact pages, the privacy policy, and the free tools, so no important route is ever far away. Bookmark the checker address once, and this page becomes a rare guest instead of a familiar one.</p></div></section>
        <section className="mt-6 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Check the resume first</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Upload your latest file and see length, keywords, content, organization, and scanning details all at once, with a suggestion under every finding.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Then study the journal</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The guides explain how systems read text and structure, and every article pairs an idea with an action you can take on your own document.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold">Then grab the tools</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Download a format from the templates page and pull the repeating language from any listing with the keyword finder before you apply.</p></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">site map</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">Everything on the site, pointing the way home</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">If a bookmark failed, the map below is the fastest way to rebuild your bearings. Each entry says what the page does in one paragraph.</p></div><div className="mt-7 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/" className="text-[hsl(var(--primary))]">The resume checker</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The main page and the only place you upload a resume. It reads the file in your browser, scores five signals, and sends you to the results page with suggestions you can act on.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/free-tools/templates" className="text-[hsl(var(--primary))]">Resume templates</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Four downloadable ATS-friendly formats with previews: Classic ATS, Modern Professional, Executive, and Minimal. Pick the one that fits your seniority and download a copy to edit.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/free-tools/keyword-finder" className="text-[hsl(var(--primary))]">Keyword finder</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Paste a job description and receive a ranked, categorised list of the language it repeats. Copy the list and use it as an honest tailoring checklist while editing your resume.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/blog" className="text-[hsl(var(--primary))]">The journal</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Plain-language guides on how ATS systems read resumes, how to tailor a document, and how the checker scores each signal. Every article ends with an action you can take today.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/about" className="text-[hsl(var(--primary))]">About GoodSpace</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Who we are, why we build tools that run in the browser, the five principles behind the product, and a roadmap written in plain terms.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/privacy" className="text-[hsl(var(--primary))]">Privacy policy</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A feature-by-feature map of what is and is not sent, how to verify the claims yourself in the network tab, and what changes require disclosure.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/contact" className="text-[hsl(var(--primary))]">Contact us</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Reach the small team behind the tools within two working days, vote on the roadmap, or report a broken page like the one you are standing on.</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5"><div className="font-['Space_Grotesk'] text-lg font-bold"><Link href="/free-tools" className="text-[hsl(var(--primary))]">Free tools hub</Link></div><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The landing page for the suite: description of each tool, a three-step workflow, privacy answers, and the roadmap for what comes next.</p></div></div></section>
        <section className="mt-6 rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-10"><div className="max-w-3xl"><div className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">bookmark this instead</div><h2 className="mt-3 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.06em]">The address worth saving is the home page</h2><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">The footer repeats the same map on every page, so you never need to remember a long address. Save the root, open a fresh tab, and let the navigation bar and footer be your compass. If you find a link somewhere else on the web pointing to a page that no longer exists here, the contact page is the right place to report it, and we will route-fix it as soon as we read your note. In the meantime, the checklist on this page and the workflows in the guides still apply to your resume, so the detour rarely ends up wasted.</p>
            <p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">A closing thought for anyone reading a 404 during a job search: a missing page says nothing about your application, but how you handle a dead end says something about your resilience. Treat this as a five-minute reset, run the checker on your newest file, and let the ten edits on this page carry you forward.</p><p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">If you arrived via a link inside one of the journal guides, the article you wanted is likely still listed on the blog page; only its address changed. Everything we publish is reachable from the navigation menu at the top and the footer below, so consider the address bar a suggestion rather than a rule.</p></div></section></main><SiteFooter /></>;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location]);
  return null;
}

function resolveSeo(location: string): { title?: string; description?: string; canonicalPath?: string; noindex?: boolean; jsonLd?: JsonLd | JsonLd[] } | null {
  const path = location.split('?')[0];
  if (path === '/') {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalPath: '/',
      jsonLd: [websiteJsonLd(absoluteUrl('/')), organizationJsonLd(absoluteUrl('/'))],
    };
  }
  if (path === '/about' || path === '/about-contact') {
    return { title: 'About ScoreMyResume — A free, private ATS resume checker', description: 'ScoreMyResume reads resumes entirely in the browser — nothing is uploaded or stored. Learn about the team behind GoodSpace and why the checker is built for privacy first.', canonicalPath: '/about' };
  }
  if (path === '/contact') {
    return { title: 'Contact — ScoreMyResume', description: 'Questions about the ScoreMyResume ATS resume checker, the resume help guides, or the GoodSpace blog? Reach out through the contact page.', canonicalPath: '/contact' };
  }
  if (path === '/privacy' || path === '/privacy-policy') {
    return { title: 'Privacy Policy — ScoreMyResume', description: 'ScoreMyResume never uploads, stores, or tracks your resume. Read how the browser-only ATS checker keeps your data private.', canonicalPath: '/privacy' };
  }
  if (path === '/free-tools') {
    return { title: 'Free resume tools — ScoreMyResume', description: 'Free ATS-friendly resume tools: templates, a job-description keyword finder, and the browser-only ATS resume score checker.', canonicalPath: '/free-tools' };
  }
  if (path === '/free-tools/templates' || path === '/free-ats-resume-templates') {
    return { title: 'Free ATS Resume Templates — ScoreMyResume', description: 'Free, ATS-friendly resume templates that keep headings, dates, and keywords readable to applicant tracking systems.', canonicalPath: '/free-tools/templates' };
  }
  if (path === '/free-tools/keyword-finder') {
    return { title: 'Job Description Keyword Finder — ScoreMyResume', description: 'Paste a job description and instantly pull the keywords to match in your resume — no uploads, works in your browser.', canonicalPath: '/free-tools/keyword-finder' };
  }
  if (path === '/blog') {
    return { title: 'Blog — ScoreMyResume', description: 'Practical writing for hiring software: how applicant tracking systems read resumes, what to fix first, and honest guidance for job seekers.', canonicalPath: '/blog' };
  }
  if (path === '/resume-help') {
    return { title: 'Resume Help Guides & City Pages — ScoreMyResume', description: 'Free resume help for freshers, IT, government jobs, digital marketing, remote roles — plus city-specific advice for Haryana and NCR.', canonicalPath: '/resume-help' };
  }
  if (path === '/score') {
    return { title: 'Your ATS Resume Score — ScoreMyResume', description: 'See how an applicant tracking system reads your resume: category scores, matched and missing keywords, and a step-by-step fix list.', canonicalPath: '/score' };
  }
  if (path === '/improve') {
    return { title: 'Improve Your Resume — ScoreMyResume', description: 'Turn your ATS score into edits: a focused checklist, a formatted preview, and downloads of a cleaner PDF or Word resume.', canonicalPath: '/improve' };
  }
  if (path.startsWith('/admin')) {
    return { title: 'Admin — ScoreMyResume', description: '', noindex: true };
  }
  return { title: 'Page not found — ScoreMyResume', description: 'The page you are looking for could not be found. Head back to the free ATS resume checker or browse the resume help guides.', noindex: true };
}

function Router({ analysis, file, resumeText, keywordPlan, setKeywordPlan, aiAnalysis, aiLoading, aiError, onTriggerAi, onAnalysisComplete, onReset, jobDescription }: { analysis: Analysis | null; file: File | null; resumeText: string; keywordPlan: string[]; setKeywordPlan: React.Dispatch<React.SetStateAction<string[]>>; aiAnalysis: AiAnalysis | null; aiLoading: boolean; aiError: string; onTriggerAi: () => void; onAnalysisComplete: (analysis: Analysis, file: File, jobDescription: string, resumeText: string) => void; onReset: () => void; jobDescription: string }) {
  const resultRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  usePageViewTracking();
  const seo = resolveSeo(location);
  return <><Seo title={seo?.title} description={seo?.description} noindex={seo?.noindex} canonicalPath={seo?.canonicalPath} jsonLd={seo?.jsonLd ?? null} /><Suspense fallback={<div className="min-h-[60dvh]" />}><Switch>
    <Route path="/"><Home onAnalysisComplete={onAnalysisComplete} onReset={onReset} /></Route>
    <Route path="/score">{() => analysis ? <><Header onReset={onReset} /><Results analysis={analysis} file={file} resumeText={resumeText} onReset={onReset} resultRef={resultRef} keywordPlan={keywordPlan} setKeywordPlan={setKeywordPlan} aiAnalysis={aiAnalysis} aiLoading={aiLoading} aiError={aiError} onTriggerAi={onTriggerAi} /></> : <EmptyAnalysisPage title="Your score is waiting." description="Upload a resume from the checker page to see your category breakdown." />}</Route>
    <Route path="/improve">{() => <ImprovePage analysis={analysis} file={file} resumeText={resumeText} keywordPlan={keywordPlan} setKeywordPlan={setKeywordPlan} onReset={onReset} jobDescription={jobDescription} />}</Route>
    <Route path="/blog" component={BlogPage} />
    <Route path="/blog/:slug">{({ slug }) => <BlogPostPage slug={slug} />}</Route>
    <Route path="/admin/login" component={AdminLoginPage} />
    <Route path="/admin" component={AdminDashboardPage} />
    <Route path="/admin/blog" component={AdminBlogPage} />
    <Route path="/admin/blog/new">{() => <AdminPostFormPage />}</Route>
    <Route path="/admin/blog/:id">{({ id }) => <AdminPostFormPage postId={Number(id)} />}</Route>
    <Route path="/admin/settings" component={AdminSettingsPage} />
    <Route path="/about" component={AboutPage} />
    <Route path="/contact" component={ContactPage} />
    <Route path="/privacy" component={PrivacyPage} />
    <Route path="/free-tools/templates" component={ResumeTemplatesPage} />
    <Route path="/free-tools/keyword-finder" component={KeywordFinderPage} />
    <Route path="/free-tools" component={FreeToolsHubPage} />
    <Route path="/resume-help">{() => <LandingChrome><HelpDirectory /></LandingChrome>}</Route>
    <Route path="/resume-help/city/:slug">{({ slug }) => <LandingChrome><CityHelpPage slug={slug} /></LandingChrome>}</Route>
    <Route path="/resume-help/:slug">{({ slug }) => <LandingChrome><KeywordHelpPage slug={slug} /></LandingChrome>}</Route>
    <Route path="/ats-resume-checker-freshers">{() => <LandingChrome><KeywordHelpPage slug="freshers" /></LandingChrome>}</Route>
    <Route path="/software-engineer-resume-scanner">{() => <LandingChrome><KeywordHelpPage slug="software-engineer" /></LandingChrome>}</Route>
    <Route path="/data-analyst-resume-review">{() => <LandingChrome><KeywordHelpPage slug="data-analyst" /></LandingChrome>}</Route>
    <Route path="/digital-marketing-resume-optimizer">{() => <LandingChrome><KeywordHelpPage slug="digital-marketing" /></LandingChrome>}</Route>
    <Route path="/canva-resume-ats-friendly">{() => <LandingChrome><KeywordHelpPage slug="canva" /></LandingChrome>}</Route>
    <Route path="/best-file-format-for-ats">{() => <LandingChrome><KeywordHelpPage slug="file-format" /></LandingChrome>}</Route>
    <Route path="/how-to-optimize-resume-keywords">{() => <LandingChrome><KeywordHelpPage slug="keywords" /></LandingChrome>}</Route>
    <Route path="/free-ats-resume-templates" component={ResumeTemplatesPage} />
    <Route path="/about-contact" component={ContactPage} />
    <Route path="/privacy-policy" component={PrivacyPage} />
    <Route component={NotFound} />
    </Switch></Suspense></>;
}

function App() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [keywordPlan, setKeywordPlan] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const handleAnalysisComplete = (nextAnalysis: Analysis, nextFile: File, nextJobDescription: string, nextResumeText: string) => {
    setAnalysis(nextAnalysis);
    setFile(nextFile);
    setResumeText(nextResumeText);
    setJobDescription(nextJobDescription);
    setKeywordPlan([]);
    setAiAnalysis(null);
    setAiLoading(false);
    setAiError('');
  };
  const triggerAiAnalysis = async () => {
    if (!resumeText || aiLoading || aiAnalysis) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await fetchAiAnalysis(resumeText, jobDescription, file);
      setAiAnalysis(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };
  useEffect(() => {
    if (analysis && resumeText && !aiAnalysis && !aiLoading) {
      triggerAiAnalysis();
    }
  }, [analysis, resumeText]);
  const reset = () => {
    setAnalysis(null);
    setFile(null);
    setResumeText('');
    setJobDescription('');
    setKeywordPlan([]);
    setAiAnalysis(null);
    setAiLoading(false);
    setAiError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ScrollToTop /><ErrorBoundary><Router analysis={analysis} file={file} resumeText={resumeText} keywordPlan={keywordPlan} setKeywordPlan={setKeywordPlan} aiAnalysis={aiAnalysis} aiLoading={aiLoading} aiError={aiError} onTriggerAi={triggerAiAnalysis} onAnalysisComplete={handleAnalysisComplete} onReset={reset} jobDescription={jobDescription} /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
