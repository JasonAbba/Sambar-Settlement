create table if not exists public.app_records (
  collection text not null check (collection in ('users','menuItems','lunches','orders','settlements','meta')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.app_records enable row level security;
drop policy if exists "lunch group read" on public.app_records;
drop policy if exists "lunch group insert" on public.app_records;
drop policy if exists "lunch group update" on public.app_records;
drop policy if exists "lunch group delete" on public.app_records;
create policy "lunch group read"   on public.app_records for select to anon, authenticated using (true);
create policy "lunch group insert" on public.app_records for insert to anon, authenticated with check (true);
create policy "lunch group update" on public.app_records for update to anon, authenticated using (true) with check (true);
create policy "lunch group delete" on public.app_records for delete to anon, authenticated using (true);
grant select, insert, update, delete on public.app_records to anon, authenticated;
alter table public.app_records replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_records') then
    alter publication supabase_realtime add table public.app_records;
  end if;
end $$;
