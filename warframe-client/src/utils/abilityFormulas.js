// Named registry of hand-verified per-ability override formulas. A
// wf_base.ability_parameters row with formula_key set MUST have a
// matching entry here -- a missing entry is a bug (computeAbilityStats
// warns and returns null, never silently skips or approximates). Kept as
// plain named functions, not a JSONB formula DSL, so every irregular
// ability's math is grep-able and reviewable in source control, same
// transparency principle as seed_mods.py's MAX_RANK_OVERRIDES.
//
// Every entry below has an explicit real-world citation. Never add one by
// inferring a formula from a name or a guess -- the whole reason this
// registry exists is that generic linear scaling is provably wrong for
// these specific abilities.
export const ABILITY_FORMULAS = {
  // Some parameters are pure formula-input constants (Snow Globe's
  // armor_multiplier is the "5x" a compound formula multiplies by, not a
  // stat that independently scales with Ability Strength on its own) --
  // the generic field-level scales_with assignment doesn't know that,
  // since it's assigned per wiki template field ("strength="), not per
  // formula dependency. This just returns the raw base_value unscaled,
  // so the displayed tile matches what the formula actually consumes
  // instead of double-applying a scaling that was never real.
  raw_passthrough: ({ siblingByKey, parameterKey }) => siblingByKey[parameterKey]?.base_value ?? null,


  // Verified against wiki.warframe.com/w/Snow_Globe's own worked example
  // (2026-08-31): "with a maxed Steel Fiber and Intensify, rank-3 Snow
  // Globe will have an initial health of {3500 + 5*[300*(1+1)]}*(1+0.3)".
  // Real formula: Modified Health = {BaseHealth + ArmorMultiplier *
  // [Frost's Base Armor * (1+ArmorBonus) + Additional Armor]} *
  // (1+Ability Strength) + Absorbed Damage. buildStats.armor already IS
  // "Frost's Base Armor * (1+ArmorBonus) + Additional Armor" -- it's
  // computeModdedWarframeStats's own armor result, which already folds in
  // both Armor% mods and flat Armor shards -- so no separate "Additional
  // Armor" input is needed here. Absorbed Damage is live combat-runtime
  // state (damage soaked during the invulnerability window), not a
  // buildable stat -- permanently out of scope for a static calculator,
  // not a gap to fill later.
  snow_globe_health: ({ siblingByKey, buildStats }) => {
    const baseHealth = siblingByKey.base_health?.base_value;
    const armorMult = siblingByKey.armor_multiplier?.base_value;
    if (baseHealth == null || armorMult == null || buildStats.armor == null) return null;
    return (baseHealth + armorMult * buildStats.armor) * (buildStats.strength / 100);
  },

  // Verified from Nourish's own "| helminth =" wiki prose (2026-08-31):
  // subsumed cast's energy-multiplier buff uses "1 + ((0.3/0.39/0.48/0.6)
  // * Ability Strength)" -- a different formula than the home-cast
  // 1.5x-2x flat table, not just a smaller version of the same one. 0.6
  // is the maxed (Ability Rank 3) coefficient, per this project's
  // "every tracked build is fully leveled" convention.
  nourish_subsumed_energy_multiplier: ({ buildStats }) => {
    if (buildStats.strength == null) return null;
    return 1 + 0.6 * (buildStats.strength / 100);
  },
};
