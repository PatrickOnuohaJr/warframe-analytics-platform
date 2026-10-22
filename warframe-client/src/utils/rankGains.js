// Max-rank (rank 30) base stat gains for Warframes.
//
// wf_base.warframes stores each frame's RANK-0 Health/Shield/Armor/Energy.
// In game, every Warframe gains more by rank 30, and Gu models builds at max
// rank, so the compute functions add these gains on top of the stored base.
//
// Source: wiki.warframe.com "Warframe" page, "Rank Up Exceptions" table plus
// the general rule (+100 Health, +100 Shield, +50 Energy, +0 Armor at rank 30),
// read 2026-10-21. Verified against Patrick's in-game Arsenal for Garuda Prime
// at rank 30 with nothing equipped (370 / 370 / 420 / 320 from a 270 / 270 /
// 420 / 220 base). Per Patrick, the wiki is trusted unless an in-game
// discrepancy shows up; always model frames at rank 30, never rank 0.
//
// Nidus/Nidus Prime also gain +15% Ability Strength by rank 30 (confirmed true
// in game by Patrick); their Armor +100 is in the table below. Their +15
// Health/s regeneration is not modeled (Gu has no regeneration stat).

export const GENERAL_RANK_30_GAINS = { health: 100, shield: 100, armor: 0, energy: 50 };

const g = (health, shield, armor, energy) => ({ health, shield, armor, energy });

export const RANK_30_GAIN_EXCEPTIONS = {
  'Baruuk': g(100, 100, 0, 100),
  'Baruuk Prime': g(100, 100, 0, 100),
  'Chroma Prime': g(100, 100, 0, 100),
  'Dante': g(90, 90, 0, 70),
  'Garuda': g(100, 100, 0, 100),
  'Garuda Prime': g(100, 100, 0, 100),
  'Grendel': g(200, 0, 0, 50),
  'Grendel Prime': g(200, 0, 0, 50),
  'Hildryn': g(100, 500, 0, 0),
  'Hildryn Prime': g(100, 500, 0, 0),
  'Inaros': g(200, 0, 0, 50),
  'Inaros Prime': g(200, 0, 0, 50),
  'Koumei': g(100, 100, 0, 100),
  'Kullervo': g(200, 0, 100, 50),
  'Lavos': g(200, 100, 100, 0),
  'Lavos Prime': g(200, 100, 100, 0),
  'Narin': g(100, 100, 0, 90),
  'Nezha': g(100, 50, 0, 50),
  'Nezha Prime': g(100, 50, 0, 50),
  'Nidus': g(100, 0, 100, 50),
  'Nidus Prime': g(100, 0, 100, 50),
  'Saryn Prime': g(100, 100, 0, 100),
  'Valkyr': g(100, 50, 0, 50),
  'Valkyr Prime': g(100, 50, 0, 50),
  'Volt Prime': g(100, 100, 0, 100),
  'Wisp': g(100, 100, 0, 100),
  'Wisp Prime': g(100, 100, 0, 100),
  'Xaku': g(90, 90, 0, 70),
  'Xaku Prime': g(90, 90, 0, 70),
  'Yareli': g(100, 100, 0, 100),
  'Yareli Prime': g(100, 100, 0, 100),
};

// Returns baseStats with the rank-30 gains added to health/shield/armor/energy.
// Needs baseStats.name (the wf_base.warframes row's name); without it the
// stats are returned untouched (rank-0 values), since the right gain can't be
// chosen. Loaders must therefore select `name` alongside the stat columns.
// Ability Strength (percentage points) a Warframe gains by rank 30.
const RANK_30_ABILITY_STRENGTH = { 'Nidus': 15, 'Nidus Prime': 15 };

export function maxRankAbilityStrength(name) {
  return RANK_30_ABILITY_STRENGTH[name] ?? 0;
}

export function applyMaxRankStats(baseStats) {
  if (!baseStats || typeof baseStats.name !== 'string') return baseStats;
  const gains = RANK_30_GAIN_EXCEPTIONS[baseStats.name] ?? GENERAL_RANK_30_GAINS;
  // A missing (null) stat stays missing so "no data" is not turned into a number.
  const add = (value, gain) => (typeof value === 'number' ? value + gain : value);
  return {
    ...baseStats,
    health: add(baseStats.health, gains.health),
    shield: add(baseStats.shield, gains.shield),
    armor: add(baseStats.armor, gains.armor),
    energy: add(baseStats.energy, gains.energy),
  };
}
