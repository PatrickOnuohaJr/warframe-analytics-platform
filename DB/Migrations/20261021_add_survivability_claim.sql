-- Replaces the S/A/B/C tier grade with a Jade Light survivability standing.
--
-- survivability_claim is Patrick's own call that a build is a Tier 0 or
-- Tier 1 CANDIDATE. It is never a verified result -- verified results live
-- in wf_user.jade_light_tests (20261021_add_jade_light_tests.sql). The app
-- shows "tested" only when a Jade Light result exists; otherwise a claim
-- shows as "candidate", and no claim means "untested" (the default).
--
-- Tier 2 and below are deliberately not allowed here until defined.

alter table wf_user.my_frames
  add column if not exists survivability_claim text
  check (survivability_claim in ('Tier 0', 'Tier 1'));

-- One-shot wipe of the retired S/A/B/C grades, per Patrick: every build
-- starts untested. The `tier` column itself is left in place (unused by
-- the app) so nothing structural is dropped.
update wf_user.my_frames set tier = null where tier is not null;
