import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type GenericRow = Record<string, unknown>;
type SortMode = "health" | "name" | "found" | "processed";
type HealthStatus =
  | "success"
  | "degraded"
  | "partial"
  | "failed"
  | "legacy"
  | "active"
  | "stale"
  | "inactive"
  | "unknown"
  | "no-run";

function makeSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatShortDate(value: unknown) {
  if (!value || typeof value !== "string") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

function pickSourceName(row: GenericRow) {
  return String(
    row.source_name ?? row.source ?? row.name ?? row.label ?? "Unknown source"
  );
}

function pickLifecycle(row: GenericRow) {
  const candidates = [
    row.lifecycle_status,
    row.source_lifecycle,
    row.status_group,
    row.source_status,
    row.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.toLowerCase().trim();

    if (value === "legacy" || value.includes("legacy")) return "legacy";
    if (value === "active" || value.includes("active")) return "active";
  }

  if (row.is_active_source === false) return "legacy";
  if (row.is_active === false) return "legacy";

  return "active";
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function badgeClasses(status: string) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";

  switch (status) {
    case "success":
      return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-300`;
    case "degraded":
      return `${base} border-amber-400/30 bg-amber-500/10 text-amber-300`;
    case "partial":
      return `${base} border-amber-400/30 bg-amber-500/10 text-amber-300`;
    case "failed":
      return `${base} border-red-400/30 bg-red-500/10 text-red-300`;
    case "legacy":
      return `${base} border-zinc-400/30 bg-zinc-500/10 text-zinc-300`;
    case "active":
      return `${base} border-sky-400/30 bg-sky-500/10 text-sky-300`;
    case "stale":
      return `${base} border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200`;
    case "inactive":
      return `${base} border-white/15 bg-white/5 text-white/60`;
    default:
      return `${base} border-white/15 bg-white/5 text-white/70`;
  }
}

function sortChipClasses(active: boolean) {
  const base = "rounded-full border px-3 py-1.5 text-xs font-medium transition";
  return active
    ? `${base} border-cyan-400/40 bg-cyan-500/15 text-cyan-200`
    : `${base} border-white/10 bg-white/5 text-white/70 hover:bg-white/10`;
}

function runLinkClasses(active: boolean) {
  const base =
    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition";
  return active
    ? `${base} border-emerald-400/40 bg-emerald-500/15 text-emerald-200`
    : `${base} border-white/10 bg-white/5 text-white/70 hover:bg-white/10`;
}

function sourceLinkClasses() {
  return "transition hover:text-cyan-200";
}

function legendDotClasses(kind: "yes" | "blocked" | "not_found" | "unknown") {
  switch (kind) {
    case "yes":
      return "h-2.5 w-2.5 rounded-full bg-emerald-300";
    case "blocked":
      return "h-2.5 w-2.5 rounded-full bg-amber-300";
    case "not_found":
      return "h-2.5 w-2.5 rounded-full bg-rose-300";
    default:
      return "h-2.5 w-2.5 rounded-full bg-zinc-300";
  }
}

function tinyMetricClasses(kind: "yes" | "blocked" | "not_found" | "unknown") {
  switch (kind) {
    case "yes":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "blocked":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "not_found":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    default:
      return "border-zinc-400/20 bg-zinc-500/10 text-zinc-200";
  }
}

function trendPillClasses(status: HealthStatus) {
  const base = "h-2.5 flex-1 rounded-full border";
  switch (status) {
    case "success":
      return `${base} border-emerald-400/30 bg-emerald-400/80`;
    case "degraded":
    case "partial":
      return `${base} border-amber-400/30 bg-amber-400/80`;
    case "failed":
      return `${base} border-red-400/30 bg-red-400/80`;
    case "stale":
      return `${base} border-fuchsia-400/30 bg-fuchsia-400/70`;
    case "inactive":
    case "no-run":
      return `${base} border-white/10 bg-white/10`;
    default:
      return `${base} border-white/10 bg-white/20`;
  }
}

function actionBadgeClasses(kind: "fix" | "monitor" | "structural") {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  switch (kind) {
    case "fix":
      return `${base} border-rose-400/30 bg-rose-500/10 text-rose-200`;
    case "structural":
      return `${base} border-amber-400/30 bg-amber-500/10 text-amber-200`;
    default:
      return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`;
  }
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="min-h-[2.75rem] text-[11px] uppercase leading-[1.15rem] tracking-[0.18em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sublabel,
  badge,
}: {
  label: string;
  value?: number | string;
  sublabel?: string;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </p>

      {badge ? (
        <>
          <div className="mt-2">
            <span className={badgeClasses(badge.toLowerCase())}>{badge}</span>
          </div>
          {sublabel ? <p className="mt-3 text-xs text-white/60">{sublabel}</p> : null}
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          {sublabel ? <p className="mt-1 text-xs text-white/60">{sublabel}</p> : null}
        </>
      )}
    </div>
  );
}

function CommandCard({
  title,
  description,
  command,
}: {
  title: string;
  description: string;
  command: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/60">{description}</p>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#050b14] p-3 text-xs leading-6 text-cyan-100">
        <code>{command}</code>
      </pre>
    </div>
  );
}

type SourceCard = {
  sourceName: string;
  sourceSlug: string;
  lifecycle: string;
  latestRun: GenericRow | null;
  diagnosticRow: GenericRow | null;
};

type RecommendedAction = {
  sourceName: string;
  type: "fix" | "monitor" | "structural";
  title: string;
  detail: string;
};

function deriveRunHealthStatus(run: GenericRow | null): HealthStatus {
  if (!run) return "no-run";

  const runStatus = String(run.status ?? "").toLowerCase().trim();
  const itemsProcessed = numberValue(run.items_processed);
  const itemsFound = numberValue(run.items_found);
  const bodyYes = numberValue(run.body_yes);
  const bodyBlocked = numberValue(run.body_blocked);
  const bodyNotFound = numberValue(run.body_not_found);
  const bodyUnknown = numberValue(run.body_unknown);
  const bodyMissing = bodyBlocked + bodyNotFound + bodyUnknown;

  if (runStatus === "failed") return "failed";
  if (runStatus === "partial") return "partial";

  if (itemsFound === 0 && itemsProcessed === 0) return "inactive";
  if (itemsProcessed > 0 && bodyYes === 0 && bodyMissing > 0) return "degraded";
  if (itemsProcessed > 0 && bodyMissing > bodyYes) return "degraded";
  if (itemsProcessed > 0 && bodyMissing > 0) return "degraded";

  return "success";
}

function deriveSourceHealthStatus(item: SourceCard): HealthStatus {
  const diagnosticStatus = String(item.diagnosticRow?.status ?? "")
    .toLowerCase()
    .trim();

  if (
    diagnosticStatus === "failed" ||
    diagnosticStatus === "partial" ||
    diagnosticStatus === "degraded" ||
    diagnosticStatus === "stale" ||
    diagnosticStatus === "inactive"
  ) {
    return diagnosticStatus as HealthStatus;
  }

  return deriveRunHealthStatus(item.latestRun);
}

function healthLabel(status: HealthStatus) {
  switch (status) {
    case "no-run":
      return "no run yet";
    default:
      return status;
  }
}

function healthScore(item: SourceCard) {
  const run = item.latestRun;
  const status = deriveSourceHealthStatus(item);
  const blocked = numberValue(run?.body_blocked);
  const notFound = numberValue(run?.body_not_found);
  const unknown = numberValue(run?.body_unknown);
  const processed = numberValue(run?.items_processed);
  const yes = numberValue(run?.body_yes);

  let penalty = 0;

  if (status === "failed") penalty += 1_000_000;
  else if (status === "partial") penalty += 750_000;
  else if (status === "degraded") penalty += 500_000;
  else if (status === "stale") penalty += 100_000;
  else if (status === "inactive") penalty += 50_000;

  return penalty + blocked * 1000 + notFound * 100 + unknown * 10 - yes - processed * 0.01;
}

function issueLabel(item: SourceCard) {
  const run = item.latestRun;
  const blocked = numberValue(run?.body_blocked);
  const notFound = numberValue(run?.body_not_found);
  const unknown = numberValue(run?.body_unknown);

  if (blocked > 0) return `${blocked} blocked`;
  if (notFound > 0) return `${notFound} not found`;
  if (unknown > 0) return `${unknown} unknown`;
  return "healthy";
}

function sourceNote(item: SourceCard) {
  return textValue(item.diagnosticRow?.notes);
}

function sortSources(items: SourceCard[], sort: SortMode) {
  const copy = [...items];

  copy.sort((a, b) => {
    if (sort === "name") {
      return a.sourceName.localeCompare(b.sourceName);
    }

    if (sort === "found") {
      const diff =
        numberValue(b.latestRun?.items_found) - numberValue(a.latestRun?.items_found);
      if (diff !== 0) return diff;
      return a.sourceName.localeCompare(b.sourceName);
    }

    if (sort === "processed") {
      const diff =
        numberValue(b.latestRun?.items_processed) -
        numberValue(a.latestRun?.items_processed);
      if (diff !== 0) return diff;
      return a.sourceName.localeCompare(b.sourceName);
    }

    const diff = healthScore(b) - healthScore(a);
    if (diff !== 0) return diff;

    return a.sourceName.localeCompare(b.sourceName);
  });

  return copy;
}

function sortRunSources(rows: GenericRow[]) {
  return [...rows].sort((a, b) => {
    const aScore =
      numberValue(a.body_blocked) * 1000 +
      numberValue(a.body_not_found) * 100 +
      numberValue(a.body_unknown) * 10 -
      numberValue(a.body_yes);

    const bScore =
      numberValue(b.body_blocked) * 1000 +
      numberValue(b.body_not_found) * 100 +
      numberValue(b.body_unknown) * 10 -
      numberValue(b.body_yes);

    if (bScore !== aScore) return bScore - aScore;

    return String(a.source_name ?? "").localeCompare(String(b.source_name ?? ""));
  });
}

function buildRecommendedActions(activeSources: SourceCard[]): RecommendedAction[] {
  return activeSources.map((source) => {
    const run = source.latestRun;
    const blocked = numberValue(run?.body_blocked);
    const notFound = numberValue(run?.body_not_found);
    const unknown = numberValue(run?.body_unknown);

    if (notFound > 0) {
      return {
        sourceName: source.sourceName,
        type: "fix",
        title: "Improve extractor next",
        detail: `${notFound} article bodies were not found. This is the best candidate for extraction work.`,
      };
    }

    if (blocked > 0) {
      return {
        sourceName: source.sourceName,
        type: "structural",
        title: "Monitor unless source strategy changes",
        detail: `${blocked} bodies were blocked by source behavior. This is likely structural rather than a simple parser fix.`,
      };
    }

    if (unknown > 0) {
      return {
        sourceName: source.sourceName,
        type: "fix",
        title: "Tighten classification",
        detail: `${unknown} results were uncategorised. Improve parser classification before relying on this source fully.`,
      };
    }

    return {
      sourceName: source.sourceName,
      type: "monitor",
      title: "Healthy — monitor only",
      detail: "Current runs look stable. No immediate source-specific action needed.",
    };
  });
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string; run?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedSort = String(resolvedSearchParams.sort ?? "health").toLowerCase();
  const selectedRunId = String(resolvedSearchParams.run ?? "");

  const sortMode: SortMode =
    requestedSort === "name" ||
    requestedSort === "found" ||
    requestedSort === "processed"
      ? requestedSort
      : "health";

  const supabase = getSupabase();

  let diagnostics: GenericRow[] = [];
  let sourceRuns: GenericRow[] = [];
  let ingestRuns: GenericRow[] = [];
  let diagnosticsError = "";

  if (supabase) {
    const [diagnosticsResult, sourceRunsResult, ingestRunsResult] = await Promise.all([
      supabase
        .from("source_diagnostics")
        .select("*")
        .order("source_name", { ascending: true }),
      supabase
        .from("ingest_source_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(300),
      supabase
        .from("ingest_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10),
    ]);

    if (diagnosticsResult.error) {
      diagnosticsError = diagnosticsResult.error.message;
    } else {
      diagnostics = diagnosticsResult.data ?? [];
    }

    sourceRuns = sourceRunsResult.data ?? [];
    ingestRuns = ingestRunsResult.data ?? [];
  } else {
    diagnosticsError =
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  const latestRunBySource = new Map<string, GenericRow>();
  for (const row of sourceRuns) {
    const sourceSlug = String(
      row.source_slug ?? makeSlug(String(row.source_name ?? ""))
    );

    if (!latestRunBySource.has(sourceSlug)) {
      latestRunBySource.set(sourceSlug, row);
    }
  }

  const latestIngestRun = ingestRuns[0] ?? null;

  const latestRunTotals = Array.from(latestRunBySource.values()).reduce(
    (
      acc: {
        bodyYes: number;
        blocked: number;
        notFound: number;
        unknown: number;
      },
      row,
    ) => {
      acc.bodyYes += numberValue(row.body_yes);
      acc.blocked += numberValue(row.body_blocked);
      acc.notFound += numberValue(row.body_not_found);
      acc.unknown += numberValue(row.body_unknown);
      return acc;
    },
    {
      bodyYes: 0,
      blocked: 0,
      notFound: 0,
      unknown: 0,
    }
  );

  const sourceCards: SourceCard[] = diagnostics.map((row) => {
    const sourceName = pickSourceName(row);
    const sourceSlug = String(row.source_slug ?? makeSlug(sourceName));
    const lifecycle = pickLifecycle(row);
    const latestRun = latestRunBySource.get(sourceSlug) ?? null;

    return {
      sourceName,
      sourceSlug,
      lifecycle,
      latestRun,
      diagnosticRow: row,
    };
  });

  const activeSources = sortSources(
    sourceCards.filter((item) => item.lifecycle === "active"),
    sortMode
  );

  const legacySources = sourceCards
    .filter((item) => item.lifecycle === "legacy")
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName));

  const worstSource = activeSources[0] ?? null;
  const problemSources = activeSources.filter((item) => {
    const run = item.latestRun;
    return (
      numberValue(run?.body_blocked) > 0 ||
      numberValue(run?.body_not_found) > 0 ||
      numberValue(run?.body_unknown) > 0
    );
  }).length;

  const degradedSources = activeSources.filter(
    (item) => deriveSourceHealthStatus(item) === "degraded"
  );
  const failedSources = activeSources.filter(
    (item) => deriveSourceHealthStatus(item) === "failed"
  );
  const partialSources = activeSources.filter(
    (item) => deriveSourceHealthStatus(item) === "partial"
  );
  const staleSources = activeSources.filter(
    (item) => deriveSourceHealthStatus(item) === "stale"
  );
  const healthySources = activeSources.filter(
    (item) => deriveSourceHealthStatus(item) === "success"
  );

  const recentRuns = ingestRuns.slice(0, 5);
  const defaultSelectedRunId = selectedRunId || String(recentRuns[0]?.id ?? "");
  const selectedRun =
    recentRuns.find((run) => String(run.id ?? "") === defaultSelectedRunId) ?? null;

  const selectedRunSources = sortRunSources(
    sourceRuns.filter(
      (row) => String(row.ingest_run_id ?? "") === String(selectedRun?.id ?? "")
    )
  );

  const selectedRunTotals = selectedRunSources.reduce(
    (
      acc: {
        bodyYes: number;
        blocked: number;
        notFound: number;
        unknown: number;
      },
      row,
    ) => {
      acc.bodyYes += numberValue(row.body_yes);
      acc.blocked += numberValue(row.body_blocked);
      acc.notFound += numberValue(row.body_not_found);
      acc.unknown += numberValue(row.body_unknown);
      return acc;
    },
    { bodyYes: 0, blocked: 0, notFound: 0, unknown: 0 }
  );

  const makeRunHref = (runId: string) => `/sources?sort=${sortMode}&run=${runId}`;

  const activeSourceTrends = activeSources.map((source) => {
    const rows = sourceRuns
      .filter((row) => String(row.source_slug ?? "") === source.sourceSlug)
      .sort((a, b) => {
        const aDate = new Date(String(a.started_at ?? "")).getTime();
        const bDate = new Date(String(b.started_at ?? "")).getTime();
        return bDate - aDate;
      })
      .slice(0, 4);

    return {
      ...source,
      trendRows: rows,
    };
  });

  const recommendedActions = buildRecommendedActions(activeSources);

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                Source diagnostics
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Ingest health
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/70">
                This view now combines your source registry with true run-level ingest
                metrics captured from the real ingest output.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Back to home
              </Link>
            </div>
          </div>

          {latestIngestRun ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <SummaryCard
                label="Last run"
                badge={String(latestIngestRun.status ?? "unknown")}
                sublabel={formatDate(latestIngestRun.started_at)}
              />
              <SummaryCard
                label="Sources"
                value={numberValue(latestIngestRun.total_sources)}
                sublabel="tracked this run"
              />
              <SummaryCard
                label="Items found"
                value={numberValue(latestIngestRun.items_found)}
                sublabel="raw source items"
              />
              <SummaryCard
                label="Processed"
                value={numberValue(latestIngestRun.items_processed)}
                sublabel="articles written"
              />
              <SummaryCard
                label="Body yes"
                value={latestRunTotals.bodyYes}
                sublabel="latest run total"
              />
              <SummaryCard
                label="Blocked"
                value={latestRunTotals.blocked}
                sublabel="latest run total"
              />
              <SummaryCard
                label="Not found"
                value={latestRunTotals.notFound}
                sublabel="latest run total"
              />
              <SummaryCard
                label="Failed sources"
                value={numberValue(latestIngestRun.failed_sources)}
                sublabel="latest run only"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              No ingest runs recorded yet. Run <code>npm run ingest:news</code> after
              applying the migration below.
            </div>
          )}

          {diagnosticsError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {diagnosticsError}
            </div>
          ) : null}
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryCard label="Healthy" value={healthySources.length} sublabel="active sources" />
          <SummaryCard label="Degraded" value={degradedSources.length} sublabel="active sources" />
          <SummaryCard label="Partial" value={partialSources.length} sublabel="active sources" />
          <SummaryCard label="Failed" value={failedSources.length} sublabel="active sources" />
          <SummaryCard label="Stale" value={staleSources.length} sublabel="active sources" />
        </section>

        {failedSources.length > 0 || degradedSources.length > 0 || partialSources.length > 0 ? (
          <section className="rounded-3xl border border-amber-400/20 bg-amber-500/[0.08] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-amber-100">
                  Operator warning
                </h2>
                <p className="mt-1 text-sm text-amber-50/80">
                  One or more active sources need attention based on latest extraction health,
                  not just run completion.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {failedSources.length > 0 ? (
                  <span className={badgeClasses("failed")}>
                    failed {failedSources.length}
                  </span>
                ) : null}
                {partialSources.length > 0 ? (
                  <span className={badgeClasses("partial")}>
                    partial {partialSources.length}
                  </span>
                ) : null}
                {degradedSources.length > 0 ? (
                  <span className={badgeClasses("degraded")}>
                    degraded {degradedSources.length}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {[...failedSources, ...partialSources, ...degradedSources].slice(0, 4).map((item) => (
                <div
                  key={`warning-${item.sourceSlug}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/sources/${item.sourceSlug}`}
                      className={`text-sm font-semibold text-white ${sourceLinkClasses()}`}
                    >
                      {item.sourceName}
                    </Link>
                    <span className={badgeClasses(deriveSourceHealthStatus(item))}>
                      {healthLabel(deriveSourceHealthStatus(item))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    {sourceNote(item) || "Latest source diagnostics indicate extraction issues."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Recommended actions</h2>
              <p className="mt-1 text-sm text-white/60">
                Ranked operator guidance based on the latest run outcomes.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recommendedActions.map((action) => (
              <div
                key={`action-${action.sourceName}`}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{action.sourceName}</p>
                    <p className="mt-1 text-sm text-white/60">{action.title}</p>
                  </div>
                  <span className={actionBadgeClasses(action.type)}>
                    {action.type === "fix"
                      ? "fix next"
                      : action.type === "structural"
                        ? "structural"
                        : "monitor"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/70">{action.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Status legend</h2>
              <p className="mt-1 text-sm text-white/60">
                Quick definitions for how body extraction outcomes are classified.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className={legendDotClasses("yes")} />
                <span className="text-sm font-semibold text-white">Body yes</span>
              </div>
              <p className="mt-2 text-sm text-white/65">
                The article body was extracted successfully and the source content was usable.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className={legendDotClasses("blocked")} />
                <span className="text-sm font-semibold text-white">Blocked</span>
              </div>
              <p className="mt-2 text-sm text-white/65">
                The source or page behavior prevented extraction, even though the listing item was found.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className={legendDotClasses("not_found")} />
                <span className="text-sm font-semibold text-white">Not found</span>
              </div>
              <p className="mt-2 text-sm text-white/65">
                The ingest found the article reference, but could not retrieve or isolate the body content.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <span className={legendDotClasses("unknown")} />
                <span className="text-sm font-semibold text-white">Unknown</span>
              </div>
              <p className="mt-2 text-sm text-white/65">
                The run completed but the extraction result did not fit a known classification.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CommandCard
            title="Full auto ingest + diagnostics"
            description="Runs the current production-style ingest flow and rebuilds diagnostics automatically."
            command={`cd ~/Desktop/ai-signal\nnpm run ingest:news`}
          />
          <CommandCard
            title="Diagnostics rebuild only"
            description="Rebuilds the diagnostics tables and page data without re-ingesting articles."
            command={`cd ~/Desktop/ai-signal\nnode --env-file=.env.local scripts/rebuild-source-diagnostics.mjs`}
          />
          <CommandCard
            title="Entity reseed"
            description="Refreshes company and product matching entities before future ingest runs."
            command={`cd ~/Desktop/ai-signal\nnode --env-file=.env.local scripts/seed-entities.mjs`}
          />
          <CommandCard
            title="Article refresh"
            description="Re-runs the refresh pipeline for older articles using the configured refresh model."
            command={`cd ~/Desktop/ai-signal\nnode --env-file=.env.local scripts/refresh-articles.mjs`}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Active sources</h2>
              <span className="ml-3 text-sm text-white/50">{activeSources.length}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/sources?sort=health" className={sortChipClasses(sortMode === "health")}>
                Sort: Health
              </Link>
              <Link href="/sources?sort=name" className={sortChipClasses(sortMode === "name")}>
                Name
              </Link>
              <Link href="/sources?sort=found" className={sortChipClasses(sortMode === "found")}>
                Found
              </Link>
              <Link
                href="/sources?sort=processed"
                className={sortChipClasses(sortMode === "processed")}
              >
                Processed
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.06] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <span className="text-sm font-medium text-cyan-100">
                Health sort ranks sources by extraction issues first.
              </span>

              {worstSource ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
                  Worst source: <span className="font-semibold text-white">{worstSource.sourceName}</span> ({issueLabel(worstSource)})
                </span>
              ) : null}

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
                Problem sources this run: <span className="font-semibold text-white">{problemSources}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeSourceTrends.map((item) => {
              const run = item.latestRun;
              const healthStatus = deriveSourceHealthStatus(item);
              const note = sourceNote(item);
              const recentTrendRows = item.trendRows.slice(0, 4);

              return (
                <article
                  key={`active-${item.sourceSlug}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sources/${item.sourceSlug}`}
                          className={`text-lg font-semibold ${sourceLinkClasses()}`}
                        >
                          {item.sourceName}
                        </Link>
                        <span className={badgeClasses("active")}>active</span>
                      </div>
                      <p className="mt-1 text-xs text-white/45">slug: {item.sourceSlug}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sources/${item.sourceSlug}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                      >
                        View source
                      </Link>
                      <span className={badgeClasses(healthStatus)}>
                        {healthLabel(healthStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                        Recent health
                      </p>
                      <p className="text-[11px] text-white/45">latest 4 runs</p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {[0, 1, 2, 3].map((index) => {
                        const row = recentTrendRows[index];
                        const status = deriveRunHealthStatus(row ?? null);
                        const title = row
                          ? `${formatShortDate(row.started_at)} · ${healthLabel(status)}`
                          : "No run";

                        return (
                          <span
                            key={`trend-pill-${item.sourceSlug}-${index}`}
                            className={trendPillClasses(status)}
                            title={title}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatCard label="Found" value={numberValue(run?.items_found)} />
                    <StatCard label="Processed" value={numberValue(run?.items_processed)} />
                    <StatCard label="Body yes" value={numberValue(run?.body_yes)} />
                    <StatCard label="Blocked" value={numberValue(run?.body_blocked)} />
                    <StatCard label="Not found" value={numberValue(run?.body_not_found)} />
                    <StatCard label="Unknown" value={numberValue(run?.body_unknown)} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                        Last started
                      </p>
                      <p className="mt-2 text-sm text-white/80">
                        {formatDate(run?.started_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                        Last finished
                      </p>
                      <p className="mt-2 text-sm text-white/80">
                        {formatDate(run?.finished_at)}
                      </p>
                    </div>
                  </div>

                  {note ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                        Diagnostic note
                      </p>
                      <p className="mt-2 text-sm text-white/70">{note}</p>
                    </div>
                  ) : null}

                  {run?.error_text ? (
                    <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                      {String(run.error_text)}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Source trend snapshot</h2>
            <span className="text-sm text-white/50">last 4 runs per active source</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {activeSourceTrends.map((source) => (
              <article
                key={`trend-mobile-${source.sourceSlug}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/sources/${source.sourceSlug}`}
                      className={`text-base font-semibold text-white ${sourceLinkClasses()}`}
                    >
                      {source.sourceName}
                    </Link>
                    <p className="mt-1 text-xs text-white/45">{source.sourceSlug}</p>
                  </div>
                  <Link
                    href={`/sources/${source.sourceSlug}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {source.trendRows.length > 0 ? (
                    source.trendRows.map((row, index) => {
                      const trendHealth = deriveRunHealthStatus(row);

                      return (
                        <div
                          key={`trend-mobile-row-${source.sourceSlug}-${index}`}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-white/70">{formatShortDate(row.started_at)}</p>
                            <span className={badgeClasses(trendHealth)}>
                              {healthLabel(trendHealth)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <MiniStat label="Found" value={numberValue(row.items_found)} />
                            <MiniStat label="Processed" value={numberValue(row.items_processed)} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("yes")}`}
                            >
                              yes {numberValue(row.body_yes)}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("blocked")}`}
                            >
                              blocked {numberValue(row.body_blocked)}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("not_found")}`}
                            >
                              not found {numberValue(row.body_not_found)}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("unknown")}`}
                            >
                              unknown {numberValue(row.body_unknown)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                      No recent runs for this source yet.
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-white/5 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-white/55">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Run 1</th>
                    <th className="px-4 py-3 font-medium">Run 2</th>
                    <th className="px-4 py-3 font-medium">Run 3</th>
                    <th className="px-4 py-3 font-medium">Run 4</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSourceTrends.map((source) => (
                    <tr
                      key={`trend-${source.sourceSlug}`}
                      className="border-t border-white/10 text-white/80 align-top"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/sources/${source.sourceSlug}`}
                          className={`font-medium text-white ${sourceLinkClasses()}`}
                        >
                          {source.sourceName}
                        </Link>
                        <div className="mt-1 text-xs text-white/45">{source.sourceSlug}</div>
                      </td>

                      {[0, 1, 2, 3].map((index) => {
                        const row = source.trendRows[index];
                        const trendHealth = deriveRunHealthStatus(row ?? null);

                        return (
                          <td key={`trend-cell-${source.sourceSlug}-${index}`} className="px-4 py-4">
                            {row ? (
                              <div className="min-w-[170px] rounded-2xl border border-white/10 bg-black/20 p-3">
                                <p className="text-xs text-white/55">
                                  {formatShortDate(row.started_at)}
                                </p>
                                <div className="mt-2">
                                  <span className={badgeClasses(trendHealth)}>
                                    {healthLabel(trendHealth)}
                                  </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
                                    <span className="block text-white/45">Found</span>
                                    <span className="font-medium text-white">{numberValue(row.items_found)}</span>
                                  </div>
                                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
                                    <span className="block text-white/45">Processed</span>
                                    <span className="font-medium text-white">{numberValue(row.items_processed)}</span>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("yes")}`}
                                  >
                                    yes {numberValue(row.body_yes)}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("blocked")}`}
                                  >
                                    blocked {numberValue(row.body_blocked)}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("not_found")}`}
                                  >
                                    not found {numberValue(row.body_not_found)}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-1 text-[11px] ${tinyMetricClasses("unknown")}`}
                                  >
                                    unknown {numberValue(row.body_unknown)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-white/35">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent ingest runs</h2>
            <span className="text-sm text-white/50">{Math.min(5, ingestRuns.length)}</span>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap gap-2">
              {recentRuns.map((run, index) => {
                const runId = String(run.id ?? index);
                const active = runId === String(selectedRun?.id ?? "");
                return (
                  <Link
                    key={`run-chip-${runId}`}
                    href={makeRunHref(runId)}
                    className={runLinkClasses(active)}
                  >
                    {formatDate(run.started_at)}
                  </Link>
                );
              })}
            </div>

            {selectedRun ? (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                <SummaryCard
                  label="Selected run"
                  badge={String(selectedRun.status ?? "unknown")}
                  sublabel={formatDate(selectedRun.started_at)}
                />
                <SummaryCard
                  label="Sources"
                  value={numberValue(selectedRun.total_sources)}
                  sublabel="tracked this run"
                />
                <SummaryCard
                  label="Items found"
                  value={numberValue(selectedRun.items_found)}
                  sublabel="raw source items"
                />
                <SummaryCard
                  label="Processed"
                  value={numberValue(selectedRun.items_processed)}
                  sublabel="articles written"
                />
                <SummaryCard
                  label="Body yes"
                  value={selectedRunTotals.bodyYes}
                  sublabel="selected run total"
                />
                <SummaryCard
                  label="Blocked"
                  value={selectedRunTotals.blocked}
                  sublabel="selected run total"
                />
                <SummaryCard
                  label="Not found"
                  value={selectedRunTotals.notFound}
                  sublabel="selected run total"
                />
                <SummaryCard
                  label="Failed sources"
                  value={numberValue(selectedRun.failed_sources)}
                  sublabel="selected run only"
                />
              </div>
            ) : null}

            <div className="mt-4 lg:hidden">
              <div className="grid grid-cols-1 gap-3">
                {selectedRunSources.map((row, index) => {
                  const rowHealth = deriveRunHealthStatus(row);
                  const rowSlug = String(
                    row.source_slug ?? makeSlug(String(row.source_name ?? ""))
                  );

                  return (
                    <article
                      key={`selected-run-mobile-${String(row.id ?? index)}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                          href={`/sources/${rowSlug}`}
                          className={`text-sm font-semibold text-white ${sourceLinkClasses()}`}
                        >
                          {String(row.source_name ?? "Unknown")}
                        </Link>
                        <span className={badgeClasses(rowHealth)}>
                          {healthLabel(rowHealth)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <MiniStat label="Found" value={numberValue(row.items_found)} />
                        <MiniStat label="Processed" value={numberValue(row.items_processed)} />
                        <MiniStat label="Yes" value={numberValue(row.body_yes)} />
                        <MiniStat label="Blocked" value={numberValue(row.body_blocked)} />
                        <MiniStat label="Not found" value={numberValue(row.body_not_found)} />
                        <MiniStat label="Unknown" value={numberValue(row.body_unknown)} />
                      </div>
                    </article>
                  );
                })}

                {selectedRunSources.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                    No source rows found for this run.
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {recentRuns.map((run, index) => {
                  const runId = String(run.id ?? index);
                  const active = runId === String(selectedRun?.id ?? "");

                  return (
                    <article
                      key={`run-mobile-${runId}`}
                      className={`rounded-2xl border p-4 ${
                        active
                          ? "border-cyan-400/20 bg-cyan-500/[0.06]"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link href={makeRunHref(runId)} className="text-sm font-medium text-white hover:text-cyan-200">
                          {formatDate(run.started_at)}
                        </Link>
                        <span className={badgeClasses(String(run.status ?? "unknown").toLowerCase())}>
                          {String(run.status ?? "unknown")}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <MiniStat label="Sources" value={numberValue(run.total_sources)} />
                        <MiniStat label="Found" value={numberValue(run.items_found)} />
                        <MiniStat label="Processed" value={numberValue(run.items_processed)} />
                        <MiniStat label="Failed" value={numberValue(run.failed_sources)} />
                      </div>
                    </article>
                  );
                })}

                {recentRuns.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                    No ingest history recorded yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-white/55">
                    <tr>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Found</th>
                      <th className="px-4 py-3 font-medium">Processed</th>
                      <th className="px-4 py-3 font-medium">Yes</th>
                      <th className="px-4 py-3 font-medium">Blocked</th>
                      <th className="px-4 py-3 font-medium">Not found</th>
                      <th className="px-4 py-3 font-medium">Unknown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRunSources.map((row, index) => {
                      const rowHealth = deriveRunHealthStatus(row);
                      const rowSlug = String(
                        row.source_slug ?? makeSlug(String(row.source_name ?? ""))
                      );

                      return (
                        <tr
                          key={`selected-run-source-${String(row.id ?? index)}`}
                          className="border-t border-white/10 text-white/80"
                        >
                          <td className="px-4 py-3 font-medium text-white">
                            <Link
                              href={`/sources/${rowSlug}`}
                              className={sourceLinkClasses()}
                            >
                              {String(row.source_name ?? "Unknown")}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className={badgeClasses(rowHealth)}>
                              {healthLabel(rowHealth)}
                            </span>
                          </td>
                          <td className="px-4 py-3">{numberValue(row.items_found)}</td>
                          <td className="px-4 py-3">{numberValue(row.items_processed)}</td>
                          <td className="px-4 py-3">{numberValue(row.body_yes)}</td>
                          <td className="px-4 py-3">{numberValue(row.body_blocked)}</td>
                          <td className="px-4 py-3">{numberValue(row.body_not_found)}</td>
                          <td className="px-4 py-3">{numberValue(row.body_unknown)}</td>
                        </tr>
                      );
                    })}

                    {selectedRunSources.length === 0 ? (
                      <tr className="border-t border-white/10 text-white/70">
                        <td className="px-4 py-4" colSpan={8}>
                          No source rows found for this run.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-white/55">
                    <tr>
                      <th className="px-4 py-3 font-medium">Started</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Sources</th>
                      <th className="px-4 py-3 font-medium">Found</th>
                      <th className="px-4 py-3 font-medium">Processed</th>
                      <th className="px-4 py-3 font-medium">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run, index) => {
                      const runId = String(run.id ?? index);
                      const active = runId === String(selectedRun?.id ?? "");

                      return (
                        <tr
                          key={`run-${runId}`}
                          className={`border-t border-white/10 text-white/80 ${
                            active ? "bg-cyan-500/[0.06]" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Link href={makeRunHref(runId)} className="hover:text-cyan-200">
                              {formatDate(run.started_at)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className={badgeClasses(String(run.status ?? "unknown").toLowerCase())}>
                              {String(run.status ?? "unknown")}
                            </span>
                          </td>
                          <td className="px-4 py-3">{numberValue(run.total_sources)}</td>
                          <td className="px-4 py-3">{numberValue(run.items_found)}</td>
                          <td className="px-4 py-3">{numberValue(run.items_processed)}</td>
                          <td className="px-4 py-3">{numberValue(run.failed_sources)}</td>
                        </tr>
                      );
                    })}

                    {recentRuns.length === 0 ? (
                      <tr className="border-t border-white/10 text-white/70">
                        <td className="px-4 py-4" colSpan={6}>
                          No ingest history recorded yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Legacy sources</h2>
            <span className="text-sm text-white/50">{legacySources.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {legacySources.map((item) => {
              const run = item.latestRun;
              const runStatus = String(run?.status ?? "no-run").toLowerCase();

              return (
                <article
                  key={`legacy-${item.sourceSlug}`}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sources/${item.sourceSlug}`}
                          className={`text-lg font-semibold text-white/90 ${sourceLinkClasses()}`}
                        >
                          {item.sourceName}
                        </Link>
                        <span className={badgeClasses("legacy")}>legacy</span>
                      </div>
                      <p className="mt-1 text-xs text-white/45">slug: {item.sourceSlug}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sources/${item.sourceSlug}`}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                      >
                        View source
                      </Link>
                      <span className={badgeClasses(runStatus)}>
                        {run ? runStatus : "no run yet"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-white/60">
                    Kept for historical visibility but not part of the current stable ingest
                    set.
                  </p>

                  {run ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <StatCard label="Found" value={numberValue(run.items_found)} />
                      <StatCard label="Processed" value={numberValue(run.items_processed)} />
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                          Last started
                        </p>
                        <p className="mt-2 text-sm text-white/80">
                          {formatDate(run.started_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                          Last finished
                        </p>
                        <p className="mt-2 text-sm text-white/80">
                          {formatDate(run.finished_at)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}