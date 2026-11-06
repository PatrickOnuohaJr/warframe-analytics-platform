-- Remove Conclave mods from MY inventory only.
--
-- Scope: deletes rows from wf_user.mod_inventory. The mod CATALOG
-- (wf_base.mods) is untouched, so Conclave mods stay in the Add Mods
-- picker and anyone (including you) can add them back later.
--
-- Safe to re-run: a second run finds nothing to delete.
-- Run in the Supabase SQL editor. Step 1 is a read-only preview; step 2
-- makes the changes in one transaction.

-- ---------------------------------------------------------------
-- STEP 1 (preview, read-only): what will be affected
-- ---------------------------------------------------------------
select
  (select count(*) from wf_user.mod_inventory i
     join wf_base.mods m using (mod_id) where m.is_conclave)            as inventory_rows_to_delete,
  (select count(*) from wf_user.loadout_slots s
     join wf_base.mods m using (mod_id) where m.is_conclave)            as loadout_slots_using_them;

-- Names, in case you want to eyeball them first.
select m.name, m.category, i.owned_rank
from wf_user.mod_inventory i
join wf_base.mods m using (mod_id)
where m.is_conclave
order by m.category, m.name;

-- ---------------------------------------------------------------
-- STEP 2: apply
-- ---------------------------------------------------------------
begin;

-- Empty any loadout slot holding a Conclave mod (keeps the slot's
-- polarity; this is how the app itself clears a slot). Done first so
-- no build is left pointing at a mod you no longer own.
update wf_user.loadout_slots s
set mod_id = null
from wf_base.mods m
where s.mod_id = m.mod_id
  and m.is_conclave;

-- Remove the Conclave mods from the inventory.
delete from wf_user.mod_inventory i
using wf_base.mods m
where i.mod_id = m.mod_id
  and m.is_conclave;

-- Verify: both should be 0 before you commit.
select
  (select count(*) from wf_user.mod_inventory i
     join wf_base.mods m using (mod_id) where m.is_conclave) as inventory_left,
  (select count(*) from wf_user.loadout_slots s
     join wf_base.mods m using (mod_id) where m.is_conclave) as slots_left;

commit;
