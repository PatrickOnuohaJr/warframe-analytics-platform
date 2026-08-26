-- Fix: the RLS policies from 20260826_add_mods_schema.sql didn't take
-- effect. wf_base.mods has 1005 rows (confirmed via service key) but the
-- anon key gets an empty result set -- RLS is enabled with no working
-- policy. The new wf_user tables are worse: even the service/secret key
-- gets 403 Forbidden, meaning grants didn't land either.
-- Idempotent -- safe to run regardless of current state.

drop policy if exists "Allow all access to mods" on wf_base.mods;
drop policy if exists "Allow all access to mod_inventory" on wf_user.mod_inventory;
drop policy if exists "Allow all access to loadout_slots" on wf_user.loadout_slots;
drop policy if exists "Allow all access to loadout_meta" on wf_user.loadout_meta;

alter table wf_base.mods enable row level security;
alter table wf_user.mod_inventory enable row level security;
alter table wf_user.loadout_slots enable row level security;
alter table wf_user.loadout_meta enable row level security;

create policy "Allow all access to mods" on wf_base.mods for all using (true) with check (true);
create policy "Allow all access to mod_inventory" on wf_user.mod_inventory for all using (true) with check (true);
create policy "Allow all access to loadout_slots" on wf_user.loadout_slots for all using (true) with check (true);
create policy "Allow all access to loadout_meta" on wf_user.loadout_meta for all using (true) with check (true);

grant select, insert, update, delete on wf_base.mods to anon, authenticated, service_role;
grant select, insert, update, delete on wf_user.mod_inventory to anon, authenticated, service_role;
grant select, insert, update, delete on wf_user.loadout_slots to anon, authenticated, service_role;
grant select, insert, update, delete on wf_user.loadout_meta to anon, authenticated, service_role;

grant usage, select on sequence wf_base.mods_mod_id_seq to anon, authenticated, service_role;
grant usage, select on sequence wf_user.mod_inventory_inventory_id_seq to anon, authenticated, service_role;
grant usage, select on sequence wf_user.loadout_slots_slot_id_seq to anon, authenticated, service_role;
grant usage, select on sequence wf_user.loadout_meta_meta_id_seq to anon, authenticated, service_role;
