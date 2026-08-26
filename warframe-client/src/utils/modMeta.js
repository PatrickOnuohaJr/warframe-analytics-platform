// Shared helpers for reading WFCD's raw mod payload (stored as raw_json on
// wf_base.mods). WFCD has no flat "description" field -- effect text lives
// per-rank in levelStats, and it's littered with markup tags like
// <LOWER_IS_BETTER> / <ENERGY> meant for their own icon rendering, not ours.

export function isAugment(mod) {
  return mod.raw_json?.isAugment === true;
}

export function augmentTarget(mod) {
  return mod.raw_json?.compatName;
}

export function isPrimeMod(mod) {
  return mod.raw_json?.isPrime === true;
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
