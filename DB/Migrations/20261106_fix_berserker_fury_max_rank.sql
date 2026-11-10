-- Berserker Fury: the catalog gave it 11 rank levels (0-10, up to +64.2%
-- attack speed, drain 14). In the real game, and on the wiki, it is a
-- 5-rank mod: +35% attack speed and 9 drain at rank 5. Patrick confirmed
-- with the in-game card (9 drain, +35%, 5 rank pips).
--
-- This fixes three things, in one transaction, safe to re-run:
--   1. wf_base.mods.max_rank          10 -> 5
--   2. raw_json.fusionLimit           10 -> 5, and levelStats cut to ranks 0-5
--   3. wf_user.mod_inventory.owned_rank for this mod is capped at 5 (it was
--      saved as 10, which is what made the loadout show 14 drain, not 9).
--
-- Other mods may have the same kind of extra rank levels in the catalog;
-- this only touches Berserker Fury.

begin;

-- Preview of what will change (read-only; shown in the editor's result tab).
select m.mod_id, m.name, m.max_rank,
       jsonb_array_length(m.raw_json->'levelStats') as level_rows,
       (select owned_rank from wf_user.mod_inventory i where i.mod_id = m.mod_id) as my_rank
from wf_base.mods m
where m.name = 'Berserker Fury' and m.category = 'Melee';

update wf_base.mods m
set max_rank = 5,
    raw_json = jsonb_set(
                 jsonb_set(m.raw_json, '{fusionLimit}', to_jsonb(5)),
                 '{levelStats}',
                 (select jsonb_agg(t.e order by t.n)
                  from jsonb_array_elements(m.raw_json->'levelStats') with ordinality as t(e, n)
                  where t.n <= 6)
               )
where m.name = 'Berserker Fury' and m.category = 'Melee';

update wf_user.mod_inventory i
set owned_rank = 5
from wf_base.mods m
where i.mod_id = m.mod_id
  and m.name = 'Berserker Fury' and m.category = 'Melee'
  and i.owned_rank > 5;

-- Verify: expect max_rank 5, 6 level rows, my_rank 5.
select m.name, m.max_rank,
       jsonb_array_length(m.raw_json->'levelStats') as level_rows,
       (select owned_rank from wf_user.mod_inventory i where i.mod_id = m.mod_id) as my_rank
from wf_base.mods m
where m.name = 'Berserker Fury' and m.category = 'Melee';

commit;
