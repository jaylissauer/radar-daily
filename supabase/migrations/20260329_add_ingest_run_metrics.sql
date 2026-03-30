create extension if not exists pgcrypto;

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  total_sources integer not null default 0,
  successful_sources integer not null default 0,
  failed_sources integer not null default 0,
  partial_sources integer not null default 0,
  items_found integer not null default 0,
  items_processed integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ingest_source_runs (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid not null references public.ingest_runs(id) on delete cascade,
  source_name text not null,
  source_slug text not null,
  source_url text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  items_found integer not null default 0,
  items_processed integer not null default 0,
  body_yes integer not null default 0,
  body_blocked integer not null default 0,
  body_not_found integer not null default 0,
  body_unknown integer not null default 0,
  error_text text,
  created_at timestamptz not null default now(),
  unique (ingest_run_id, source_slug)
);

create index if not exists ingest_runs_started_at_idx
  on public.ingest_runs (started_at desc);

create index if not exists ingest_source_runs_ingest_run_id_idx
  on public.ingest_source_runs (ingest_run_id);

create index if not exists ingest_source_runs_source_slug_idx
  on public.ingest_source_runs (source_slug);

create index if not exists ingest_source_runs_started_at_idx
  on public.ingest_source_runs (started_at desc);

alter table public.ingest_runs enable row level security;
alter table public.ingest_source_runs enable row level security;

drop policy if exists "Public read ingest runs" on public.ingest_runs;
create policy "Public read ingest runs"
  on public.ingest_runs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read ingest source runs" on public.ingest_source_runs;
create policy "Public read ingest source runs"
  on public.ingest_source_runs
  for select
  to anon, authenticated
  using (true);
