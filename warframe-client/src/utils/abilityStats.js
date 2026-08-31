import { ABILITY_FORMULAS } from './abilityFormulas';

// Live "current values" for one ability, computed from wf_base's canonical
// per-parameter data (base_value/scales_with/formula_key/context) plus a
// build's already-computed Ability Duration/Efficiency/Range/Strength (and
// Armor, for the one formula that needs it) -- computeModdedWarframeStats
// in survivability.js is the single source of those four multipliers,
// never recomputed here.
//
// `parameters`: every wf_base.ability_parameters row for one ability
// (both 'base' and 'subsumed' context rows included -- this function does
// the context resolution).
// `buildStats`: { duration, efficiency, range, strength, armor } -- the
// 100-baseline percentages already returned by computeModdedWarframeStats
// (abilityDuration/abilityEfficiency/abilityRange/abilityStrength), plus
// its armor result.
// `context`: 'base' | 'subsumed' -- which cast context to resolve.
export function computeAbilityStats({ parameters = [], buildStats, context = 'base' }) {
  const byKeyForContext = key =>
    parameters.find(p => p.parameter_key === key && p.context === context) ??
    parameters.find(p => p.parameter_key === key && p.context === 'base');

  // Every distinct parameter_key this ability has, resolved once per key
  // (not once per row) so a key with both a 'base' and 'subsumed' row
  // only appears once in the output, using whichever the requested
  // context actually has.
  const keys = [...new Set(parameters.map(p => p.parameter_key))];

  // Raw (unscaled) sibling values for the resolved context, keyed by
  // parameter_key -- lets a formula (e.g. Snow Globe's) read another
  // parameter's base_value directly instead of an already-scaled output.
  const siblingByKey = {};
  keys.forEach(key => {
    const row = byKeyForContext(key);
    if (row) siblingByKey[key] = row;
  });

  const results = keys
    .map(key => {
      const row = byKeyForContext(key);
      if (!row) return null;

      let value;
      if (row.formula_key) {
        const formula = ABILITY_FORMULAS[row.formula_key];
        if (!formula) {
          console.warn(`No ABILITY_FORMULAS entry for formula_key "${row.formula_key}" (parameter "${key}")`);
          value = null;
        } else {
          value = formula({ siblingByKey, buildStats, parameterKey: key });
        }
      } else if (row.base_value == null) {
        value = null;
      } else if (!row.scales_with || row.scales_with === 'none') {
        value = row.base_value;
      } else {
        const multiplier = buildStats?.[row.scales_with];
        value = multiplier == null ? null : row.base_value * (multiplier / 100);
      }

      return {
        parameterKey: key,
        label: row.label,
        unit: row.unit,
        value: value == null ? null : Math.round(value * 100) / 100,
        sortOrder: row.sort_order ?? 0,
      };
    })
    .filter(Boolean);

  results.sort((a, b) => a.sortOrder - b.sortOrder);
  return results;
}
