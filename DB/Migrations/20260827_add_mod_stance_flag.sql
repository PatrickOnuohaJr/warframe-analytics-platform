-- Stance slot support (Session 013 follow-up): melee weapons have a real,
-- dedicated Stance slot in-game -- structurally identical to how Aura works
-- for Warframes (its own special slot, not one of the 8 numbered ones).
-- WFCD's raw mod "type" field already distinguishes "Stance Mod" from
-- "Melee Mod", but seed_mods.py's TYPE_TO_CATEGORY collapses both into
-- category="Melee" (a stance mod is still melee-exclusive, so the category
-- collapse itself was correct) -- this column preserves the distinction
-- the same way is_aura/is_exilus/is_conclave already do for their own
-- special-slot concepts.
alter table wf_base.mods add column if not exists is_stance boolean not null default false;
