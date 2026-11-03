import { computeAbilityStats } from './abilityStats';

// Ability stat forecaster: "if my Strength / Duration / Range / Efficiency
// changes by X, what do this ability's numbers become?" -- the proportions
// Patrick used to do on a calculator.
//
// The build's own stats (computeModdedWarframeStats) are the starting point.
// Every hypothetical change is a number of percentage points added to that
// stat's total, because the game stacks these four stats ADDITIVELY on a
// 100% baseline (mods, Archon Shards and arcanes all add into one pool; see
// utils/survivability.js). So +60% and +75% on a build at 243% Strength gives
// 243 + 60 + 75 = 378%, never 243 x 1.6 x 1.75.
//
// Each displayed ability number depends on one stat (Strength for damage,
// Duration for seconds, Range for metres, Efficiency for Energy cost), a few
// irregular ones depend on a hand-written formula, and some are capped. All
// of that is read from the same canonical parameters computeAbilityStats uses,
// so a forecast can never disagree with the number shown today: it runs the
// same function twice, once with the current stats and once with the changed.

export const FORECAST_STATS = ['strength', 'duration', 'range', 'efficiency'];

export const FORECAST_STAT_LABELS = {
  strength: 'Strength',
  duration: 'Duration',
  range: 'Range',
  efficiency: 'Efficiency',
};

// Adds up a list of { stat, percent } changes into one total per stat.
// Rows with an unknown stat or a non-numeric percent are ignored, so a
// half-typed input box never breaks the forecast.
export function sumChanges(changes = []) {
  const totals = { strength: 0, duration: 0, range: 0, efficiency: 0 };
  changes.forEach(change => {
    const percent = Number(change?.percent);
    if (!FORECAST_STATS.includes(change?.stat) || !Number.isFinite(percent)) return;
    totals[change.stat] += percent;
  });
  return totals;
}

// buildStats with the changes added on. Stats the build does not report are
// left alone (null stays null), so nothing is invented.
export function applyChanges(buildStats, changes = []) {
  const totals = sumChanges(changes);
  const next = { ...buildStats };
  FORECAST_STATS.forEach(stat => {
    if (next[stat] != null) next[stat] = next[stat] + totals[stat];
  });
  return next;
}

// Which of the four stats move this one number. Found by trying each stat
// on its own with a large nudge and checking whether the UNCAPPED value
// moves, so it also covers formula-driven numbers (Snow Globe health depends
// on Strength) and numbers that are currently capped (Eclipse's damage
// reduction is held at 90% but still comes from Strength).
function driversOf(parameterKey, parameters, context, buildStats) {
  const pick = stats => stats.find(s => s.parameterKey === parameterKey)?.rawValue;
  const base = pick(computeAbilityStats({ parameters, buildStats, context }));
  return FORECAST_STATS.filter(stat => {
    if (buildStats?.[stat] == null) return false;
    // Nudge up AND down: a stat already sitting on a floor/ceiling (e.g.
    // Efficiency past the 25% cost floor) only shows its effect one way.
    return [100, -50].some(nudge => {
      const probe = { ...buildStats, [stat]: buildStats[stat] + nudge };
      const moved = pick(computeAbilityStats({ parameters, buildStats: probe, context }));
      return base != null && moved != null && moved !== base;
    });
  });
}

// Forecast one ability.
// `parameters`: wf_base.ability_parameters rows for it (as for
//   computeAbilityStats). `context`: 'base' | 'subsumed'.
// `buildStats`: { duration, efficiency, range, strength, armor } as in
//   AbilitiesEditor. `changes`: [{ stat, percent }].
// Returns one row per displayed number:
//   { parameterKey, label, unit, current, forecast, delta, ratio,
//     affectedBy: ['strength', ...], capped: bool, cap }
// `ratio` is forecast / current (null when current is 0 or unknown), the
// "proportion" of the old pencil-and-calculator method. `capped` is true when
// the FORECAST value is being held at its cap.
export function forecastAbility({ parameters = [], context = 'base', buildStats, changes = [] }) {
  if (!buildStats) return [];
  const before = computeAbilityStats({ parameters, buildStats, context });
  const after = computeAbilityStats({ parameters, buildStats: applyChanges(buildStats, changes), context });

  return before.map(row => {
    const next = after.find(r => r.parameterKey === row.parameterKey);
    const current = row.value;
    const forecast = next?.value ?? null;
    const delta = current != null && forecast != null ? Math.round((forecast - current) * 100) / 100 : null;
    const ratio = current ? (forecast != null ? Math.round((forecast / current) * 1000) / 1000 : null) : null;
    return {
      parameterKey: row.parameterKey,
      label: row.label,
      unit: row.unit,
      current,
      forecast,
      delta,
      ratio,
      affectedBy: driversOf(row.parameterKey, parameters, context, buildStats),
      capped: Boolean(next?.capped),
      cap: row.cap,
    };
  });
}
