import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type GenericRow = Record<string, unknown>;
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

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function deriveDiagnosticHealthStatus(diagnostic: GenericRow | null): HealthStatus | null {
  if (!diagnostic) return null;

  const diagnosticStatus = String(diagnostic.status ?? "").toLowerCase().trim();

  if (
    diagnosticStatus === "failed" ||
    diagnosticStatus === "partial" ||
    diagnosticStatus === "degraded" ||
    diagnosticStatus === "stale" ||
    diagnosticStatus === "inactive"
  ) {
    return diagnosticStatus as HealthStatus;
  }

  if (diagnosticStatus === "legacy") return "legacy";
  if (diagnosticStatus === "active") return "active";

  return null;
}

function healthLabel(status: HealthStatus) {
  switch (status) {
    case "no-run":
      return "no run yet";
    default:
      return status;
  }
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-white/55">{sublabel}</p> : null}
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

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-200">
          Missing Supabase environment variables.
        </div>
      </main>
    );
  }

  const [diagnosticsResult, sourceRunsResult] = await Promise.all([
    supabase.from("source_diagnostics").select("*").order("source_name", { ascending: true }),
    supabase.from("ingest_source_runs").select("*").order("started_at", { ascending: false }).limit(500),
  ]);

  const diagnostics = diagnosticsResult.data ?? [];
  const sourceRuns = sourceRunsResult.data ?? [];

  const diagnosticRow =
    diagnostics.find((row) => {
      const sourceSlug = String(row.source_slug ?? makeSlug(String(row.source_name ?? "")));
      return sourceSlug === slug;
    }) ?? null;

  const sourceRows = sourceRuns.filter((row) => {
    const sourceSlug = String(row.source_slug ?? makeSlug(String(row.source_name ?? "")));
    return sourceSlug === slug;
  });

  const sourceName =
    String(diagnosticRow?.source_name ?? sourceRows[0]?.source_name ?? "").trim() || slug;

  if (!diagnosticRow && sourceRows.length === 0) {
    notFound();
  }

  const latestRun = sourceRows[0] ?? null;
  const diagnosticStatus = deriveDiagnosticHealthStatus(diagnosticRow);
  const runHealth = deriveRunHealthStatus(latestRun);
  const healthStatus =
    diagnosticStatus && diagnosticStatus !== "active" ? diagnosticStatus : runHealth;

  const lifecycle =
    String(diagnosticRow?.status ?? "").toLowerCase().includes("legacy") ? "legacy" : "active";

  const note = textValue(diagnosticRow?.notes);

  const recentRuns = sourceRows.slice(0, 8);

  const totals = recentRuns.reduce(
    (acc, row) => {
      acc.found += numberValue(row.items_found);
      acc.processed += numberValue(row.items_processed);
      acc.yes += numberValue(row.body_yes);
      acc.blocked += numberValue(row.body_blocked);
      acc.notFound += numberValue(row.body_not_found);
      acc.unknown += numberValue(row.body_unknown);
      return acc;
    },
    {
      found: 0,
      processed: 0,
      yes: 0,
      blocked: 0,
      notFound: 0,
      unknown: 0,
    }
  );

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                Source detail
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {sourceName}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={badgeClasses(lifecycle)}>{lifecycle}</span>
                <span className={badgeClasses(healthStatus)}>
                  {healthLabel(healthStatus)}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                  slug: {slug}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/sources"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Back to sources
              </Link>
            </div>
          </div>

          {note ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                Diagnostic note
              </p>
              <p className="mt-2 text-sm leading-6 text-white/70">{note}</p>
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <StatCard label="Latest found" value={numberValue(latestRun?.items_found)} />
          <StatCard label="Latest processed" value={numberValue(latestRun?.items_processed)} />
          <StatCard label="Latest yes" value={numberValue(latestRun?.body_yes)} />
          <StatCard label="Latest blocked" value={numberValue(latestRun?.body_blocked)} />
          <StatCard label="Latest not found" value={numberValue(latestRun?.body_not_found)} />
          <StatCard label="Latest unknown" value={numberValue(latestRun?.body_unknown)} />
          <StatCard label="Last started" value={formatDate(latestRun?.started_at)} />
          <StatCard label="Last finished" value={formatDate(latestRun?.finished_at)} />
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="8-run found" value={totals.found} />
          <StatCard label="8-run processed" value={totals.processed} />
          <StatCard label="8-run yes" value={totals.yes} />
          <StatCard label="8-run blocked" value={totals.blocked} />
          <StatCard label="8-run not found" value={totals.notFound} />
          <StatCard label="8-run unknown" value={totals.unknown} />
        </section>

        {latestRun?.error_text ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">
            <p className="text-sm font-semibold">Latest run error</p>
            <p className="mt-2 text-sm leading-6">{String(latestRun.error_text)}</p>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent run history</h2>
            <span className="text-sm text-white/50">{recentRuns.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {recentRuns.map((row, index) => {
              const rowHealth = deriveRunHealthStatus(row);

              return (
                <article
                  key={`mobile-run-${String(row.id ?? index)}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-white/75">{formatDate(row.started_at)}</p>
                    <span className={badgeClasses(rowHealth)}>{healthLabel(rowHealth)}</span>
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

            {recentRuns.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                No runs recorded for this source yet.
              </div>
            ) : null}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-white/5 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-white/55">
                  <tr>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Found</th>
                    <th className="px-4 py-3 font-medium">Processed</th>
                    <th className="px-4 py-3 font-medium">Yes</th>
                    <th className="px-4 py-3 font-medium">Blocked</th>
                    <th className="px-4 py-3 font-medium">Not found</th>
                    <th className="px-4 py-3 font-medium">Unknown</th>
                    <th className="px-4 py-3 font-medium">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((row, index) => {
                    const rowHealth = deriveRunHealthStatus(row);

                    return (
                      <tr
                        key={`desktop-run-${String(row.id ?? index)}`}
                        className="border-t border-white/10 text-white/80"
                      >
                        <td className="px-4 py-3">{formatDate(row.started_at)}</td>
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
                        <td className="px-4 py-3">{formatDate(row.finished_at)}</td>
                      </tr>
                    );
                  })}

                  {recentRuns.length === 0 ? (
                    <tr className="border-t border-white/10 text-white/70">
                      <td className="px-4 py-4" colSpan={9}>
                        No runs recorded for this source yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {["openai", "anthropic", "google", "hugging-face", "meta"].map((item) => (
              <Link
                key={item}
                href={`/sources/${item}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  item === slug
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
