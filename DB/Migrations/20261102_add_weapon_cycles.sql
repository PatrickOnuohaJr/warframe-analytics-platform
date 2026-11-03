-- Kuva weapon cycle tracker: remembers which Kuva weapons you have cycled past
-- (finished a mission without taking the Larvling's weapon) and which one you
-- are hunting.
--
-- One row per user per pool. `pool` is 'kuva' for now. `rejected` is the reject
-- list; the app clears it when you accept a weapon or when every weapon has
-- cycled. The app validates the weapon names; the database only guards the
-- shape (distinct, bounded).
--
-- Owner-only like the rest of the database. If Supabase warns that a query
-- "creates a table without RLS", pick "Run and enable RLS" -- this script
-- enables it itself.

-- CHECK constraints cannot contain subqueries, so the distinctness rule lives
-- in a small immutable function.
create or replace function wf_user.weapon_cycle_all_distinct(items text[])
returns boolean language sql immutable as
$$ select cardinality(items) = (select count(distinct i) from unnest(items) i) $$;

create table if not exists wf_user.weapon_cycles (
  user_id    uuid not null default auth.uid(),
  pool       text not null check (pool in ('kuva')),
  rejected   text[] not null default '{}',
  target     text check (target is null or length(btrim(target)) between 1 and 60),
  updated_at timestamptz not null default now(),
  primary key (user_id, pool),
  constraint rejected_bounded check (
    cardinality(rejected) <= 40 and wf_user.weapon_cycle_all_distinct(rejected)
  )
);

-- Added after the first version of this file: the weapon of the Lich currently
-- holding your slot. Safe to re-run this whole file; it only adds what is missing.
alter table wf_user.weapon_cycles
  add column if not exists current_lich text
  check (current_lich is null or length(btrim(current_lich)) between 1 and 60);

alter table wf_user.weapon_cycles enable row level security;

drop policy if exists "owner all weapon_cycles" on wf_user.weapon_cycles;
create policy "owner all weapon_cycles" on wf_user.weapon_cycles
  for all to authenticated
  using (wf_user.is_owner() and user_id = auth.uid())
  with check (wf_user.is_owner() and user_id = auth.uid());

revoke all on wf_user.weapon_cycles from anon, public;
grant select, insert, update, delete on wf_user.weapon_cycles to authenticated;
grant select on wf_user.weapon_cycles to service_role;
