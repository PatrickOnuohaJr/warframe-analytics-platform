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
