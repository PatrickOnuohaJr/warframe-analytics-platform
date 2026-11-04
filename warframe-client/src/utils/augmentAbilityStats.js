// Numbers an equipped AUGMENT mod adds to one of the Warframe's abilities.
// They are not in wf_base.ability_parameters (that table is the ability's own
// kit), so they live here as hand-checked rows in the same shape and get
// appended to the ability's parameters, which means the ability card and the
// forecaster scale them exactly like any other number.
//
// Only add an entry after confirming it against the wiki AND a real in-game
// tooltip. Values are the max-rank (rank 3) ones, matching the rest of the app.
//
// Healing Flame (Ember, Fire Blast): wiki.warframe.com/w/Healing_Flame says
// "25 to 50" health per enemy hit depending on Immolation and an Overguard cap
// of 10,000, both "affected by Ability Strength". Checked in game by Patrick
// (2026-11-03, Ember Prime at 199% Strength): tooltip 25-50 -> 49.75-99.5 and
// Overguard cap 10,000 -> 19,900, i.e. both x1.99.
const AUGMENTS = {
  'Healing Flame': {
    ability: 'Fire Blast',
    rows: [
      { parameter_key: 'healing_flame_heal_min', label: 'Healing Flame heal (low Immolation)', base_value: 25, unit: 'flat', scales_with: 'strength' },
      { parameter_key: 'healing_flame_heal_max', label: 'Healing Flame heal (full Immolation)', base_value: 50, unit: 'flat', scales_with: 'strength' },
      { parameter_key: 'healing_flame_overguard_cap', label: 'Healing Flame Overguard cap', base_value: 10000, unit: 'flat', scales_with: 'strength' },
    ],
  },
  // Icy Avalanche (Frost, Avalanche). Wiki: 60 Overguard per enemy hit, +20% of
  // Armor once per enemy, cap 15,000; all three "affected by Ability Strength".
  // Checked in game by Patrick (Frost Prime, 276% Strength): 60 -> 165.6,
  // cap 15,000 -> 41,400, Armor conversion 20% -> 55%.
  'Icy Avalanche': {
    ability: 'Avalanche',
    rows: [
      { parameter_key: 'icy_avalanche_overguard', label: 'Icy Avalanche Overguard per hit', base_value: 60, unit: 'flat', scales_with: 'strength' },
      { parameter_key: 'icy_avalanche_overguard_cap', label: 'Icy Avalanche Overguard cap', base_value: 15000, unit: 'flat', scales_with: 'strength' },
      { parameter_key: 'icy_avalanche_armor_conversion', label: 'Icy Avalanche Armor to Overguard', base_value: 20, unit: 'percent', scales_with: 'strength' },
    ],
  },

  // Intrepid Stand (Styanax, Final Stand). Wiki only (not yet checked in game):
  // 60 Overguard to Styanax and 30 to allies per javelin hit, cap 15,000, "the
  // amount and the cap are affected by Ability Strength".
  'Intrepid Stand': {
    ability: 'Final Stand',
    rows: [
      { parameter_key: 'intrepid_stand_overguard_self', label: 'Intrepid Stand Overguard (Styanax)', base_value: 60, unit: 'flat', scales_with: 'strength' },
      { parameter_key: 'intrepid_stand_overguard_ally', label: 'Intrepid Stand Overguard (allies)', base_value: 30, unit: 'flat', scales_with: 'strength' },
      { parameter_key: 'intrepid_stand_overguard_cap', label: 'Intrepid Stand Overguard cap', base_value: 15000, unit: 'flat', scales_with: 'strength' },
    ],
  },

  // Rumbled (Atlas, Rumblers). Wiki only: the Rumbler's Overguard absorbs up to
  // 300% of Max Health, "health multiplier affected by Ability Strength".
  'Rumbled': {
    ability: 'Rumblers',
    rows: [
      { parameter_key: 'rumbled_overguard_health', label: 'Rumbled Overguard (% of Max Health)', base_value: 300, unit: 'percent', scales_with: 'strength' },
    ],
  },
};

// Extra parameter rows for `abilityName` from the augments currently
// equipped. `equippedMods`: [{ name, rank, maxRank }]. Only a max-rank augment
// counts (the stored numbers are rank 3). A Helminth-subsumed cast gets
// nothing: the augment belongs to the ability's home frame.
export function augmentParameters(abilityName, equippedMods = [], context = 'base') {
  if (context !== 'base') return [];
  return equippedMods.flatMap(({ name, rank, maxRank }) => {
    const augment = AUGMENTS[name];
    if (!augment || augment.ability !== abilityName || rank < maxRank) return [];
    return augment.rows.map((row, i) => ({ ...row, context: 'base', sort_order: 100 + i, source: 'augment' }));
  });
}
