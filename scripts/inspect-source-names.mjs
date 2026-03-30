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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, source_name, created_at, published_at")
    .order("source_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to read articles: ${error.message}`);
  }

  const rows = data ?? [];
  const grouped = new Map();

  for (const row of rows) {
    const key = String(row.source_name || "").trim() || "(blank)";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  console.log(`Found ${grouped.size} distinct source_name values`);
  console.log("");

  for (const [sourceName, items] of Array.from(grouped.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    console.log(`SOURCE: ${sourceName} (${items.length})`);
    for (const item of items.slice(0, 8)) {
      console.log(
        `  - ${item.title} | published=${item.published_at || item.created_at || "—"}`
      );
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});