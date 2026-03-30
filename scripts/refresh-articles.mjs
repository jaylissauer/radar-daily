import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const USING_SERVICE_ROLE = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const ARTICLES_TABLE = process.env.ARTICLES_TABLE || "articles";
const BATCH_SIZE = Number(process.env.REFRESH_BATCH_SIZE || 25);
const DRY_RUN = String(process.env.REFRESH_DRY_RUN || "false") === "true";
const SOURCE_FILTER = (process.env.REFRESH_SOURCE || "").trim();
const BEFORE_DATE = (process.env.REFRESH_BEFORE || "").trim();
const FORCE_ALL = String(process.env.REFRESH_FORCE_ALL || "false") === "true";
const MIN_SOURCE_TEXT = Number(process.env.REFRESH_MIN_SOURCE_TEXT || 40);
const CANDIDATE_LIMIT = Number(process.env.REFRESH_CANDIDATE_LIMIT || 300);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env.");
  console.error("");
  console.error("Expected at least:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function makeSlug(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function normaliseText(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function cleanSentenceText(value) {
  if (!value) return "";
  let text = normaliseText(value);

  text = text.replace(/^["'`\-–—\s]+/, "").replace(/["'`\s]+$/, "").trim();
  text = text.replace(/^\.{2,}/, "").trim();
  text = text.replace(/\.\.\.\s*\.\.\./g, "...");
  text = text.replace(/\s*\.\.\.\s*$/, "").trim();

  return text;
}

function cleanParagraph(value) {
  let text = cleanSentenceText(value);
  text = text.replace(/\s{2,}/g, " ").trim();
  return text;
}

function cleanTakeaways(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanSentenceText(item))
    .filter(Boolean)
    .filter((item) => {
      if (item.length < 20) return false;
      if (/^(and|but|or|so|because)\b/i.test(item)) return false;
      if (/^[.,"'`\-–—]+$/.test(item)) return false;
      return /[a-z0-9)]$/i.test(item);
    })
    .slice(0, 4);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getRawSourceParts(row) {
  return [
    { key: "body", value: row.body },
    { key: "content", value: row.content },
    { key: "article_text", value: row.article_text },
    { key: "raw_text", value: row.raw_text },
    { key: "extracted_text", value: row.extracted_text },
    { key: "html", value: row.html ? stripHtml(row.html) : "" },
    { key: "description", value: row.description },
    { key: "summary", value: row.summary },
    { key: "why_it_matters", value: row.why_it_matters },
    { key: "use_case_example", value: row.use_case_example },
  ].map((part) => ({
    key: part.key,
    value: cleanParagraph(part.value),
  }));
}

function getSourceBody(row) {
  const parts = getRawSourceParts(row)
    .filter((part) => part.value)
    .filter((part, index, arr) => {
      const firstIndex = arr.findIndex((x) => x.value === part.value);
      return firstIndex === index;
    });

  const combined = parts.map((part) => part.value).join("\n\n").trim();

  return combined.slice(0, 12000);
}

function getSourceDiagnostics(row) {
  const parts = getRawSourceParts(row)
    .filter((part) => part.value)
    .map((part) => `${part.key}:${part.value.length}`);

  return parts.join(", ");
}

function looksWeak(text) {
  const value = String(text || "").trim().toLowerCase();
  if (!value) return true;
  if (value.length < 80) return true;
  if (value.includes("no summary yet")) return true;
  if (value.includes("lorem ipsum")) return true;
  if (value.includes("article discusses")) return true;
  if (value.includes("this article explains")) return true;
  if (value.includes("in summary,")) return true;
  return false;
}

function looksWeakTakeaways(value) {
  if (!Array.isArray(value) || value.length === 0) return true;
  const cleaned = cleanTakeaways(value);
  return cleaned.length === 0;
}

function shouldRefresh(row) {
  if (FORCE_ALL) return true;

  const summary = firstNonEmpty(row.summary);
  const whyItMatters = firstNonEmpty(row.why_it_matters);
  const useCaseExample = firstNonEmpty(row.use_case_example);
  const takeaways = row.takeaways;

  if (looksWeak(summary)) return true;
  if (looksWeak(whyItMatters)) return true;
  if (looksWeak(useCaseExample)) return true;
  if (looksWeakTakeaways(takeaways)) return true;

  return false;
}

async function generateIntelligence(row) {
  const sourceText = getSourceBody(row);
  const title = cleanParagraph(firstNonEmpty(row.title, "Untitled article"));
  const sourceName = cleanParagraph(firstNonEmpty(row.source_name, row.source, "Unknown source"));
  const url = firstNonEmpty(row.original_url, row.url);

  if (!sourceText || sourceText.length < MIN_SOURCE_TEXT) {
    return null;
  }

  const prompt = `
You are improving article intelligence for an AI news and product intelligence app.

Return ONLY valid JSON with this exact shape:
{
  "summary": "string",
  "why_it_matters": "string",
  "use_case_example": "string",
  "takeaways": ["string", "string", "string"]
}

Rules:
- Be specific to the article.
- No hype.
- No generic filler.
- No markdown.
- summary: 2-4 sentences, concise, readable, product-focused.
- why_it_matters: 1-2 sentences explaining what decision-maker value this creates.
- use_case_example: 1-2 sentences, realistic business/product use case.
- takeaways: 2-4 completed readable sentences.
- You may rely on title + short description style source text if full body is unavailable.
- Stay grounded in the provided source text only.
- Never mention that the text may be incomplete.
- Do not include ellipsis fragments or sentence fragments.

Article metadata:
Title: ${JSON.stringify(title)}
Source: ${JSON.stringify(sourceName)}
URL: ${JSON.stringify(url)}

Article text:
${JSON.stringify(sourceText)}
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REFRESH_MODEL || "gpt-5.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "article_intelligence_refresh",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              why_it_matters: { type: "string" },
              use_case_example: { type: "string" },
              takeaways: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 4,
              },
            },
            required: [
              "summary",
              "why_it_matters",
              "use_case_example",
              "takeaways",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI refresh failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  let rawText = "";
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    rawText = data.output_text.trim();
  } else if (Array.isArray(data.output)) {
    const textParts = [];
    for (const item of data.output) {
      if (!item || !Array.isArray(item.content)) continue;
      for (const part of item.content) {
        if (part?.type === "output_text" && typeof part.text === "string") {
          textParts.push(part.text);
        }
      }
    }
    rawText = textParts.join("\n").trim();
  }

  if (!rawText) {
    throw new Error("OpenAI refresh returned no parseable text.");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Failed to parse JSON intelligence: ${rawText}`);
  }

  return {
    summary: cleanParagraph(parsed.summary),
    why_it_matters: cleanParagraph(parsed.why_it_matters),
    use_case_example: cleanParagraph(parsed.use_case_example),
    takeaways: cleanTakeaways(parsed.takeaways),
  };
}

async function fetchCandidateRows() {
  let query = supabase
    .from(ARTICLES_TABLE)
    .select("*")
    .order("published_at", { ascending: true, nullsFirst: false })
    .limit(CANDIDATE_LIMIT);

  if (SOURCE_FILTER) {
    query = query.eq("source_name", SOURCE_FILTER);
  }

  if (BEFORE_DATE) {
    query = query.lt("published_at", BEFORE_DATE);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase fetch failed: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

function buildUpdatePayload(row, intelligence) {
  const payload = {};
  const rowKeys = new Set(Object.keys(row));

  if (rowKeys.has("summary")) payload.summary = intelligence.summary;
  if (rowKeys.has("why_it_matters")) payload.why_it_matters = intelligence.why_it_matters;
  if (rowKeys.has("use_case_example")) payload.use_case_example = intelligence.use_case_example;
  if (rowKeys.has("takeaways")) payload.takeaways = intelligence.takeaways;
  if (rowKeys.has("slug") && !row.slug) payload.slug = makeSlug(row.title);
  if (rowKeys.has("updated_at")) payload.updated_at = new Date().toISOString();

  return payload;
}

async function updateRow(row, payload) {
  if (!Object.prototype.hasOwnProperty.call(row, "id")) {
    throw new Error("Cannot update row because no 'id' column was found.");
  }

  const { error } = await supabase
    .from(ARTICLES_TABLE)
    .update(payload)
    .eq("id", row.id);

  if (error) {
    throw new Error(`Supabase update failed for ${row.id}: ${error.message}`);
  }
}

async function main() {
  console.log(`Refreshing articles from table: ${ARTICLES_TABLE}`);
  console.log(`Batch size target: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Source filter: ${SOURCE_FILTER || "(none)"}`);
  console.log(`Before date: ${BEFORE_DATE || "(none)"}`);
  console.log(`Force all: ${FORCE_ALL}`);
  console.log(`Min source text: ${MIN_SOURCE_TEXT}`);
  console.log(`Candidate limit: ${CANDIDATE_LIMIT}`);
  console.log(`Supabase key type: ${USING_SERVICE_ROLE ? "service_role" : "anon/public fallback"}`);
  console.log("");

  const rows = await fetchCandidateRows();
  console.log(`Fetched ${rows.length} candidate rows`);

  const refreshTargets = rows.filter(shouldRefresh).slice(0, BATCH_SIZE);
  console.log(`Selected ${refreshTargets.length} rows for refresh`);
  console.log("");

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of refreshTargets) {
    const sourceText = getSourceBody(row);
    const diagnostics = getSourceDiagnostics(row);
    const label = `${row.id ?? "unknown-id"} | ${row.source_name ?? row.source ?? "unknown-source"} | ${cleanParagraph(row.title ?? "Untitled")}`;

    try {
      if (!sourceText || sourceText.length < MIN_SOURCE_TEXT) {
        console.log(`SKIP  ${label} -> insufficient source text (${sourceText.length} chars) [${diagnostics || "no populated fields"}]`);
        skipped += 1;
        continue;
      }

      const intelligence = await generateIntelligence(row);
      if (!intelligence) {
        console.log(`SKIP  ${label} -> no intelligence returned [${diagnostics || "no populated fields"}]`);
        skipped += 1;
        continue;
      }

      const payload = buildUpdatePayload(row, intelligence);

      if (DRY_RUN) {
        console.log(`DRY   ${label} -> sourceText=${sourceText.length} [${diagnostics}]`);
        console.log(JSON.stringify(payload, null, 2));
        console.log("");
      } else {
        await updateRow(row, payload);
        console.log(`DONE  ${label} -> sourceText=${sourceText.length} [${diagnostics}]`);
      }

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`FAIL  ${label} [${diagnostics || "no populated fields"}]`);
      console.error(error instanceof Error ? error.message : String(error));
      console.error("");
    }
  }

  console.log("");
  console.log(`Refresh complete. Updated=${updated} Skipped=${skipped} Failed=${failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});