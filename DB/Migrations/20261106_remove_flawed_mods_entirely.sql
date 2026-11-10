-- Remove every "Flawed ..." mod from Cephalon Gu entirely.
--
-- Patrick does not use Flawed mods and does not want them anywhere: not in
-- the catalog, the picker, the Mods page, search, or the database. The
-- seeder (DB/Seeds/seed_mods.py) now skips them too, so a reseed will not
-- bring them back.
--
-- Order matters because other tables point at wf_base.mods:
--   1. clear any loadout slot holding a Flawed mod (slot stays, mod removed)
--   2. delete the Flawed rows from wf_user.mod_inventory
--   3. delete the Flawed rows from the wf_base.mods catalog
-- All in one transaction. Safe to re-run: a second run finds nothing.
-- This permanently deletes catalog rows; they can only come back by
-- removing the skip in seed_mods.py and reseeding.

begin;

-- Preview (read-only): expect about 92 catalog rows. Inventory and slot
-- counts show what else is touched.
select
  (select count(*) from wf_base.mods where name like 'Flawed %')                     as catalog_rows,
  (select count(*) from wf_user.mod_inventory i
     join wf_base.mods m using (mod_id) where m.name like 'Flawed %')                as inventory_rows,
  (select count(*) from wf_user.loadout_slots s
     join wf_base.mods m using (mod_id) where m.name like 'Flawed %')                as slots_using_them;

update wf_user.loadout_slots s
set mod_id = null
from wf_base.mods m
where s.mod_id = m.mod_id and m.name like 'Flawed %';

delete from wf_user.mod_inventory i
using wf_base.mods m
where i.mod_id = m.mod_id and m.name like 'Flawed %';

delete from wf_base.mods where name like 'Flawed %';

-- Verify: all three should be 0 before the commit.
select
  (select count(*) from wf_base.mods where name like 'Flawed %')                     as catalog_left,
  (select count(*) from wf_user.mod_inventory i
     join wf_base.mods m using (mod_id) where m.name like 'Flawed %')                as inventory_left,
  (select count(*) from wf_user.loadout_slots s
     join wf_base.mods m using (mod_id) where m.name like 'Flawed %')                as slots_left;

commit;
