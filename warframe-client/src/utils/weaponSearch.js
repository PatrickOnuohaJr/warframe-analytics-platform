// Pure filter logic for WeaponStatSearchTab, kept out of the component so the
// threshold behaviour can be regression-tested without a DOM.

// Raw WFCD values (e.g. crit chance 0.25) are shown scaled (25%).
export function toDisplay(raw, stat) {
  return raw * stat.scale;
}

// Live min/max per stat from whatever weapons are in the category right now.
// Weapons missing a numeric value for a stat are ignored for that stat's bounds.
export function computeStatBounds(weapons, stats) {
  const bounds = {};
  for (const stat of stats) {
    const values = weapons
      .map(w => w.raw_json?.[stat.key])
      .filter(v => typeof v === 'number' && !Number.isNaN(v));

    if (values.length === 0) {
      bounds[stat.key] = { min: 0, max: 0 };
      continue;
    }

    bounds[stat.key] = {
      min: toDisplay(Math.min(...values), stat),
      max: toDisplay(Math.max(...values), stat),
    };
  }
  return bounds;
}

// Every threshold is a MIN. A threshold at/below the stat's floor is a no-op,
// so an untouched slider never excludes anything (including weapons that lack
// the stat). Once a threshold is raised, weapons without the stat are excluded.
export function filterByThresholds(weapons, stats, thresholds, bounds) {
  return weapons.filter(w => stats.every(stat => {
    const threshold = thresholds[stat.key];
    const bound = bounds[stat.key];
    if (threshold === undefined || bound === undefined || threshold <= bound.min) return true;

    const raw = w.raw_json?.[stat.key];
    if (typeof raw !== 'number') return false;

    return toDisplay(raw, stat) >= threshold;
  }));
}
