-- Cleans up the Arcane catalog after the 2026-10-24 source-of-truth audit
-- (see Docs/Static Data/Arcane SoT Audit 2026-10-24.csv and
-- 20261028_promote_wfcd_arcane_effect_text.sql, which should be run first).
--
-- 1. RENAMES two misspelled stub rows to their real names and fills them in:
--      Arcane Hotshot     -> Arcane Hot Shot
--      Arcane Trunculence -> Arcane Truculence
--    Safe to rename: no build references either name (checked), and owned-copy
--    rows point at arcane_id, which does not change.
-- 2. ADDS 5 arcanes Gu was missing (all confirmed current on wiki.warframe.com):
--    Arcane Ice Storm, Arcane Sculptor, Melee Assimilation, Primary Compression,
--    Secondary Cryogenic.
--
-- NOT added (deliberately): Arcane Defense, Detoxifier, Liquid, Protection, Shield,
-- Survival, Temperance. WFCD lists them but they have no drops and do not appear on
-- the wiki's current arcane page; add them only if Patrick sees them in game.
--
-- Text/trigger come from WFCD, same cleaning as the other file. wfm_slug is left
-- null rather than guessed. Re-running is harmless: renames match on the old name,
-- inserts skip names that already exist.
--
-- UNDO: a full-row backup is taken first (wf_base.arcanes_rowbackup_20261028). To
-- undo the inserts and renames:
--   delete from wf_base.arcanes where arcane_id > (select max(arcane_id) from wf_base.arcanes_rowbackup_20261028);
--   update wf_base.arcanes a set name = b.name, effect_r5 = b.effect_r5, trigger = b.trigger,
--          source = b.source, raw_json = b.raw_json, rarity = b.rarity, added_update = b.added_update
--     from wf_base.arcanes_rowbackup_20261028 b where b.arcane_id = a.arcane_id;

begin;

create table if not exists wf_base.arcanes_rowbackup_20261028 as
  select * from wf_base.arcanes;
alter table wf_base.arcanes_rowbackup_20261028 enable row level security;
revoke all on wf_base.arcanes_rowbackup_20261028 from anon, authenticated, public;

-- 1. renames + fill-in
with ren (arcane_id, old_name, new_name, rarity, trig, effect, source, added) as (
values
  (416, $t$Arcane Hotshot$t$, $t$Arcane Hot Shot$t$, $t$Legendary$t$, $t$$t$, $t$Gain 6% weapon Critical Chance for 10s, when using abilities to inflict Heat Status effect on enemies. Maximum 50x stacks. +1 Arcane Revive.$t$, $t$Temporal Archimedea rewards$t$, $t$38.5$t$),
  (420, $t$Arcane Trunculence$t$, $t$Arcane Truculence$t$, $t$Rare$t$, $t$$t$, $t$When gaining 3,000 or more Overguard threshold, release a 30m Radial Attack that applies max Viral Status stacks. +1 Arcane Revive.$t$, $t$H-09 Apex / Efervon Tank$t$, $t$38.0$t$)
),
renamed as (
  update wf_base.arcanes a
     set name         = r.new_name,
         effect_r5    = r.effect,
         trigger      = nullif(r.trig, ''),
         source       = r.source,
         rarity       = r.rarity,
         added_update = r.added,
         tradable     = true,
         is_tradeable = true,
         raw_json     = jsonb_build_object(
                          'name', r.new_name, 'rarity', r.rarity, 'trigger', nullif(r.trig, ''),
                          'category', 'Warframe', 'max_rank', 5, 'effect_r5', r.effect,
                          'source', r.source, 'added_update', r.added,
                          'seed_source', '20261028_fix_missing_and_misnamed_arcanes.sql')
    from ren r
   where a.arcane_id = r.arcane_id and a.name = r.old_name
  returning a.name
)
select count(*) as renamed_rows, 2 as expected from renamed;

-- 2. new arcanes (ids continue after the current highest)
with new_rows (name, arcane_type, rarity, trig, effect, source, added) as (
values
  ($t$Arcane Ice Storm$t$, $t$Warframe$t$, $t$Rare$t$, $t$$t$, $t$On Enemy Frozen: Gain +2% Ability Strength and +2% Ability Duration for 15s. Stacks up to 20x. +1 Arcane Revive.$t$, $t$Sisters of Parvos (Ascension) / Ordis shop$t$, $t$36.0$t$),
  ($t$Arcane Sculptor$t$, $t$Warframe$t$, $t$Rare$t$, $t$$t$, $t$On creating an object with abilities: casts have 175% Ability Efficiency for 12s. +1 Arcane Revive.$t$, $t$Kuva Wytch / Scoria's Angel (Uranus Skirmish) / Hunhow shop$t$, $t$43.0$t$),
  ($t$Melee Assimilation$t$, $t$Melee$t$, $t$Rare$t$, $t$Shield Break$t$, $t$+150% Melee Damage on Heavy Attack and Heavy Attack kills restore +30% of max Shields for 20s.$t$, $t$Kuva Wytch / Scoria's Angel (Uranus Skirmish) / Hunhow shop$t$, $t$43.0$t$),
  ($t$Primary Compression$t$, $t$Primary$t$, $t$Rare$t$, $t$$t$, $t$On aim: x0.2 explosion radius, +100% damage and +5.5% ammo efficiency for every 1m radius lost.$t$, $t$Kuva Wytch / Scoria's Angel (Uranus Skirmish) / Hunhow shop$t$, $t$43.0$t$),
  ($t$Secondary Cryogenic$t$, $t$Secondary$t$, $t$Rare$t$, $t$$t$, $t$On Puncture: Apply 3 Cold stacks on targets within 15m.$t$, $t$Kuva Wytch / Scoria's Angel (Uranus Skirmish) / Hunhow shop$t$, $t$43.0$t$)
),
numbered as (
  select v.*, row_number() over (order by v.name) as n
    from new_rows v
   where not exists (select 1 from wf_base.arcanes x where x.name = v.name)
),
base as (select coalesce(max(arcane_id), 0) as max_id from wf_base.arcanes),
inserted as (
  insert into wf_base.arcanes
    (arcane_id, name, arcane_type, rarity, trigger, effect_r5, source, added_update, max_rank, tradable, is_tradeable, raw_json)
  select base.max_id + nr.n, nr.name, nr.arcane_type, nr.rarity, nullif(nr.trig, ''), nr.effect, nr.source, nr.added, 5, true, true,
         jsonb_build_object('name', nr.name, 'rarity', nr.rarity, 'trigger', nullif(nr.trig, ''),
                            'category', nr.arcane_type, 'max_rank', 5, 'effect_r5', nr.effect,
                            'source', nr.source, 'added_update', nr.added,
                            'seed_source', '20261028_fix_missing_and_misnamed_arcanes.sql')
    from numbered nr, base
  returning arcane_id
)
select count(*) as inserted_rows, 5 as expected from inserted;

commit;
