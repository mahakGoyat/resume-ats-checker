import { Router, type IRouter } from "express";
import Groq from "groq-sdk";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MODEL = "openai/gpt-oss-120b";

interface BlogFaq {
  question: string;
  answer: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeFaqs(raw: unknown): BlogFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is BlogFaq => isRecord(item) && typeof item.question === "string" && typeof item.answer === "string")
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .slice(0, 8);
}

async function askJson(prompt: string): Promise<Record<string, unknown>> {
  const groq = new Groq();
  const response = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a content strategist for ScoreMyResume, a career advice journal. " +
          'Respond with ONLY a valid JSON object. No markdown fences, no extra text.',
      },
      { role: "user", content: prompt },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");
  const parsed: unknown = JSON.parse(content);
  if (!isRecord(parsed)) throw new Error("AI returned an unexpected shape");
  return parsed;
}

function readTitleContent(body: Record<string, unknown>): { title: string; content: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  if (!title && !content.trim()) {
    throw new Error("A post title or content is required.");
  }
  return { title, content };
}

router.post("/blog/ai/tags", async (req, res) => {
  try {
    const { title, content } = readTitleContent(req.body as Record<string, unknown>);
    const raw = await askJson(`Suggest 4-8 focused blog post tags for the post below. Return JSON: {"tags": ["tag1", ...]}. Tags should be short, lowercase, single words or brief phrases that represent searchable topics.\n\nPOST TITLE:\n${title || "(untitled)"}\n\nPOST CONTENT:\n${content.slice(0, 4000) || "(no content yet)"}`);
    const tags = asStringArray(raw.tags)
      .map((tag) => tag.trim().replace(/\s+/g, " ").slice(0, 40))
      .filter(Boolean)
      .slice(0, 10);
    if (!tags.length) throw new Error("AI returned no tags");
    res.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Blog AI tag generation failed");
    res.status(502).json({ error: `Tag generation failed: ${message}` });
  }
});

router.post("/blog/ai/faq", async (req, res) => {
  try {
    const { title, content } = readTitleContent(req.body as Record<string, unknown>);
    const raw = await askJson(`Write 3-5 useful FAQ question/answer pairs for the blog post below. Questions should be auto-suggested from the title and the article's topics, phrased the way readers search. Answers must be short, accurate, and based only on the post. Return JSON: {"faqs": [{"question": "...", "answer": "..."}]}\n\nPOST TITLE:\n${title || "(untitled)"}\n\nPOST CONTENT:\n${content.slice(0, 4000) || "(no content yet)"}`);
    const faqs = normalizeFaqs(raw.faqs);
    if (!faqs.length) throw new Error("AI returned no FAQs");
    res.json({ faqs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Blog AI FAQ generation failed");
    res.status(502).json({ error: `FAQ generation failed: ${message}` });
  }
});

router.post("/blog/ai/meta", async (req, res) => {
  try {
    const { title, content } = readTitleContent(req.body as Record<string, unknown>);
    const raw = await askJson(`Write SEO metadata for the blog post below.
- metaTitle: max 60 characters, compelling, includes the main keyword from the title. Must override the post title in search results.
- metaDescription: max 160 characters, a short summary that encourages clicks.
Return JSON: {"metaTitle": "...", "metaDescription": "..."}\n\nPOST TITLE:\n${title || "(untitled)"}\n\nPOST CONTENT:\n${content.slice(0, 4000) || "(no content yet)"}`);
    const metaTitle = typeof raw.metaTitle === "string" ? raw.metaTitle.trim().slice(0, 60) : "";
    const metaDescription = typeof raw.metaDescription === "string" ? raw.metaDescription.trim().slice(0, 160) : "";
    if (!metaTitle && !metaDescription) throw new Error("AI returned empty metadata");
    res.json({ metaTitle, metaDescription });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Blog AI meta generation failed");
    res.status(502).json({ error: `Meta generation failed: ${message}` });
  }
});

export default router;