-- Removes every "Flawed ..." mod from Patrick's owned inventory.
--
-- Flawed mods are the weak starter versions; Patrick does not use them and
-- they clutter the picker and the Mods page. Checked read-only on 2026-11-04:
-- 27 owned Flawed mods, none equipped in any loadout slot.
--
-- Only wf_user.mod_inventory rows are deleted. The wf_base.mods catalog is
-- left alone (it is reseeded from WFCD data). Mods currently equipped in a
-- slot are skipped, so no build can lose a mod it is using.
-- Safe to re-run: a second run finds nothing to delete.

delete from wf_user.mod_inventory inv
using wf_base.mods m
where inv.mod_id = m.mod_id
  and m.name like 'Flawed %'
  and not exists (
    select 1 from wf_user.loadout_slots s where s.mod_id = inv.mod_id
  );

-- Check afterwards: should return 0 rows (or only any that are equipped).
-- select m.name from wf_user.mod_inventory inv
-- join wf_base.mods m using (mod_id) where m.name like 'Flawed %';
