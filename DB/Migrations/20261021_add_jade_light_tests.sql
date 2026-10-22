-- Jade Light survivability tests -- the VERIFIED survivability record.
--
-- Patrick's survivability standard is binary and empirical, not a number:
-- stand underneath a full Jade Light (~8s) while mobbed, no evading.
--   Tier 0 ("Bathroom Big")  -- survived with no player intervention
--   Tier 1 (Active)          -- survived, but needed active defensive upkeep
--   Did not survive          -- failed the test
-- Default setting: Steel Path 1999 Scaldre/Techrot survival missions (high enemy
-- density). Void Steel Path is an occasional alternate; Archimedea without
-- modifiers is a newer option; Icebind is locked for now.
-- Tier 2 and below are deliberately NOT defined yet (needs calibration);
-- do not add values for them here until Patrick defines them.
--
-- Every row is a verified result by definition. Gu's computed numbers
-- (effective health etc.) are PREDICTIONS and never write to this table.
--
-- Separate from wf_user.build_tests: that table logs "I changed X, did it
-- work?" experiments (Pass/Fail/Inconclusive). This one records a build's
-- standing against the fixed Jade Light benchmark.
--
-- loadout_snapshot freezes the build as it was when the result was logged
-- (mods, shards, arcanes, subsumed ability) so later edits to the build
-- can't rewrite what earned the tier.

create table if not exists wf_user.jade_light_tests (
  test_id serial primary key,
  my_frame_id integer not null references wf_user.my_frames(my_frame_id) on delete cascade,
  result text not null check (result in ('Tier 0', 'Tier 1', 'Did not survive')),
  environment text,               -- free text so new test settings need no migration; UI offers the known ones (utils/jadeLightSnapshot.js)
  tested_on date,                 -- when the test happened (null = unknown)
  loadout_snapshot jsonb,         -- build state when logged; see utils/jadeLightSnapshot.js
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists jade_light_tests_frame_idx on wf_user.jade_light_tests (my_frame_id, tested_on desc);

alter table wf_user.jade_light_tests enable row level security;

-- Same permissive single-user pattern as every other wf_user table today.
-- Tightening happens with the shared-beta access work (see Docs/HANDOFF.md).
create policy "Allow all access to jade_light_tests" on wf_user.jade_light_tests for all using (true) with check (true);

grant select, insert, update, delete on wf_user.jade_light_tests to anon, authenticated;
grant select on wf_user.jade_light_tests to service_role;
grant usage, select on sequence wf_user.jade_light_tests_test_id_seq to anon, authenticated;
