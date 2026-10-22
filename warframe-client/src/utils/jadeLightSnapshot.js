// Freezes a build's defensive loadout at the moment a Jade Light result is
// logged, so later edits to the build can't rewrite what earned the tier.
// Pure so it can be tested without a DOM or database.

export const JADE_LIGHT_RESULTS = ['Tier 0', 'Tier 1', 'Did not survive'];
// First entry is the default: every build is assumed tested there unless logged otherwise.
export const JADE_LIGHT_ENVIRONMENTS = [
  'Steel Path 1999 (Scaldre/Techrot Survival)',
  'Steel Path Void',
  'Elite Deep Archimedea (no modifiers)',
  'Temporal Archimedea (no modifiers)',
  'Icebind',
];

// equippedMods: [{ slot, name, rank }] for the Warframe piece.
// shardBonusTexts: resolved shard bonus lines (Tau already applied).
export function buildLoadoutSnapshot({ frame, equippedMods = [], shardBonusTexts = [] }) {
  return {
    build_title: frame.build_title ?? null,
    display_name: frame.display_name ?? null,
    warframe_mods: equippedMods.map(m => ({ slot: m.slot, name: m.name, rank: m.rank ?? 0 })),
    shards: [...shardBonusTexts],
    arcanes: [frame.arcane_1, frame.arcane_2].filter(Boolean),
    subsumed_ability: frame.subsumed_ability ?? null,
    subsumed_slot: frame.subsumed_slot ?? null,
    // An empty mod list usually means "not entered yet", not "no mods" --
    // flag it so a Tier 0 on an unentered build isn't mistaken for a full record.
    mods_recorded: equippedMods.length > 0,
  };
}
