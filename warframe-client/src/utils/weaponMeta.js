import { cleanStatText } from './modMeta';

// Unique-trait lookup for a weapon by name, read off WFCD's own weapon
// payload (wf_base.weapons.raw_json.description). Verified against real
// weapons first, not guessed -- Dual Coda Torxica, Xoris, and Stropha all
// carry real mechanical trait text here ("Inflicts a spore that spreads to
// nearby enemies...", "capable of chaining combos infinitely", "Send
// nearby enemies flying with a powerful short-range shockwave"), not just
// flavor lore, so this is a real surfacing job rather than new data entry.
// Same WFCD markup-tag cleanup as mod effect text (e.g. <DT_FREEZE_COLOR>
// shows up raw in weapon descriptions too), via modMeta's cleanStatText.
//
// Weapon names have no duplicates in wf_base.weapons (confirmed against
// live data before building this -- 665 rows, 0 collisions), so a plain
// name-keyed lookup is safe, unlike the mod catalog's duplicate-name bug
// earlier this session.
export function weaponTrait(weapons, name) {
  if (!name) return null;
  const match = weaponByName(weapons, name);
  return cleanStatText(match?.raw_json?.description ?? null);
}

// Same exact-name lookup weaponTrait already relies on, exported so other
// callers (the Loadout tab's modded-stats panel) share one canonical
// lookup instead of re-typing `weapons.find(w => w.name === name)`.
export function weaponByName(weapons, name) {
  if (!name) return null;
  return weapons.find(w => w.name === name) ?? null;
}
