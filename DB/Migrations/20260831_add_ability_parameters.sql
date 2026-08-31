-- Canonical ability data (prerequisite/foundation detour, not part of D.7).
-- Patrick's build-accuracy scrutiny pass on Frost Prime surfaced that Gu
-- shows zero real ability numbers anywhere -- wf_base.warframe_abilities
-- only ever stored ability_name (confirmed against this DB's schema and
-- against WFCD's own raw source repo, both cap out at name + flavor text,
-- zero numeric fields). Real per-ability numbers required going upstream
-- of WFCD entirely -- see DB/Seeds/seed_ability_data.py's header comment
-- for the full source audit (DE's own Public Export for Energy cost,
-- the Warframe Wiki's raw per-ability wikitext templates for
-- Duration/Range/Strength, both fetched programmatically, no HTML
-- scraping, no rendered-page parsing).
--
-- Not an extension of warframe_abilities -- that table is slot-keyed per
-- Warframe (468 rows, duplicating identical ability data across every
-- Prime/Umbra variant of the same frame) and has no usable row shape for
-- a Helminth-only ability like Nourish, which belongs to Grendel but can
-- be equipped on any frame. Ability data is keyed by ability IDENTITY
-- (name) instead, deduplicated once, resolvable regardless of which frame
-- currently has it slotted -- matching how ability_name is already the
-- plain-text join key used by both warframe_abilities.ability_name and
-- wf_user.ability_configs.subsumed_ability today.
--
-- Only the maxed (Ability Rank 3) scalar is stored per parameter, not a
-- 4-value progression -- confirmed via the wiki's own Mastery/Abilities
-- documentation that ability rank auto-maxes as a Warframe levels to 30
-- via affinity, and this app already assumes every tracked build is fully
-- leveled (see ModsLoadoutTab.jsx's "No Mastery Rank input" comment).
create table if not exists wf_base.ability_catalog (
  ability_catalog_id serial primary key,
  ability_name text not null unique,
  wiki_title text,              -- exact wiki page title used for the ?action=raw fetch
  last_ingested_at timestamptz,
  raw_json jsonb,                -- full raw wikitext + DE Public Export fragment, for re-parsing without re-fetching
  notes text                     -- free-form curation notes
);

-- One row per named parameter per ability (Nourish alone has 5 distinct
-- Strength-scaled sub-parameters -- a rigid duration/range/strength/energy
-- column model can't represent that; abilities are irregular, this table
-- shape is not).
create table if not exists wf_base.ability_parameters (
  ability_parameter_id serial primary key,
  ability_catalog_id integer not null references wf_base.ability_catalog(ability_catalog_id) on delete cascade,
  parameter_key text not null,   -- stable snake_case, e.g. 'self_heal', 'armor_multiplier'
  label text not null,           -- human display label, e.g. "Self Heal"
  sort_order integer not null default 0,  -- preserves the wiki template's own field order
  base_value numeric,            -- the maxed scalar -- NULL on any parse failure, never a guessed value
  unit text,                     -- 'flat' | 'percent' | 'seconds' | 'meters' | 'multiplier' | 'count'
  scales_with text,              -- 'duration' | 'efficiency' | 'range' | 'strength' | 'none' -- drives GENERIC linear scaling only
  -- Names a hand-written override function in warframe-client's
  -- utils/abilityFormulas.js. When set, this overrides scales_with
  -- entirely -- a plain named slug (not a JSONB formula DSL) so
  -- `git grep formula_key` finds every irregular ability in one query,
  -- matching seed_mods.py's MAX_RANK_OVERRIDES transparency principle.
  formula_key text,
  -- A parameter can exist twice per ability only when Helminth-subsumed
  -- casting genuinely differs from the ability's home-frame cast (e.g.
  -- Nourish's self_heal is 0 when subsumed, ~1000 at home) -- confirmed
  -- real via the wiki's own "| helminth =" prose section, not assumed.
  -- Parameters unaffected by subsuming simply have no 'subsumed' row;
  -- the app falls back to 'base'.
  context text not null default 'base',  -- 'base' | 'subsumed'
  source text not null,           -- 'de_public_export' | 'wiki' | 'manual' -- per-datum provenance
  source_ref text,                -- the literal wikitext fragment or export field name this came from
  verified_note text,             -- citation, e.g. a worked-example cross-check
  unique (ability_catalog_id, parameter_key, context)
);

alter table wf_base.ability_catalog enable row level security;
alter table wf_base.ability_parameters enable row level security;

create policy "Allow all access to ability_catalog" on wf_base.ability_catalog for all using (true) with check (true);
create policy "Allow all access to ability_parameters" on wf_base.ability_parameters for all using (true) with check (true);

grant select, insert, update, delete on wf_base.ability_catalog to anon, authenticated;
grant select, insert, update, delete on wf_base.ability_parameters to anon, authenticated;

grant usage, select on sequence wf_base.ability_catalog_ability_catalog_id_seq to anon, authenticated;
grant usage, select on sequence wf_base.ability_parameters_ability_parameter_id_seq to anon, authenticated;

-- Grant service_role read access up front this time -- a prior session
-- found this gap missing on rivens/weapon_inventory/build_tests/
-- survivability_goals after the fact (20260829_grant_service_role_wf_user.sql).
-- DB/Seeds/seed_ability_data.py uses the service key directly.
grant select, insert, update on wf_base.ability_catalog to service_role;
grant select, insert, update on wf_base.ability_parameters to service_role;
grant usage, select on sequence wf_base.ability_catalog_ability_catalog_id_seq to service_role;
grant usage, select on sequence wf_base.ability_parameters_ability_parameter_id_seq to service_role;
