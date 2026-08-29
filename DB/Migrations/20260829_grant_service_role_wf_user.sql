-- Fixes a pre-existing gap noticed while verifying D.2-D.5 (Session 015):
-- every wf_user migration's grant line lists only `anon, authenticated`
-- (see e.g. 20260827_add_rivens.sql, 20260826_add_weapon_inventory.sql,
-- 20260829_add_survivability_profiles.sql) -- service_role was never
-- included, so the ad-hoc debug/seed scripts that use the service key
-- (DB/Seeds/*.py) get "permission denied for table X" on these four.
-- Doesn't affect the real app, which always reads through the anon-key
-- path -- this only unblocks one-off scripting against these tables.
--
-- Read-only: these tables hold player-entered data (Rivens, weapon
-- ownership, field-test results, survivability goals), not WFCD catalog
-- rows a seed script would ever write to, so service_role only needs
-- select here, not the full anon/authenticated insert/update/delete grant.
grant select on wf_user.rivens to service_role;
grant select on wf_user.weapon_inventory to service_role;
grant select on wf_user.build_tests to service_role;
grant select on wf_user.survivability_goals to service_role;
