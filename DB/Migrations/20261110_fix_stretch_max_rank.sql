-- Stretch (Warframe): the catalog row is the "Expert" variant (uniqueName
-- .../Expert/AvatarAbilityRangeModExpert) with 11 rank levels (0-10, up to
-- +82.5% Ability Range). The real mod has 5 ranks and tops out at +45%
-- (7.5% x 6 steps), which is exactly what the first 6 catalog rows already
-- say, so cutting the table to ranks 0-5 is correct for this mod.
-- Base drain stays 4 (the audit flagged only max_rank).
--
-- In one transaction, safe to re-run:
--   1. wf_base.mods.max_rank          10 -> 5
--   2. raw_json.fusionLimit           10 -> 5, levelStats cut to ranks 0-5
--   3. wf_user.mod_inventory.owned_rank capped at 5
-- Only touches the regular Stretch (not Archon Stretch).

begin;

select m.mod_id, m.name, m.max_rank,
       jsonb_array_length(m.raw_json->'levelStats') as level_rows,
       (select owned_rank from wf_user.mod_inventory i where i.mod_id = m.mod_id) as my_rank
from wf_base.mods m
where m.name = 'Stretch' and m.category = 'Warframe';

update wf_base.mods m
set max_rank = 5,
    raw_json = jsonb_set(
                 jsonb_set(m.raw_json, '{fusionLimit}', to_jsonb(5)),
                 '{levelStats}',
                 (select jsonb_agg(t.e order by t.n)
                  from jsonb_array_elements(m.raw_json->'levelStats') with ordinality as t(e, n)
                  where t.n <= 6)
               )
where m.name = 'Stretch' and m.category = 'Warframe';

update wf_user.mod_inventory i
set owned_rank = 5
from wf_base.mods m
where i.mod_id = m.mod_id
  and m.name = 'Stretch' and m.category = 'Warframe'
  and i.owned_rank > 5;

-- Verify: expect max_rank 5, 6 level rows, my_rank 5.
select m.name, m.max_rank,
       jsonb_array_length(m.raw_json->'levelStats') as level_rows,
       (select owned_rank from wf_user.mod_inventory i where i.mod_id = m.mod_id) as my_rank
from wf_base.mods m
where m.name = 'Stretch' and m.category = 'Warframe';

commit;
