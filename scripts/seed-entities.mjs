import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const DRY_RUN = String(process.env.SEED_DRY_RUN || "false") === "true";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables.");
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

const companiesSeed = [
  { name: "OpenAI", category: "AI Labs" },
  { name: "Anthropic", category: "AI Labs" },
  { name: "Google", category: "Big Tech" },
  { name: "Meta", category: "Big Tech" },
  { name: "Microsoft", category: "Big Tech" },
  { name: "Amazon Web Services", category: "Cloud / AI" },
  { name: "AWS", category: "Cloud / AI" },
  { name: "NVIDIA", category: "Semiconductors / AI" },
  { name: "Hugging Face", category: "Open Source / AI" },
  { name: "Perplexity", category: "AI Search" },
  { name: "Mistral", category: "AI Labs" },
  { name: "Cohere", category: "AI Labs" },
  { name: "xAI", category: "AI Labs" },
  { name: "Stability AI", category: "AI Labs" },
  { name: "Midjourney", category: "Generative Media" },
  { name: "Runway", category: "Generative Media" },
  { name: "Adobe", category: "Creative Software" },
  { name: "Figma", category: "Design Software" },
  { name: "Canva", category: "Design Software" },
  { name: "Notion", category: "Productivity" },
  { name: "Atlassian", category: "Productivity" },
  { name: "Salesforce", category: "Enterprise Software" },
  { name: "Oracle", category: "Enterprise Software" },
  { name: "IBM", category: "Enterprise Software" },
  { name: "Intel", category: "Semiconductors" },
  { name: "AMD", category: "Semiconductors" },
  { name: "Tesla", category: "Autonomy / Robotics" },
  { name: "Figure", category: "Robotics" },
  { name: "1X", category: "Robotics" },
  { name: "Waymo", category: "Autonomy" },
];

const productsSeed = [
  {
    companyName: "OpenAI",
    name: "ChatGPT",
    category: "AI Assistant",
    description: "OpenAI's conversational AI product for chat, search, analysis, and creation.",
    official_url: "https://chatgpt.com",
  },
  {
    companyName: "OpenAI",
    name: "Sora",
    category: "Video Generation",
    description: "OpenAI's text-to-video generation product.",
    official_url: "https://openai.com/sora",
  },
  {
    companyName: "OpenAI",
    name: "GPT-5.4",
    category: "Foundation Model",
    description: "OpenAI flagship reasoning and generation model family.",
    official_url: "https://platform.openai.com/docs/models",
  },
  {
    companyName: "OpenAI",
    name: "Codex",
    category: "Developer Tools",
    description: "OpenAI coding and software development assistant capabilities.",
    official_url: "https://openai.com",
  },
  {
    companyName: "Anthropic",
    name: "Claude",
    category: "AI Assistant",
    description: "Anthropic's family of assistant models and products.",
    official_url: "https://www.anthropic.com/claude",
  },
  {
    companyName: "Anthropic",
    name: "Claude Sonnet",
    category: "Foundation Model",
    description: "Anthropic model tier designed for balanced speed and capability.",
    official_url: "https://www.anthropic.com",
  },
  {
    companyName: "Anthropic",
    name: "Claude Opus",
    category: "Foundation Model",
    description: "Anthropic model tier focused on high capability tasks.",
    official_url: "https://www.anthropic.com",
  },
  {
    companyName: "Google",
    name: "Gemini",
    category: "AI Assistant",
    description: "Google's assistant and multimodal model family.",
    official_url: "https://gemini.google.com",
  },
  {
    companyName: "Google",
    name: "Gemini API",
    category: "Developer Tools",
    description: "Google API access for Gemini models.",
    official_url: "https://ai.google.dev",
  },
  {
    companyName: "Google",
    name: "Gemini 3.1 Flash Live",
    category: "Realtime AI",
    description: "Google's low-latency live conversational model capability.",
    official_url: "https://ai.google.dev",
  },
  {
    companyName: "Google",
    name: "Lyria 3",
    category: "Music Generation",
    description: "Google's music generation model family.",
    official_url: "https://deepmind.google",
  },
  {
    companyName: "Google",
    name: "Search Live",
    category: "AI Search",
    description: "Google live multimodal search experience.",
    official_url: "https://blog.google",
  },
  {
    companyName: "Meta",
    name: "Llama",
    category: "Foundation Model",
    description: "Meta's open model family.",
    official_url: "https://ai.meta.com",
  },
  {
    companyName: "Meta",
    name: "SAM",
    category: "Computer Vision",
    description: "Segment Anything model family from Meta.",
    official_url: "https://ai.meta.com",
  },
  {
    companyName: "Meta",
    name: "DINO",
    category: "Computer Vision",
    description: "Meta computer vision research and model line.",
    official_url: "https://ai.meta.com",
  },
  {
    companyName: "Microsoft",
    name: "Copilot",
    category: "AI Assistant",
    description: "Microsoft AI assistant products across work and consumer software.",
    official_url: "https://copilot.microsoft.com",
  },
  {
    companyName: "Microsoft",
    name: "Azure AI",
    category: "Cloud / AI",
    description: "Microsoft Azure AI platform and services.",
    official_url: "https://azure.microsoft.com",
  },
  {
    companyName: "Amazon Web Services",
    name: "Amazon Bedrock",
    category: "Cloud / AI",
    description: "AWS managed platform for foundation models and AI apps.",
    official_url: "https://aws.amazon.com/bedrock",
  },
  {
    companyName: "Amazon Web Services",
    name: "Amazon Q",
    category: "AI Assistant",
    description: "AWS business and developer assistant product line.",
    official_url: "https://aws.amazon.com/q",
  },
  {
    companyName: "NVIDIA",
    name: "NIM",
    category: "Developer Tools",
    description: "NVIDIA inference microservices for AI deployment.",
    official_url: "https://www.nvidia.com",
  },
  {
    companyName: "NVIDIA",
    name: "DGX",
    category: "AI Infrastructure",
    description: "NVIDIA accelerated AI compute systems.",
    official_url: "https://www.nvidia.com",
  },
  {
    companyName: "Hugging Face",
    name: "Transformers",
    category: "Open Source / Models",
    description: "Hugging Face library for transformer models.",
    official_url: "https://huggingface.co/docs/transformers",
  },
  {
    companyName: "Hugging Face",
    name: "Diffusers",
    category: "Open Source / Media",
    description: "Hugging Face library for diffusion models.",
    official_url: "https://huggingface.co/docs/diffusers",
  },
  {
    companyName: "Hugging Face",
    name: "LeRobot",
    category: "Robotics",
    description: "Hugging Face robotics tooling and datasets.",
    official_url: "https://huggingface.co",
  },
  {
    companyName: "Perplexity",
    name: "Perplexity",
    category: "AI Search",
    description: "Perplexity search and answer engine.",
    official_url: "https://www.perplexity.ai",
  },
  {
    companyName: "Mistral",
    name: "Le Chat",
    category: "AI Assistant",
    description: "Mistral's assistant product.",
    official_url: "https://mistral.ai",
  },
  {
    companyName: "Mistral",
    name: "Mistral Large",
    category: "Foundation Model",
    description: "Mistral flagship model line.",
    official_url: "https://mistral.ai",
  },
  {
    companyName: "Cohere",
    name: "Command",
    category: "Foundation Model",
    description: "Cohere enterprise model family.",
    official_url: "https://cohere.com",
  },
  {
    companyName: "xAI",
    name: "Grok",
    category: "AI Assistant",
    description: "xAI's assistant and model product family.",
    official_url: "https://x.ai",
  },
  {
    companyName: "Adobe",
    name: "Firefly",
    category: "Creative AI",
    description: "Adobe generative media product family.",
    official_url: "https://www.adobe.com/products/firefly.html",
  },
  {
    companyName: "Runway",
    name: "Runway",
    category: "Video Generation",
    description: "Runway's generative video and creative tooling.",
    official_url: "https://runwayml.com",
  },
  {
    companyName: "Midjourney",
    name: "Midjourney",
    category: "Image Generation",
    description: "Midjourney image generation product.",
    official_url: "https://www.midjourney.com",
  },
  {
    companyName: "Figma",
    name: "Figma AI",
    category: "Design AI",
    description: "Figma AI-assisted design and product features.",
    official_url: "https://www.figma.com",
  },
  {
    companyName: "Canva",
    name: "Canva AI",
    category: "Design AI",
    description: "Canva AI-assisted design features.",
    official_url: "https://www.canva.com",
  },
  {
    companyName: "Notion",
    name: "Notion AI",
    category: "Productivity AI",
    description: "Notion AI writing and workspace assistance features.",
    official_url: "https://www.notion.so/product/ai",
  },
  {
    companyName: "Atlassian",
    name: "Atlassian Rovo",
    category: "Enterprise AI",
    description: "Atlassian AI search and assistance product.",
    official_url: "https://www.atlassian.com",
  },
  {
    companyName: "Salesforce",
    name: "Agentforce",
    category: "Enterprise AI",
    description: "Salesforce AI agents platform.",
    official_url: "https://www.salesforce.com",
  },
  {
    companyName: "Oracle",
    name: "OCI Generative AI",
    category: "Cloud / AI",
    description: "Oracle cloud generative AI services.",
    official_url: "https://www.oracle.com",
  },
  {
    companyName: "IBM",
    name: "watsonx",
    category: "Enterprise AI",
    description: "IBM enterprise AI and data platform.",
    official_url: "https://www.ibm.com/watsonx",
  },
  {
    companyName: "Tesla",
    name: "Optimus",
    category: "Robotics",
    description: "Tesla humanoid robotics platform.",
    official_url: "https://www.tesla.com/AI",
  },
  {
    companyName: "Waymo",
    name: "Waymo One",
    category: "Autonomy",
    description: "Waymo autonomous ride-hailing product.",
    official_url: "https://waymo.com",
  },
];

async function fetchExistingCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, category");

  if (error) {
    throw new Error(`Failed to read companies: ${error.message}`);
  }

  return data ?? [];
}

async function fetchExistingProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, official_url, category, company_id");

  if (error) {
    throw new Error(`Failed to read products: ${error.message}`);
  }

  return data ?? [];
}

function normaliseKey(value) {
  return String(value || "").trim().toLowerCase();
}

async function insertWithOptionalSlug(table, payload) {
  const payloadWithSlug = {
    ...payload,
    slug: makeSlug(payload.name),
  };

  const firstAttempt = await supabase.from(table).insert(payloadWithSlug);

  if (!firstAttempt.error) {
    return;
  }

  const message = firstAttempt.error.message || "";

  const slugColumnMissing =
    message.includes("column") &&
    message.includes("slug") &&
    message.includes("does not exist");

  if (slugColumnMissing) {
    const secondAttempt = await supabase.from(table).insert(payload);
    if (!secondAttempt.error) {
      return;
    }
    throw new Error(secondAttempt.error.message);
  }

  throw new Error(firstAttempt.error.message);
}

async function upsertCompanies() {
  const existing = await fetchExistingCompanies();
  const existingByName = new Map(
    existing.map((item) => [normaliseKey(item.name), item])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const company of companiesSeed) {
    const existingRow = existingByName.get(normaliseKey(company.name));

    if (!existingRow) {
      if (DRY_RUN) {
        console.log(`DRY   company create -> ${company.name}`);
      } else {
        await insertWithOptionalSlug("companies", {
          name: company.name,
          category: company.category,
        });
      }
      created += 1;
      continue;
    }

    const needsUpdate =
      (existingRow.category || "") !== (company.category || "");

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`DRY   company update -> ${company.name}`);
    } else {
      const { error } = await supabase
        .from("companies")
        .update({
          category: company.category,
        })
        .eq("id", existingRow.id);

      if (error) {
        throw new Error(`Failed to update company "${company.name}": ${error.message}`);
      }
    }

    updated += 1;
  }

  return { created, updated, skipped };
}

async function buildCompanyIdMap() {
  const companies = await fetchExistingCompanies();
  return new Map(companies.map((item) => [normaliseKey(item.name), item.id]));
}

async function upsertProducts() {
  const existing = await fetchExistingProducts();
  const existingByName = new Map(
    existing.map((item) => [normaliseKey(item.name), item])
  );
  const companyIdMap = await buildCompanyIdMap();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let unresolvedCompany = 0;

  for (const product of productsSeed) {
    const companyId = companyIdMap.get(normaliseKey(product.companyName));

    if (!companyId) {
      console.log(`WARN  product skipped (missing company) -> ${product.name} / ${product.companyName}`);
      unresolvedCompany += 1;
      continue;
    }

    const existingRow = existingByName.get(normaliseKey(product.name));
    const payload = {
      name: product.name,
      description: product.description,
      official_url: product.official_url,
      category: product.category,
      company_id: companyId,
    };

    if (!existingRow) {
      if (DRY_RUN) {
        console.log(`DRY   product create -> ${product.name}`);
      } else {
        await insertWithOptionalSlug("products", payload);
      }

      created += 1;
      continue;
    }

    const needsUpdate =
      (existingRow.description || "") !== (payload.description || "") ||
      (existingRow.official_url || "") !== (payload.official_url || "") ||
      (existingRow.category || "") !== (payload.category || "") ||
      (existingRow.company_id || "") !== (payload.company_id || "");

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`DRY   product update -> ${product.name}`);
    } else {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", existingRow.id);

      if (error) {
        throw new Error(`Failed to update product "${product.name}": ${error.message}`);
      }
    }

    updated += 1;
  }

  return { created, updated, skipped, unresolvedCompany };
}

async function main() {
  console.log(`Seeding entities`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log("");

  const companyResult = await upsertCompanies();
  console.log(
    `Companies -> created=${companyResult.created} updated=${companyResult.updated} skipped=${companyResult.skipped}`
  );

  const productResult = await upsertProducts();
  console.log(
    `Products  -> created=${productResult.created} updated=${productResult.updated} skipped=${productResult.skipped} unresolvedCompany=${productResult.unresolvedCompany}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});