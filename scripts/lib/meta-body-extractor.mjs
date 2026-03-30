const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-AU,en;q=0.9,en-US;q=0.8",
  pragma: "no-cache",
  "cache-control": "no-cache",
};

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanParagraph(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normaliseBody(text = "") {
  const lines = text
    .split(/\n+/)
    .map((line) => cleanParagraph(line))
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();

  for (const line of lines) {
    const key = line.toLowerCase();
    if (line.length < 40) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(line);
  }

  return deduped.join("\n\n").trim();
}

function getMetaContent(html, attr, value) {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return (match?.[1] || match?.[2] || "").trim();
}

function extractJsonLdBodies(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const results = [];

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? parsed : [parsed];

      while (queue.length) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;

        if (Array.isArray(item)) {
          queue.push(...item);
          continue;
        }

        if (item["@graph"] && Array.isArray(item["@graph"])) {
          queue.push(...item["@graph"]);
        }

        if (typeof item.articleBody === "string" && item.articleBody.trim()) {
          results.push(item.articleBody.trim());
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

function extractParagraphBlocks(html) {
  const blockCandidates = [];

  const mainLikeMatches = [
    ...html.matchAll(
      /<(article|main|section|div)[^>]*(class|id)=["'][^"']*(article|content|body|story|post|entry|main)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi
    ),
  ];

  for (const match of mainLikeMatches) {
    blockCandidates.push(match[4] || "");
  }

  if (blockCandidates.length === 0) {
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch?.[1]) {
      blockCandidates.push(articleMatch[1]);
    }
  }

  const paragraphs = [];

  for (const block of blockCandidates) {
    const pMatches = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
    for (const p of pMatches) {
      const text = stripTags(p[1] || "");
      const cleaned = cleanParagraph(text);
      if (cleaned.length >= 40) {
        paragraphs.push(cleaned);
      }
    }
  }

  return paragraphs;
}

function scoreBodyCandidate(text = "") {
  let score = 0;
  const length = text.length;

  if (length >= 400) score += 4;
  if (length >= 800) score += 4;
  if (length >= 1400) score += 4;

  const paragraphCount = text.split(/\n\n+/).filter(Boolean).length;
  score += Math.min(paragraphCount, 10);

  if (/meta|facebook|instagram|whatsapp|threads|ai/i.test(text)) score += 2;
  if (/cookie|sign up|log in|privacy policy|related articles/i.test(text)) score -= 4;

  return score;
}

function chooseBestBody(candidates = []) {
  const cleaned = candidates
    .map((item) => normaliseBody(typeof item === "string" ? item : ""))
    .filter(Boolean);

  if (cleaned.length === 0) return "";

  const scored = cleaned
    .map((text) => ({ text, score: scoreBodyCandidate(text) }))
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length);

  return scored[0]?.text || "";
}

export async function extractMetaArticleBody(url) {
  const result = {
    source: "Meta",
    url,
    status: "not-found",
    title: "",
    description: "",
    body: "",
    notes: [],
  };

  let response;
  try {
    response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      redirect: "follow",
    });
  } catch (error) {
    result.status = "fetch-error";
    result.notes.push(`fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }

  if (!response.ok) {
    result.status = "http-error";
    result.notes.push(`http ${response.status}`);
    return result;
  }

  const html = await response.text();

  result.title =
    getMetaContent(html, "property", "og:title") ||
    getMetaContent(html, "name", "twitter:title") ||
    "";

  result.description =
    getMetaContent(html, "property", "og:description") ||
    getMetaContent(html, "name", "description") ||
    "";

  const jsonLdBodies = extractJsonLdBodies(html);
  if (jsonLdBodies.length > 0) {
    result.notes.push(`json-ld bodies found: ${jsonLdBodies.length}`);
  }

  const paragraphBlocks = extractParagraphBlocks(html);
  if (paragraphBlocks.length > 0) {
    result.notes.push(`paragraph blocks found: ${paragraphBlocks.length}`);
  }

  const bestBody = chooseBestBody([
    ...jsonLdBodies,
    paragraphBlocks.join("\n\n"),
  ]);

  if (bestBody) {
    result.body = bestBody;
    result.status = "ok";
    result.notes.push(`body length: ${bestBody.length}`);
    return result;
  }

  if (result.description) {
    result.body = result.description;
    result.status = "summary-only";
    result.notes.push("fell back to meta description");
    return result;
  }

  result.notes.push("no usable body extracted");
  return result;
}
