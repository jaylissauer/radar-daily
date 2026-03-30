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

const DRY_RUN = String(process.env.SOURCE_CLEANUP_DRY_RUN || "true") === "true";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function inferSourceFromTitle(title, currentSourceName) {
  const value = String(title || "").toLowerCase();
  const current = String(currentSourceName || "").trim();

  if (current === "OpenAI" || current === "Anthropic" || current === "Google" || current === "Hugging Face" || current === "Meta") {
    return current;
  }

  if (
    value.includes("claude") ||
    value.includes("anthropic")
  ) {
    return "Anthropic";
  }

  if (
    value.includes("gemini") ||
    value.includes("google") ||
    value.includes("lyria") ||
    value.includes("search live") ||
    value.includes("medgemma")
  ) {
    return "Google";
  }

  if (
    value.includes("hugging face") ||
    value.includes("transformers") ||
    value.includes("diffusers") ||
    value.includes("lerobot") ||
    value.includes("ggml") ||
    value.includes("llama.cpp")
  ) {
    return "Hugging Face";
  }

  if (
    value.includes("chatgpt") ||
    value.includes("openai") ||
    value.includes("sora") ||
    value.includes("codex") ||
    value.includes("gpt-5.4") ||
    value.includes("prompt injection")
  ) {
    return "OpenAI";
  }

  if (
    value.includes("meta") ||
    value.includes("dino") ||
    value.includes("sam 3.1") ||
    value.includes("tribe v2") ||
    value.includes("canopy height") ||
    value.includes("mtia")
  ) {
    return "Meta";
  }

  return null;
}

async function main() {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, source_name")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to read articles: ${error.message}`);
  }

  const rows = data ?? [];
  const planned = [];

  for (const row of rows) {
    const current = String(row.source_name || "").trim();
    const inferred = inferSourceFromTitle(row.title, current);

    if (!inferred) continue;
    if (current === inferred) continue;

    planned.push({
      id: row.id,
      title: row.title,
      from: current || "(blank)",
      to: inferred,
    });
  }

  console.log(`Found ${planned.length} articles needing source_name cleanup`);
  console.log("");

  for (const item of planned.slice(0, 40)) {
    console.log(`- ${item.title}`);
    console.log(`  ${item.from} -> ${item.to}`);
  }

  if (planned.length > 40) {
    console.log("");
    console.log(`...and ${planned.length - 40} more`);
  }

  console.log("");
  console.log(`Dry run: ${DRY_RUN}`);

  if (DRY_RUN || planned.length === 0) {
    return;
  }

  for (const item of planned) {
    const { error: updateError } = await supabase
      .from("articles")
      .update({ source_name: item.to })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(`Failed updating "${item.title}": ${updateError.message}`);
    }
  }

  console.log("");
  console.log("Source cleanup complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});