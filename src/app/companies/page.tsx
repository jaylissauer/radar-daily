import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { ExternalLink } from "lucide-react";

type CompanyRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  website_url: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  company_id: string | null;
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

function buildCompanyFallbackDescription(
  company: CompanyRow,
  companyProducts: ProductRow[]
) {
  const category = company.category?.trim();
  const productNames = companyProducts
    .map((product) => product.name.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (category && productNames.length >= 3) {
    return `${company.name} is tracked in AI Signal as a ${category.toLowerCase()} company connected to products such as ${productNames[0]}, ${productNames[1]}, and ${productNames[2]}.`;
  }

  if (category && productNames.length === 2) {
    return `${company.name} is tracked in AI Signal as a ${category.toLowerCase()} company connected to products such as ${productNames[0]} and ${productNames[1]}.`;
  }

  if (category && productNames.length === 1) {
    return `${company.name} is tracked in AI Signal as a ${category.toLowerCase()} company connected to products such as ${productNames[0]}.`;
  }

  if (category) {
    return `${company.name} is tracked in AI Signal as a ${category.toLowerCase()} company. More company description detail will appear here as the directory expands.`;
  }

  if (productNames.length >= 3) {
    return `${company.name} is connected to products such as ${productNames[0]}, ${productNames[1]}, and ${productNames[2]} in the AI Signal directory.`;
  }

  if (productNames.length === 2) {
    return `${company.name} is connected to products such as ${productNames[0]} and ${productNames[1]} in the AI Signal directory.`;
  }

  if (productNames.length === 1) {
    return `${company.name} is connected to ${productNames[0]} in the AI Signal directory.`;
  }

  return `${company.name} is being tracked in AI Signal and will gain a richer company description as more source data is connected.`;
}

export default async function CompaniesPage() {
  const [{ data: companies }, { data: products }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, category, description, website_url")
      .order("name", { ascending: true }),
    supabase.from("products").select("id, name, company_id"),
  ]);

  const companyRows = (companies ?? []) as CompanyRow[];
  const productRows = (products ?? []) as ProductRow[];

  return (
    <AppShell
      title="Companies"
      subtitle="Explore AI companies and their offerings so you can discover tools beyond the daily headlines."
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {companyRows.map((company) => {
          const companyProducts = productRows.filter(
            (product) => product.company_id === company.id
          );

          const cleanedDescription = cleanupDescription(company.description);
          const description =
            cleanedDescription ||
            buildCompanyFallbackDescription(company, companyProducts);

          return (
            <article
              key={company.id}
              className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_30px_rgba(2,8,23,0.25)] sm:p-6"
            >
              <div className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
                {company.category ?? "Category coming soon"}
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]">
                {company.name}
              </h2>

              <p className="text-sm leading-7 text-white/70 sm:text-[15px]">
                {description}
              </p>

              <div className="flex flex-wrap gap-2">
                {companyProducts.map((product) => (
                  <span
                    key={product.id}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/75"
                  >
                    {product.name}
                  </span>
                ))}

                {companyProducts.length === 0 ? (
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
                    No products yet
                  </span>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap gap-3">
                <button
                  className="inline-flex min-h-10 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                  type="button"
                >
                  Company profile
                </button>

                {company.website_url ? (
                  <a
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Official site</span>
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <button
                    className="inline-flex min-h-10 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/40"
                    type="button"
                    disabled
                  >
                    Official site
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {companyRows.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-white/70">
            <h3 className="text-base font-semibold text-white">No companies yet</h3>
            <p className="mt-2 text-sm leading-6">
              Add companies to the database and they will appear here automatically.
            </p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}