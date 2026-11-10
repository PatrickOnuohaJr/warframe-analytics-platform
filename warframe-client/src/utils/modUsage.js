// "Frequently used mods on top" -- ranks mods by how often Patrick actually
// equips them across ALL his saved builds (wf_user.loadout_slots), instead of
// a hand-kept list. 9 times out of 10 a Duration search should lead with
// Primed Continuity; this learns that from his builds.

// slotRows: loadout_slots rows (only `mod_id` is read). Rivens have a null
// mod_id and are ignored. Returns Map<mod_id, number of slots using it>.
export function countModUsage(slotRows) {
  const usage = new Map();
  for (const row of slotRows ?? []) {
    if (row?.mod_id == null) continue;
    usage.set(row.mod_id, (usage.get(row.mod_id) ?? 0) + 1);
  }
  return usage;
}

// Returns a NEW array, most-used first. Array.prototype.sort is stable, so
// mods with equal usage (including all the never-used ones) keep whatever
// order the caller already had (the picker sorts by name first). Items with
// no mod_id (Rivens) count as 0 uses.
export function sortByUsage(items, usage) {
  const uses = item => (item.mod_id == null ? 0 : usage?.get(item.mod_id) ?? 0);
  return [...items].sort((a, b) => uses(b) - uses(a));
}
