drop policy if exists "Public insert ingest runs" on public.ingest_runs;
create policy "Public insert ingest runs"
  on public.ingest_runs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public insert ingest source runs" on public.ingest_source_runs;
create policy "Public insert ingest source runs"
  on public.ingest_source_runs
  for insert
  to anon, authenticated
  with check (true);
