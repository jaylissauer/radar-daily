"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SavedArticle = {
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
  is_saved: boolean | null;
};

export default function SavedPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await supabase
          .from("articles")
          .select(
            "id, slug, title, source_name, source_url, article_url, published_at, summary, why_it_matters, use_case_example, image_url, article_body, is_saved"
          )
          .eq("is_saved", true)
          .order("published_at", { ascending: false });

        if (response.error) throw response.error;

        if (!cancelled) {
          setArticles((response.data ?? []) as SavedArticle[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load saved articles.");
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
  }, []);

  const hasSavedArticles = articles.length > 0;

  const savedCountLabel = useMemo(() => {
    if (articles.length === 1) return "1 saved article";
    return `${articles.length} saved articles`;
  }, [articles.length]);

  async function handleUnsave(articleId: string) {
    if (pendingIds.includes(articleId)) return;

    setPendingIds((current) => [...current, articleId]);

    try {
      const { error: updateError } = await supabase
        .from("articles")
        .update({ is_saved: false })
        .eq("id", articleId);

      if (updateError) throw updateError;

      setArticles((current) => current.filter((article) => article.id !== articleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsave article.");
    } finally {
      setPendingIds((current) => current.filter((id) => id !== articleId));
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.heroSkeleton} />
        <div style={styles.cardSkeleton} />
        <div style={styles.cardSkeleton} />
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.heroCard}>
        <div style={styles.heroTopRow}>
          <Link href="/" style={styles.backLink}>
            ← Back to Radar Daily
          </Link>
          <span style={styles.heroCount}>{savedCountLabel}</span>
        </div>

        <div style={styles.heroTextBlock}>
          <p style={styles.kicker}>Saved</p>
          <h1 style={styles.heroTitle}>Your saved articles</h1>
          <p style={styles.heroText}>
            Keep track of the items you want to come back to, then remove them once you are done.
          </p>
        </div>
      </section>

      {error ? (
        <section style={styles.messageCard}>
          <p style={styles.messageTitle}>Something went wrong</p>
          <p style={styles.messageText}>{error}</p>
        </section>
      ) : null}

      {!hasSavedArticles ? (
        <section style={styles.emptyCard}>
          <p style={styles.emptyTitle}>No saved articles yet</p>
          <p style={styles.emptyText}>
            Save articles from the feed or article pages and they will appear here.
          </p>
          <Link href="/" style={styles.primaryButton}>
            Go to homepage
          </Link>
        </section>
      ) : (
        <section style={styles.listWrap}>
          {articles.map((article) => {
            const isPending = pendingIds.includes(article.id);
            const hasBody = Boolean(article.article_body?.trim());

            return (
              <article key={article.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardMeta}>
                    <span style={styles.sourcePill}>
                      {article.source_name?.trim() || "Unknown source"}
                    </span>
                    {!hasBody ? <span style={styles.summaryOnlyPill}>Summary only</span> : null}
                    <span style={styles.savedPill}>Saved</span>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => handleUnsave(article.id)}
                      disabled={isPending}
                      style={{
                        ...styles.secondaryButton,
                        ...(isPending ? styles.buttonDisabled : null),
                      }}
                    >
                      {isPending ? "Unsaving..." : "Unsave"}
                    </button>
                  </div>
                </div>

                <Link href={`/articles/${article.slug}`} style={styles.cardLink}>
                  <h2 style={styles.cardTitle}>{article.title}</h2>
                </Link>

                <div style={styles.cardSubmeta}>
                  <span>{formatDate(article.published_at)}</span>
                </div>

                <p style={styles.summary}>
                  {cleanupSummary(article.summary, "No summary available yet.")}
                </p>

                {article.why_it_matters ? (
                  <div style={styles.insightBox}>
                    <p style={styles.insightLabel}>Why it matters</p>
                    <p style={styles.insightText}>{article.why_it_matters}</p>
                  </div>
                ) : null}

                <div style={styles.footerRow}>
                  <Link href={`/articles/${article.slug}`} style={styles.primaryButton}>
                    Open in Radar Daily
                  </Link>

                  {article.source_url ? (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.secondaryButton}
                    >
                      Source site
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function cleanupSummary(value: string | null, fallback: string) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
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
    maxWidth: 1040,
    margin: "0 auto",
    padding: "20px 16px 56px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxSizing: "border-box",
  },
  heroCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    background: "rgba(255,255,255,0.03)",
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  heroTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  heroTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(30px, 5vw, 52px)",
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: "-0.045em",
  },
  heroText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.7,
    opacity: 0.82,
    maxWidth: 760,
  },
  heroCount: {
    fontSize: 13,
    fontWeight: 800,
    opacity: 0.72,
  },
  backLink: {
    color: "inherit",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
    opacity: 0.82,
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    opacity: 0.68,
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  card: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    background: "rgba(255,255,255,0.03)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  cardMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  cardActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  sourcePill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
  },
  summaryOnlyPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid rgba(255,218,128,0.28)",
    background: "rgba(255,196,81,0.14)",
    color: "rgba(255,232,181,0.96)",
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
  },
  savedPill: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.14)",
    padding: "7px 11px",
    fontSize: 11,
    fontWeight: 800,
  },
  cardLink: {
    color: "inherit",
    textDecoration: "none",
  },
  cardTitle: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 32px)",
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  },
  cardSubmeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 13,
    fontWeight: 700,
    opacity: 0.72,
  },
  summary: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.75,
    opacity: 0.92,
  },
  insightBox: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  insightLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.68,
  },
  insightText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    opacity: 0.88,
  },
  footerRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
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
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  emptyCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 24,
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },
  emptyText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
    opacity: 0.8,
  },
  messageCard: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 20,
    background: "rgba(255,255,255,0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  messageTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
  },
  messageText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    opacity: 0.82,
  },
  heroSkeleton: {
    minHeight: 220,
    borderRadius: 28,
    background: "rgba(255,255,255,0.05)",
  },
  cardSkeleton: {
    minHeight: 220,
    borderRadius: 22,
    background: "rgba(255,255,255,0.05)",
  },
};
