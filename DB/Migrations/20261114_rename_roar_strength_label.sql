-- Roar's wiki field is called "strength" but the number is a damage bonus
-- (+50% at home, +30% when Helminth-subsumed). Relabel it so the loadout card
-- says "Damage Bonus" instead of "Strength". Label only: the key and the
-- scaling (still by Ability Strength) are unchanged. Covers base and subsumed
-- rows. Safe to re-run.
update wf_base.ability_parameters
set label = 'Damage Bonus'
where parameter_key = 'strength'
  and ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Roar');

select context, parameter_key, label, base_value
from wf_base.ability_parameters
where ability_catalog_id = (select ability_catalog_id from wf_base.ability_catalog where ability_name = 'Roar')
order by context, sort_order;
