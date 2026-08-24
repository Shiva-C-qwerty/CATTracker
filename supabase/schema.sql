-- CAT Prep Tracker — cross-device sync schema.
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Design notes:
--   * One generic `records` table rather than a table per entity. The client
--     already validates shapes and adding an entity later needs no migration.
--   * `updated_at` is the *client* clock and drives last-write-wins.
--     `seq` is server-assigned and drives the pull watermark — the two must
--     stay separate, since client clocks across devices can't be trusted to
--     order writes.
--   * Realtime is attached to a tiny signal table, never to `records`.
--     Mistake screenshots ride inside `data` as base64 and would exceed
--     Realtime's message size limit; clients treat the signal as "go pull".

create sequence if not exists public.records_seq;

create table if not exists public.records (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  table_name text    not null,
  record_id  text    not null,
  data       jsonb,                     -- null for a tombstone
  deleted    boolean not null default false,
  updated_at bigint  not null,
  seq        bigint  not null,
  primary key (user_id, table_name, record_id)
);

-- The pull query is `where user_id = ? and seq > ? order by seq`.
create index if not exists records_pull_idx on public.records (user_id, seq);

create table if not exists public.sync_signal (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seq     bigint not null default 0
);

-- Stamps server ordering and pokes the signal table. SECURITY DEFINER so the
-- insert into sync_signal isn't blocked by that table's read-only RLS policy.
create or replace function public.records_stamp_seq()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.seq := nextval('public.records_seq');
  insert into public.sync_signal (user_id, seq)
  values (new.user_id, new.seq)
  on conflict (user_id) do update set seq = excluded.seq;
  return new;
end $$;

drop trigger if exists records_seq_trigger on public.records;
create trigger records_seq_trigger
  before insert or update on public.records
  for each row execute function public.records_stamp_seq();

alter table public.records     enable row level security;
alter table public.sync_signal enable row level security;

drop policy if exists "own records" on public.records;
create policy "own records" on public.records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Clients only ever read the signal; the trigger writes it.
drop policy if exists "own signal" on public.sync_signal;
create policy "own signal" on public.sync_signal
  for select using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.sync_signal;
exception
  when duplicate_object then null;
end $$;
