-- Corrects Arcane Blessing's stale seeded text in wf_base.arcanes.
--
-- Seeded value: "+900 Max Health for 30s (stackable)", trigger "Health Orb pickup".
-- Real in-game text at rank 5 (Patrick's Arsenal tooltip, 2026-10-23):
--   "On Health Pickup: +24 Max Health. Stacks up to 50x. +1 Arcane Revive"
--
-- One-row manual correction from direct in-game evidence. It is NOT a
-- Static Data pipeline promotion -- canonical promotion there stays
-- review-gated (see Docs/Static Data/). When the pipeline later reconciles
-- Arcanes it should confirm this row against upstream.
--
-- raw_json is kept in sync with the flat columns so the two can't disagree.

update wf_base.arcanes
set effect_r5 = '+24 Max Health. Stacks up to 50x. +1 Arcane Revive',
    trigger   = 'Health pickup',
    raw_json  = jsonb_set(
                  jsonb_set(raw_json, '{effect_r5}', to_jsonb('+24 Max Health. Stacks up to 50x. +1 Arcane Revive'::text)),
                  '{trigger}', to_jsonb('Health pickup'::text)
                )
where name = 'Arcane Blessing';
