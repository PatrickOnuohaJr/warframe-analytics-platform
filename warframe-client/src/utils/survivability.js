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

function parseStat(text, patterns) {
  for (const { key, re } of patterns) {
    const match = re.exec(text);
    if (match) return { key, value: Number(match[1]) };
  }
  return null;
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
