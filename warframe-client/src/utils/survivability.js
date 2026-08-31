import { parseStat } from './statPatterns';

// Warframe Resilience metric -- Effective Health/Shield computed from base
// stats (wf_base.warframes) + equipped mod bonuses + equipped Archon Shard
// bonuses. Grounded in the real in-game armor mitigation formula, not a
// homebrewed approximation:
//   damage reduction = armor / (armor + 300)
//   effective health  = health / (1 - damage reduction) = health * (armor + 300) / 300
// Shields take no armor mitigation in-game, so effective shield is just
// the shield pool itself.
//
// v1 scope, deliberately narrow: only Health/Shield/Armor bonuses that are
// a flat number (Archon Shards) or clean "+N% Stat" text (mods) are
// counted. Conditional/proc-based defensive effects (Adaptation, Rolling
// Guard, Quick Thinking, Brief Respite, Rage, etc.), Overguard, Energy,
// and Arcanes (no effect-text data exists anywhere in this DB for
// abilities or arcanes -- only names are stored) are NOT reflected in
// this number. See the D.2-D.5 scoping notes in Docs/HANDOFF.md
// (Session 015) for why -- this is a relative-but-honest number, not a
// claim of exact in-game effective HP.

const MOD_STAT_PATTERNS = [
  { key: 'health', re: /^\+([\d.]+)% Health$/ },
  { key: 'shield', re: /^\+([\d.]+)% Shield Capacity$/ },
  { key: 'armor', re: /^\+([\d.]+)% Armor$/ },
];

const SHARD_STAT_PATTERNS = [
  { key: 'health', re: /^\+([\d.]+) Health$/ },
  { key: 'shield', re: /^\+([\d.]+) Shield Capacity$/ },
  { key: 'armor', re: /^\+([\d.]+) Armor$/ },
];

// Resolved Archon Shard bonus text for a build's currently-equipped shards
// (frame.shard_slots' shard_1_bonus..shard_5_bonus, nulls filtered) -- not
// the goal/target shard layout. Shared by SurvivabilityTab and the Loadout
// tab's modded-stats panel, both of which need the same equipped-shard
// text feeding two different compute functions below.
export function getShardBonusTexts(frame) {
  const slots = frame.shard_slots;
  if (!slots) return [];
  return [1, 2, 3, 4, 5].map(i => slots[`shard_${i}_bonus`]).filter(Boolean);
}

// Warframe stats for the Loadout tab's live "modded stats" panel --
// distinct from computeResilience above (that's a derived combat metric
// with its own rounding/display shape; this returns the raw stat totals
// as the game itself would show them on the Arsenal screen). Sign-aware
// (unlike MOD_STAT_PATTERNS above) because real dual-effect mods grant one
// stat and take another away on the same card, verified against real text:
// Fleeting Expertise (+Efficiency/-Duration), Overextended (+Range/
// -Strength), Blind Rage (+Strength/-Efficiency), Transient Fortitude
// (+Strength/-Duration), Narrow Minded (+Duration/-Range).
//
// Verified against: Continuity/Primed Continuity -> "Ability Duration",
// Streamline -> "Ability Efficiency", Stretch -> "Ability Range",
// Intensify -> "Ability Strength", Rush -> "Sprint Speed", Flow/Primed
// Flow -> "Energy Max". Health/Shield/Armor reuse the same real text
// MOD_STAT_PATTERNS above already verified.
//
// Ability Duration/Efficiency/Range/Strength have no per-Warframe base
// column -- every Warframe starts at the same universal 100% baseline in
// the real game, mods stack additively onto that (confirmed against a
// maxed Primed Continuity: 100 * 1.55 = 155, matching its real +55%).
const WARFRAME_STAT_PATTERNS = [
  { key: 'health', re: /^([+-][\d.]+)% Health$/ },
  { key: 'shield', re: /^([+-][\d.]+)% Shield Capacity$/ },
  { key: 'armor', re: /^([+-][\d.]+)% Armor$/ },
  { key: 'energy', re: /^([+-][\d.]+)% Energy Max$/ },
  { key: 'sprintSpeed', re: /^([+-][\d.]+)% Sprint Speed$/ },
  { key: 'duration', re: /^([+-][\d.]+)% Ability Duration$/ },
  { key: 'efficiency', re: /^([+-][\d.]+)% Ability Efficiency$/ },
  { key: 'range', re: /^([+-][\d.]+)% Ability Range$/ },
  { key: 'strength', re: /^([+-][\d.]+)% Ability Strength$/ },
];

// Archon Shards aren't limited to the flat Health/Shield/Armor/Energy
// shape SHARD_STAT_PATTERNS above assumes -- Crimson shards grant
// percentage Ability Strength/Duration (verified against
// constants/shardBonuses.js: "+10%/+15% Ability Strength", "...Ability
// Duration"), same text shape as a mod card, not a shard's usual flat
// number. Tried after the flat list below, in computeModdedWarframeStats.
const WARFRAME_SHARD_FLAT_PATTERNS = [
  { key: 'health', re: /^\+([\d.]+) Health$/ },
  { key: 'shield', re: /^\+([\d.]+) Shield Capacity$/ },
  { key: 'armor', re: /^\+([\d.]+) Armor$/ },
  { key: 'energy', re: /^\+([\d.]+) Energy Max$/ },
];

const WARFRAME_SHARD_PCT_PATTERNS = [
  { key: 'strength', re: /^\+([\d.]+)% Ability Strength$/ },
  { key: 'duration', re: /^\+([\d.]+)% Ability Duration$/ },
];

// Arcane effect text is full natural language (e.g. "Remove all Shields.
// If Armor is above 700: Cannot be hit for more than 500 Damage/s."), not
// a clean "+N% Stat" line -- there's no generic pattern to extract from it
// the way mods/shards work. Named special cases only, added one at a time
// after confirming the exact real effect (this one via wiki screenshot,
// 2026-08-30, since the seeded wf_base.arcanes.effect_r5 text was
// independently found to be missing the shield-removal clause entirely).
// Never add an entry here by inferring from a name alone.
const SHIELD_REMOVING_ARCANES = new Set(['Arcane Persistence']);

// `equippedMods`/`shardBonusTexts`: same shapes computeResilience takes.
// `equippedArcaneNames`: this build's arcane_1/arcane_2 values (nulls
// filtered by the caller or left in, either way -- only matched names
// have any effect).
export function computeModdedWarframeStats({ baseStats, equippedMods = [], shardBonusTexts = [], equippedArcaneNames = [] }) {
  const pctBonus = { health: 0, shield: 0, armor: 0, energy: 0, sprintSpeed: 0, duration: 0, efficiency: 0, range: 0, strength: 0 };
  const flatBonus = { health: 0, shield: 0, armor: 0, energy: 0 };
  const countedMods = [];
  const countedShards = [];

  equippedMods.forEach(({ mod, rank }) => {
    const levelStats = mod?.raw_json?.levelStats;
    if (!Array.isArray(levelStats) || levelStats.length === 0) return;

    const clampedRank = Math.max(0, Math.min(rank ?? 0, levelStats.length - 1));
    const stats = levelStats[clampedRank]?.stats ?? [];

    stats.forEach(statText => {
      const parsed = parseStat(statText, WARFRAME_STAT_PATTERNS);
      if (!parsed) return;
      pctBonus[parsed.key] += parsed.value;
      countedMods.push({ name: mod.name, stat: parsed.key, text: statText });
    });
  });

  shardBonusTexts.forEach(text => {
    const flat = parseStat(text, WARFRAME_SHARD_FLAT_PATTERNS);
    if (flat) {
      flatBonus[flat.key] += flat.value;
      countedShards.push({ stat: flat.key, text });
      return;
    }

    const pct = parseStat(text, WARFRAME_SHARD_PCT_PATTERNS);
    if (pct) {
      pctBonus[pct.key] += pct.value;
      countedShards.push({ stat: pct.key, text });
    }
  });

  const shieldRemoved = equippedArcaneNames.some(name => SHIELD_REMOVING_ARCANES.has(name));

  const health = (baseStats?.health ?? 0) * (1 + pctBonus.health / 100) + flatBonus.health;
  const shield = shieldRemoved ? 0 : (baseStats?.shield ?? 0) * (1 + pctBonus.shield / 100) + flatBonus.shield;
  const armor = (baseStats?.armor ?? 0) * (1 + pctBonus.armor / 100) + flatBonus.armor;
  const energy = (baseStats?.energy ?? 0) * (1 + pctBonus.energy / 100) + flatBonus.energy;
  // Sprint Speed's base column is already a raw multiplier (e.g. 1.25),
  // not a percentage -- keep it displayed the same way, no invented "100%"
  // framing for a stat that already has a real base value on file.
  const sprintSpeed = (baseStats?.sprint_speed ?? 0) * (1 + pctBonus.sprintSpeed / 100);

  return {
    health: Math.round(health),
    shield: Math.round(shield),
    armor: Math.round(armor),
    energy: Math.round(energy),
    sprintSpeed: Math.round(sprintSpeed * 100) / 100,
    abilityDuration: Math.round(100 * (1 + pctBonus.duration / 100)),
    abilityEfficiency: Math.round(100 * (1 + pctBonus.efficiency / 100)),
    abilityRange: Math.round(100 * (1 + pctBonus.range / 100)),
    abilityStrength: Math.round(100 * (1 + pctBonus.strength / 100)),
    countedMods,
    countedShards,
  };
}

// `equippedMods`: [{ mod, rank }] -- mod is a wf_base.mods row (needs
// mod.raw_json.levelStats), rank is that mod's owned_rank, used to index
// into levelStats (clamped to the array so an unranked/rank-0 mod still
// resolves instead of throwing).
// `shardBonusTexts`: resolved bonus strings for this build's currently
// equipped shards only (frame.shard_slots' shard_1_bonus..shard_5_bonus,
// nulls filtered) -- not the goal/target shard layout.
export function computeResilience({ baseStats, equippedMods = [], shardBonusTexts = [] }) {
  const pctBonus = { health: 0, shield: 0, armor: 0 };
  const flatBonus = { health: 0, shield: 0, armor: 0 };
  const countedMods = [];
  const countedShards = [];

  equippedMods.forEach(({ mod, rank }) => {
    const levelStats = mod?.raw_json?.levelStats;
    if (!Array.isArray(levelStats) || levelStats.length === 0) return;

    const clampedRank = Math.max(0, Math.min(rank ?? 0, levelStats.length - 1));
    const stats = levelStats[clampedRank]?.stats ?? [];

    stats.forEach(statText => {
      const parsed = parseStat(statText, MOD_STAT_PATTERNS);
      if (!parsed) return;
      pctBonus[parsed.key] += parsed.value;
      countedMods.push({ name: mod.name, stat: parsed.key, text: statText });
    });
  });

  shardBonusTexts.forEach(text => {
    const parsed = parseStat(text, SHARD_STAT_PATTERNS);
    if (!parsed) return;
    flatBonus[parsed.key] += parsed.value;
    countedShards.push({ stat: parsed.key, text });
  });

  const baseHealth = baseStats?.health ?? 0;
  const baseShield = baseStats?.shield ?? 0;
  const baseArmor = baseStats?.armor ?? 0;

  const totalHealth = baseHealth * (1 + pctBonus.health / 100) + flatBonus.health;
  const totalShield = baseShield * (1 + pctBonus.shield / 100) + flatBonus.shield;
  const totalArmor = baseArmor * (1 + pctBonus.armor / 100) + flatBonus.armor;

  const effectiveHealth = (totalHealth * (totalArmor + 300)) / 300;
  const effectiveShield = totalShield;

  return {
    baseHealth,
    baseShield,
    baseArmor,
    totalHealth: Math.round(totalHealth),
    totalShield: Math.round(totalShield),
    totalArmor: Math.round(totalArmor),
    effectiveHealth: Math.round(effectiveHealth),
    effectiveShield: Math.round(effectiveShield),
    totalEffectivePool: Math.round(effectiveHealth + effectiveShield),
    countedMods,
    countedShards,
  };
}

// A profile's benchmark_tiers is authored strictest-first (e.g. Elite
// before Strong before Adequate) -- returns the first tier whose min_*
// thresholds are all met by `result`, or null if none are (including the
// common case of a profile with no tiers authored yet). Threshold keys
// are 'min_effective_health' / 'min_effective_shield', matching
// computeResilience()'s own field names with a 'min_' prefix.
export function pickBenchmarkTier(tiers, result) {
  if (!Array.isArray(tiers) || tiers.length === 0 || !result) return null;

  for (const tier of tiers) {
    const checks = Object.entries(tier).filter(([key]) => key.startsWith('min_'));
    if (checks.length === 0) continue;

    const passes = checks.every(([key, threshold]) => {
      const resultKey = key.slice(4).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      return (result[resultKey] ?? 0) >= threshold;
    });

    if (passes) return tier.tier ?? null;
  }

  return null;
}
