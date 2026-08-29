-- D.4 Survivability Profiles -- reusable defensive reference models
-- (Health Tank, Shield Tank, Overguard Tank, Hybrid Tank), kept as a
-- separate schema from per-build survivability data, per Patrick's
-- explicit direction (Session 015):
--
--   - Profile catalog (this table): reusable reference data. Not tied to
--     any one build. Defines each archetype's characteristic defensive
--     layers, which of utils/survivability.js's computed metrics are
--     relevant to it, typical dependencies (mods/shards/mechanics it
--     leans on), and standardized benchmark tiers.
--   - Per-build data stays exactly where it already lives: current
--     computed Resilience is live math (utils/survivability.js, not
--     persisted), field-tested results are wf_user.build_tests (already
--     shipped, D.6 -- its benchmark_archetype free-text field already
--     uses this same Health Tank/Shield Tank/Overguard Tank/Hybrid
--     vocabulary), and the new optional goal state is
--     wf_user.survivability_goals below. The Report Card compares a
--     build's real numbers against whichever profile is selected for it.
--
-- benchmark_tiers is intentionally NULL on every seeded row here. This
-- project doesn't fabricate numeric thresholds -- see the "no guessing"
-- rigor already established for mod effects, capacity math, etc. Real
-- tier cutoffs (e.g. what Effective Health counts as "Strong" for a
-- Health Tank) need Patrick's own live-game judgment before they're
-- authored in, not an invented number. Same treatment as
-- DB/Cultivation/*.sql's hand-authored per-build lore -- this is
-- Patrick's own analytical framework, not WFCD-sourced data, so it
-- lives in wf_base as shared reference content rather than being
-- guessed by an agent.

create table if not exists wf_base.survivability_profiles (
  profile_id serial primary key,
  name text not null unique,
  defensive_layers text,       -- prose: what mechanically defines this archetype
  relevant_metrics text[],     -- subset of ['effective_health','effective_shield'] -- empty array if nothing here is currently computable
  dependencies text,           -- prose: typical mods/shards/mechanics this archetype leans on
  benchmark_tiers jsonb,       -- e.g. [{"tier":"Strong","min_effective_health":2000}, ...] -- NULL until Patrick authors real thresholds
  created_at timestamptz not null default now()
);

-- Optional per-build goal state: which profile this build is being
-- measured against, plus an optional manual override target if the
-- profile's own benchmark tiers aren't granular enough for this specific
-- build. One row per build, all fields optional -- a build with no row
-- here just has no goal set, same "untouched until first edit" convention
-- as wf_user.loadout_slots.
create table if not exists wf_user.survivability_goals (
  goal_id serial primary key,
  my_frame_id integer not null unique references wf_user.my_frames(my_frame_id) on delete cascade,
  target_profile_id integer references wf_base.survivability_profiles(profile_id) on delete set null,
  target_effective_health integer,
  target_effective_shield integer,
  notes text,
  updated_at timestamptz not null default now()
);

insert into wf_base.survivability_profiles (name, defensive_layers, relevant_metrics, dependencies) values
(
  'Health Tank',
  'Maximizes the Health pool and Armor together, since Armor is what makes Health effective (damage mitigation scales with Armor via the standard curve, not with Health directly). Often paired with Health-sustain sources -- Health orb pickups, damage-triggered heals, or scaling damage-type resistance -- to keep the pool topped up under sustained fire rather than just being a bigger one-time buffer.',
  array['effective_health'],
  'Health% mods (Vitality-family), Armor% mods (Steel Fiber-family), Health-restore Arcanes/mods, Adaptation-style scaling resistance. All of these except Adaptation''s conditional resistance are directly counted by utils/survivability.js today.'
),
(
  'Shield Tank',
  'Maximizes Shield Capacity and leans on Shield gating -- taking a hit that depletes your shields grants a brief window of invulnerability, so fast shield regen and a big shield pool matter more than the shield number alone. Armor does not mitigate shield damage in-game, so this archetype gets nothing from Armor investment.',
  array['effective_shield'],
  'Shield% mods (Redirection-family), shield recharge-rate/delay mods, Energy-to-shield conversion effects. Recharge/delay/conversion mechanics aren''t numeric Health/Shield/Armor bonuses, so they aren''t counted by utils/survivability.js -- only the flat Shield Capacity increase is.'
),
(
  'Overguard Tank',
  'Relies on Overguard, a separate damage-absorbing pool granted by specific Warframe abilities or Helminth-subsumed abilities. Overguard ignores normal Health/Shield/Armor entirely and isn''t affected by Vitality/Redirection/Steel Fiber-style mods at all.',
  array[]::text[],
  'Ability/Helminth-granted Overguard sources. Not currently quantifiable by this app at all -- wf_base.warframe_abilities stores ability names only, no effect text, so there is no data source to compute an Overguard number from yet.'
),
(
  'Hybrid Tank',
  'Splits investment across Health and Shield (sometimes Armor too) rather than maximizing any single pool, trading a lower ceiling in either for not having a single point of failure.',
  array['effective_health', 'effective_shield'],
  'A mix of Health% and Shield% mods rather than full investment in one family -- both are directly counted by utils/survivability.js.'
)
on conflict (name) do nothing;

alter table wf_base.survivability_profiles enable row level security;
alter table wf_user.survivability_goals enable row level security;

create policy "Allow all access to survivability_profiles" on wf_base.survivability_profiles for all using (true) with check (true);
create policy "Allow all access to survivability_goals" on wf_user.survivability_goals for all using (true) with check (true);

grant select, insert, update, delete on wf_base.survivability_profiles to anon, authenticated;
grant select, insert, update, delete on wf_user.survivability_goals to anon, authenticated;

grant usage, select on sequence wf_base.survivability_profiles_profile_id_seq to anon, authenticated;
grant usage, select on sequence wf_user.survivability_goals_goal_id_seq to anon, authenticated;
