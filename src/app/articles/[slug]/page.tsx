"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ArticleRecord = {
  id: string;
  slug: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  article_url: string | null;
  published_at: string | null;
  summary: string | null;
  why_it_matters: string | null;
  use_case_example: string | null;
  image_url: string | null;
  article_body: string | null;
  key_takeaways: string[] | null;
  is_saved: boolean | null;
};

type CompanyChip = {
  id: string;
  name: string;
  slug: string | null;
};

type ProductChip = {
  id: string;
  name: string;
  slug: string | null;
};

type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string };

const allowedArticleHostsBySource: Record<string, string[]> = {
  OpenAI: ["openai.com", "www.openai.com"],
  Anthropic: ["anthropic.com", "www.anthropic.com"],
  Google: ["blog.google"],
  "Hugging Face": ["huggingface.co", "www.huggingface.co"],
  Meta: ["about.fb.com"],
};

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [companies, setCompanies] = useState<CompanyChip[]>([]);
  const [products, setProducts] = useState<ProductChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("Article slug is missing.");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const articleResponse = await supabase
          .from("articles")
          .select(
            "id, slug, title, source_name, source_url, article_url, published_at, summary, why_it_matters, use_case_example, image_url, article_body, key_takeaways, is_saved"
          )
          .eq("slug", slug)
          .single();

        if (articleResponse.error) throw articleResponse.error;

        const articleRow = articleResponse.data as ArticleRecord;

        const [articleCompaniesResponse, articleProductsResponse] = await Promise.all([
          supabase
            .from("article_companies")
            .select("company_id")
            .eq("article_id", articleRow.id),

          supabase
            .from("article_products")
            .select("product_id")
            .eq("article_id", articleRow.id),
        ]);

        if (articleCompaniesResponse.error) throw articleCompaniesResponse.error;
        if (articleProductsResponse.error) throw articleProductsResponse.error;

        const companyIds = (articleCompaniesResponse.data ?? []).map(
          (row: { company_id: string }) => row.company_id
        );
        const productIds = (articleProductsResponse.data ?? []).map(
          (row: { product_id: string }) => row.product_id
        );

        const [companiesResponse, productsResponse] = await Promise.all([
          companyIds.length > 0
            ? supabase
                .from("companies")
                .select("id, name, slug")
                .in("id", companyIds)
                .order("name", { ascending: true })
            : Promise.resolve({ data: [], error: null }),

          productIds.length > 0
            ? supabase
                .from("products")
                .select("id, name, slug")
                .in("id", productIds)
                .order("name", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (companiesResponse.error) throw companiesResponse.error;
        if (productsResponse.error) throw productsResponse.error;

        if (!cancelled) {
          setArticle(articleRow);
          setCompanies((companiesResponse.data ?? []) as CompanyChip[]);
          setProducts((productsResponse.data ?? []) as ProductChip[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load article.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const bodyBlocks = useMemo(() => {
    if (!article?.article_body) return [];
    return buildReadableBodyBlocks(article.article_body);
  }, [article?.article_body]);

  const takeaways = useMemo(() => {
    if (!article?.key_takeaways) return [];
    return article.key_takeaways
      .filter(Boolean)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [article?.key_takeaways]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.skeletonHero} />
        <div style={styles.skeletonRow} />
        <div style={styles.skeletonRowTall} />
      </main>
    );
  }

  if (error || !article) {
    return (
      <main style={styles.page}>
        <section style={styles.messageCard}>
          <p style={styles.kicker}>Article</p>
          <h1 style={styles.messageTitle}>Unable to load article</h1>
          <p style={styles.messageText}>{error ?? "Article not found."}</p>
          <Link href="/" style={styles.primaryButton}>
            Back to homepage
          </Link>
        </section>
      </main>
    );
  }

  const coverStyle = getArticleCoverStyle(article, companies);
  const publishedLabel = formatDate(article.published_at);
  const hasExtractedBody = bodyBlocks.length > 0;
  const safeOriginalArticleUrl = hasExtractedBody
    ? getSafeOriginalArticleUrl(article.article_url, article.source_name)
    : null;
  const safeSourceSiteUrl = getSafeExternalUrl(article.source_url);

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <Link href="/" style={styles.backLink}>
          ← Back to Radar Daily
        </Link>

        <div style={styles.topActions}>
          {safeOriginalArticleUrl ? (
            <a
              href={safeOriginalArticleUrl}
              target="_blank"
              rel="noreferrer"
              style={styles.secondaryButton}
            >
              Original article
            </a>
          ) : null}

          {safeSourceSiteUrl ? (
            <a
              href={safeSourceSiteUrl}
              target="_blank"
              rel="noreferrer"
              style={styles.secondaryButton}
            >
              Source site
            </a>
          ) : null}
        </div>
      </div>

      <section style={styles.heroCard}>
        <div
          style={{
            ...styles.heroMedia,
            background: coverStyle.background,
          }}
        >
          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image_url}
              alt={article.title}
              style={styles.heroImage}
            />
          ) : (
            <>
              <div
                style={{
                  ...styles.heroGlow,
                  background: coverStyle.glow,
                }}
              />
              <div style={styles.heroPattern} />
            </>
          )}

          <div style={styles.heroOverlay} />

          <div style={styles.heroContent}>
            <div style={styles.heroMetaRow}>
              <div style={styles.heroMetaLeft}>
                <span style={styles.heroPill}>
                  {companies[0]?.name ?? article.source_name ?? "Unknown"}
                </span>
                {!hasExtractedBody ? <span style={styles.statusPill}>Summary only</span> : null}
                {article.is_saved ? <span style={styles.savedPill}>Saved</span> : null}
              </div>

              <div style={styles.heroMetaRight}>
                <span>{publishedLabel}</span>
                {article.source_name ? <span>• {article.source_name}</span> : null}
              </div>
            </div>

            <div style={styles.heroTextBlock}>
              <p style={styles.kicker}>Radar Daily Brief</p>
              <h1 style={styles.heroTitle}>{article.title}</h1>

              {(companies.length > 0 || products.length > 0) && (
                <div style={styles.tagRow}>
                  {companies.slice(0, 3).map((company) => (
                    <span key={company.id} style={styles.coverTag}>
                      {company.name}
                    </span>
                  ))}
                  {products.slice(0, 3).map((product) => (
                    <span key={product.id} style={styles.coverTagMuted}>
                      {product.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.heroBottom}>
          {!hasExtractedBody ? (
            <div style={styles.infoBanner}>
              <p style={styles.infoBannerTitle}>Summary only</p>
              <p style={styles.infoBannerText}>
                This article is shown from source metadata and Radar Daily insights, but the full article body could not
                be extracted.
              </p>
            </div>
          ) : null}

          <div style={styles.summaryPanel}>
            <p style={styles.sectionLabel}>Summary</p>
            <p style={styles.summaryText}>
              {article.summary?.trim() || "No summary available for this article yet."}
            </p>
          </div>

          <div style={styles.insightGrid}>
            {article.why_it_matters ? (
              <section style={styles.insightCard}>
                <p style={styles.sectionLabel}>Why it matters</p>
                <p style={styles.insightText}>{article.why_it_matters}</p>
              </section>
            ) : null}

            {article.use_case_example ? (
              <section style={styles.insightCard}>
                <p style={styles.sectionLabel}>Use case example</p>
                <p style={styles.insightText}>{article.use_case_example}</p>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      {takeaways.length > 0 ? (
        <section style={styles.contentCard}>
          <div style={styles.cardHeader}>
            <p style={styles.sectionLabel}>Key takeaways</p>
            <p style={styles.cardSubtle}>
              The fastest way to understand the article at a glance.
            </p>
          </div>

          <div style={styles.takeawayGrid}>
            {takeaways.map((takeaway, index) => (
              <div key={`${takeaway}-${index}`} style={styles.takeawayCard}>
                <div style={styles.takeawayBadge}>{index + 1}</div>
                <p style={styles.takeawayText}>{takeaway}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={styles.contentCard}>
        <div style={styles.cardHeader}>
          <p style={styles.sectionLabel}>
            {hasExtractedBody ? "Article body" : "Article body unavailable"}
          </p>
          <p style={styles.cardSubtle}>
            {hasExtractedBody
              ? "Reformatted from source extraction for easier reading."
              : "Radar Daily could not extract the long-form article text for this item."}
          </p>
        </div>

        {bodyBlocks.length > 0 ? (
          <div style={styles.articleBody}>
            {bodyBlocks.map((block, index) =>
              block.type === "subheading" ? (
                <h2 key={`sub-${index}`} style={styles.bodySubheading}>
                  {block.text}
                </h2>
              ) : (
                <p key={`para-${index}`} style={styles.bodyParagraph}>
                  {block.text}
                </p>
              )
            )}
          </div>
        ) : (
          <div style={styles.emptyStatePanel}>
            <p style={styles.emptyStateTitle}>No extracted article body available</p>
            <p style={styles.emptyStateText}>
              This item can still be useful from its title, summary, source context, and Radar Daily insights.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function getSafeExternalUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function isGenericListingPath(pathname: string, sourceName: string | null) {
  const path = normalizePathname(pathname).toLowerCase();

  if (path === "/" || path === "/news" || path === "/blog") {
    return true;
  }

  if (sourceName === "Google" && path === "/innovation-and-ai") {
    return true;
  }

  return false;
}

function isArticleLikePathForSource(pathname: string, sourceName: string | null) {
  const path = normalizePathname(pathname);

  if (isGenericListingPath(path, sourceName)) return false;

  if (sourceName === "OpenAI") return /^\/news\/[a-z0-9-]+$/i.test(path);
  if (sourceName === "Anthropic") return /^\/news\/[a-z0-9-]+$/i.test(path);
  if (sourceName === "Meta") return /^\/news\/\d{4}\/\d{2}\/.+$/i.test(path);
  if (sourceName === "Hugging Face") return /^\/blog\/.+$/i.test(path);

  if (sourceName === "Google") {
    return path.split("/").filter(Boolean).length >= 2 && !isGenericListingPath(path, sourceName);
  }

  return !isGenericListingPath(path, sourceName);
}

function getSafeOriginalArticleUrl(value: string | null, sourceName: string | null) {
  const safe = getSafeExternalUrl(value);
  if (!safe) return null;

  const url = new URL(safe);

  if (sourceName) {
    const allowedHosts = allowedArticleHostsBySource[sourceName] ?? [];
    if (allowedHosts.length > 0) {
      const host = url.hostname.toLowerCase();
      const matches = allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
      if (!matches) return null;
    }
  }

  if (!isArticleLikePathForSource(url.pathname, sourceName)) {
    return null;
  }

  return safe;
}

function buildReadableBodyBlocks(raw: string): BodyBlock[] {
  const decoded = decodeHtmlEntities(raw)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();

  if (!decoded) return [];

  const explicitParagraphs = decoded
    .split(/\n\s*\n+/)
    .map((item) => item.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  const baseParagraphs =
    explicitParagraphs.length >= 3
      ? explicitParagraphs
      : chunkIntoParagraphs(decoded.replace(/\n+/g, " "));

  return insertTopicBreaks(baseParagraphs);
}

function chunkIntoParagraphs(value: string) {
  const sentenceParts = value
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/g)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentenceParts.length <= 3) {
    return [value];
  }

  const grouped: string[] = [];
  let current = "";

  for (const sentence of sentenceParts) {
    const next = current ? `${current} ${sentence}` : sentence;

    if (next.length > 520 || countSentences(next) >= 4) {
      if (current) grouped.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current.trim()) {
    grouped.push(current.trim());
  }

  return grouped;
}

function insertTopicBreaks(paragraphs: string[]): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let sectionCount = 1;

  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    const previous = paragraphs[i - 1];

    if (i > 0 && shouldInsertSubheading(previous, paragraph)) {
      sectionCount += 1;
      blocks.push({
        type: "subheading",
        text: deriveSubheading(paragraph, sectionCount),
      });
    }

    blocks.push({
      type: "paragraph",
      text: paragraph,
    });
  }

  return blocks;
}

function shouldInsertSubheading(previous: string | undefined, current: string) {
  if (!previous) return false;
  if (current.length < 120) return false;

  const starter = current.toLowerCase();

  const strongStarts = [
    "for ",
    "through ",
    "as part",
    "meanwhile",
    "in addition",
    "another",
    "we also",
    "for example",
    "this includes",
    "this means",
    "together",
    "at the same time",
    "beyond ",
    "to support",
    "looking ahead",
  ];

  const hasStrongStart = strongStarts.some((value) => starter.startsWith(value));
  if (hasStrongStart) return true;

  const previousWords = new Set(tokenize(previous));
  const currentWords = tokenize(current);

  if (currentWords.length === 0) return false;

  const overlapCount = currentWords.filter((word) => previousWords.has(word)).length;
  const overlapRatio = overlapCount / currentWords.length;

  return overlapRatio < 0.18;
}

function deriveSubheading(paragraph: string, sectionCount: number) {
  const lower = paragraph.toLowerCase();

  if (lower.includes("for example")) return "Example and practical impact";
  if (lower.includes("community")) return "Community and local impact";
  if (lower.includes("jobs") || lower.includes("workforce")) return "Jobs and workforce";
  if (lower.includes("energy") || lower.includes("grid") || lower.includes("electricity")) {
    return "Energy and infrastructure";
  }
  if (lower.includes("teacher") || lower.includes("school") || lower.includes("education")) {
    return "Education and skills";
  }
  if (lower.includes("small businesses") || lower.includes("business")) {
    return "Business implications";
  }
  if (lower.includes("support") || lower.includes("program")) {
    return "Programs and support";
  }

  return `Section ${sectionCount}`;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5);
}

function countSentences(value: string) {
  const matches = value.match(/[.!?](\s|$)/g);
  return matches ? matches.length : 1;
}

function decodeHtmlEntities(value: string) {
  if (typeof window === "undefined") {
    return value
      .replace(/&#8217;/g, "’")
      .replace(/&#8216;/g, "‘")
      .replace(/&#8220;/g, "“")
      .replace(/&#8221;/g, "”")
      .replace(/&#8230;/g, "…")
      .replace(/&#8211;/g, "–")
      .replace(/&#8212;/g, "—")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function getArticleCoverStyle(
  article: Pick<ArticleRecord, "source_name">,
  companies: CompanyChip[]
) {
  const companyName = companies[0]?.name ?? null;
  return getEntityCoverStyle(companyName, article.source_name);
}

function getEntityCoverStyle(companyName: string | null, sourceName: string | null) {
  const company = (companyName ?? "").toLowerCase();
  const source = (sourceName ?? "").toLowerCase();
  const key = company || source;

  if (company.includes("openai") || source.includes("openai")) {
    return {
      background:
        "linear-gradient(135deg, rgba(7,16,22,1) 0%, rgba(10,61,48,1) 56%, rgba(31,148,108,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(84,255,184,0.34) 0%, rgba(84,255,184,0) 72%)",
    };
  }

  if (company.includes("anthropic") || source.includes("anthropic")) {
    return {
      background:
        "linear-gradient(135deg, rgba(28,18,12,1) 0%, rgba(96,56,18,1) 58%, rgba(201,133,52,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(255,202,120,0.32) 0%, rgba(255,202,120,0) 72%)",
    };
  }

  if (company.includes("google") || source.includes("google")) {
    return {
      background:
        "linear-gradient(135deg, rgba(15,21,42,1) 0%, rgba(20,69,153,1) 45%, rgba(144,72,209,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(123,167,255,0.34) 0%, rgba(123,167,255,0) 72%)",
    };
  }

  if (company.includes("meta") || source.includes("meta") || company.includes("facebook")) {
    return {
      background:
        "linear-gradient(135deg, rgba(7,18,49,1) 0%, rgba(13,61,160,1) 54%, rgba(70,135,255,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(104,177,255,0.34) 0%, rgba(104,177,255,0) 72%)",
    };
  }

  if (company.includes("hugging face") || source.includes("hugging face")) {
    return {
      background:
        "linear-gradient(135deg, rgba(38,24,6,1) 0%, rgba(128,78,10,1) 54%, rgba(238,176,63,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(255,227,131,0.34) 0%, rgba(255,227,131,0) 72%)",
    };
  }

  return getFallbackCoverFromKey(key);
}

function getFallbackCoverFromKey(key: string) {
  const palettes = [
    {
      background:
        "linear-gradient(135deg, rgba(16,24,44,1) 0%, rgba(34,53,99,1) 52%, rgba(92,121,209,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(142,170,255,0.28) 0%, rgba(142,170,255,0) 72%)",
    },
    {
      background:
        "linear-gradient(135deg, rgba(23,18,43,1) 0%, rgba(69,44,122,1) 52%, rgba(155,92,255,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(198,155,255,0.28) 0%, rgba(198,155,255,0) 72%)",
    },
    {
      background:
        "linear-gradient(135deg, rgba(15,31,36,1) 0%, rgba(18,89,94,1) 52%, rgba(39,183,173,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(120,255,238,0.28) 0%, rgba(120,255,238,0) 72%)",
    },
    {
      background:
        "linear-gradient(135deg, rgba(34,19,26,1) 0%, rgba(112,39,72,1) 52%, rgba(239,88,141,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(255,150,186,0.28) 0%, rgba(255,150,186,0) 72%)",
    },
  ];

  const index = Math.abs(simpleHash(key)) % palettes.length;
  return palettes[index];
}

function simpleHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 1160,
    margin: "0 auto",
    padding: "20px 16px 56px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  topActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  backLink: {
    color: "inherit",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
    opacity: 0.82,
  },
  heroCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    overflow: "hidden",
    background: "rgba(255,255,255,0.03)",
  },
  heroMedia: {
    position: "relative",
    minHeight: 380,
    overflow: "hidden",
    padding: 24,
    boxSizing: "border-box",
  },
  heroImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  heroGlow: {
    position: "absolute",
    width: 420,
    height: 420,
    right: -80,
    top: -100,
    filter: "blur(10px)",
  },
  heroPattern: {
    position: "absolute",
    inset: 0,
    opacity: 0.14,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 36%, rgba(0,0,0,0.78) 100%)",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    minHeight: 332,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 28,
  },
  heroMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  heroMetaLeft: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  heroMetaRight: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 13,
    fontWeight: 700,
    opacity: 0.88,
  },
  heroTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(34px, 5vw, 62px)",
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: "-0.045em",
    textWrap: "balance",
    maxWidth: 950,
  },
  heroBottom: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 22,
    boxSizing: "border-box",
  },
  summaryPanel: {
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  summaryText: {
    margin: 0,
    fontSize: 19,
    lineHeight: 1.7,
    opacity: 0.94,
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },
  insightCard: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  insightText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
    opacity: 0.86,
  },
  heroPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(10,16,28,0.34)",
    backdropFilter: "blur(10px)",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid rgba(255,218,128,0.28)",
    background: "rgba(255,196,81,0.16)",
    backdropFilter: "blur(10px)",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  savedPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
  },
  infoBanner: {
    borderRadius: 18,
    border: "1px solid rgba(255,218,128,0.20)",
    background: "rgba(255,196,81,0.08)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  infoBannerTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
  infoBannerText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    opacity: 0.84,
  },
  tagRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  coverTag: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
  },
  coverTagMuted: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "rgba(9,16,28,0.34)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
  },
  contentCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    background: "rgba(255,255,255,0.03)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  cardSubtle: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.68,
  },
  takeawayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  takeawayCard: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  takeawayBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    fontSize: 14,
    fontWeight: 800,
  },
  takeawayText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.65,
    opacity: 0.92,
  },
  articleBody: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  bodySubheading: {
    margin: "8px 0 0",
    fontSize: 20,
    lineHeight: 1.25,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    opacity: 0.96,
  },
  bodyParagraph: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.95,
    letterSpacing: "0.002em",
    opacity: 0.94,
    maxWidth: 900,
  },
  emptyStatePanel: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  emptyStateTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
  emptyStateText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    opacity: 0.8,
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    opacity: 0.68,
  },
  sectionLabel: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    opacity: 0.68,
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "12px 16px",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 800,
    color: "inherit",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    width: "fit-content",
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "11px 14px",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    color: "inherit",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  messageCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 24,
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  messageTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
  },
  messageText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.6,
    opacity: 0.8,
  },
  skeletonHero: {
    minHeight: 420,
    borderRadius: 28,
    background: "rgba(255,255,255,0.05)",
  },
  skeletonRow: {
    minHeight: 200,
    borderRadius: 24,
    background: "rgba(255,255,255,0.05)",
  },
  skeletonRowTall: {
    minHeight: 520,
    borderRadius: 24,
    background: "rgba(255,255,255,0.05)",
  },
};
