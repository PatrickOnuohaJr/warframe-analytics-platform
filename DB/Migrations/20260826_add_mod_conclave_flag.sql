-- Conclave mod tagging (Session 012 follow-up, 2026-08-26): while auditing
-- the mod catalog for fakes, Patrick kept hitting real mods he didn't
-- recognize that turned out to be Conclave-exclusive (or Conclave-origin)
-- mods WFCD mixes in alongside normal PvE mods -- clutter for a tracker
-- scoped to real PvE gameplay. Tagged via a real, reliable signal: every
-- Conclave mod's WFCD uniqueName contains "/PvPMods/" in its internal item
-- path (verified against the full 1082-mod catalog -- zero false positives
-- against known PvE-only mods like Hornet Strike).
alter table wf_base.mods add column if not exists is_conclave boolean not null default false;
