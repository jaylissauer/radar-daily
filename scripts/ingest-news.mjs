import Parser from "rss-parser";
import slugify from "slugify";
import { createClient } from "@supabase/supabase-js";
import { extractMetaArticleBody } from "./lib/meta-body-extractor.mjs";

const parser = new Parser({
  timeout: 20000,
  customFields: {
    item: [
      "summary",
      "content",
      "content:encoded",
      "description",
      "media:content",
      "media:thumbnail",
      "enclosure",
      "category",
      "dc:creator",
    ],
  },
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const newsSources = [
  {
    name: "OpenAI",
    mode: "rss",
    feedUrls: ["https://openai.com/news/rss.xml"],
    sourceUrl: "https://openai.com/news/",
    companySlug: "openai",
  },
  {
    name: "Anthropic",
    mode: "html",
    htmlUrl: "https://www.anthropic.com/news",
    sourceUrl: "https://www.anthropic.com/news",
    companySlug: "anthropic",
    listingLinkRegex: /\/news\/[^"']+/i,
  },
  {
    name: "Google",
    mode: "rss",
    feedUrls: ["https://blog.google/rss/"],
    sourceUrl: "https://blog.google/innovation-and-ai/",
    companySlug: "google",
  },
  {
    name: "Hugging Face",
    mode: "rss",
    feedUrls: ["https://huggingface.co/blog/feed.xml"],
    sourceUrl: "https://huggingface.co/blog",
    companySlug: "hugging-face",
  },
  {
    name: "Meta",
    mode: "html",
    htmlUrl: "https://about.fb.com/news/",
    sourceUrl: "https://about.fb.com/news/",
    companySlug: "meta",
    listingLinkRegex: /about\.fb\.com\/news\/\d{4}\/\d{2}\/[^"']+/i,
  },
  {
    name: "Microsoft",
    mode: "html",
    htmlUrl: "https://www.microsoft.com/en-us/ai/blog/",
    sourceUrl: "https://www.microsoft.com/en-us/ai/blog/",
    companySlug: "microsoft",
    listingLinkRegex: /microsoft\.com\/en-us\/ai\/blog\/[^"']+/i,
  },
  {
    name: "AWS",
    mode: "html",
    htmlUrl: "https://aws.amazon.com/blogs/machine-learning/",
    sourceUrl: "https://aws.amazon.com/blogs/machine-learning/",
    companySlug: "aws",
    listingLinkRegex: /aws\.amazon\.com\/blogs\/machine-learning\/[^"']+/i,
  },
  {
    name: "NVIDIA",
    mode: "rss",
    feedUrls: [
      "https://nvidianews.nvidia.com/rss",
      "https://blogs.nvidia.com/feed/"
    ],
    sourceUrl: "https://nvidianews.nvidia.com/",
    companySlug: "nvidia",
  },
  {
    name: "xAI",
    mode: "html",
    htmlUrl: "https://x.ai/news",
    sourceUrl: "https://x.ai/news",
    companySlug: "xai",
    listingLinkRegex: /x\.ai\/news\/[^"']+/i,
  },
  {
    name: "TechCrunch",
    mode: "html",
    htmlUrl: "https://techcrunch.com/category/artificial-intelligence/",
    sourceUrl: "https://techcrunch.com/category/artificial-intelligence/",
    companySlug: "techcrunch",
    listingLinkRegex: /techcrunch\.com\/\d{4}\/\d{2}\/\d{2}\/[^"']+/i,
  },
  {
    name: "Reuters",
    mode: "html",
    htmlUrl: "https://www.reuters.com/technology/artificial-intelligence/",
    sourceUrl: "https://www.reuters.com/technology/artificial-intelligence/",
    companySlug: "reuters",
    listingLinkRegex: /reuters\.com\/technology\/[^"']+-\d{4}-\d{2}-\d{2}\/?/i,
  },
  {
    name: "VentureBeat",
    mode: "html",
    htmlUrl: "https://venturebeat.com/category/ai/",
    sourceUrl: "https://venturebeat.com/category/ai/",
    companySlug: "venturebeat",
    listingLinkRegex: /venturebeat\.com\/[^"']+/i,
  },
  {
    name: "The Verge",
    mode: "html",
    htmlUrl: "https://www.theverge.com/ai-artificial-intelligence",
    sourceUrl: "https://www.theverge.com/ai-artificial-intelligence",
    companySlug: "the-verge",
    listingLinkRegex: /theverge\.com\/(ai-artificial-intelligence|tech|news)\/[^"']+/i,
  },
];

const productAliasMap = {
  chatgpt: ["chatgpt", "gpt-5.4", "gpt 5.4", "gpt-5", "gpt 5"],
  sora: ["sora"],
  codex: ["codex"],
  claude: ["claude", "claude sonnet", "claude opus", "claude partner network"],
  gemini: ["gemini", "gemini app", "gemini flash", "flash live", "gemini 3.1", "gemini live"],
  lyria: ["lyria", "lyria 3", "lyria 3 pro"],
  copilot: ["copilot", "microsoft copilot", "copilot studio", "m365 copilot", "github copilot"],
  bedrock: ["bedrock", "amazon bedrock"],
  grok: ["grok", "grok business", "grok enterprise", "grok imagine"],
};

function makeSlug(title) {
  return slugify(title || "untitled-article", {
    lower: true,
    strict: true,
    trim: true,
  }).slice(0, 120);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normaliseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function removeLeadInGarbage(value) {
  let cleaned = normaliseWhitespace(value);

  cleaned = cleaned.replace(/^announcements?\s+/i, "");
  cleaned = cleaned.replace(/^announcement\s+/i, "");
  cleaned = cleaned.replace(/^read the [^.?!]+/i, "");
  cleaned = cleaned.replace(/^today we are publishing[^.?!]*[.?!]\s*/i, "");
  cleaned = cleaned.replace(/^today we'?re publishing[^.?!]*[.?!]\s*/i, "");
  cleaned = cleaned.replace(/^this article (shows|explains|describes|highlights)\s+/i, "");
  cleaned = cleaned.replace(/^the article (shows|explains|describes|highlights)\s+/i, "");
  cleaned = cleaned.replace(/^in summary[:,]?\s*/i, "");
  cleaned = cleaned.replace(/^overall[:,]?\s*/i, "");

  return cleaned.trim();
}

function extractReadableSentences(value, minLength = 24) {
  const cleaned = removeLeadInGarbage(value);

  if (!cleaned) return [];

  const matches = cleaned.match(/[^.!?]+[.!?]+(?:["')\]]+)?/g) ?? [];

  return matches
    .map((sentence) => normaliseWhitespace(sentence))
    .filter((sentence) => sentence.length >= minLength)
    .filter((sentence) => /[A-Za-z]/.test(sentence))
    .filter((sentence) => !/\.\.\.$/.test(sentence))
    .filter((sentence) => !/[…]/.test(sentence));
}

function cleanupCompleteSentenceText(value, fallback = "") {
  if (!value) return fallback;

  const raw = removeLeadInGarbage(value);
  if (!raw) return fallback;

  const sentences = extractReadableSentences(raw, 24);

  if (sentences.length > 0) {
    return sentences.join(" ");
  }

  return fallback;
}

function cleanupSummaryText(value, fallback = "No summary extracted.") {
  const raw = normaliseWhitespace(stripHtml(value || ""));
  if (!raw) return fallback;

  const sentences = extractReadableSentences(raw, 18);

  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(" ").slice(0, 320);
  }

  const softened = removeLeadInGarbage(raw)
    .replace(/\s+/g, " ")
    .replace(/[…]/g, "")
    .trim();

  if (!softened) {
    return fallback;
  }

  if (softened.length <= 320) {
    return softened;
  }

  const cut = softened.slice(0, 320);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 180 ? lastSpace : 320).trim();
}

function cleanupInsightSentence(value, fallback) {
  const sentences = extractReadableSentences(value, 24);

  if (sentences.length > 0) {
    return sentences[0];
  }

  return fallback;
}

function cleanupTakeawaySentence(value) {
  const stripped = String(value || "")
    .replace(/^[•\-\d\.\)\s]+/, "")
    .trim();

  if (!stripped) return "";

  const sentences = extractReadableSentences(stripped, 24);
  if (sentences.length === 0) return "";

  return sentences[0];
}

function buildSummary(item) {
  const raw =
    item.contentSnippet ||
    item.summary ||
    item.description ||
    item.content ||
    item["content:encoded"] ||
    "";

  const cleaned = normaliseWhitespace(stripHtml(raw));
  const cleanTitle = normaliseWhitespace(stripHtml(item.title || ""));

  if (cleaned) {
    return cleanupSummaryText(cleaned, cleaned.slice(0, 320));
  }

  if (cleanTitle) {
    return cleanupSummaryText(cleanTitle, cleanTitle.slice(0, 320));
  }

  return "No summary extracted.";
}

function buildFallbackWhyItMatters(sourceName, title, summary, bodyText) {
  const cleanTitle = normaliseWhitespace(stripHtml(title || ""));
  const cleanSummary = normaliseWhitespace(stripHtml(summary || ""));
  const cleanBody = normaliseWhitespace(stripHtml(bodyText || ""));

  const focus =
    cleanSummary && cleanSummary !== "No summary extracted."
      ? cleanSummary
      : cleanBody
        ? cleanBody.slice(0, 220)
        : cleanTitle || "a notable AI-related update";

  if (/policy|safety|security|compliance|responsible scaling|distillation/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      `The article details ${focus}, which could affect how teams think about AI safety, governance, and rollout controls.`,
      "This update could affect how teams think about AI safety, governance, and rollout controls."
    );
  }

  if (/launch|release|introducing|announces|now available/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      `The article outlines ${focus}, which helps show whether this release is important enough to test or brief internally.`,
      "This release helps show whether the update is important enough to test or brief internally."
    );
  }

  if (/partner|partnership|acquire|acquisition|office|expansion/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      `The article describes ${focus}, which may signal a broader strategic move by ${sourceName}.`,
      `This article may signal a broader strategic move by ${sourceName}.`
    );
  }

  return cleanupInsightSentence(
    `The article highlights ${focus}, which helps clarify whether this update is worth tracking closely.`,
    "This update helps clarify whether it is worth tracking closely."
  );
}

function buildFallbackUseCaseExample(sourceName, title, summary, bodyText) {
  const cleanTitle = normaliseWhitespace(stripHtml(title || ""));
  const cleanSummary = normaliseWhitespace(stripHtml(summary || ""));
  const cleanBody = normaliseWhitespace(stripHtml(bodyText || ""));

  const focus =
    cleanSummary && cleanSummary !== "No summary extracted."
      ? cleanSummary
      : cleanBody
        ? cleanBody.slice(0, 220)
        : cleanTitle || "this update";

  if (/policy|safety|security|compliance|responsible scaling|distillation/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      `Useful for someone deciding whether ${focus} changes internal policy, approval rules, or risk settings.`,
      "Useful for someone deciding whether this update changes internal policy, approval rules, or risk settings."
    );
  }

  if (/api|developer|sdk|coding|codex/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      "Useful for an engineering or product team trying to understand what this update changes for developer workflows before acting on it.",
      "Useful for an engineering or product team assessing what this update changes for developer workflows."
    );
  }

  if (/model|reasoning|benchmark|evaluation|performance/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      "Useful for someone comparing model progress and deciding whether this claim is material enough to test against their current setup.",
      "Useful for someone comparing model progress and deciding whether the claim is material enough to test."
    );
  }

  if (/partner|partnership|acquire|acquisition|office|expansion/i.test(`${cleanTitle} ${cleanSummary}`)) {
    return cleanupInsightSentence(
      `Useful for someone tracking ${sourceName}'s strategic direction and wanting to understand what this move may imply.`,
      `Useful for someone tracking ${sourceName}'s strategic direction and what this move may imply.`
    );
  }

  return cleanupInsightSentence(
    `Useful for someone who wants a fast understanding of ${focus} before deciding whether to look deeper.`,
    "Useful for someone who wants a fast understanding of this update before deciding whether to look deeper."
  );
}

function normaliseForComparison(value) {
  return normaliseWhitespace(stripHtml(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSet(value) {
  return new Set(normaliseForComparison(value).split(" ").filter(Boolean));
}

function overlapRatio(a, b) {
  const aSet = wordSet(a);
  const bSet = wordSet(b);

  if (!aSet.size || !bSet.size) return 0;

  let overlap = 0;
  for (const word of aSet) {
    if (bSet.has(word)) overlap += 1;
  }

  return overlap / Math.max(Math.min(aSet.size, bSet.size), 1);
}

function looksGenericInsight(value) {
  const lower = normaliseForComparison(value);

  if (!lower) return true;

  const bannedFragments = [
    "latest update from this source",
    "an important update",
    "the article explains an important update",
    "this article explains an important update",
    "worth paying attention to",
  ];

  if (bannedFragments.some((fragment) => lower.includes(fragment))) {
    return true;
  }

  if (lower.split(" ").length < 7) {
    return true;
  }

  return false;
}

function buildGenerationContext({ sourceName, title, summary, articleBody }) {
  const cleanTitle = normaliseWhitespace(stripHtml(title || ""));
  const cleanSummary = normaliseWhitespace(stripHtml(summary || ""));
  const cleanBody = normaliseWhitespace(stripHtml(articleBody || "")).slice(0, 9000);

  return [
    `Source: ${sourceName || "Unknown source"}`,
    `Title: ${cleanTitle || "Untitled"}`,
    `Summary: ${cleanSummary || "No summary extracted."}`,
    `Article body: ${cleanBody || "No article body extracted."}`,
  ].join("\n\n");
}

function parseJsonObjectFromText(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function isInsightPairAcceptable({ whyItMatters, useCaseExample }) {
  if (!whyItMatters || !useCaseExample) return false;
  if (looksGenericInsight(whyItMatters) || looksGenericInsight(useCaseExample)) return false;
  if (overlapRatio(whyItMatters, useCaseExample) > 0.88) return false;
  return true;
}

async function generateArticleInsights({ sourceName, title, summary, articleBody }) {
  const fallback = {
    whyItMatters: buildFallbackWhyItMatters(sourceName, title, summary, articleBody),
    useCaseExample: buildFallbackUseCaseExample(sourceName, title, summary, articleBody),
  };

  if (!openAiApiKey) {
    console.log(`Insight generation fallback for "${title}": missing OPENAI_API_KEY`);
    return fallback;
  }

  const context = buildGenerationContext({ sourceName, title, summary, articleBody });

  const prompt = `
You are reading an AI news article for an intelligence product.

Return three fields:
1. article_main_point
2. why_it_matters
3. how_this_could_be_used

Critical instructions:
- Read the actual article context provided.
- Base the answer on the article body when present.
- Do NOT use generic boilerplate.
- Do NOT simply rephrase the title or summary.
- Do NOT start with phrases like:
  - "This matters because the article..."
  - "Useful if you want..."
  - "This article explains..."
- "why_it_matters" must explain the significance of the specific announcement, policy, release, finding, partnership, warning, or change in this article.
- "how_this_could_be_used" means why reading this article is useful, what decision it helps with, or what team/person would use this article to inform a next step.
- The two visible fields must feel different.
- Each visible field must be exactly one sentence.
- Be concrete, natural, and specific.

Return strict JSON only:
{
  "article_main_point": "...",
  "why_it_matters": "...",
  "how_this_could_be_used": "..."
}

Article context:
${context}
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    const rawText =
      data.output_text ||
      data.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text ||
      "";

    const parsed = parseJsonObjectFromText(rawText);

    const whyItMattersRaw =
      typeof parsed?.why_it_matters === "string" ? parsed.why_it_matters.trim() : "";
    const useCaseExampleRaw =
      typeof parsed?.how_this_could_be_used === "string"
        ? parsed.how_this_could_be_used.trim()
        : "";

    const whyItMatters = cleanupInsightSentence(
      whyItMattersRaw,
      fallback.whyItMatters
    );
    const useCaseExample = cleanupInsightSentence(
      useCaseExampleRaw,
      fallback.useCaseExample
    );

    if (isInsightPairAcceptable({ whyItMatters, useCaseExample })) {
      return { whyItMatters, useCaseExample };
    }

    console.log(`Insight generation rejected as too generic for "${title}"`);
    return fallback;
  } catch (error) {
    console.log(`Insight generation fallback for "${title}": ${error.message || error}`);
    return fallback;
  }
}


function normaliseImageCandidate(value, baseUrl = "") {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^data:/i.test(trimmed)) return null;
  if (/^javascript:/i.test(trimmed)) return null;

  try {
    if (baseUrl) {
      return new URL(trimmed, baseUrl).toString();
    }
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function extractImageMetaCandidatesFromHtml(value, baseUrl = "") {
  const html = String(value || "");
  if (!html) return [];

  const results = [];

  const patterns = [
    { kind: "og", regex: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi },
    { kind: "og", regex: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi },
    { kind: "twitter", regex: /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi },
    { kind: "twitter", regex: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/gi },
    { kind: "img", regex: /<img[^>]+src=["']([^"']+)["']/gi },
  ];

  for (const { kind, regex } of patterns) {
    for (const match of html.matchAll(regex)) {
      const candidate = normaliseImageCandidate(match?.[1] || "", baseUrl);
      if (!candidate) continue;
      results.push({ url: candidate, origin: kind });
    }
  }

  return results;
}

function scoreImageCandidate(url, origin = "unknown", item = {}) {
  let score = 0;
  const lower = String(url || "").toLowerCase();
  const sourceName = String(item?.source_name || item?.source || "").toLowerCase();
  const title = String(item?.title || "").toLowerCase();

  if (!lower) return Number.NEGATIVE_INFINITY;

  if (/\.(jpe?g|png|webp)(\?|$)/i.test(lower)) score += 4;
  if (/\.(gif|svg)(\?|$)/i.test(lower)) score -= 6;

  if (origin === "og") score += 10;
  if (origin === "twitter") score += 8;
  if (origin === "media:content") score += 6;
  if (origin === "media:thumbnail") score += 2;
  if (origin === "enclosure") score += 4;
  if (origin === "image") score += 4;
  if (origin === "img") score += 1;

  if (/og[-_]?image|twitter[-_]?image|social|share|featured|feature|hero|cover|banner|lead|article|post|news/i.test(lower)) {
    score += 6;
  }

  if (/maxresdefault|sddefault|landscape|wide|1200x630|1600x900|1280x720|1920x1080/i.test(lower)) {
    score += 5;
  }

  if (/logo|wordmark|icon|favicon|sprite|avatar|badge|placeholder|loader|spinner|emoji|glyph/i.test(lower)) {
    score -= 14;
  }

  if (/apple-touch|android-chrome|mstile|site-icon|touch-icon/i.test(lower)) {
    score -= 16;
  }

  if (/(^|[^0-9])(16|24|32|48|64|72|96|120|128|144|150|152|180|192|256|384|512)x\2([^0-9]|$)/i.test(lower)) {
    score -= 10;
  }

  if (/(^|[^0-9])(96|120|128|150|180|192|200|256)x(96|120|128|150|180|192|200|256)([^0-9]|$)/i.test(lower)) {
    score -= 8;
  }

  if (/thumbnail|thumb|small|tiny|mini|icon/i.test(lower)) {
    score -= 4;
  }

  if (/text[-_]?to[-_]?image|stock|logo[-_]?lockup/i.test(lower)) {
    score -= 4;
  }

  if (/gemini|lyria|claude|chatgpt|sora/i.test(lower) && /text|wordmark|lockup/i.test(lower)) {
    score -= 4;
  }

  if (sourceName.includes("google")) {
    if (/googleblog\.com|blogger\.googleusercontent\.com|storage\.googleapis\.com/i.test(lower)) score += 2;
  }

  if (sourceName.includes("meta")) {
    if (/about\.fb\.com|scontent|fbcdn/i.test(lower)) score += 2;
  }

  if (sourceName.includes("anthropic")) {
    if (/anthropic\.com/i.test(lower)) score += 2;
  }

  if (sourceName.includes("hugging face")) {
    if (/huggingface\.co/i.test(lower)) score += 2;
  }

  if (title && lower.includes(slugFragment(title))) {
    score += 3;
  }

  score += Math.min(lower.length / 120, 3);

  return score;
}

function slugFragment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function collectImageCandidates(item) {
  const baseUrl =
    item?.link ||
    item?.article_url ||
    item?.guid ||
    item?.url ||
    "";

  const candidates = [];

  const push = (value, origin = "unknown") => {
    if (!value) return;
    candidates.push({ value, origin });
  };

  const mediaContent = item?.["media:content"];
  if (Array.isArray(mediaContent)) {
    for (const entry of mediaContent) {
      push(entry?.$?.url, "media:content");
      push(entry?.url, "media:content");
    }
  } else {
    push(mediaContent?.$?.url, "media:content");
    push(mediaContent?.url, "media:content");
  }

  const mediaThumbnail = item?.["media:thumbnail"];
  if (Array.isArray(mediaThumbnail)) {
    for (const entry of mediaThumbnail) {
      push(entry?.$?.url, "media:thumbnail");
      push(entry?.url, "media:thumbnail");
    }
  } else {
    push(mediaThumbnail?.$?.url, "media:thumbnail");
    push(mediaThumbnail?.url, "media:thumbnail");
  }

  const enclosure = item?.enclosure;
  if (Array.isArray(enclosure)) {
    for (const entry of enclosure) {
      push(entry?.url, "enclosure");
      push(entry?.href, "enclosure");
      push(entry?.$?.url, "enclosure");
    }
  } else {
    push(enclosure?.url, "enclosure");
    push(enclosure?.href, "enclosure");
    push(enclosure?.$?.url, "enclosure");
  }

  const imageField = item?.image;
  if (Array.isArray(imageField)) {
    for (const entry of imageField) {
      if (typeof entry === "string") push(entry, "image");
      else {
        push(entry?.url, "image");
        push(entry?.href, "image");
      }
    }
  } else if (typeof imageField === "string") {
    push(imageField, "image");
  } else {
    push(imageField?.url, "image");
    push(imageField?.href, "image");
  }

  push(item?.thumbnail, "thumbnail");
  push(item?.image_url, "image_url");
  push(item?.["itunes:image"]?.href, "itunes:image");

  const htmlSources = [
    item?.content,
    item?.["content:encoded"],
    item?.summary,
    item?.description,
  ];

  for (const blob of htmlSources) {
    const metaCandidates = extractImageMetaCandidatesFromHtml(blob, baseUrl);
    for (const candidate of metaCandidates) {
      push(candidate.url, candidate.origin);
    }
  }

  const deduped = [];
  const seen = new Set();

  for (const raw of candidates) {
    const candidate = normaliseImageCandidate(raw.value, baseUrl);
    if (!candidate) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    deduped.push({
      url: candidate,
      origin: raw.origin,
      score: scoreImageCandidate(candidate, raw.origin, item),
    });
  }

  deduped.sort((a, b) => b.score - a.score || a.url.length - b.url.length);

  return deduped;
}

function extractImageUrl(item) {
  const candidates = collectImageCandidates(item);
  return candidates[0]?.url || null;
}


async function getCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug");

  if (error) {
    console.error("Failed to load companies:", error.message);
    return [];
  }

  return data ?? [];
}

async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name");

  if (error) {
    console.error("Failed to load products:", error.message);
    return [];
  }

  return data ?? [];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMatchedCompanies(source, title, summary, companies) {
  const haystack = `${source.name} ${source.companySlug || ""} ${title} ${summary}`.toLowerCase();
  const matched = [];

  for (const company of companies) {
    const candidates = [company.name, company.slug].filter(Boolean);

    const isMatch = candidates.some((candidate) => {
      const pattern = new RegExp(`\\b${escapeRegExp(String(candidate).toLowerCase())}\\b`, "i");
      return pattern.test(haystack);
    });

    if (isMatch) {
      matched.push(company);
    }
  }

  return matched;
}

function getAliasesForProduct(productName) {
  const normalized = String(productName || "").trim().toLowerCase();
  return productAliasMap[normalized] ?? [normalized];
}

function getMatchedProducts(title, summary, products) {
  const haystack = `${title} ${summary}`.toLowerCase();
  const matched = [];

  for (const product of products) {
    const name = String(product.name || "").trim();
    if (!name) continue;

    const aliases = getAliasesForProduct(name);
    const isMatch = aliases.some((alias) => {
      if (!alias || alias.length < 3) return false;
      const pattern = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, "i");
      return pattern.test(haystack);
    });

    if (isMatch) {
      matched.push(product);
    }
  }

  return matched;
}

function cleanAnthropicTitle(rawTitle) {
  let cleaned = stripHtml(rawTitle);
  if (!cleaned) return cleaned;

  cleaned = cleaned.replace(
    /^(Product|Announcements|Policy|Research|Security)\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+/,
    ""
  );
  cleaned = cleaned.replace(
    /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+(Product|Announcements|Policy|Research|Security)\s+/,
    ""
  );
  cleaned = cleaned.replace(/^(Product|Announcements|Policy|Research|Security)\s+/, "");
  cleaned = cleaned.replace(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+/, "");

  const headlinePatterns = [
    /^Introducing Claude Sonnet [\d.]+/i,
    /^Introducing Claude Opus [\d.]+/i,
    /^Claude is a space to think/i,
    /^Anthropic invests \$?[0-9,.]+(?:\s*million|\s*billion)? into the Claude Partner Network/i,
    /^Introducing The Anthropic Institute/i,
    /^Sydney will become Anthropic[’']s fourth office in Asia-Pacific/i,
    /^Partnering with Mozilla to improve Firefox[’']s security/i,
    /^Where things stand with the Department of War/i,
    /^Statement on the comments from Secretary of War .*$/i,
    /^Statement from Dario Amodei on our discussions with the Department of War/i,
    /^Anthropic acquires Vercept to advance Claude's computer use capabilities/i,
    /^Anthropic[’']s Responsible Scaling Policy: Version [\d.]+/i,
    /^Detecting and preventing distillation attacks/i,
    /^Responsible Scaling Policy/i,
  ];

  for (const pattern of headlinePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  const sentenceSplit = cleaned.split(/(?<=[.!?])\s+/);
  const firstSentence = sentenceSplit[0]?.trim() || cleaned;

  if (firstSentence.length >= 12 && firstSentence.length <= 140) {
    return firstSentence;
  }

  return cleaned.slice(0, 140).trim();
}

async function parseFeedFromCandidates(source) {
  let lastError = null;

  for (const feedUrl of source.feedUrls) {
    try {
      console.log(`Trying ${source.name} feed: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      return { feed, resolvedFeedUrl: feedUrl };
    } catch (error) {
      lastError = error;
      console.log(`Failed candidate for ${source.name}: ${feedUrl} | ${error.message || error}`);
    }
  }

  throw lastError || new Error(`No valid feed found for ${source.name}`);
}

function extractJsonLdArticleCandidates(html, baseUrl, sourceName) {
  const scripts = [...String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const results = [];

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const node of nodes) {
        const typeValue = node?.["@type"];
        const types = Array.isArray(typeValue) ? typeValue : [typeValue];
        const isArticleLike = types.some((t) =>
          ["Article", "NewsArticle", "BlogPosting"].includes(String(t || ""))
        );

        if (!isArticleLike) continue;

        const url = node.url || node.mainEntityOfPage || node["@id"];
        const rawTitle = node.headline || node.name;
        const description = node.description || "";
        const published = node.datePublished || null;
        const image =
          Array.isArray(node.image) ? node.image[0] :
          typeof node.image === "string" ? node.image :
          node.image?.url || null;

        if (!url || !rawTitle) continue;

        const absoluteUrl = String(url).startsWith("http")
          ? String(url)
          : new URL(String(url), baseUrl).toString();

        const title =
          sourceName === "Anthropic"
            ? cleanAnthropicTitle(rawTitle)
            : String(rawTitle).trim();

        if (!title) continue;

        results.push({
          title,
          link: absoluteUrl,
          pubDate: published,
          contentSnippet: stripHtml(description),
          enclosure: image ? { url: image } : undefined,
        });
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return results;
}

function extractAnchorCandidates(html, baseUrl, source) {
  const results = [];
  const fallbackRegex = /\/news\/[^"']+/i;
  const linkRegex = source.listingLinkRegex || fallbackRegex;

  const matches = [
    ...String(html).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ];

  for (const match of matches) {
    const href = match[1];
    const inner = stripHtml(match[2]);

    if (!href || !inner) continue;
    if (inner.length < 20) continue;

    const absoluteUrl = href.startsWith("http")
      ? href
      : new URL(href, baseUrl).toString();

    if (!linkRegex.test(absoluteUrl) && !linkRegex.test(href)) continue;

    const title =
      source.name === "Anthropic"
        ? cleanAnthropicTitle(inner)
        : inner;

    if (!title || title.length < 12) continue;
    if (/^(skip to|customer stories|business impact|machine learning|responsible ai|announcements|artificial intelligence|advanced \(\d+\)|expert \(\d+\)|technical how-to)$/i.test(title.trim())) {
      continue;
    }

    results.push({
      title,
      link: absoluteUrl,
      pubDate: null,
      contentSnippet: "",
    });
  }

  return results;
}

function dedupeItems(items) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const key = item.link || item.title;
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

async function parseHtmlListing(source) {
  console.log(`Fetching HTML listing for ${source.name}: ${source.htmlUrl}`);

  const response = await fetch(source.htmlUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-AU,en;q=0.9,en-US;q=0.8",
      pragma: "no-cache",
      "cache-control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Status code ${response.status}`);
  }

  const html = await response.text();

  const jsonLdItems = extractJsonLdArticleCandidates(html, source.htmlUrl, source.name);
  const anchorItems = extractAnchorCandidates(html, source.htmlUrl, source);
  const items = dedupeItems([...jsonLdItems, ...anchorItems]).slice(0, 15);

  return {
    items,
    resolvedFeedUrl: source.htmlUrl,
  };
}

function scoreBodyCandidate(text) {
  const cleaned = stripHtml(text);
  if (!cleaned) return 0;
  if (cleaned.length < 400) return 0;

  let score = cleaned.length;
  const paragraphCount = cleaned.split(/\n\n+/).filter((p) => p.trim().length > 40).length;
  score += paragraphCount * 120;

  if (/cookie|privacy|subscribe|sign up|newsletter|advertisement/i.test(cleaned)) {
    score -= 1200;
  }

  return score;
}

function extractBodyFromJsonLd(html) {
  const scripts = [...String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scripts) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const node of nodes) {
        const typeValue = node?.["@type"];
        const types = Array.isArray(typeValue) ? typeValue : [typeValue];
        const isArticleLike = types.some((t) =>
          ["Article", "NewsArticle", "BlogPosting"].includes(String(t || ""))
        );

        if (!isArticleLike) continue;

        const body = node.articleBody || node.text || node.description;
        const cleaned = stripHtml(body || "");
        if (cleaned.length > 800) {
          return cleaned.slice(0, 20000);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return null;
}

function walkForLongStrings(value, collector) {
  if (value == null) return;

  if (typeof value === "string") {
    const cleaned = stripHtml(value);
    if (cleaned.length > 800) {
      collector.push(cleaned);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walkForLongStrings(item, collector);
    }
    return;
  }

  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      walkForLongStrings(value[key], collector);
    }
  }
}

function extractOpenAIFromNextData(html) {
  const candidates = [];

  const nextDataMatch = String(html).match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (nextDataMatch?.[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      walkForLongStrings(parsed, candidates);
    } catch {
      // ignore
    }
  }

  const flightMatches = [...String(html).matchAll(
    /<script[^>]*>\s*self\.__next_f\.push\(([\s\S]*?)\)\s*<\/script>/gi
  )];
  for (const match of flightMatches) {
    const raw = match[1];
    if (!raw) continue;

    const quotedStrings = [...raw.matchAll(/"((?:\\.|[^"\\]){800,})"/g)];
    for (const quoted of quotedStrings) {
      try {
        const decoded = JSON.parse(`"${quoted[1]}"`);
        const cleaned = stripHtml(decoded);
        if (cleaned.length > 800) {
          candidates.push(cleaned);
        }
      } catch {
        // ignore
      }
    }
  }

  let best = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreBodyCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best && best.length > 800 ? best.slice(0, 20000) : null;
}

function extractOpenAISpecificBody(html) {
  const candidates = [];

  const specificMatches = [
    ...String(html).matchAll(/<(article|main|section|div)[^>]+(?:class|id)=["'][^"']*(prose|ui-rich-text|content|article|body|story|markdown)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi),
  ];

  for (const match of specificMatches) {
    const cleaned = stripHtml(match[3] || match[0]);
    if (cleaned.length > 800) {
      candidates.push(cleaned);
    }
  }

  let best = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreBodyCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best && best.length > 800 ? best.slice(0, 20000) : null;
}

function extractBestBodyCandidate(html) {
  const candidates = [];

  const articleMatches = [...String(html).matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)];
  for (const match of articleMatches) {
    candidates.push(match[1]);
  }

  const mainMatches = [...String(html).matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)];
  for (const match of mainMatches) {
    candidates.push(match[1]);
  }

  const sectionMatches = [...String(html).matchAll(
    /<(div|section)[^>]+(?:class|id)=["'][^"']*(article|content|post|body|story|entry|main)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi
  )];
  for (const match of sectionMatches) {
    candidates.push(match[3]);
  }

  let best = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const cleaned = stripHtml(candidate);
    const score = scoreBodyCandidate(cleaned);

    if (score > bestScore) {
      bestScore = score;
      best = cleaned;
    }
  }

  if (best && best.length > 600) {
    return best.slice(0, 20000);
  }

  return null;
}

async function fetchArticleBody(articleUrl, sourceName) {
  if (!articleUrl) {
    return { bodyText: null, status: "not-found" };
  }

  if (sourceName === "Meta") {
    try {
      const metaResult = await extractMetaArticleBody(articleUrl);

      if (metaResult.body && (metaResult.status === "ok" || metaResult.status === "summary-only")) {
        return {
          bodyText: metaResult.body,
          status: "yes",
        };
      }

      return { bodyText: null, status: "not-found" };
    } catch {
      return { bodyText: null, status: "not-found" };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(articleUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 AI-Signal-Ingestion",
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (sourceName === "OpenAI" && response.status === 403) {
        return { bodyText: null, status: "blocked" };
      }
      return { bodyText: null, status: "not-found" };
    }

    const html = await response.text();

    if (sourceName === "OpenAI") {
      const openAiSpecific = extractOpenAISpecificBody(html);
      if (openAiSpecific && openAiSpecific.length > 600) {
        return { bodyText: openAiSpecific, status: "yes" };
      }

      const nextDataBody = extractOpenAIFromNextData(html);
      if (nextDataBody && nextDataBody.length > 600) {
        return { bodyText: nextDataBody, status: "yes" };
      }
    }

    const fromJsonLd = extractBodyFromJsonLd(html);
    if (fromJsonLd && fromJsonLd.length > 600) {
      return { bodyText: fromJsonLd, status: "yes" };
    }

    const fromHtml = extractBestBodyCandidate(html);
    if (fromHtml && fromHtml.length > 600) {
      return { bodyText: fromHtml, status: "yes" };
    }

    return { bodyText: null, status: "not-found" };
  } catch {
    return { bodyText: null, status: "not-found" };
  } finally {
    clearTimeout(timeout);
  }
}

function splitIntoSentences(text) {
  return extractReadableSentences(text, 30);
}

function scoreSentence(sentence, title) {
  let score = 0;
  const lower = sentence.toLowerCase();
  const lowerTitle = String(title || "").toLowerCase();

  score += Math.min(sentence.length, 220) / 10;

  if (lower.includes("launch") || lower.includes("introducing") || lower.includes("announce")) score += 10;
  if (lower.includes("model") || lower.includes("product") || lower.includes("feature")) score += 8;
  if (lower.includes("developer") || lower.includes("api") || lower.includes("platform")) score += 7;
  if (lower.includes("enterprise") || lower.includes("business") || lower.includes("customer")) score += 6;
  if (lower.includes("safety") || lower.includes("security") || lower.includes("policy")) score += 6;
  if (lower.includes("available") || lower.includes("now") || lower.includes("today")) score += 5;

  const titleWords = lowerTitle
    .split(/\W+/)
    .filter((word) => word.length > 3);

  for (const word of titleWords) {
    if (lower.includes(word)) score += 1.5;
  }

  if (/cookie|privacy|sign up|subscribe|newsletter/i.test(lower)) score -= 20;

  return score;
}

function generateFallbackTakeaways({ title, summary, bodyText, sourceName }) {
  const intro = cleanupTakeawaySentence(
    buildSummary({
      title,
      summary,
      contentSnippet: summary,
      content: bodyText,
      sourceName,
    })
  );

  const sentences = splitIntoSentences(`${summary || ""} ${bodyText || ""}`)
    .map((sentence) => cleanupTakeawaySentence(sentence))
    .filter(Boolean);

  const scored = sentences
    .map((sentence) => ({
      sentence,
      score: scoreTakeawaySentence(sentence, { title, summary, bodyText, sourceName }),
    }))
    .sort((a, b) => b.score - a.score);

  const takeaways = [];
  const seen = new Set();

  if (intro) {
    takeaways.push(intro);
    seen.add(intro.toLowerCase());
  }

  for (const item of scored) {
    const cleaned = cleanupTakeawaySentence(item.sentence);

    if (!cleaned) continue;
    if (cleaned.length < 40) continue;

    const dedupeKey = cleaned.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    if (takeaways.some((existing) => existing.toLowerCase() === dedupeKey)) continue;

    seen.add(dedupeKey);
    takeaways.push(cleaned);

    if (takeaways.length >= 4) break;
  }

  return takeaways.slice(0, 4);
}

function cleanupTakeawayBullet(value) {
  const cleaned = normaliseWhitespace(stripHtml(String(value || "")))
    .replace(/^[-•\d.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  return cleaned.replace(/[.;:\s]+$/, "");
}

function looksWeakTakeaway(value, title = "", summary = "") {
  const cleaned = cleanupTakeawayBullet(value);
  if (!cleaned) return true;

  const lower = cleaned.toLowerCase();
  const titleLower = normaliseWhitespace(stripHtml(title || "")).toLowerCase();
  const summaryLower = normaliseWhitespace(stripHtml(summary || "")).toLowerCase();

  if (cleaned.length < 18) return true;
  if (cleaned.length > 140) return true;

  const bannedStarts = [
    "this article",
    "the article",
    "this update",
    "the update",
    "in this article",
    "the piece",
  ];

  if (bannedStarts.some((prefix) => lower.startsWith(prefix))) return true;
  if (lower === titleLower || lower === summaryLower) return true;

  return false;
}

function dedupeTakeaways(items) {
  const output = [];
  const seen = new Set();

  for (const item of items) {
    const cleaned = cleanupTakeawayBullet(item);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(cleaned);
  }

  return output;
}

function overlapRatio(a, b) {
  const aTokens = String(a || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);

  const bTokens = String(b || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);

  if (!aTokens.length || !bTokens.length) return 0;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let shared = 0;

  for (const token of aSet) {
    if (bSet.has(token)) shared += 1;
  }

  return shared / Math.max(aSet.size, bSet.size, 1);
}

function areTakeawaysAcceptable(items, title = "", summary = "") {
  if (!Array.isArray(items) || items.length < 2) return false;

  const cleaned = dedupeTakeaways(items).filter((item) => !looksWeakTakeaway(item, title, summary));
  if (cleaned.length < 2) return false;

  for (let i = 0; i < cleaned.length; i += 1) {
    for (let j = i + 1; j < cleaned.length; j += 1) {
      if (overlapRatio(cleaned[i], cleaned[j]) > 0.9) {
        return false;
      }
    }
  }

  return true;
}

async function generateTakeaways({ title, summary, bodyText, sourceName }) {
  const fallback = generateFallbackTakeaways({ title, summary, bodyText, sourceName }).slice(0, 3);

  if (!openAiApiKey) {
    return fallback;
  }

  const context = buildGenerationContext({
    sourceName,
    title,
    summary,
    articleBody: bodyText,
  });

  const prompt = `
You are writing takeaways for an AI news briefing product.

Return strict JSON only:
{
  "takeaways": [
    "...",
    "...",
    "..."
  ]
}

Instructions:
- Write exactly 3 takeaways.
- Each takeaway must be a short summary point, not a quote and not copied from the article.
- Each takeaway should usually be 8 to 18 words.
- Be concrete and specific.
- Avoid generic phrases like "this article explains" or "this matters because".
- Avoid repeating the title verbatim.
- Focus on what changed, what was announced, or what a reader should retain.

Article context:
${context}
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    const rawText =
      data.output_text ||
      data.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text ||
      "";

    const parsed = parseJsonObjectFromText(rawText);
    const rawTakeaways = Array.isArray(parsed?.takeaways) ? parsed.takeaways : [];
    const cleaned = dedupeTakeaways(rawTakeaways).slice(0, 3);

    if (areTakeawaysAcceptable(cleaned, title, summary)) {
      return cleaned;
    }

    console.log(`Takeaway generation fallback for "${title}": output rejected as too weak`);
    return fallback;
  } catch (error) {
    console.log(`Takeaway generation fallback for "${title}": ${error.message || error}`);
    return fallback;
  }
}

async function upsertArticle(source, item) {
  const articleUrl = item.link?.trim();

  if (!articleUrl) {
    return {
      articleId: null,
      title: null,
      summary: null,
      bodyFound: false,
      bodyStatus: "not-found",
    };
  }

  const title = item.title?.trim() || "Untitled article";
  const bodyResult = await fetchArticleBody(articleUrl, source.name);
  const bodyTextRaw = bodyResult.bodyText;
  const bodyText = cleanupCompleteSentenceText(bodyTextRaw, bodyTextRaw || "");
  const summaryRaw =
    buildSummary(item) ||
    (bodyText ? bodyText.slice(0, 320) : "") ||
    stripHtml(title);
  const summary = cleanupSummaryText(summaryRaw, stripHtml(title) || "No summary extracted.");
  const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();

  const keyTakeaways = await generateTakeaways({
    title,
    summary,
    bodyText,
    sourceName: source.name,
  });

  const generatedInsights = await generateArticleInsights({
    sourceName: source.name,
    title,
    summary,
    articleBody: bodyText,
  });

  const cleanedWhyItMatters = cleanupInsightSentence(
    generatedInsights.whyItMatters,
    buildFallbackWhyItMatters(source.name, title, summary, bodyText)
  );

  const cleanedUseCaseExample = cleanupInsightSentence(
    generatedInsights.useCaseExample,
    buildFallbackUseCaseExample(source.name, title, summary, bodyText)
  );

  const payload = {
    title,
    slug: makeSlug(title),
    source_name: source.name,
    source_url: source.sourceUrl,
    article_url: articleUrl,
    published_at: publishedAt,
    summary: summary || "No summary extracted.",
    why_it_matters: cleanedWhyItMatters,
    use_case_example: cleanedUseCaseExample,
    image_url: extractImageUrl(item),
    article_body: bodyText || bodyTextRaw,
    content_extracted_at: bodyTextRaw ? new Date().toISOString() : null,
    key_takeaways: keyTakeaways,
    is_saved: false,
  };

  const { data, error } = await supabase
    .from("articles")
    .upsert(payload, { onConflict: "article_url" })
    .select("id")
    .single();

  if (error) {
    console.error(`Failed to upsert article "${title}":`, error.message);
    return {
      articleId: null,
      title,
      summary,
      bodyFound: false,
      bodyStatus: bodyResult.status,
    };
  }

  return {
    articleId: data.id,
    title,
    summary,
    bodyFound: bodyResult.status === "yes",
    bodyStatus: bodyResult.status,
  };
}

async function linkArticleToCompanies(articleId, companies) {
  if (!articleId || !companies.length) return;

  const rows = companies.map((company) => ({
    article_id: articleId,
    company_id: company.id,
  }));

  const { error } = await supabase
    .from("article_companies")
    .upsert(rows, { onConflict: "article_id,company_id" });

  if (error) {
    console.error("Failed to link article to companies:", error.message);
  }
}

async function linkArticleToProducts(articleId, products) {
  if (!articleId || !products.length) return;

  const rows = products.map((product) => ({
    article_id: articleId,
    product_id: product.id,
  }));

  const { error } = await supabase
    .from("article_products")
    .upsert(rows, { onConflict: "article_id,product_id" });

  if (error) {
    console.error("Failed to link article to products:", error.message);
  }
}

async function ingestSource(source, companies, products) {
  console.log(`\nFetching ${source.name}`);

  try {
    let resolvedSource = "";
    let items = [];

    if (source.mode === "html") {
      const result = await parseHtmlListing(source);
      resolvedSource = result.resolvedFeedUrl;
      items = result.items;
    } else {
      const result = await parseFeedFromCandidates(source);
      resolvedSource = result.resolvedFeedUrl;
      items = Array.isArray(result.feed.items) ? result.feed.items.slice(0, 15) : [];
    }

    console.log(`Using source: ${resolvedSource}`);
    console.log(`Found ${items.length} items`);

    for (const item of items) {
      const result = await upsertArticle(source, item);

      if (!result.articleId) {
        console.log(`Skipped: ${item.title || "Untitled article"}`);
        continue;
      }

      const matchedCompanies = getMatchedCompanies(
        source,
        result.title || item.title || "",
        result.summary || "",
        companies
      );

      const matchedProducts = getMatchedProducts(
        result.title || item.title || "",
        result.summary || "",
        products
      );

      await linkArticleToCompanies(result.articleId, matchedCompanies);
      await linkArticleToProducts(result.articleId, matchedProducts);

      console.log(
        `Processed: ${item.title || "Untitled article"} | companies=${matchedCompanies.length} | products=${matchedProducts.length} | body=${result.bodyStatus || (result.bodyFound ? "yes" : "not-found")}`
      );
    }
  } catch (error) {
    console.error(`Failed to fetch ${source.name}:`, error.message || error);
  }
}

async function main() {
  const companies = await getCompanies();
  const products = await getProducts();

  console.log(`Loaded ${companies.length} companies for matching`);
  console.log(`Loaded ${products.length} products for matching`);

  for (const source of newsSources) {
    await ingestSource(source, companies, products);
  }

  console.log("\nIngestion complete.");
}

main();