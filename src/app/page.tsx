"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SourceBrandMark } from "@/components/source-brand-mark";
import { supabase } from "@/lib/supabase";

type SourceChip = {
  id: string;
  name: string;
  slug: string | null;
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

type FeedArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  use_case_example: string | null;
  published_at: string | null;
  image_url: string | null;
  article_url: string | null;
  source_name: string | null;
  source_url: string | null;
  article_body: string | null;
  is_saved: boolean;
  companies: CompanyChip[];
  products: ProductChip[];
};

type FeedState = {
  articles: FeedArticle[];
  sources: SourceChip[];
  companies: CompanyChip[];
  products: ProductChip[];
};

type ArticleCompanyRow = {
  article_id: string;
  company_id: string;
};

type ArticleProductRow = {
  article_id: string;
  product_id: string;
};

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  use_case_example: string | null;
  published_at: string | null;
  image_url: string | null;
  article_url: string | null;
  source_name: string | null;
  source_url: string | null;
  article_body: string | null;
  is_saved: boolean | null;
};

type CompanyRow = {
  id: string;
  name: string;
  slug: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
};

type BrandStyle = {
  key: string;
  name: string;
  background: string;
  glow: string;
};

const PUBLIC_ALLOWED_SOURCES = new Set([
  "OpenAI",
  "Anthropic",
  "Google",
  "Hugging Face",
  "Meta",
  "Microsoft",
  "AWS",
  "NVIDIA",
  "xAI",
  "TechCrunch",
  "Reuters",
  "VentureBeat",
  "The Verge",
]);

export default function HomePage() {
  const [data, setData] = useState<FeedState>({
    articles: [],
    sources: [],
    companies: [],
    products: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [
          articlesResponse,
          companiesResponse,
          productsResponse,
          articleCompaniesResponse,
          articleProductsResponse,
        ] = await Promise.all([
          supabase
            .from("articles")
            .select(
              "id, slug, title, summary, why_it_matters, use_case_example, published_at, image_url, article_url, source_name, source_url, article_body, is_saved"
            )
            .order("published_at", { ascending: false })
            .limit(160),

          supabase
            .from("companies")
            .select("id, name, slug")
            .order("name", { ascending: true }),

          supabase
            .from("products")
            .select("id, name, slug")
            .order("name", { ascending: true }),

          supabase.from("article_companies").select("article_id, company_id"),
          supabase.from("article_products").select("article_id, product_id"),
        ]);

        if (articlesResponse.error) throw articlesResponse.error;
        if (companiesResponse.error) throw companiesResponse.error;
        if (productsResponse.error) throw productsResponse.error;
        if (articleCompaniesResponse.error) throw articleCompaniesResponse.error;
        if (articleProductsResponse.error) throw articleProductsResponse.error;

        const articleRows = (articlesResponse.data ?? []) as ArticleRow[];
        const companyRows = (companiesResponse.data ?? []) as CompanyRow[];
        const productRows = (productsResponse.data ?? []) as ProductRow[];
        const articleCompanyRows = (articleCompaniesResponse.data ?? []) as ArticleCompanyRow[];
        const articleProductRows = (articleProductsResponse.data ?? []) as ArticleProductRow[];

        const companiesById = new Map<string, CompanyChip>();
        const productsById = new Map<string, ProductChip>();

        for (const company of companyRows) {
          companiesById.set(company.id, {
            id: company.id,
            name: decodeHtmlEntities(company.name),
            slug: company.slug ?? null,
          });
        }

        for (const product of productRows) {
          productsById.set(product.id, {
            id: product.id,
            name: decodeHtmlEntities(product.name),
            slug: product.slug ?? null,
          });
        }

        const companiesByArticleId = new Map<string, CompanyChip[]>();
        const productsByArticleId = new Map<string, ProductChip[]>();

        for (const row of articleCompanyRows) {
          const company = companiesById.get(row.company_id);
          if (!company) continue;

          const existing = companiesByArticleId.get(row.article_id) ?? [];
          existing.push(company);
          companiesByArticleId.set(row.article_id, dedupeById(existing));
        }

        for (const row of articleProductRows) {
          const product = productsById.get(row.product_id);
          if (!product) continue;

          const existing = productsByArticleId.get(row.article_id) ?? [];
          existing.push(product);
          productsByArticleId.set(row.article_id, dedupeById(existing));
        }

        const publicArticleRows = articleRows.filter((article) =>
          PUBLIC_ALLOWED_SOURCES.has(article.source_name ?? "")
        );

        const sourceMap = new Map<string, SourceChip>();

        for (const article of publicArticleRows) {
          const sourceName = decodeHtmlEntities((article.source_name ?? "").trim());
          if (!sourceName) continue;

          const id = slugify(sourceName);

          if (!sourceMap.has(id)) {
            sourceMap.set(id, {
              id,
              name: sourceName,
              slug: id,
            });
          }
        }

        const articles: FeedArticle[] = publicArticleRows.map((article) => ({
          id: article.id,
          slug: article.slug,
          title: decodeHtmlEntities(article.title),
          summary: article.summary ? decodeHtmlEntities(article.summary) : null,
          why_it_matters: article.why_it_matters
            ? decodeHtmlEntities(article.why_it_matters)
            : null,
          use_case_example: article.use_case_example
            ? decodeHtmlEntities(article.use_case_example)
            : null,
          published_at: article.published_at ?? null,
          image_url: article.image_url ?? null,
          article_url: article.article_url ?? null,
          source_name: article.source_name ? decodeHtmlEntities(article.source_name) : null,
          source_url: article.source_url ?? null,
          article_body: article.article_body ? decodeHtmlEntities(article.article_body) : null,
          is_saved: Boolean(article.is_saved),
          companies: companiesByArticleId.get(article.id) ?? [],
          products: productsByArticleId.get(article.id) ?? [],
        }));

        if (!cancelled) {
          setData({
            articles,
            sources: Array.from(sourceMap.values()).sort((a, b) =>
              a.name.localeCompare(b.name)
            ),
            companies: companyRows.map((item) => ({
              id: item.id,
              name: decodeHtmlEntities(item.name),
              slug: item.slug ?? null,
            })),
            products: productRows.map((item) => ({
              id: item.id,
              name: decodeHtmlEntities(item.name),
              slug: item.slug ?? null,
            })),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load feed.");
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

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const base = data.articles.filter((article) => {
      const articleSourceId = slugify(article.source_name ?? "");

      const sourceMatch =
        sourceFilter === "all" || articleSourceId === sourceFilter;

      const companyMatch =
        companyFilter === "all" ||
        article.companies.some((company) => company.id === companyFilter);

      const productMatch =
        productFilter === "all" ||
        article.products.some((product) => product.id === productFilter);

      const textMatch =
        query.length === 0 ||
        article.title.toLowerCase().includes(query) ||
        (article.summary ?? "").toLowerCase().includes(query) ||
        (article.why_it_matters ?? "").toLowerCase().includes(query) ||
        (article.use_case_example ?? "").toLowerCase().includes(query) ||
        (article.source_name ?? "").toLowerCase().includes(query) ||
        article.companies.some((company) =>
          company.name.toLowerCase().includes(query)
        ) ||
        article.products.some((product) =>
          product.name.toLowerCase().includes(query)
        );

      return sourceMatch && companyMatch && productMatch && textMatch;
    });

    const shouldDiversify =
      sourceFilter === "all" &&
      companyFilter === "all" &&
      productFilter === "all" &&
      query.length === 0;

    return shouldDiversify ? diversifyEditorialFeed(base) : base;
  }, [companyFilter, data.articles, productFilter, searchQuery, sourceFilter]);

  const featuredArticles = filteredArticles.slice(0, 3);
  const remainingArticles = filteredArticles.slice(3);
  const savedArticlesCount = data.articles.filter((article) => article.is_saved).length;
  const savedArticlesLabel =
    savedArticlesCount === 1
      ? "Saved articles (1)"
      : `Saved articles (${savedArticlesCount})`;

  return (
    <>
      <main className="page-shell">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "12px",
          }}
        >
          <Link
            href="/saved"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "12px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              color: "inherit",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
            }}
          >
            {savedArticlesLabel}
          </Link>
        </div>

        <section className="hero-grid">
          <Link href="/products" className="hero-copy">
            <span className="eyebrow">RADAR DAILY</span>
            <h1 className="hero-title">
              Daily AI news, organised so you can decide faster.
            </h1>
            <p className="hero-text">
              Track what matters across companies, products, and sources in one
              cleaner, more visual feed built for fast scanning on desktop and mobile.
            </p>
          </Link>

          <div className="hero-stats">
            <div className="hero-stat-card-wrap">
              <StatCard label="Articles loaded" value={String(data.articles.length)} />
            </div>

            <Link href="/companies" className="hero-stat-card-wrap hero-stat-card-link">
              <StatCard label="Companies tracked" value={String(data.companies.length)} />
            </Link>

            <Link href="/products" className="hero-stat-card-wrap hero-stat-card-link">
              <StatCard label="Products tracked" value={String(data.products.length)} />
            </Link>
          </div>
        </section>

        <section className="surface-card controls-card">
          <div className="search-wrap">
            <label htmlFor="feed-search" className="search-label">
              Search the feed
            </label>
            <input
              id="feed-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search titles, summaries, companies, or products"
              className="search-input"
            />
          </div>

          <div className="filter-block">
            <FilterRow
              label="Sources"
              items={[
                { id: "all", name: "All sources" },
                ...data.sources.map((item) => ({ id: item.id, name: item.name })),
              ]}
              activeId={sourceFilter}
              onSelect={setSourceFilter}
            />

            <FilterRow
              label="Companies"
              items={[
                { id: "all", name: "All companies" },
                ...data.companies.map((item) => ({ id: item.id, name: item.name })),
              ]}
              activeId={companyFilter}
              onSelect={setCompanyFilter}
            />

            <FilterRow
              label="Products"
              items={[
                { id: "all", name: "All products" },
                ...data.products.map((item) => ({ id: item.id, name: item.name })),
              ]}
              activeId={productFilter}
              onSelect={setProductFilter}
            />
          </div>

          <div className="active-filters">
            <span className="results-count">
              {loading
                ? "Loading…"
                : `${filteredArticles.length} article${
                    filteredArticles.length === 1 ? "" : "s"
                  }`}
            </span>

            {(sourceFilter !== "all" ||
              companyFilter !== "all" ||
              productFilter !== "all" ||
              searchQuery.trim().length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSourceFilter("all");
                  setCompanyFilter("all");
                  setProductFilter("all");
                  setSearchQuery("");
                }}
                className="clear-button"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {error ? (
          <section className="surface-card message-card">
            <h2 className="message-title">Feed unavailable</h2>
            <p className="message-text">{error}</p>
          </section>
        ) : null}

        {loading ? (
          <section className="article-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <article key={index} className="surface-card skeleton-card">
                <div className="skeleton-image" />
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
                <div className="skeleton-line long" />
                <div className="skeleton-line medium" />
              </article>
            ))}
          </section>
        ) : filteredArticles.length === 0 ? (
          <section className="surface-card message-card">
            <h2 className="message-title">No matching articles</h2>
            <p className="message-text">
              Try removing a filter or broadening your search.
            </p>
          </section>
        ) : (
          <>
            <section className="featured-grid">
              {featuredArticles.map((article, index) => (
                <FeaturedArticleCard
                  key={article.id}
                  article={article}
                  large={index === 0}
                />
              ))}
            </section>

            {remainingArticles.length > 0 ? (
              <section className="article-grid">
                {remainingArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </section>
            ) : null}
          </>
        )}
      </main>

      <style jsx>{`
        .page-shell {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: 20px 16px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-sizing: border-box;
        }

        .surface-card {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.03);
          box-sizing: border-box;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.95fr);
          gap: 16px;
          align-items: stretch;
        }

        .hero-copy {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 24px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.02)
          );
        }

        .eyebrow {
          display: inline-block;
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.7;
        }

        .hero-title {
          margin: 0;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .hero-text {
          margin: 14px 0 0;
          font-size: 16px;
          line-height: 1.6;
          opacity: 0.82;
          max-width: 760px;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 12px;
        }

        .hero-stat-card-wrap {
          display: block;
          min-width: 0;
        }

        .hero-stat-card-link {
          color: inherit;
          text-decoration: none;
        }


        .controls-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow: hidden;
        }

        .search-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .search-label {
          font-size: 13px;
          font-weight: 700;
          opacity: 0.78;
        }

        .search-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          padding: 14px 16px;
          font-size: 15px;
          color: inherit;
          outline: none;
          box-sizing: border-box;
        }

        .filter-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }

        .active-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .results-count {
          font-size: 14px;
          font-weight: 700;
          opacity: 0.82;
        }

        .clear-button {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: inherit;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .message-card {
          padding: 24px;
        }

        .message-title {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .message-text {
          margin: 10px 0 0;
          font-size: 15px;
          line-height: 1.6;
          opacity: 0.8;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr 1fr;
          gap: 16px;
          align-items: stretch;
        }

        .article-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 16px;
        }

        .skeleton-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-image {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
        }

        .skeleton-line {
          height: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
        }

        .skeleton-line.short {
          width: 35%;
          height: 12px;
        }

        .skeleton-line.long {
          width: 100%;
        }

        .skeleton-line.medium {
          width: 68%;
        }

        @media (max-width: 1100px) {
          .featured-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }

          .featured-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .page-shell {
            padding: 14px 12px 28px;
            gap: 14px;
          }

          .surface-card,
          .hero-copy {
            border-radius: 20px;
          }

          .hero-copy,
          .controls-card,
          .message-card,
          .skeleton-card {
            padding: 16px;
          }

          .hero-title {
            font-size: 32px;
            line-height: 1.04;
          }

          .hero-text {
            font-size: 14px;
            line-height: 1.55;
          }

          .article-grid,
          .featured-grid,
          .hero-stats {
            gap: 12px;
          }

          .search-input {
            font-size: 16px;
          }

          .active-filters {
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}

function FilterRow({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string;
  items: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="filter-row-wrap">
      <div className="filter-label">{label}</div>
      <div className="filter-scroller">
        {items.map((item) => {
          const active = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`filter-chip${active ? " active" : ""}`}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .filter-row-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 700;
          opacity: 0.78;
        }

        .filter-scroller {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 2px;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }

        .filter-chip {
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          color: inherit;
          cursor: pointer;
        }

        .filter-chip.active {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.22);
        }

        @media (max-width: 640px) {
          .filter-chip {
            padding: 10px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function FeaturedArticleCard({
  article,
  large,
}: {
  article: FeedArticle;
  large: boolean;
}) {
  const brand = getArticleBranding(article);

  return (
    <article className={`featured-card surface ${large ? "large" : ""}`}>
      <Link href={`/articles/${article.slug}`} className="featured-card-link">
        <div
          className="featured-cover"
          style={{
            background: brand.background,
          }}
        >
          <div
            className="featured-glow"
            style={{
              background: brand.glow,
            }}
          />
          <div className="featured-cover-pattern" />
          <div className="featured-cover-overlay" />

          <div className="featured-logo-stage">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "8px",
                width: "100%",
              }}
            >
              {isSummaryOnlyArticle(article) ? (
                <span
                  title="Summary only"
                  aria-label="Summary only"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 218, 128, 0.22)",
                    background: "rgba(255, 196, 81, 0.14)",
                    color: "rgba(255, 232, 181, 0.96)",
                    fontSize: "11px",
                    fontWeight: 900,
                    lineHeight: 1,
                    flex: "0 0 auto",
                  }}
                >
                  ≡
                </span>
              ) : null}

              <SourceBrandMark source={article.source_name} />
            </div>
          </div>

          <div className="featured-top-row">
            {article.products[0]?.name ? (
              <span className="featured-source-pill">{article.products[0].name}</span>
            ) : null}
          </div>

          <div className="featured-bottom">
            <div className="featured-date">{formatDate(article.published_at)}</div>
            <h2 className={`featured-title${large ? " large" : ""}`}>
              {article.title}
            </h2>

            <div className="featured-tag-row" />
          </div>
        </div>

        <div className="featured-body">
          <p className="featured-summary clamp-3">{article.summary ?? "Open article"}</p>
          {article.why_it_matters ? (
            <div className="inline-why">
              <span className="inline-why-label">Why it matters</span>
              <span className="inline-why-text clamp-3">{article.why_it_matters}</span>
            </div>
          ) : null}
        </div>
      </Link>

      <style jsx>{`
        .surface {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 26px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          min-width: 0;
        }

        .featured-card.large {
          grid-row: span 2;
        }

        .featured-card-link {
          display: flex;
          flex-direction: column;
          height: 100%;
          color: inherit;
          text-decoration: none;
        }

        .featured-cover {
          position: relative;
          min-height: 260px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 18px;
          box-sizing: border-box;
        }

        .featured-glow {
          position: absolute;
          width: 340px;
          height: 340px;
          right: -60px;
          top: -80px;
          filter: blur(10px);
        }

        .featured-cover-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          background-image: linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        .featured-cover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.04) 0%,
            rgba(0, 0, 0, 0.1) 32%,
            rgba(0, 0, 0, 0.7) 100%
          );
        }

        .featured-logo-stage {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 3;
          pointer-events: none;
        }

        .featured-top-row {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          padding-right: 132px;
          min-height: 40px;
        }

        .featured-source-pill,
        .saved-pill,
        .cover-tag,
        .cover-tag.muted {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          white-space: nowrap;
        }

        .featured-source-pill {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(10, 16, 28, 0.3);
          backdrop-filter: blur(10px);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          max-width: 100%;
        }

        .saved-pill {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
        }

        .featured-bottom {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .featured-date {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          opacity: 0.84;
        }

        .featured-title {
          margin: 0;
          font-size: 28px;
          line-height: 1.06;
          font-weight: 800;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .featured-title.large {
          font-size: 38px;
        }

        .featured-tag-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cover-tag {
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .cover-tag.muted {
          background: rgba(9, 16, 28, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .featured-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
          box-sizing: border-box;
        }

        .featured-summary {
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
          opacity: 0.84;
        }

        .inline-why {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .inline-why-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.68;
        }

        .inline-why-text {
          font-size: 14px;
          line-height: 1.55;
          opacity: 0.78;
        }

        .clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .surface {
            border-radius: 20px;
          }

          .featured-cover {
            min-height: 220px;
            padding: 14px;
          }

          .featured-logo-stage {
            top: 14px;
            right: 14px;
          }

          .featured-top-row {
            padding-right: 108px;
            min-height: 34px;
          }

          .featured-title,
          .featured-title.large {
            font-size: 24px;
            line-height: 1.05;
          }

          .featured-body {
            padding: 14px;
          }

          .featured-summary {
            font-size: 14px;
            line-height: 1.55;
          }

          .inline-why-text {
            font-size: 13px;
          }
        }
      `}</style>
    </article>
  );
}

function ArticleCard({ article }: { article: FeedArticle }) {
  const brand = getArticleBranding(article);

  return (
    <article className="article-card surface">
      <Link href={`/articles/${article.slug}`} className="article-card-link">
        <div
          className="card-image-wrap"
          style={{
            background: brand.background,
          }}
        >
          <div
            className="card-glow"
            style={{
              background: brand.glow,
            }}
          />
          <div className="card-image-pattern" />
          <div className="card-image-overlay" />

          <div className="card-logo-stage">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "8px",
                width: "100%",
              }}
            >
              {isSummaryOnlyArticle(article) ? (
                <span
                  title="Summary only"
                  aria-label="Summary only"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 218, 128, 0.22)",
                    background: "rgba(255, 196, 81, 0.14)",
                    color: "rgba(255, 232, 181, 0.96)",
                    fontSize: "11px",
                    fontWeight: 900,
                    lineHeight: 1,
                    flex: "0 0 auto",
                  }}
                >
                  ≡
                </span>
              ) : null}

              <SourceBrandMark source={article.source_name} />
            </div>
          </div>

          <div className="card-image-inner">
            <div className="card-image-meta">
              {article.products[0]?.name ? (
                <span className="source-pill">{article.products[0].name}</span>
              ) : null}
            </div>

            <div className="card-image-bottom">
              <div className="card-date-text">{formatDate(article.published_at)}</div>
              <h2 className="card-title-overlay clamp-3">{article.title}</h2>

              {null}
            </div>
          </div>
        </div>

        <div className="card-body">
          <p className="card-summary clamp-3">{article.summary ?? "Open article"}</p>

          {article.why_it_matters ? (
            <div className="compact-insight-box">
              <div className="compact-insight-label">Why it matters</div>
              <p className="compact-insight-text clamp-3">{article.why_it_matters}</p>
            </div>
          ) : null}

          <div className="card-footer">
            <span className="read-more">Open article</span>
          </div>
        </div>
      </Link>

      <style jsx>{`
        .surface {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          min-width: 0;
          box-sizing: border-box;
        }

        .article-card-link {
          display: flex;
          flex-direction: column;
          height: 100%;
          color: inherit;
          text-decoration: none;
        }

        .card-image-wrap {
          position: relative;
          aspect-ratio: 16 / 10;
          width: 100%;
          overflow: hidden;
        }

        .card-glow {
          position: absolute;
          width: 240px;
          height: 240px;
          right: -50px;
          top: -40px;
          filter: blur(8px);
        }

        .card-image-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          background-image: linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        .card-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.04) 0%,
            rgba(0, 0, 0, 0.1) 38%,
            rgba(0, 0, 0, 0.72) 100%
          );
        }

        .card-logo-stage {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 3;
          pointer-events: none;
        }

        .card-image-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .card-image-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-right: 126px;
          min-height: 36px;
        }

        .source-pill,
        .saved-pill,
        .cover-tag,
        .cover-tag.muted {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          white-space: nowrap;
        }

        .source-pill {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(10, 16, 28, 0.3);
          backdrop-filter: blur(10px);
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
          max-width: 100%;
        }

        .saved-pill {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(10px);
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
        }

        .card-image-bottom {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .card-date-text {
          font-size: 12px;
          font-weight: 700;
          opacity: 0.84;
        }

        .card-title-overlay {
          margin: 0;
          font-size: 20px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-wrap: balance;
        }

        .tag-section {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cover-tag {
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .cover-tag.muted {
          background: rgba(9, 16, 28, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          box-sizing: border-box;
          min-width: 0;
        }

        .card-summary {
          margin: 0;
          font-size: 15px;
          line-height: 1.58;
          opacity: 0.84;
        }

        .compact-insight-box {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 14px;
        }

        .compact-insight-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.68;
          margin-bottom: 6px;
        }

        .compact-insight-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          opacity: 0.8;
        }

        .card-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .read-more {
          font-size: 13px;
          font-weight: 800;
          opacity: 0.92;
        }

        .clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .surface {
            border-radius: 20px;
          }

          .card-image-inner {
            padding: 14px;
          }

          .card-logo-stage {
            top: 12px;
            right: 12px;
          }

          .card-image-meta {
            padding-right: 108px;
            min-height: 34px;
          }

          .card-title-overlay {
            font-size: 18px;
            line-height: 1.08;
          }

          .card-body {
            padding: 14px;
          }

          .card-summary,
          .compact-insight-text {
            font-size: 14px;
            line-height: 1.5;
          }

          .compact-insight-box {
            padding: 12px;
          }
        }
      `}</style>
    </article>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>

      <style jsx>{`
        .stat-card {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          min-height: 96px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .stat-value {
          font-size: 30px;
          font-weight: 800;
          line-height: 1;
        }

        .stat-label {
          font-size: 13px;
          opacity: 0.72;
        }

        @media (max-width: 640px) {
          .stat-card {
            padding: 16px;
            min-height: 88px;
          }

          .stat-value {
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
}

function diversifyEditorialFeed(articles: FeedArticle[]) {
  const pool = [...articles];
  const result: FeedArticle[] = [];

  while (pool.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      const score = scoreCandidate(candidate, result, i);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    result.push(pool[bestIndex]);
    pool.splice(bestIndex, 1);
  }

  return result;
}

function scoreCandidate(
  candidate: FeedArticle,
  placed: FeedArticle[],
  poolIndex: number
) {
  let score = 0;

  const recencyScore = getPublishedTime(candidate.published_at) / 1000000000000;
  score += recencyScore * 8;

  const last1 = placed[placed.length - 1];
  const last2 = placed[placed.length - 2];
  const last3 = placed[placed.length - 3];

  const candidateSource = slugify(candidate.source_name ?? "unknown");
  const candidateCompanies = candidate.companies.map((company) => company.id);

  if (last1) {
    const lastSource = slugify(last1.source_name ?? "unknown");
    if (candidateSource === lastSource) score -= 5.5;
    if (sharesCompany(candidateCompanies, last1.companies)) score -= 3.75;
  }

  if (last2) {
    const lastSource = slugify(last2.source_name ?? "unknown");
    if (candidateSource === lastSource) score -= 2.25;
    if (sharesCompany(candidateCompanies, last2.companies)) score -= 1.5;
  }

  if (last3) {
    const lastSource = slugify(last3.source_name ?? "unknown");
    if (candidateSource === lastSource) score -= 1;
    if (sharesCompany(candidateCompanies, last3.companies)) score -= 0.75;
  }

  if (candidate.companies.length > 0) score += 0.35;
  if (candidate.products.length > 0) score += 0.2;

  score += seededJitter(candidate.id) * 1.6;
  score -= poolIndex * 0.015;

  return score;
}

function sharesCompany(candidateCompanyIds: string[], otherCompanies: CompanyChip[]) {
  if (candidateCompanyIds.length === 0 || otherCompanies.length === 0) return false;
  const set = new Set(candidateCompanyIds);
  return otherCompanies.some((company) => set.has(company.id));
}

function seededJitter(input: string) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = ((hash >>> 0) % 1000) / 1000;
  return normalized - 0.5;
}


function isSummaryOnlyArticle(article: FeedArticle) {
  return !String(article.article_body ?? "").trim();
}

function getLeadLabel(article: FeedArticle) {
  return article.companies[0]?.name ?? article.source_name ?? "Unknown";
}

function getArticleBranding(article: FeedArticle) {
  const companyName = article.companies[0]?.name ?? null;
  const sourceName = article.source_name ?? null;
  return getBrandStyle(companyName, sourceName);
}

function getBrandStyle(companyName: string | null, sourceName: string | null): BrandStyle {
  const company = (companyName ?? "").toLowerCase();
  const source = (sourceName ?? "").toLowerCase();

  if (company.includes("openai") || source.includes("openai")) {
    return {
      key: "openai",
      name: "OpenAI",
      background:
        "linear-gradient(135deg, rgba(7,16,22,1) 0%, rgba(10,61,48,1) 56%, rgba(31,148,108,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(84,255,184,0.34) 0%, rgba(84,255,184,0) 72%)",
    };
  }

  if (company.includes("anthropic") || source.includes("anthropic")) {
    return {
      key: "anthropic",
      name: "Anthropic",
      background:
        "linear-gradient(135deg, rgba(28,18,12,1) 0%, rgba(96,56,18,1) 58%, rgba(201,133,52,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(255,202,120,0.32) 0%, rgba(255,202,120,0) 72%)",
    };
  }

  if (company.includes("google") || source.includes("google")) {
    return {
      key: "google",
      name: "Google",
      background:
        "linear-gradient(135deg, rgba(15,21,42,1) 0%, rgba(20,69,153,1) 45%, rgba(144,72,209,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(123,167,255,0.34) 0%, rgba(123,167,255,0) 72%)",
    };
  }

  if (company.includes("meta") || source.includes("meta") || company.includes("facebook")) {
    return {
      key: "meta",
      name: "Meta",
      background:
        "linear-gradient(135deg, rgba(7,18,49,1) 0%, rgba(13,61,160,1) 54%, rgba(70,135,255,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(104,177,255,0.34) 0%, rgba(104,177,255,0) 72%)",
    };
  }

  if (company.includes("hugging face") || source.includes("hugging face")) {
    return {
      key: "huggingface",
      name: "Hugging Face",
      background:
        "linear-gradient(135deg, rgba(38,24,6,1) 0%, rgba(128,78,10,1) 54%, rgba(238,176,63,1) 100%)",
      glow:
        "radial-gradient(circle at center, rgba(255,227,131,0.34) 0%, rgba(255,227,131,0) 72%)",
    };
  }

  return {
    key: "fallback",
    name: companyName || sourceName || "AI",
    background:
      "linear-gradient(135deg, rgba(16,24,44,1) 0%, rgba(34,53,99,1) 52%, rgba(92,121,209,1) 100%)",
    glow:
      "radial-gradient(circle at center, rgba(142,170,255,0.28) 0%, rgba(142,170,255,0) 72%)",
  };
}

function getPublishedTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function decodeHtmlEntities(value: string) {
  return String(value || "")
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
