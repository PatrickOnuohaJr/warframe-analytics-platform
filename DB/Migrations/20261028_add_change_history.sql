-- Change history: a safety net so an accidental edit or delete can always be undone.
--
-- WHY: on 2026-10-28 Trinity Prime's secondary weapon vanished (an emptied
-- autosaving weapon box saved "no weapon"). The old value was gone for good,
-- because the database only keeps the current row. From now on, every UPDATE
-- or DELETE on your build data first copies the OLD row into
-- wf_user.change_history, so nothing is ever truly lost.
--
-- It records only changes made AFTER this runs; it cannot recover Trinity's
-- old weapon. Rows with no real change (UPDATE to the same values) are skipped.
--
-- HOW TO RECOVER (run in the Supabase SQL editor, e.g. for build 42):
--   select changed_at, operation, old_row->>'secondary_weapon' as secondary_before
--     from wf_user.change_history
--    where table_name = 'my_frames' and my_frame_id = 42
--    order by changed_at desc limit 20;
-- The full old row is in old_row (jsonb), for any table below.
--
-- Covers: my_frames, loadout_slots, loadout_meta, mod_inventory, weapon_inventory,
-- rivens, my_arcanes, ability_configs, archon_shard_slots, archon_shard_slots_target,
-- survivability_goals, jade_light_tests, build_tests, helminth_invigorations,
-- archon_shard_inventory (whichever of these exist).
--
-- Owner-only, like the rest of the database. History grows over time; it can be
-- pruned later, e.g.:  delete from wf_user.change_history where changed_at < now() - interval '1 year';
-- If Supabase warns that a query "creates a table without RLS", pick
-- "Run and enable RLS" -- this script enables it itself.

create table if not exists wf_user.change_history (
  history_id  bigint generated always as identity primary key,
  table_name  text not null,
  operation   text not null check (operation in ('UPDATE', 'DELETE')),
  my_frame_id integer,                 -- filled in when the row belongs to a build
  old_row     jsonb not null,          -- the row exactly as it was before the change
  changed_by  uuid,                    -- the signed-in user, when known
  changed_at  timestamptz not null default now()
);

create index if not exists change_history_lookup
  on wf_user.change_history (table_name, my_frame_id, changed_at desc);

alter table wf_user.change_history enable row level security;

drop policy if exists "owner read history" on wf_user.change_history;
create policy "owner read history" on wf_user.change_history
  for select to authenticated
  using (wf_user.is_owner());
-- No insert/update/delete policy: only the trigger below (and the service role)
-- can write, so history can't be edited or erased from the app.

revoke all on wf_user.change_history from anon, public;
grant select on wf_user.change_history to authenticated;
grant select on wf_user.change_history to service_role;

-- Copies the old row aside after a real change. SECURITY DEFINER so it can write
-- to the locked-down history table on the user's behalf; search_path is pinned.
create or replace function wf_user.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then
    return null;  -- nothing actually changed
  end if;

  insert into wf_user.change_history (table_name, operation, my_frame_id, old_row, changed_by)
  values (
    tg_table_name,
    tg_op,
    nullif(to_jsonb(old) ->> 'my_frame_id', '')::integer,
    to_jsonb(old),
    auth.uid()
  );
  return null;  -- AFTER trigger: the return value is ignored
end;
$$;

revoke all on function wf_user.log_change() from public, anon;

do $$
declare
  t text;
begin
  foreach t in array array[
    'my_frames', 'loadout_slots', 'loadout_meta', 'mod_inventory', 'weapon_inventory',
    'rivens', 'my_arcanes', 'ability_configs', 'archon_shard_slots',
    'archon_shard_slots_target', 'survivability_goals', 'jade_light_tests',
    'build_tests', 'helminth_invigorations', 'archon_shard_inventory'
  ]
  loop
    if to_regclass(format('wf_user.%I', t)) is not null then
      execute format('drop trigger if exists log_change on wf_user.%I', t);
      execute format(
        'create trigger log_change after update or delete on wf_user.%I for each row execute function wf_user.log_change()',
        t
      );
    end if;
  end loop;
end
$$;
