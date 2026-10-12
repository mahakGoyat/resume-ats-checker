import { Router, type IRouter } from "express";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ---------- types ----------

interface TextAnalysisIssue {
  category: string;
  severity: "critical" | "major" | "minor";
  detail: string;
  line?: string;
}

interface TextAnalysisSuggestion {
  original: string;
  rewrite: string;
  reason: string;
}

interface TextAnalysisResult {
  grammarIssues: TextAnalysisIssue[];
  weakBulletPoints: TextAnalysisIssue[];
  missingQuantifiableAchievements: TextAnalysisIssue[];
  missingKeywords: string[];
  rewriteSuggestions: TextAnalysisSuggestion[];
  strengths: string[];
}

interface FormatAnalysisResult {
  formatScore: number;
  issues: string[];
  suggestions: string[];
}

interface AnalyzeResponse {
  textAnalysis: TextAnalysisResult | null;
  formatAnalysis: FormatAnalysisResult | null;
  errors: string[];
}

// ---------- response normalization ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asIssueArray(value: unknown): TextAnalysisIssue[] {
  return Array.isArray(value)
    ? value.filter((item): item is TextAnalysisIssue => isRecord(item) && typeof item.category === "string" && typeof item.detail === "string")
    : [];
}

function asSuggestionArray(value: unknown): TextAnalysisSuggestion[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is TextAnalysisSuggestion =>
          isRecord(item) && typeof item.original === "string" && typeof item.rewrite === "string",
      )
    : [];
}

function normalizeTextAnalysis(raw: unknown): TextAnalysisResult {
  if (!isRecord(raw)) {
    return { grammarIssues: [], weakBulletPoints: [], missingQuantifiableAchievements: [], missingKeywords: [], rewriteSuggestions: [], strengths: [] };
  }
  return {
    grammarIssues: asIssueArray(raw.grammarIssues),
    weakBulletPoints: asIssueArray(raw.weakBulletPoints),
    missingQuantifiableAchievements: asIssueArray(raw.missingQuantifiableAchievements),
    missingKeywords: asStringArray(raw.missingKeywords),
    rewriteSuggestions: asSuggestionArray(raw.rewriteSuggestions),
    strengths: asStringArray(raw.strengths),
  };
}

function normalizeFormatAnalysis(raw: unknown): FormatAnalysisResult {
  if (!isRecord(raw)) {
    return { formatScore: 0, issues: [], suggestions: [] };
  }
  return {
    formatScore: typeof raw.formatScore === "number" && Number.isFinite(raw.formatScore) ? raw.formatScore : 0,
    issues: asStringArray(raw.issues),
    suggestions: asStringArray(raw.suggestions),
  };
}

// ---------- Groq text analysis ----------

async function analyzeTextWithGroq(
  resumeText: string,
  jobDescription: string,
): Promise<TextAnalysisResult> {
  const groq = new Groq();

  const jobContext = jobDescription.trim()
    ? `\n\nJOB DESCRIPTION TO COMPARE AGAINST:\n${jobDescription}`
    : "";

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert resume reviewer and ATS optimization specialist. Analyze the resume text and return a JSON object with this exact structure:

{
  "grammarIssues": [{ "category": "Grammar/Spelling/Punctuation", "severity": "critical|major|minor", "detail": "specific issue description", "line": "problematic text excerpt or empty string" }],
  "weakBulletPoints": [{ "category": "Weak Bullet Point", "severity": "major|minor", "detail": "why this bullet is weak and what's missing", "line": "the weak bullet text" }],
  "missingQuantifiableAchievements": [{ "category": "Missing Quantification", "severity": "major|minor", "detail": "what achievement lacks quantification and how to add metrics", "line": "the bullet that needs metrics" }],
  "missingKeywords": ["keyword1", "keyword2"],
  "rewriteSuggestions": [{ "original": "original text", "rewrite": "improved rewrite", "reason": "why this is better" }],
  "strengths": ["strength 1", "strength 2"]
}

Rules:
- Return ONLY valid JSON, no markdown fences.
- Be specific and concrete -- cite actual text from the resume.
- For rewriteSuggestions, provide 3-5 of the most impactful rewrites.
- For missingKeywords, extract skills/terms from the job description that are absent from the resume (only if a job description is provided).
- For strengths, list 2-4 genuine positives found in the resume.
- Do NOT invent issues that don't exist. Be honest.
- Do NOT make claims about specific ATS vendor compatibility.`,
      },
      {
        role: "user",
        content: `RESUME TEXT:\n${resumeText}${jobContext}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return normalizeTextAnalysis(JSON.parse(content));
}

// ---------- Gemini format analysis ----------

async function analyzeFormatWithGemini(
  imageBase64: string,
  mimeType: string,
): Promise<FormatAnalysisResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  const result = await model.generateContent([
    {
      text: `You are a resume formatting and visual layout expert. Examine this image of a resume and evaluate ONLY its visual and formatting aspects. Return a JSON object with this exact structure:

{
  "formatScore": <number 0-100>,
  "issues": ["specific formatting issue 1", "specific formatting issue 2"],
  "suggestions": ["specific actionable suggestion 1", "specific actionable suggestion 2"]
}

Evaluation criteria (visual/formatting ONLY -- do NOT evaluate content quality):
1. Is the layout visually clean and professional?
2. Is spacing consistent between sections, bullet points, and margins?
3. Is it a single clear column layout? (Multi-column layouts can confuse ATS parsers -- flag this)
4. Are font sizes readable and consistent?
5. Are there any images, graphics, icons, or logos that might not be machine-readable by ATS?
6. Is there good use of white space?
7. Are section headings visually distinct and clearly separated?
8. Does the overall formatting look professional and polished?

Rules:
- Return ONLY valid JSON, no markdown fences.
- The formatScore should reflect how ATS-friendly the visual layout is (100 = perfect single-column, clean formatting).
- Be specific in your issues and suggestions -- reference what you actually see in the image.
- Only flag things you can observe from the visual layout. Do not guess about hidden content.
- If the image is too blurry or small to evaluate, set formatScore to 50 and explain in issues.`,
    },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text();
  return normalizeFormatAnalysis(JSON.parse(text));
}

// ---------- Resume improvement ----------

interface ImprovedHeader {
  name: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  other: string[];
}

type ImprovedItemType = "text" | "skills-row" | "entry" | "edu";

interface ImprovedItem {
  type: ImprovedItemType;
  text?: string;
  label?: string;
  values?: string[];
  title?: string;
  subtitle?: string;
  right?: string;
  bullets?: string[];
}

type ImprovedSectionType =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "additional";

interface ImprovedSection {
  type: ImprovedSectionType;
  title: string;
  items: ImprovedItem[];
}

interface ImprovedResume {
  header: ImprovedHeader;
  sections: ImprovedSection[];
  suggestions: string[];
}

const IMPROVED_SECTION_TYPES = new Set<string>([
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "certifications",
  "additional",
]);

function asImprovedItem(value: unknown): ImprovedItem | null {
  if (!isRecord(value)) return null;
  const type = typeof value.type === "string" && ["text", "skills-row", "entry", "edu"].includes(value.type)
    ? (value.type as ImprovedItemType)
    : "text";
  const item: ImprovedItem = { type };
  if (typeof value.text === "string") item.text = value.text;
  if (typeof value.label === "string") item.label = value.label;
  if (Array.isArray(value.values)) item.values = value.values.filter((v): v is string => typeof v === "string");
  if (typeof value.title === "string") item.title = value.title;
  if (typeof value.subtitle === "string") item.subtitle = value.subtitle;
  if (typeof value.right === "string") item.right = value.right;
  if (Array.isArray(value.bullets)) item.bullets = value.bullets.filter((v): v is string => typeof v === "string");
  return item;
}

function normalizeImprovedResume(raw: unknown): ImprovedResume {
  const emptyHeader: ImprovedHeader = {
    name: "",
    title: "",
    location: "",
    phone: "",
    email: "",
    linkedin: "",
    github: "",
    other: [],
  };
  if (!isRecord(raw)) {
    return { header: emptyHeader, sections: [], suggestions: [] };
  }
  const headerRaw = isRecord(raw.header) ? raw.header : {};
  const header: ImprovedHeader = {
    name: typeof headerRaw.name === "string" ? headerRaw.name : "",
    title: typeof headerRaw.title === "string" ? headerRaw.title : "",
    location: typeof headerRaw.location === "string" ? headerRaw.location : "",
    phone: typeof headerRaw.phone === "string" ? headerRaw.phone : "",
    email: typeof headerRaw.email === "string" ? headerRaw.email : "",
    linkedin: typeof headerRaw.linkedin === "string" ? headerRaw.linkedin : "",
    github: typeof headerRaw.github === "string" ? headerRaw.github : "",
    other: asStringArray(headerRaw.other),
  };
  const sections: ImprovedSection[] = Array.isArray(raw.sections)
    ? raw.sections
        .filter(isRecord)
        .map((section) => ({
          type: (typeof section.type === "string" && IMPROVED_SECTION_TYPES.has(section.type)
            ? section.type
            : "additional") as ImprovedSectionType,
          title: typeof section.title === "string" ? section.title : "",
          items: Array.isArray(section.items)
            ? section.items.map(asImprovedItem).filter((item): item is ImprovedItem => item !== null)
            : [],
        }))
    : [];
  return { header, sections, suggestions: asStringArray(raw.suggestions) };
}

function sanitizeResumeText(text: string): string {
  return text
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060\uFEFF\uE000-\uF8FF]/g,
      "",
    )
    .replace(/[\u2600-\u27BF\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}]/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function improveResumeWithGemini(
  resumeText: string,
  jobDescription: string,
): Promise<ImprovedResume> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  const jobContext = jobDescription.trim()
    ? `\nJOB DESCRIPTION (context only -- never invent facts from it):\n${jobDescription}\n`
    : "";

  const systemDirectives = `You are an expert resume editor. Rewrite this resume to be clearer and more ATS-friendly WITHOUT changing facts.

STRICT RULES:
1. Keep EVERY fact: company names, job titles, institution names, project names, dates, locations, degree names, grades, percentages, tech stack, and websites. Do NOT invent any metric, number, percentage, tool, role, or keyword that is not present. Do not add companies. Do not remove real details.
2. Copy the name, phone, email, and website/linkedin/github links VERBATIM. Phones must keep their exact digits, the + prefix, and spaces. URLs must keep their exact slashes (/), dots (.), and protocol exactly as written.
3. Keep each section heading EXACTLY as written in the ORIGINAL (e.g. "TECHNICAL & PROFESSIONAL SKILLS" stays "TECHNICAL & PROFESSIONAL SKILLS", "KEY PROJECTS" stays "KEY PROJECTS", "EDUCATION & CERTIFICATIONS" stays "EDUCATION & CERTIFICATIONS"). Never rename, merge, drop, or reorder sections. Never invent headings.
4. Keep the SAME number of sections, the SAME number of entries per section, and the SAME number of bullet points per entry as the original. Do not merge several entries into one and do not split one entry into several.
5. Improve only the wording: use strong action verbs, fix grammar and punctuation, keep bullets concise (max 2 lines), keep the same language as the original, and never shorten facts.
6. If the header has a job title below the name, put it in "title"; otherwise use "".
7. Return ONLY the JSON object described below and nothing else (no markdown fences, no commentary):

{
  "header": { "name": "", "title": "", "location": "", "phone": "", "email": "", "linkedin": "", "github": "", "other": [] },
  "sections": [
    {
      "type": "summary|skills|experience|education|projects|certifications|additional",
      "title": "EXACT original heading text",
      "items": []
    }
  ],
  "suggestions": [""]
}

Item shapes by section type:
- summary / additional: { "type": "text", "text": "one paragraph" }
- skills: { "type": "skills-row", "label": "e.g. Languages/Frameworks", "values": ["JavaScript", "React", "Node.js"] }
  // one row per original skills line; if the line has no label prefix, use label "" and put the whole line in values.
- experience / projects: { "type": "entry", "title": "company or project title", "subtitle": "role or tech-stack line, or \"\"", "right": "start end dates or \"\"", "bullets": ["bullet 1", "bullet 2"] }
  // bullet count must equal the original entry's bullet count.
- education / certifications: { "type": "edu", "text": "degree AND institution", "right": "dates or status or \"\"" }

Fill every field the original has. Use "" for anything missing. Never invent bullets or placers.`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemDirectives}\n\nORIGINAL RESUME TEXT:\n${sanitizeResumeText(resumeText)}${jobContext}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  });

  const content = result.response.text();
  if (!content) {
    throw new Error("Gemini returned an empty response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${msg}`);
  }
  return normalizeImprovedResume(parsed);
}

// ---------- POST /api/resume/analyze ----------

router.post("/resume/analyze", async (req, res) => {
  const { resumeText, jobDescription, imageBase64, imageMimeType } = req.body as {
    resumeText?: string;
    jobDescription?: string;
    imageBase64?: string;
    imageMimeType?: string;
  };

  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20) {
    res.status(400).json({ error: "Resume text is required (minimum 20 characters)." });
    return;
  }

  const errors: string[] = [];

  const [textResult, formatResult] = await Promise.allSettled([
    analyzeTextWithGroq(resumeText, jobDescription ?? ""),
    imageBase64
      ? analyzeFormatWithGemini(imageBase64, imageMimeType ?? "image/jpeg")
      : Promise.resolve(null),
  ]);

  let textAnalysis: TextAnalysisResult | null = null;
  if (textResult.status === "fulfilled") {
    textAnalysis = textResult.value;
  } else {
    const msg = textResult.reason instanceof Error ? textResult.reason.message : String(textResult.reason);
    logger.error({ err: msg }, "Groq text analysis failed");
    errors.push(`Text analysis unavailable: ${msg}`);
  }

  let formatAnalysis: FormatAnalysisResult | null = null;
  if (formatResult.status === "fulfilled") {
    formatAnalysis = formatResult.value;
  } else if (imageBase64) {
    const msg = formatResult.reason instanceof Error ? formatResult.reason.message : String(formatResult.reason);
    logger.error({ err: msg }, "Gemini format analysis failed");
    errors.push(`Format analysis unavailable: ${msg}`);
  }

  if (!textAnalysis && !formatAnalysis && errors.length > 0) {
    res.status(502).json({ error: "All AI analyses failed", details: errors } as const);
    return;
  }

  const response: AnalyzeResponse = {
    textAnalysis,
    formatAnalysis,
    errors,
  };

  res.json(response);
});

// ---------- POST /api/resume/improve ----------

router.post("/resume/improve", async (req, res) => {
  const { resumeText, jobDescription } = req.body as {
    resumeText?: unknown;
    jobDescription?: unknown;
  };

  if (typeof resumeText !== "string" || resumeText.trim().length < 20) {
    res.status(400).json({ error: "Resume text is required (minimum 20 characters)." });
    return;
  }

  try {
    const result = await improveResumeWithGemini(
      resumeText,
      typeof jobDescription === "string" ? jobDescription : "",
    );
    res.json({ result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ err: msg }, "Gemini resume improvement failed");
    res.status(502).json({ error: "The resume improver could not complete. Your content is unchanged — try again shortly.", details: msg });
  }
});

export default router;
