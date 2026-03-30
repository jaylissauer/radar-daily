import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

function makeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function createEmptySourceRun(sourceName, sourceUrl = null) {
  return {
    source_name: sourceName,
    source_slug: makeSlug(sourceName),
    source_url: sourceUrl,
    started_at: nowIso(),
    finished_at: null,
    status: "running",
    items_found: 0,
    items_processed: 0,
    body_yes: 0,
    body_blocked: 0,
    body_not_found: 0,
    body_unknown: 0,
    error_text: null,
  };
}

function normaliseBodyStatus(rawStatus) {
  const value = String(rawStatus || "").toLowerCase().trim();
  if (!value) return "unknown";
  if (["ok", "yes", "found", "full", "success"].includes(value)) return "yes";
  if (value === "blocked") return "blocked";
  if (value === "not-found") return "not-found";
  return "unknown";
}

function applyBodyStatus(sourceRun, rawStatus) {
  const status = normaliseBodyStatus(rawStatus);

  if (status === "yes") {
    sourceRun.body_yes += 1;
    return;
  }

  if (status === "blocked") {
    sourceRun.body_blocked += 1;
    return;
  }

  if (status === "not-found") {
    sourceRun.body_not_found += 1;
    return;
  }

  sourceRun.body_unknown += 1;
}

function finaliseSourceRun(sourceRun, fallbackStatus = "success") {
  if (!sourceRun) return;

  if (!sourceRun.finished_at) {
    sourceRun.finished_at = nowIso();
  }

  if (sourceRun.status === "running") {
    sourceRun.status = fallbackStatus;
  }
}

function beginSource(state, sourceName, sourceUrl = null) {
  const sourceSlug = makeSlug(sourceName);

  if (state.currentSourceSlug) {
    const previous = state.sources.get(state.currentSourceSlug);
    finaliseSourceRun(previous, previous?.error_text ? "partial" : "success");
  }

  if (!state.sources.has(sourceSlug)) {
    state.sources.set(sourceSlug, createEmptySourceRun(sourceName, sourceUrl));
  } else {
    const existing = state.sources.get(sourceSlug);
    existing.source_name = sourceName;
    existing.source_url = sourceUrl || existing.source_url;
    existing.started_at = nowIso();
    existing.finished_at = null;
    existing.status = "running";
    existing.items_found = 0;
    existing.items_processed = 0;
    existing.body_yes = 0;
    existing.body_blocked = 0;
    existing.body_not_found = 0;
    existing.body_unknown = 0;
    existing.error_text = null;
  }

  state.currentSourceSlug = sourceSlug;
}

function parseLine(line, state) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return;

  const fetchingWithUrlMatch = trimmed.match(/^Fetching\s+(.+?)\s+from\s+(.+)$/i);
  if (fetchingWithUrlMatch) {
    const [, sourceName, sourceUrl] = fetchingWithUrlMatch;
    beginSource(state, sourceName, sourceUrl);
    return;
  }

  const fetchingSourceOnlyMatch = trimmed.match(/^Fetching\s+([A-Za-z0-9 .&+_-]+)$/i);
  if (fetchingSourceOnlyMatch) {
    const [, sourceName] = fetchingSourceOnlyMatch;
    beginSource(state, sourceName);
    return;
  }

  const usingSourceMatch = trimmed.match(/^Using source:\s+(.+)$/i);
  if (usingSourceMatch && state.currentSourceSlug) {
    const sourceRun = state.sources.get(state.currentSourceSlug);
    if (sourceRun) {
      sourceRun.source_url = usingSourceMatch[1];
    }
    return;
  }

  const failedFetchMatch = trimmed.match(/^Failed to fetch\s+(.+?)(?:\s+from\s+.+)?$/i);
  if (failedFetchMatch) {
    const [, sourceName] = failedFetchMatch;
    const sourceSlug = makeSlug(sourceName);

    if (!state.sources.has(sourceSlug)) {
      state.sources.set(sourceSlug, createEmptySourceRun(sourceName));
    }

    const sourceRun = state.sources.get(sourceSlug);
    sourceRun.status = "failed";
    sourceRun.error_text = trimmed;
    sourceRun.finished_at = nowIso();

    if (state.currentSourceSlug === sourceSlug) {
      state.currentSourceSlug = null;
    }
    return;
  }

  const foundItemsMatch = trimmed.match(/^Found\s+(\d+)\s+items$/i);
  if (foundItemsMatch && state.currentSourceSlug) {
    const sourceRun = state.sources.get(state.currentSourceSlug);
    if (sourceRun) {
      sourceRun.items_found = Number(foundItemsMatch[1]);
    }
    return;
  }

  if (/^Processed:/i.test(trimmed) && state.currentSourceSlug) {
    const sourceRun = state.sources.get(state.currentSourceSlug);
    if (!sourceRun) return;

    sourceRun.items_processed += 1;

    const bodyMatch =
      trimmed.match(/\bbody=([a-z-]+)\b/i) ||
      trimmed.match(/\bbody_status=([a-z-]+)\b/i) ||
      trimmed.match(/\bbody-status=([a-z-]+)\b/i);

    applyBodyStatus(sourceRun, bodyMatch?.[1] || "unknown");
    return;
  }

  if (/^Skipped:/i.test(trimmed) && state.currentSourceSlug) {
    return;
  }

  const sourceSpecificErrorMatch =
    trimmed.match(/^Error ingesting\s+(.+?):\s+(.+)$/i) ||
    trimmed.match(/^Source error\s+\[(.+?)\]:\s+(.+)$/i);

  if (sourceSpecificErrorMatch) {
    const [, sourceName, errorText] = sourceSpecificErrorMatch;
    const sourceSlug = makeSlug(sourceName);

    if (!state.sources.has(sourceSlug)) {
      state.sources.set(sourceSlug, createEmptySourceRun(sourceName));
    }

    const sourceRun = state.sources.get(sourceSlug);
    sourceRun.status = sourceRun.items_processed > 0 ? "partial" : "failed";
    sourceRun.error_text = errorText;
    sourceRun.finished_at = nowIso();

    if (state.currentSourceSlug === sourceSlug) {
      state.currentSourceSlug = null;
    }
  }
}

function nodeArgsForScript(scriptPath) {
  if (existsSync(".env.local")) {
    return ["--env-file=.env.local", scriptPath];
  }

  return [scriptPath];
}

async function runNodeScript(scriptPath, label) {
  return new Promise((resolve) => {
    const child = spawn("node", nodeArgsForScript(scriptPath), {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, code });
        return;
      }

      resolve({
        ok: false,
        code,
        error: `${label} exited with code ${code}`,
      });
    });
  });
}

async function runIngestAndCaptureMetrics() {
  return new Promise((resolve) => {
    const state = {
      sources: new Map(),
      currentSourceSlug: null,
      ingestStartedAt: nowIso(),
      ingestFinishedAt: null,
    };

    const child = spawn("node", nodeArgsForScript("scripts/ingest-news.mjs"), {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      stdoutBuffer += text;

      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        parseLine(line, state);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      stderrBuffer += text;

      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || "";

      for (const line of lines) {
        parseLine(line, state);
      }
    });

    child.on("close", (code) => {
      if (stdoutBuffer.trim()) {
        parseLine(stdoutBuffer.trim(), state);
      }

      if (stderrBuffer.trim()) {
        parseLine(stderrBuffer.trim(), state);
      }

      if (state.currentSourceSlug) {
        const current = state.sources.get(state.currentSourceSlug);
        finaliseSourceRun(current, current?.error_text ? "partial" : "success");
      }

      for (const sourceRun of state.sources.values()) {
        if (sourceRun.status === "running") {
          finaliseSourceRun(sourceRun, sourceRun.error_text ? "partial" : "success");
        } else if (!sourceRun.finished_at) {
          sourceRun.finished_at = nowIso();
        }
      }

      state.ingestFinishedAt = nowIso();

      resolve({
        ok: code === 0,
        code,
        state,
      });
    });
  });
}

async function persistMetrics(runResult) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    null;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Skipping true ingest metrics write because Supabase env vars are missing.");
    return;
  }

  let createClient;

  try {
    ({ createClient } = await import("@supabase/supabase-js"));
  } catch (error) {
    console.warn("Skipping true ingest metrics write because @supabase/supabase-js is unavailable.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const sourceRuns = Array.from(runResult.state.sources.values());

  const totalSources = sourceRuns.length;
  const successfulSources = sourceRuns.filter((item) => item.status === "success").length;
  const failedSources = sourceRuns.filter((item) => item.status === "failed").length;
  const partialSources = sourceRuns.filter((item) => item.status === "partial").length;

  const overallStatus = !runResult.ok
    ? successfulSources > 0 || partialSources > 0
      ? "partial"
      : "failed"
    : failedSources > 0
      ? "partial"
      : "success";

  const totals = sourceRuns.reduce(
    (acc, item) => {
      acc.items_found += item.items_found || 0;
      acc.items_processed += item.items_processed || 0;
      return acc;
    },
    { items_found: 0, items_processed: 0 }
  );

  const { data: ingestRunRow, error: ingestRunError } = await supabase
    .from("ingest_runs")
    .insert({
      started_at: runResult.state.ingestStartedAt,
      finished_at: runResult.state.ingestFinishedAt,
      status: overallStatus,
      total_sources: totalSources,
      successful_sources: successfulSources,
      failed_sources: failedSources,
      partial_sources: partialSources,
      items_found: totals.items_found,
      items_processed: totals.items_processed,
    })
    .select("id")
    .single();

  if (ingestRunError) {
    throw ingestRunError;
  }

  if (!sourceRuns.length) {
    console.log("Saved true ingest metrics for 0 sources to Supabase.");
    return;
  }

  const rows = sourceRuns.map((item) => ({
    ingest_run_id: ingestRunRow.id,
    source_name: item.source_name,
    source_slug: item.source_slug,
    source_url: item.source_url,
    started_at: item.started_at,
    finished_at: item.finished_at,
    status: item.status,
    items_found: item.items_found,
    items_processed: item.items_processed,
    body_yes: item.body_yes,
    body_blocked: item.body_blocked,
    body_not_found: item.body_not_found,
    body_unknown: item.body_unknown,
    error_text: item.error_text,
  }));

  const { error: sourceRunsError } = await supabase
    .from("ingest_source_runs")
    .insert(rows);

  if (sourceRunsError) {
    throw sourceRunsError;
  }

  console.log(`Saved true ingest metrics for ${rows.length} sources to Supabase.`);
}

async function main() {
  const ingestResult = await runIngestAndCaptureMetrics();

  try {
    await persistMetrics(ingestResult);
  } catch (error) {
    console.error("Failed to persist true ingest metrics:", error);
  }

  const diagnosticsResult = await runNodeScript(
    "scripts/rebuild-source-diagnostics.mjs",
    "rebuild-source-diagnostics"
  );

  if (!diagnosticsResult.ok) {
    console.error(diagnosticsResult.error);
    process.exit(diagnosticsResult.code || 1);
  }

  if (!ingestResult.ok) {
    console.error(`ingest-news exited with code ${ingestResult.code}`);
    process.exit(ingestResult.code || 1);
  }

  console.log("Auto diagnostics flow complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
