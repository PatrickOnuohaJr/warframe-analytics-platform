-- Patrick's own survivability archetype tag for a build, used by the Codex
-- filter buttons (Health Tanks / Shield Tanks / Hybrids). Set by hand in the
-- build modal; null = not classified. A3 may later infer archetypes, but this
-- column is the manual declaration, not an inference.
--
-- Overguard Tank is intentionally not allowed yet (not measurable by Gu today).

alter table wf_user.my_frames
  add column if not exists survivability_archetype text
  check (survivability_archetype in ('Health Tank', 'Shield Tank', 'Hybrid'));
