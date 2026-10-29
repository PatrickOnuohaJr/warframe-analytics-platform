-- Loadout configs (A / B / C) for loadout_slots and loadout_meta.
--
-- In game a Companion (and later a Warframe) carries several mod
-- configurations. Until now each (build, piece, slot) held exactly one mod,
-- so a second configuration had nowhere to live. config_slot adds that
-- dimension: every existing row becomes config 'A', so nothing already
-- entered changes meaning.
--
-- BREAKING CUT: the unique key the app upserts on changes from
--   (my_frame_id, equipment_type, slot_position)   [loadout_slots]
--   (my_frame_id, equipment_type)                  [loadout_meta]
-- to the same columns plus config_slot. The new frontend upserts on the new
-- key and the old frontend upserts on the old one, so run this right after
-- the code ships (a few minutes of failed mod saves in between is expected).
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table wf_user.loadout_slots
  add column if not exists config_slot text not null default 'A';
alter table wf_user.loadout_meta
  add column if not exists config_slot text not null default 'A';

alter table wf_user.loadout_slots drop constraint if exists loadout_slots_config_slot_check;
alter table wf_user.loadout_slots
  add constraint loadout_slots_config_slot_check check (config_slot in ('A', 'B', 'C'));
alter table wf_user.loadout_meta drop constraint if exists loadout_meta_config_slot_check;
alter table wf_user.loadout_meta
  add constraint loadout_meta_config_slot_check check (config_slot in ('A', 'B', 'C'));

-- Drop whatever unique constraint currently covers the old key (looked up
-- rather than named, so a differently-named constraint can't make this fail),
-- then add the config-aware one.
do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'u'
      and conrelid in ('wf_user.loadout_slots'::regclass, 'wf_user.loadout_meta'::regclass)
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table wf_user.loadout_slots
  add constraint loadout_slots_build_piece_slot_config_key
  unique (my_frame_id, equipment_type, slot_position, config_slot);
alter table wf_user.loadout_meta
  add constraint loadout_meta_build_piece_config_key
  unique (my_frame_id, equipment_type, config_slot);

-- Check: should list exactly the two new constraints, and every existing row
-- should now be config 'A'.
--   select conrelid::regclass, conname from pg_constraint
--    where contype = 'u' and conrelid in
--      ('wf_user.loadout_slots'::regclass, 'wf_user.loadout_meta'::regclass);
--   select config_slot, count(*) from wf_user.loadout_slots group by 1;
