-- Requiem Solver: saves the Lich / Sister you are hunting and every stab so far.
--
-- Two tables:
--   adversary_sessions -- one row per Lich or Sister (revealed Requiems, whether
--                         you own Oull, how many Ultimatums you started with)
--   requiem_attempts   -- one row per stab: the three mods you equipped and
--                         which position failed (nothing computed is stored;
--                         the app re-derives the recommendation every time)
--
-- Positions are stored 1-3. failed_slot is NULL when the whole sequence passed.
-- passed_slots lists the positions that were actually checked and passed
-- (slots after the failure were never tested and are not listed).
--
-- Owner-only like the rest of the database. If Supabase warns that a query
-- "creates a table without RLS", pick "Run and enable RLS" -- this script
-- enables it itself.

-- CHECK constraints cannot contain subqueries, so the two array rules live in
-- small immutable functions.
create or replace function wf_user.requiem_all_distinct(items text[])
returns boolean language sql immutable as
$$ select cardinality(items) = (select count(distinct i) from unnest(items) i) $$;

create or replace function wf_user.requiem_passed_slots_ok(passed smallint[], failed smallint, won boolean)
returns boolean language sql immutable as
$$ select case
     when won then failed is null and passed = array[1,2,3]::smallint[]
     else failed is not null
          and passed = coalesce((select array_agg(s::smallint order by s) from generate_series(1, failed - 1) s), '{}')
   end $$;

create table if not exists wf_user.adversary_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid(),
  adversary_type  text not null check (adversary_type in ('kuva_lich', 'sister')),
  adversary_name  text check (adversary_name is null or length(btrim(adversary_name)) between 1 and 60),
  known_requiems  text[] not null default '{}',
  has_oull        boolean not null default false,
  ultimatum_count integer not null default 0 check (ultimatum_count between 0 and 99),
  status          text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,
  constraint known_requiems_valid check (
    cardinality(known_requiems) <= 3
    and known_requiems <@ array['Lohk','Xata','Jahu','Vome','Ris','Fass','Netra','Khra']
    and wf_user.requiem_all_distinct(known_requiems)
  )
);

create table if not exists wf_user.requiem_attempts (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references wf_user.adversary_sessions(id) on delete cascade,
  attempt_number   integer not null check (attempt_number >= 1),
  equipped_sequence text[] not null,
  passed_slots     smallint[] not null default '{}',
  failed_slot      smallint check (failed_slot between 1 and 3),
  succeeded        boolean not null,
  used_ultimatum   boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (session_id, attempt_number),
  constraint equipped_three check (cardinality(equipped_sequence) = 3),
  constraint equipped_known_mods check (
    equipped_sequence <@ array['Lohk','Xata','Jahu','Vome','Ris','Fass','Netra','Khra','Oull']
  ),
  constraint equipped_distinct check (
    equipped_sequence[1] <> equipped_sequence[2]
    and equipped_sequence[1] <> equipped_sequence[3]
    and equipped_sequence[2] <> equipped_sequence[3]
  ),
  -- A pass has no failed slot; a fail has one; Oull can never be the failure.
  constraint outcome_consistent check (
    wf_user.requiem_passed_slots_ok(passed_slots, failed_slot, succeeded)
    and (succeeded or equipped_sequence[failed_slot] <> 'Oull')
  )
);

create index if not exists requiem_attempts_session_idx
  on wf_user.requiem_attempts (session_id, attempt_number);

alter table wf_user.adversary_sessions enable row level security;
alter table wf_user.requiem_attempts   enable row level security;

drop policy if exists "owner all adversary_sessions" on wf_user.adversary_sessions;
create policy "owner all adversary_sessions" on wf_user.adversary_sessions
  for all to authenticated
  using (wf_user.is_owner() and user_id = auth.uid())
  with check (wf_user.is_owner() and user_id = auth.uid());

drop policy if exists "owner all requiem_attempts" on wf_user.requiem_attempts;
create policy "owner all requiem_attempts" on wf_user.requiem_attempts
  for all to authenticated
  using (wf_user.is_owner() and exists (
    select 1 from wf_user.adversary_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (wf_user.is_owner() and exists (
    select 1 from wf_user.adversary_sessions s where s.id = session_id and s.user_id = auth.uid()));

revoke all on wf_user.adversary_sessions, wf_user.requiem_attempts from anon, public;
grant select, insert, update, delete on wf_user.adversary_sessions, wf_user.requiem_attempts to authenticated;
grant select on wf_user.adversary_sessions, wf_user.requiem_attempts to service_role;
