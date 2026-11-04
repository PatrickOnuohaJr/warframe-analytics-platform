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

  // Intrepid Stand (Styanax, Final Stand). Wiki: 60 Overguard to Styanax and 30
  // to allies per javelin hit, cap 15,000, both "affected by Ability Strength".
  // Checked in game by Patrick (Styanax Prime, 313% Strength): Overguard 60 ->
  // 187.8, cap 15,000 -> 46,950. The allies' 30 is wiki-only.
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

  // Wrath Of Ukko (Kullervo, Storm of Ukko). Wiki: Wrathful Advance moves the
  // active storm and adds 3s (rank 0) to 6s (rank 3) of duration; the page says
  // the duration refresh "is affected by Ability Duration". Wiki only, not yet
  // checked in game. Rank 3 is the stored value.
  'Wrath Of Ukko': {
    ability: 'Storm of Ukko',
    rows: [
      { parameter_key: 'wrath_of_ukko_duration', label: 'Wrath Of Ukko duration added', base_value: 6, unit: 'flat', scales_with: 'duration' },
    ],
  },

  // Eternal War (Valkyr, Warcry). Wiki: +2s Warcry duration per melee kill at
  // rank 3, "affected by Ability Duration". Total is capped at double the
  // ability's duration after mods (not modeled). Wiki only, not checked in game.
  'Eternal War': {
    ability: 'Warcry',
    rows: [
      { parameter_key: 'eternal_war_duration_per_kill', label: 'Eternal War duration per melee kill', base_value: 2, unit: 'flat', scales_with: 'duration' },
    ],
  },
};

// Extra parameter rows for `abilityName` from the augments currently
// equipped. `equippedMods`: [{ name, rank, maxRank }]. Only a max-rank augment
// counts (the stored numbers are rank 3). Applies to a Helminth-subsumed cast
// too: it matches by ability name, and in game the augment works on whichever
// frame carries the ability. Rows keep context 'base' so they resolve in both.
export function augmentParameters(abilityName, equippedMods = []) {
  return equippedMods.flatMap(({ name, rank, maxRank }) => {
    const augment = AUGMENTS[name];
    if (!augment || augment.ability !== abilityName || rank < maxRank) return [];
    return augment.rows.map((row, i) => ({ ...row, context: 'base', sort_order: 100 + i, source: 'augment' }));
  });
}
