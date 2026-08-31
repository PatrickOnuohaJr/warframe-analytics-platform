// Exact-name lookup for an arcane's effect text, same shape as
// weaponMeta.js's weaponByName -- confirmed 0 duplicate names across 161
// arcanes before trusting this. `arcanes` here is whatever useArcanes()
// returns (the wf_user.arcane_collection_detail view), which already
// carries effect_r5 alongside ownership fields.
export function arcaneEffectText(arcanes, name) {
  if (!name) return null;
  const match = arcanes.find(a => a.name === name);
  return match?.effect_r5 ?? null;
}
