// Shared helpers for reading WFCD's raw mod payload (stored as raw_json on
// wf_base.mods). WFCD has no flat "description" field -- effect text lives
// per-rank in levelStats, and it's littered with markup tags like
// <LOWER_IS_BETTER> / <ENERGY> meant for their own icon rendering, not ours.

export function isAugment(mod) {
  if (mod.raw_json?.isAugment !== true) return false;

  // WFCD sets isAugment=true for two generic buckets too -- compatName
  // "WARFRAME" (plain stat/set mods like the Augur or Umbra sets) and
  // "AURA" -- neither modifies a specific ability. A real per-ability
  // augment always names a specific frame ("Chroma", "Volt", ...), and
  // those generic buckets are always ALL-CAPS placeholders, so filter on
  // that rather than hardcoding a frame-name list.
  const target = mod.raw_json?.compatName;
  if (!target || target === target.toUpperCase()) return false;

  return true;
}

export function augmentTarget(mod) {
  return mod.raw_json?.compatName;
}

export function isPrimeMod(mod) {
  return mod.raw_json?.isPrime === true;
}

// compatName also carries the specific weapon subtype a non-augment mod
// fits (Rifle, Shotgun, Sniper, Pistol, Nikanas, Bow, or a single
// weapon-exclusive name like "Sobek") -- exactly what a mod card needs to
// show so you don't have to already know the mod to know what it's for.
// Skip the generic all-caps buckets, which just repeat the category.
const GENERIC_COMPAT_NAMES = new Set(['WARFRAME', 'AURA', 'PRIMARY', 'SECONDARY', 'MELEE']);

export function weaponTag(mod) {
  if (isAugment(mod)) return null; // already shown via the augment badge
  const compat = mod.raw_json?.compatName;
  if (!compat || GENERIC_COMPAT_NAMES.has(compat)) return null;
  return compat;
}

// raw_json.modSet is a path like ".../Sets/Umbra/UmbraSetMod" -- pull the
// human-readable set name out of it. Returns null for mods with no set.
export function modSetName(mod) {
  const modSet = mod.raw_json?.modSet;
  if (!modSet) return null;
  const match = modSet.match(/([A-Za-z0-9]+)SetMod$/);
  return match ? match[1] : null;
}

// Stat-group filtering, for finding "which of my owned mods boost X" while
// assembling a build. WFCD has no stat-category field, so this scans the
// mod's own effect text for the exact phrasing the game uses -- verified
// against real mods first, never guessed. The relevant groups differ by
// equipment category (a Warframe cares about Health/Shield/Armor; a weapon
// never has any of those mods at all), so keywords are keyed by
// mod.category and only that category's groups apply to a given mod.
//
// Warframe, verified against: Vitality -> "Health", Redirection -> "Shield
// Capacity", Steel Fiber -> "Armor", Flow -> "Energy Max", Rush -> "Sprint
// Speed", Continuity -> "Ability Duration", Streamline -> "Ability
// Efficiency", Stretch -> "Ability Range", Intensify -> "Ability Strength".
//
// Primary/Secondary, verified against: Lethal Torrent -> "Fire Rate",
// Split Chamber -> "Multishot", Ammo Stock -> "Magazine Capacity", Tactical
// Pump -> "Reload Speed", Blood Rush -> "Critical Chance", Vital Sense ->
// "Critical Damage", Malignant Force -> "Status Chance", Seeking Fury ->
// "Punch Through". IPS keys off WFCD's own per-damage-type markup tags
// (DT_SLASH_COLOR / DT_IMPACT_COLOR / DT_PUNCTURE_COLOR) rather than the
// element name text, so it only catches Impact/Puncture/Slash mods and not
// every other elemental (Poison, Electricity, ...) mod that also reads
// "+N% <color>Element".
//
// Melee mods reuse the same text (Attack Speed, Range, Status Chance,
// Damage) under Patrick's own group names for that category ("Chance"
// instead of "Status", no separate Crit Chance/Damage split).
//
// A mod can land in more than one group in its own category (Transient
// Fortitude is both Strength and Duration), and this is a browsing aid,
// not a strict classifier -- it'll occasionally catch a debuff mod that
// affects enemy stats alongside real self-buff mods, same tradeoff
// Armory's auto-tags make.
const STAT_GROUP_KEYWORDS = {
  Warframe: {
    Health: ['Health'],
    Shield: ['Shield'],
    Armor: ['Armor'],
    Energy: ['Energy'],
    'Sprint Speed': ['Sprint Speed'],
    Duration: ['Ability Duration'],
    Efficiency: ['Ability Efficiency'],
    Range: ['Ability Range'],
    Strength: ['Ability Strength'],
  },
  Primary: {
    'Fire Rate': ['Fire Rate'],
    Multishot: ['Multishot'],
    Magazine: ['Magazine Capacity'],
    Reload: ['Reload Speed'],
    'Crit Chance': ['Critical Chance'],
    'Crit Damage': ['Critical Damage'],
    Status: ['Status Chance'],
    'Punch Through': ['Punch Through'],
    IPS: ['DT_SLASH_COLOR', 'DT_IMPACT_COLOR', 'DT_PUNCTURE_COLOR'],
  },
  Melee: {
    'Attack Speed': ['Attack Speed'],
    Range: ['Range'],
    Chance: ['Status Chance'],
    Damage: ['Damage'],
    IPS: ['DT_SLASH_COLOR', 'DT_IMPACT_COLOR', 'DT_PUNCTURE_COLOR'],
  },
  // Companion body, verified against: Enhanced Vitality -> "Health",
  // Calculated Redirection -> "Shield Capacity", Metal Fiber -> "Armor"
  // (same three the Link-prefixed variants that scale off the Warframe's
  // own stats also use). No Energy/Sprint Speed/ability-stat mods exist for
  // Companions, so unlike Warframe those groups aren't offered here.
  Companion: {
    Health: ['Health'],
    Shield: ['Shield'],
    Armor: ['Armor'],
  },
  // Companion Weapon (Claws), verified against: Bite -> "Critical Chance"
  // + "Critical Damage" (kept split, unlike Melee's merged scheme, because
  // real Claws mods exist that grant only one of the two -- e.g. Radon
  // Claws is Crit Damage only), Flame Gland -> "Status Chance", Brute
  // Conditioning -> "Melee Damage", Swipe -> "Attack Range". IPS reuses
  // Melee's own DT_*_COLOR tag check. No Attack Speed mods exist for
  // Claws, so that Melee group is dropped here.
  CompanionWeapon: {
    'Crit Chance': ['Critical Chance'],
    'Crit Damage': ['Critical Damage'],
    Status: ['Status Chance'],
    Damage: ['Melee Damage'],
    Range: ['Attack Range'],
    IPS: ['DT_SLASH_COLOR', 'DT_IMPACT_COLOR', 'DT_PUNCTURE_COLOR'],
  },
};
STAT_GROUP_KEYWORDS.Secondary = STAT_GROUP_KEYWORDS.Primary;

// wf_base.mods has no separate category for Companion Weapon -- both
// Companion-body and Claws mods are stored as category='Companion', split
// client-side by compat_name (see CompanionTab.jsx). Exported so that split
// is defined in exactly one place instead of drifting between here and
// CompanionTab.jsx.
export const CLAWS_COMPAT_NAMES = new Set(['Claws', 'Kubrow Claws', 'Kavat Claws', 'Helminth Claws']);

// Groups relevant to a given equipment category, in display order. Falls
// back to [] for an unrecognized category rather than throwing.
export function statGroupsFor(category) {
  return Object.keys(STAT_GROUP_KEYWORDS[category] ?? {});
}

export function statGroups(mod) {
  // A Claws mod's own category column reads 'Companion', same as a
  // Companion-body mod -- resolve it to 'CompanionWeapon' here so the same
  // compat_name split used everywhere else (picking which chips display,
  // which mods list under which sub-tab) also applies to which chips a
  // given mod actually matches.
  const effectiveCategory =
    mod.category === 'Companion' && CLAWS_COMPAT_NAMES.has(mod.compat_name)
      ? 'CompanionWeapon'
      : mod.category;
  const keywords = STAT_GROUP_KEYWORDS[effectiveCategory];
  const levels = mod.raw_json?.levelStats;
  if (!keywords || !levels || levels.length === 0) return [];

  const text = levels.map(l => (l.stats || []).join(' ')).join(' ');

  return Object.keys(keywords).filter(group =>
    keywords[group].some(keyword => text.includes(keyword))
  );
}

export function effectTextAtRank(mod, rank) {
  const levels = mod.raw_json?.levelStats;
  if (!levels || levels.length === 0) return null;
  const index = Math.max(0, Math.min(rank, levels.length - 1));
  return cleanStatText((levels[index]?.stats || []).join(' '));
}

export function cleanStatText(text) {
  if (!text) return text;
  return text.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();
}
