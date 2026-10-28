-- Your own weapon tags, edited from the Armory.
--
-- The Armory derives tags automatically from weapon stats (Beam, High Fire
-- Rate, Heat...). This table holds YOUR changes on top of those:
--   hidden = false  -> a custom tag you added (e.g. "Punch Through")
--   hidden = true   -> an automatic tag you turned off for that weapon
-- Deleting a row puts things back to the automatic default.
--
-- Owner-only, like the rest of the database. If Supabase warns that a query
-- "creates a table without RLS", pick "Run and enable RLS" -- this script
-- enables it itself.

create table if not exists wf_user.weapon_tags (
  weapon_id  integer not null,
  tag        text    not null check (length(btrim(tag)) between 1 and 40),
  hidden     boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (weapon_id, tag)
);

alter table wf_user.weapon_tags enable row level security;

drop policy if exists "owner all weapon_tags" on wf_user.weapon_tags;
create policy "owner all weapon_tags" on wf_user.weapon_tags
  for all to authenticated
  using (wf_user.is_owner())
  with check (wf_user.is_owner());

revoke all on wf_user.weapon_tags from anon, public;
grant select, insert, update, delete on wf_user.weapon_tags to authenticated;
grant select on wf_user.weapon_tags to service_role;
