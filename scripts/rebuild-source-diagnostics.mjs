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

const RECENT_DAYS = Number(process.env.DIAGNOSTICS_RECENT_DAYS || 14);

const ACTIVE_SOURCES = new Set([
  "OpenAI",
  "Anthropic",
  "Google",
  "Hugging Face",
  "Meta",
]);

const SOURCE_METHODS = {
  OpenAI: "rss",
  Anthropic: "html",
  Google: "rss",
  "Hugging Face": "rss",
  Meta: "html",
};

const SOURCE_RUN_TABLE_CANDIDATES = [
  "source_runs",
  "ingest_source_runs",
  "source_run_metrics",
  "ingestion_source_runs",
];

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberValue(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyDiagnosticsRow(sourceName) {
  const isActiveSource = ACTIVE_SOURCES.has(sourceName);

  return {
    source_name: sourceName,
    status: isActiveSource ? "inactive" : "legacy",
    fetch_method: SOURCE_METHODS[sourceName] || "legacy",
    article_count: 0,
    recent_article_count: 0,
    body_success_count: 0,
    body_missing_count: 0,
    last_article_published_at: null,
    last_rebuilt_at: new Date().toISOString(),
    notes: isActiveSource
      ? null
      : "Legacy or experimental source from earlier ingestion work. Not part of the current stable source set.",
  };
}

async function fetchArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select(
      [
        "id",
        "source_name",
        "published_at",
        "created_at",
      ].join(", ")
    )
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to read articles: ${error.message}`);
  }

  return data ?? [];
}

async function tryFetchSourceRuns(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(
      [
        "source_name",
        "source_slug",
        "source_url",
        "started_at",
        "finished_at",
        "status",
        "items_found",
        "items_processed",
        "body_yes",
        "body_blocked",
        "body_not_found",
        "body_unknown",
        "error_text",
      ].join(", ")
    )
    .order("started_at", { ascending: false });

  if (error) {
    return { ok: false, tableName, error };
  }

  return {
    ok: true,
    tableName,
    rows: data ?? [],
  };
}

async function fetchLatestSourceRuns() {
  const failures = [];

  for (const tableName of SOURCE_RUN_TABLE_CANDIDATES) {
    const result = await tryFetchSourceRuns(tableName);

    if (!result.ok) {
      failures.push(`${tableName}: ${result.error.message}`);
      continue;
    }

    const latestBySource = new Map();

    for (const row of result.rows) {
      const sourceName = String(row.source_name || "").trim();
      if (!sourceName) continue;

      if (!latestBySource.has(sourceName)) {
        latestBySource.set(sourceName, row);
      }
    }

    return {
      tableName,
      latestBySource,
    };
  }

  throw new Error(
    `Failed to read any source run table. Tried: ${failures.join(" | ")}`
  );
}

function applyArticleCounts(bySource, articles) {
  const now = new Date();
  const recentThreshold = new Date(
    now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000
  );

  for (const row of articles) {
    const sourceName = String(row.source_name || "").trim() || "Unknown";

    if (!bySource.has(sourceName)) {
      bySource.set(sourceName, emptyDiagnosticsRow(sourceName));
    }

    const item = bySource.get(sourceName);
    item.article_count += 1;

    const publishedAt =
      parseDate(row.published_at) || parseDate(row.created_at) || null;

    if (publishedAt && publishedAt >= recentThreshold) {
      item.recent_article_count += 1;
    }

    if (
      publishedAt &&
      (!item.last_article_published_at ||
        new Date(item.last_article_published_at) < publishedAt)
    ) {
      item.last_article_published_at = publishedAt.toISOString();
    }
  }
}

function applyLatestRunTruth(bySource, latestBySource) {
  for (const [sourceName, run] of latestBySource.entries()) {
    if (!bySource.has(sourceName)) {
      bySource.set(sourceName, emptyDiagnosticsRow(sourceName));
    }

    const item = bySource.get(sourceName);

    const bodyYes = numberValue(run.body_yes);
    const bodyBlocked = numberValue(run.body_blocked);
    const bodyNotFound = numberValue(run.body_not_found);
    const bodyUnknown = numberValue(run.body_unknown);
    const bodyMissing = bodyBlocked + bodyNotFound + bodyUnknown;

    item.body_success_count = bodyYes;
    item.body_missing_count = bodyMissing;

    const runStatus = String(run.status || "").toLowerCase().trim();
    const itemsProcessed = numberValue(run.items_processed);
    const itemsFound = numberValue(run.items_found);

    if (!ACTIVE_SOURCES.has(sourceName)) {
      item.status = "legacy";
    } else if (runStatus === "failed") {
      item.status = "failed";
    } else if (runStatus === "partial") {
      item.status = "partial";
    } else if (itemsFound === 0 && itemsProcessed === 0) {
      item.status = "inactive";
    } else if (itemsProcessed > 0 && bodyYes === 0 && bodyMissing > 0) {
      item.status = "degraded";
    } else if (itemsProcessed > 0 && bodyMissing > bodyYes) {
      item.status = "degraded";
    } else {
      item.status = "active";
    }

    const noteBits = [];

    if (run.source_url) {
      noteBits.push(`Latest source URL: ${run.source_url}`);
    }

    if (run.error_text) {
      noteBits.push(`Latest error: ${run.error_text}`);
    }

    noteBits.push(
      `Latest run body truth — yes=${bodyYes}, blocked=${bodyBlocked}, not_found=${bodyNotFound}, unknown=${bodyUnknown}, processed=${itemsProcessed}, found=${itemsFound}`
    );

    if (run.started_at) {
      noteBits.push(`Latest run started: ${run.started_at}`);
    }

    if (run.finished_at) {
      noteBits.push(`Latest run finished: ${run.finished_at}`);
    }

    item.notes = noteBits.join(" | ");
  }
}

function ensureActiveSourcesExist(bySource) {
  for (const sourceName of ACTIVE_SOURCES) {
    if (!bySource.has(sourceName)) {
      bySource.set(sourceName, emptyDiagnosticsRow(sourceName));
    }
  }
}

function applyFreshnessStatus(bySource) {
  for (const item of bySource.values()) {
    if (item.status === "legacy" || item.status === "failed" || item.status === "partial") {
      continue;
    }

    if (!ACTIVE_SOURCES.has(item.source_name)) {
      item.status = "legacy";
      continue;
    }

    if (item.article_count === 0) {
      item.status = "inactive";
      continue;
    }

    if (
      item.status !== "degraded" &&
      item.recent_article_count === 0 &&
      item.article_count > 0
    ) {
      item.status = "stale";
    }
  }
}

function buildDiagnosticsRows({ articles, latestBySource }) {
  const bySource = new Map();

  applyArticleCounts(bySource, articles);
  ensureActiveSourcesExist(bySource);
  applyLatestRunTruth(bySource, latestBySource);
  applyFreshnessStatus(bySource);

  return Array.from(bySource.values()).sort((a, b) => {
    const aActive = ACTIVE_SOURCES.has(a.source_name) ? 0 : 1;
    const bActive = ACTIVE_SOURCES.has(b.source_name) ? 0 : 1;

    if (aActive !== bActive) return aActive - bActive;
    return a.source_name.localeCompare(b.source_name);
  });
}

async function upsertDiagnostics(rows) {
  if (rows.length === 0) {
    console.log("No diagnostics rows to write.");
    return;
  }

  const rowsToWrite = rows.map((row) => ({
    source_name: row.source_name,
    status: row.status,
    fetch_method: row.fetch_method,
    article_count: row.article_count,
    recent_article_count: row.recent_article_count,
    body_success_count: row.body_success_count,
    body_missing_count: row.body_missing_count,
    last_article_published_at: row.last_article_published_at,
    last_rebuilt_at: row.last_rebuilt_at,
    notes: row.notes,
  }));

  const { error } = await supabase.from("source_diagnostics").upsert(rowsToWrite, {
    onConflict: "source_name",
  });

  if (error) {
    throw new Error(`Failed to upsert diagnostics: ${error.message}`);
  }
}

async function main() {
  console.log("Rebuilding source diagnostics...");
  console.log(`Recent days window: ${RECENT_DAYS}`);
  console.log("");

  const articles = await fetchArticles();
  console.log(`Fetched ${articles.length} articles`);

  const { tableName, latestBySource } = await fetchLatestSourceRuns();
  console.log(`Using source-run table: ${tableName}`);
  console.log(`Loaded latest run truth for ${latestBySource.size} sources`);

  const rows = buildDiagnosticsRows({
    articles,
    latestBySource,
  });

  console.log(`Built ${rows.length} source diagnostic rows`);

  await upsertDiagnostics(rows);

  console.log("");
  for (const row of rows) {
    console.log(
      `${row.source_name} | status=${row.status} | articles=${row.article_count} | recent=${row.recent_article_count} | body_success=${row.body_success_count} | body_missing=${row.body_missing_count} | notes=${row.notes || "none"}`
    );
  }

  console.log("");
  console.log("Diagnostics rebuild complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});