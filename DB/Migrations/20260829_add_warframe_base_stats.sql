-- D.2-D.5 Survivability Suite -- base Warframe stats.
--
-- wf_base.warframes has never carried stat columns (an earlier abandoned
-- SQL Server schema had them, but the live Postgres rebuild never brought
-- them over -- confirmed by direct query before writing this migration).
-- Without Health/Shield/Armor, a Resilience metric can only ever be a
-- relative mod/shard-bonus sum, not a real effective-HP number, so this
-- is the hard prerequisite for the whole Survivability Suite.
--
-- Sourced from WFCD's /warframes endpoint (health/shield/armor/power/
-- sprintSpeed), same shape as every other wf_base catalog table's
-- raw_json convention. Purely additive -- existing 117 catalog rows are
-- matched and updated by name in DB/Seeds/seed_warframe_stats.py, no new
-- rows inserted (WFCD's extra Warframe-typed entries -- Bonewidow,
-- Voidrig, "Orion & Sirius" -- are Necramech/non-standard and already
-- correctly absent from this catalog; the seed script only ever updates
-- an existing row, never inserts).

alter table wf_base.warframes add column if not exists health integer;
alter table wf_base.warframes add column if not exists shield integer;
alter table wf_base.warframes add column if not exists armor integer;
alter table wf_base.warframes add column if not exists energy integer;
alter table wf_base.warframes add column if not exists sprint_speed numeric;
alter table wf_base.warframes add column if not exists raw_json jsonb;
