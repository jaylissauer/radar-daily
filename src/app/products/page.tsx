import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { ExternalLink } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  official_url: string | null;
  category: string | null;
  company_id: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
};

type LinkedArticleRow = {
  product_id: string;
  article: {
    title: string;
  } | null;
};

const useCaseByProduct: Record<string, string> = {
  ChatGPT:
    "Useful when deciding how to handle daily research, drafting, brainstorming, and internal assistant workflows.",
  Sora:
    "Useful when deciding how to prototype creative concepts, campaign ideas, and visual storytelling directions from text prompts.",
  Claude:
    "Useful when deciding how to handle long-document analysis, structured writing, and research-heavy internal tasks.",
  Gemini:
    "Useful when deciding how to support productivity workflows, multimodal tasks, and workspace assistance.",
  "Vertex AI":
    "Useful when deciding how to build, deploy, and manage AI features inside products without building the full platform layer yourself.",
  "Inference Endpoints":
    "Useful when deciding how to deploy open models into apps and internal tools without standing up the full infrastructure manually.",
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanupDescription(value: string | null) {
  if (!value) return "";

  const cleaned = normalizeWhitespace(value);
  if (!cleaned) return "";

  const matches = cleaned.match(/[^.!?]+[.!?]+(?:["')\]]+)?/g) ?? [];
  const sentences = matches
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 18);

  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(" ");
  }

  return cleaned;
}

function buildProductFallbackDescription(product: ProductRow, companyName: string | null) {
  const category = product.category?.trim();

  if (companyName && category) {
    return `${product.name} is tracked under ${companyName} in the ${category.toLowerCase()} category within AI Signal.`;
  }

  if (companyName) {
    return `${product.name} is tracked under ${companyName} within the AI Signal product directory.`;
  }

  if (category) {
    return `${product.name} is tracked in the ${category.toLowerCase()} category within the AI Signal product directory.`;
  }

  return `${product.name} is tracked in the AI Signal product directory.`;
}

function buildDynamicUseCase(
  product: ProductRow,
  companyName: string | null,
  relatedCount: number
) {
  const exact = useCaseByProduct[product.name];
  if (exact) return exact;

  const category = product.category?.trim()?.toLowerCase();

  if (category?.includes("model")) {
    return `${product.name} helps you decide whether this model is worth evaluating for quality, speed, and fit inside your workflow or product.`;
  }

  if (category?.includes("assistant")) {
    return `${product.name} helps you decide whether this assistant fits research, drafting, support, or internal productivity use cases.`;
  }

  if (category?.includes("video")) {
    return `${product.name} helps you decide whether this product is useful for creative generation, campaign ideation, or rapid visual prototyping.`;
  }

  if (category?.includes("image")) {
    return `${product.name} helps you decide whether this product fits image generation, concept development, or design exploration workflows.`;
  }

  if (category?.includes("enterprise")) {
    return `${product.name} helps you decide whether this product is better suited to team workflows, internal deployment, and business operations.`;
  }

  if (category?.includes("cloud")) {
    return `${product.name} helps you decide whether this platform is the right fit for building, deploying, or scaling AI features in production.`;
  }

  if (companyName && relatedCount > 0) {
    return `${product.name} helps you decide whether this ${companyName} product is worth deeper evaluation based on how often it appears across tracked AI Signal coverage.`;
  }

  if (companyName) {
    return `${product.name} helps you decide where it fits within the broader ${companyName} product ecosystem and whether it is relevant to your workflow.`;
  }

  return `${product.name} helps you decide whether this product deserves deeper evaluation for your workflow, stack, or research list.`;
}

export default async function ProductsPage() {
  const [{ data: products }, { data: companies }, { data: articleProducts }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, description, official_url, category, company_id")
        .order("name", { ascending: true }),
      supabase.from("companies").select("id, name"),
      supabase.from("article_products").select(`
        product_id,
        article:articles (
          title
        )
      `),
    ]);

  const productRows = (products ?? []) as ProductRow[];
  const companyRows = (companies ?? []) as CompanyRow[];
  const linkedArticles = ((articleProducts ?? []) as unknown) as LinkedArticleRow[];

  return (
    <AppShell
      title="Products"
      subtitle="Browse tools, models, and platforms with written examples of how they could be used."
    >
      <section className="grid grid-cols-1 gap-4">
        {productRows.map((product) => {
          const company = companyRows.find((item) => item.id === product.company_id);
          const relatedCount = linkedArticles.filter(
            (item) => item.product_id === product.id
          ).length;

          const description =
            cleanupDescription(product.description) ||
            buildProductFallbackDescription(product, company?.name ?? null);

          const useCase = buildDynamicUseCase(
            product,
            company?.name ?? null,
            relatedCount
          );

          return (
            <article
              key={product.id}
              className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_30px_rgba(2,8,23,0.25)] sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-100">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1">
                  {company?.name ?? "Unknown company"}
                </span>
                <span className="text-white/35">•</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-white/70">
                  {product.category ?? "General"}
                </span>
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-[1.3rem]">
                {product.name}
              </h2>

              <p className="text-sm leading-7 text-white/70 sm:text-[15px]">
                {description}
              </p>

              <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/75">
                  What this helps you decide
                </p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {useCase}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {product.official_url ? (
                  <a
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                    href={product.official_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Official page</span>
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <button
                    className="inline-flex min-h-10 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/40"
                    type="button"
                    disabled
                  >
                    Official page
                  </button>
                )}

                <button
                  className="inline-flex min-h-10 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                  type="button"
                >
                  {relatedCount} related article{relatedCount === 1 ? "" : "s"}
                </button>
              </div>
            </article>
          );
        })}

        {productRows.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-white/70">
            <h3 className="text-base font-semibold text-white">No products yet</h3>
            <p className="mt-2 text-sm leading-6">
              Add products to the database and they will appear here automatically.
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}