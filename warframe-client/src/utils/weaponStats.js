import { parseStat } from './statPatterns';
import { parseRivenStat } from './rivenStats';

// Live "modded stats" for the Loadout tab's weapon pieces (Primary/
// Secondary/Melee) -- same idea as survivability.js's Warframe stats, but
// for a weapon's own base stats (wf_base.weapons.raw_json, WFCD's native
// field names) plus equipped catalog-mod and Riven bonuses.
//
// raw_json field audit (this session, sampled Braton Prime/Lex Prime/Ogris/
// Paris Prime/Skana -- hitscan rifle, pistol, AoE launcher, bow, and
// melee, deliberately picking weapon types whose stat blocks might differ):
// every one of them populates fireRate/magazineSize/reloadTime/
// criticalChance/criticalMultiplier/procChance/totalDamage at the SAME
// top-level keys with the SAME scale (criticalChance/procChance as a
// fraction, e.g. 0.12; criticalMultiplier as a raw multiplier, e.g. 2) --
// no attacks[]-only fallback needed for any sampled category. punchThrough
// is null on every sample; it's always base 0, only mods/Rivens ever grant
// it. Melee has no separate "attack speed" field -- fireRate IS attack
// speed for melee (confirmed: Skana's fireRate 0.833 matches its
// attacks[0].speed exactly). range is null for guns, populated for melee.
export function extractBaseWeaponStats(weaponRow) {
  const rj = weaponRow?.raw_json ?? {};
  return {
    fireRate: rj.fireRate ?? null,
    magazineSize: rj.magazineSize ?? null,
    reloadTime: rj.reloadTime ?? null,
    criticalChance: rj.criticalChance != null ? rj.criticalChance * 100 : null,
    criticalMultiplier: rj.criticalMultiplier != null ? rj.criticalMultiplier * 100 : null,
    procChance: rj.procChance != null ? rj.procChance * 100 : null,
    punchThrough: rj.punchThrough ?? 0,
    range: rj.range ?? null,
    damage: rj.totalDamage ?? null,
    multishot: rj.multishot ?? null,
  };
}

// Verified against real effect text (this session): Lethal Torrent ->
// "+60% Fire Rate", Ammo Stock -> "+60% Magazine Capacity", Tactical Pump
// -> "+60% Reload Speed" (a REDUCTION to reload time -- combined in
// computeModdedWeaponStats as base/(1+pct/100), not multiplied), Point
// Strike -> "+275% Critical Chance", Vital Sense -> "+220% Critical
// Damage", Malignant Force -> "+60% Status Chance", Seeking Fury -> "+15%
// Reload Speed" + "+1.2 Punch Through" (flat number, not a percent),
// Lethal Torrent -> "+60% Fire Rate" + "+60% Multishot".
//
// Real cards carry trailing conditional qualifiers the label-only text
// doesn't capture: Speed Trigger/Shred -> "+30% Fire Rate (x2 for Bows)",
// True Steel/Sacrificial Steel -> "+220% Critical Chance (x2 for Heavy
// Attacks)". The always-active base % is counted; the parenthetical
// conditional multiplier is not (same narrow-scope philosophy as
// Resilience's excluded conditional effects) -- the pattern below tolerates
// an optional trailing parenthetical rather than guessing per-weapon
// whether the condition applies. Blood Rush's "+40% Critical Chance stacks
// with Combo Multiplier" is a per-combo-tier rate, not a flat total --
// deliberately excluded, and naturally fails to match since its trailing
// text isn't a bare parenthetical.
const GUN_MOD_STAT_PATTERNS = {
  pct: [
    { key: 'fireRate', re: /^([+-][\d.]+)% Fire Rate(?: \(.*\))?$/ },
    { key: 'magazineSize', re: /^([+-][\d.]+)% Magazine Capacity$/ },
    { key: 'reloadTime', re: /^([+-][\d.]+)% Reload Speed$/ },
    { key: 'criticalChance', re: /^([+-][\d.]+)% Critical Chance(?: \(.*\))?$/ },
    { key: 'criticalMultiplier', re: /^([+-][\d.]+)% Critical Damage$/ },
    { key: 'procChance', re: /^([+-][\d.]+)% Status Chance$/ },
    { key: 'multishot', re: /^([+-][\d.]+)% Multishot$/ },
  ],
  flat: [
    { key: 'punchThrough', re: /^([+-][\d.]+) Punch Through$/ },
  ],
};

// Verified: Fury -> "+30% Attack Speed", Pressure Point -> "+200% Melee
// Damage", Organ Shatter -> "+165% Critical Damage", Reach/Primed Reach ->
// "+2.3%/+3 Range" (flat meters, NOT a percent -- unlike every other stat
// here). True Steel/Sacrificial Steel's "(x2 for Heavy Attacks)" qualifier
// handled the same tolerant-but-honest way as the gun list above.
const MELEE_MOD_STAT_PATTERNS = {
  pct: [
    { key: 'fireRate', re: /^([+-][\d.]+)% Attack Speed$/ },
    { key: 'damage', re: /^([+-][\d.]+)% Melee Damage$/ },
    { key: 'criticalChance', re: /^([+-][\d.]+)% Critical Chance(?: \(.*\))?$/ },
    { key: 'criticalMultiplier', re: /^([+-][\d.]+)% Critical Damage$/ },
    { key: 'procChance', re: /^([+-][\d.]+)% Status Chance$/ },
  ],
  flat: [
    { key: 'range', re: /^([+-][\d.]+) Range$/ },
  ],
};

// Riven stat labels are already the canonical source of truth
// (rivenStats.js, generated from WFCD's real upgradeEntries) -- map each
// relevant tag straight to this file's stat keys rather than re-parsing
// label text a second time.
const RIVEN_TAG_TO_KEY = {
  Primary: {
    WeaponFireRateMod: 'fireRate',
    WeaponClipMaxMod: 'magazineSize',
    WeaponReloadSpeedMod: 'reloadTime',
    WeaponCritChanceMod: 'criticalChance',
    WeaponCritDamageMod: 'criticalMultiplier',
    WeaponStunChanceMod: 'procChance',
    WeaponPunctureDepthMod: 'punchThrough',
    WeaponFireIterationsMod: 'multishot',
  },
  Melee: {
    WeaponMeleeDamageMod: 'damage',
    WeaponCritChanceMod: 'criticalChance',
    WeaponCritDamageMod: 'criticalMultiplier',
    WeaponStunChanceMod: 'procChance',
    WeaponFireRateMod: 'fireRate',
    WeaponMeleeRangeIncMod: 'range',
  },
};
RIVEN_TAG_TO_KEY.Secondary = RIVEN_TAG_TO_KEY.Primary;

// Punch Through and Range are flat additions (confirmed real text: "+1.2
// Punch Through", "+2.3 Range") -- every other stat here is a percentage.
const FLAT_KEYS = new Set(['punchThrough', 'range']);

// `equippedMods`: [{ mod, rank }], same shape survivability.js's functions
// take. `equippedRivens`: raw wf_user.rivens rows already filtered to the
// equipped weapon's name (see LoadoutEquipmentSection.jsx's weaponRivens).
export function computeModdedWeaponStats({ baseStats, equippedMods = [], equippedRivens = [], category }) {
  if (!baseStats) return null;

  const isMelee = category === 'Melee';
  const modPatterns = isMelee ? MELEE_MOD_STAT_PATTERNS : GUN_MOD_STAT_PATTERNS;
  const rivenTagToKey = RIVEN_TAG_TO_KEY[category] ?? RIVEN_TAG_TO_KEY.Primary;

  const pctBonus = {};
  const flatBonus = {};
  const bump = (bucket, key, value) => { bucket[key] = (bucket[key] ?? 0) + value; };

  equippedMods.forEach(({ mod, rank }) => {
    const levelStats = mod?.raw_json?.levelStats;
    if (!Array.isArray(levelStats) || levelStats.length === 0) return;

    const clampedRank = Math.max(0, Math.min(rank ?? 0, levelStats.length - 1));
    const stats = levelStats[clampedRank]?.stats ?? [];

    stats.forEach(statText => {
      const pctMatch = parseStat(statText, modPatterns.pct);
      if (pctMatch) { bump(pctBonus, pctMatch.key, pctMatch.value); return; }

      const flatMatch = parseStat(statText, modPatterns.flat);
      if (flatMatch) bump(flatBonus, flatMatch.key, flatMatch.value);
    });
  });

  equippedRivens.forEach(riven => {
    [riven.stat_1, riven.stat_2, riven.stat_3, riven.stat_4].forEach(text => {
      const parsed = parseRivenStat(text, category);
      if (!parsed) return;

      const key = rivenTagToKey[parsed.tag];
      if (!key) return;

      const signedValue = (parsed.sign === '-' ? -1 : 1) * Number(parsed.value);
      bump(FLAT_KEYS.has(key) ? flatBonus : pctBonus, key, signedValue);
    });
  });

  const pct = key => pctBonus[key] ?? 0;
  const flat = key => flatBonus[key] ?? 0;

  const fireRate = baseStats.fireRate != null ? baseStats.fireRate * (1 + pct('fireRate') / 100) : null;
  const magazineSize = baseStats.magazineSize != null ? baseStats.magazineSize * (1 + pct('magazineSize') / 100) : null;
  // Reload Speed mods make a weapon reload FASTER -- reduce reloadTime,
  // don't multiply it up.
  const reloadTime = baseStats.reloadTime != null ? baseStats.reloadTime / (1 + pct('reloadTime') / 100) : null;
  const criticalChance = baseStats.criticalChance != null ? baseStats.criticalChance * (1 + pct('criticalChance') / 100) : null;
  const criticalMultiplier = baseStats.criticalMultiplier != null ? baseStats.criticalMultiplier * (1 + pct('criticalMultiplier') / 100) : null;
  const procChance = baseStats.procChance != null ? baseStats.procChance * (1 + pct('procChance') / 100) : null;
  const punchThrough = (baseStats.punchThrough ?? 0) + flat('punchThrough');
  const range = baseStats.range != null ? baseStats.range + flat('range') : null;
  const damage = baseStats.damage != null ? baseStats.damage * (1 + pct('damage') / 100) : null;
  const multishot = baseStats.multishot != null ? baseStats.multishot * (1 + pct('multishot') / 100) : null;

  const round2 = v => (v == null ? null : Math.round(v * 100) / 100);

  return {
    fireRate: round2(fireRate),
    magazineSize: magazineSize != null ? Math.round(magazineSize) : null,
    reloadTime: round2(reloadTime),
    criticalChance: round2(criticalChance),
    criticalMultiplier: round2(criticalMultiplier),
    procChance: round2(procChance),
    punchThrough: round2(punchThrough),
    range: round2(range),
    damage: damage != null ? Math.round(damage) : null,
    multishot: round2(multishot),
  };
}
